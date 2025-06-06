
import React, {useEffect, useState} from 'react';
import {View, Text, Image, ScrollView, ActivityIndicator, Alert} from 'react-native';
import {useTailwind} from 'tailwind-rn';
import {ProfileScreenProps} from '@navigation/types';
import {useAuthStore} from '@store/useAuthStore';
import {User} from '@customtypes/index';
import {CommonButton} from '@components/common';
import {AuthService} from '@services/authService'; // Assuming you have a way to fetch user profiles
import { useTranslation } from 'react-i18next';

const ProfileScreen: React.FC<ProfileScreenProps> = ({route, navigation}) => {
  const tw = useTailwind();
  const {t} = useTranslation();
  const {user: loggedInUser, updateUser: updateLoggedInUser} = useAuthStore();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userIdToFetch = route.params?.userId || loggedInUser?.id;

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userIdToFetch) {
        setIsLoading(false);
        Alert.alert(t('profile.errorTitle'), t('profile.userNotFound'));
        navigation.goBack();
        return;
      }
      setIsLoading(true);
      try {
        // If viewing own profile and data is in store, use it, otherwise fetch
        if (userIdToFetch === loggedInUser?.id && loggedInUser) {
          setProfileUser(loggedInUser);
        } else {
          // This is a placeholder. Implement actual API call to fetch user profile by ID.
          // const fetchedUser = await AuthService.getUserProfile(userIdToFetch);
          // setProfileUser(fetchedUser);
          // For now, mock it if not the logged-in user or simulate API delay
          if (userIdToFetch === 'doc1') { // Example of fetching another user
             await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
             setProfileUser({ id: 'doc1', name: 'Dr. Aylin Yılmaz', email: 'aylin@example.com', role: 'doctor', avatarUrl: 'https://i.pravatar.cc/150?u=doc1'});
          } else if (loggedInUser) {
             setProfileUser(loggedInUser); // Default to loggedInUser if no specific other ID is mocked
          } else {
            throw new Error(t('profile.userNotFound'));
          }
        }
      } catch (error: any) {
        console.error("Failed to fetch profile:", error);
        Alert.alert(t('profile.errorTitle'), error.message || t('profile.fetchError'));
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [userIdToFetch, loggedInUser, navigation, t]);

  const handleUpdateProfile = () => {
    // Navigate to an EditProfileScreen or show a modal
    Alert.alert(t('profile.editProfile'), t('profile.featureComingSoon'));
    // Example: navigation.navigate('EditProfile', { userId: profileUser?.id });
  };

  if (isLoading) {
    return (
      <View style={tw('flex-1 justify-center items-center bg-background')}>
        <ActivityIndicator size="large" color={tw('text-primary').color as string} />
      </View>
    );
  }

  if (!profileUser) {
    return (
      <View style={tw('flex-1 justify-center items-center bg-background')}>
        <Text style={tw('text-lg text-text')}>{t('profile.userNotFound')}</Text>
        <CommonButton title={t('profile.goBack')} onPress={() => navigation.goBack()} style="mt-4" />
      </View>
    );
  }

  const isOwnProfile = profileUser.id === loggedInUser?.id;

  return (
    <ScrollView style={tw('flex-1 bg-background')}>
      <View style={tw('items-center p-8 bg-primary')}>
        <Image
          source={{uri: profileUser.avatarUrl || `https://i.pravatar.cc/150?u=${profileUser.id}`}}
          style={tw('w-32 h-32 rounded-full border-4 border-white mb-4')}
          accessibilityLabel={t('profile.avatarAlt', {name: profileUser.name})}
        />
        <Text style={tw('text-2xl font-bold text-white')}>{profileUser.name}</Text>
        <Text style={tw('text-base text-gray-200')}>{profileUser.email}</Text>
        <Text style={tw('text-sm text-gray-300 capitalize mt-1')}>{t(`roles.${profileUser.role}`)}</Text>
      </View>

      <View style={tw('p-6')}>
        <ProfileInfoRow label={t('profile.fullNameLabel')} value={profileUser.name} />
        <ProfileInfoRow label={t('profile.emailLabel')} value={profileUser.email} />
        <ProfileInfoRow label={t('profile.roleLabel')} value={t(`roles.${profileUser.role}`)} />

        {/* Add more profile information here */}
        {/* For example: Specialization for doctors, Medical history summary for patients (with privacy considerations) */}

        {isOwnProfile && (
          <CommonButton
            title={t('profile.editProfileButton')}
            onPress={handleUpdateProfile}
            style="mt-8"
          />
        )}
         <CommonButton
            title={t('profile.goBack')}
            onPress={() => navigation.goBack()}
            style="mt-4"
            type="secondary"
          />
      </View>
    </ScrollView>
  );
};

const ProfileInfoRow: React.FC<{label: string; value: string}> = ({label, value}) => {
  const tw = useTailwind();
  return (
    <View style={tw('mb-4 pb-2 border-b border-gray-200')}>
      <Text style={tw('text-sm text-gray-500')}>{label}</Text>
      <Text style={tw('text-lg text-text')}>{value}</Text>
    </View>
  );
};

export default ProfileScreen;
