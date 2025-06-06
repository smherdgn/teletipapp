
import React from 'react';
import {View, Text, TouchableOpacity, FlatList, Alert} from 'react-native';
import {useTailwind} from 'tailwind-rn';
import {DashboardScreenProps} from '@navigation/types';
import {useAuthStore} from '@store/useAuthStore';
import { CallSession, CallStatus, User } from '@customtypes/index';
import { useCallStore } from '@store/useCallStore';
import { CommonButton } from '@components/common';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';

// Mock data for users/doctors to call
const MOCK_DOCTORS: User[] = [
  { id: 'doc1', name: 'Dr. Aylin Yılmaz', email: 'aylin@example.com', role: 'doctor', avatarUrl: 'https://i.pravatar.cc/150?u=doc1'},
  { id: 'doc2', name: 'Dr. Mehmet Öztürk', email: 'mehmet@example.com', role: 'doctor', avatarUrl: 'https://i.pravatar.cc/150?u=doc2' },
];


const DashboardScreen: React.FC<DashboardScreenProps> = ({navigation}) => {
  const tw = useTailwind();
  const {t} = useTranslation();
  const {user, logout} = useAuthStore();
  const {initiateCall} = useCallStore();

  const handleLogout = async () => {
    await logout();
    // Navigation to Login will be handled by AppNavigator
  };

  const handleStartCall = (doctor: User) => {
    if (!user) {
      Alert.alert(t('dashboard.errorTitle'), t('dashboard.userNotFound'));
      return;
    }
    const callSession: CallSession = {
      id: uuidv4(),
      caller: user,
      callee: doctor,
      status: CallStatus.DIALING,
      roomId: `call_${uuidv4()}` // Example room ID
    };
    initiateCall(callSession);
    navigation.navigate('VideoCall', { callSession, localUser: user });
  };


  return (
    <View style={tw('flex-1 p-6 bg-background')}>
      <View style={tw('flex-row justify-between items-center mb-6')}>
        <Text style={tw('text-2xl font-bold text-text')}>
          {t('dashboard.welcome', { name: user?.name || t('dashboard.guest') })}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile', { userId: user?.id })}>
            <Text style={tw('text-primary')}>{t('dashboard.viewProfile')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={tw('text-lg font-semibold text-text mb-4')}>{t('dashboard.availableDoctors')}</Text>
      <FlatList
        data={MOCK_DOCTORS.filter(doc => doc.id !== user?.id)} // Don't list self
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <View style={tw('bg-card p-4 rounded-lg shadow mb-4 flex-row justify-between items-center')}>
            <View>
              <Text style={tw('text-base font-medium text-text')}>{item.name}</Text>
              <Text style={tw('text-sm text-gray-600')}>{item.role}</Text>
            </View>
            <CommonButton title={t('dashboard.callButton')} onPress={() => handleStartCall(item)} small />
          </View>
        )}
        ListEmptyComponent={<Text style={tw('text-center text-gray-500')}>{t('dashboard.noDoctors')}</Text>}
      />
      
      <View style={tw('mt-auto')}>
        <CommonButton title={t('dashboard.settings')} onPress={() => navigation.navigate('Settings')} style="mb-4" type="secondary" />
        <CommonButton title={t('dashboard.logoutButton')} onPress={handleLogout} type="destructive" />
      </View>
    </View>
  );
};

export default DashboardScreen;
