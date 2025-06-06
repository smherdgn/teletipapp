
import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, Alert, ScrollView, StyleSheet, Image} from 'react-native';
import {useTailwind} from 'tailwind-rn';
import {RoomEntryScreenProps} from '@navigation/types';
import {useAuthStore} from '@store/useAuthStore';
import {Button, TextInput, Icon, Toast, LoadingOverlay, ConsentModal} from '@components/common';
import { useTranslation } from 'react-i18next';
import { Colors } from '@constants/theme';
import Logger from '@utils/logger';

const RoomEntryScreen: React.FC<RoomEntryScreenProps> = ({navigation}) => {
  const tw = useTailwind();
  const {t} = useTranslation();
  const [roomId, setRoomId] = useState('');
  const {logout, user, hasGivenConsent, isLoadingAuth, checkInitialAuth} = useAuthStore();
  const [isLoading, setIsLoading] = useState(false); // For room joining or logout actions
  const [isConsentModalVisible, setIsConsentModalVisible] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // Re-check auth and consent status on screen focus for robustness
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      Logger.debug('RoomEntryScreen focused, re-checking auth and consent status.');
      checkInitialAuth(); // This will update user and hasGivenConsent from store/storage
    });
    return unsubscribe;
  }, [navigation, checkInitialAuth]);


  // Effect to manage ConsentModal visibility based on auth state
  // This handles the "first login" scenario or when consent is not yet given/confirmed.
  useEffect(() => {
    if (!isLoadingAuth && user) { // User is loaded and auth check is complete
      if (hasGivenConsent === null || hasGivenConsent === false) {
        Logger.info('RoomEntry: Consent not given or unknown. Showing ConsentModal.', { userId: user.id, consentStatus: hasGivenConsent });
        setIsConsentModalVisible(true);
      } else {
        setIsConsentModalVisible(false); // Consent is true, hide modal
      }
    } else if (!isLoadingAuth && !user) {
      // If no user (e.g., after logout), ensure modal is not visible
      setIsConsentModalVisible(false);
    }
    // Do not add setIsConsentModalVisible to dependencies to avoid loops if it changes elsewhere.
  }, [user, hasGivenConsent, isLoadingAuth]);


  const displayToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  }, []);

  const handleJoinRoom = () => {
    Logger.ui('RoomEntryScreen', 'JoinRoomButton Press', { roomId, userId: user?.id });

    const currentConsentStatus = useAuthStore.getState().hasGivenConsent;
    if (currentConsentStatus !== true) {
      displayToast(t('toastMessages.consentRequired'), 'warning');
      setIsConsentModalVisible(true); // Re-show modal if consent is still not given
      Logger.warn('RoomEntry: Join room attempt blocked, consent not given.', { userId: user?.id, currentConsentStatus });
      return;
    }

    const trimmedRoomId = roomId.trim();
    if (!trimmedRoomId) {
      displayToast(t('roomEntry.invalidRoomId'));
      return;
    }
    setIsLoading(true);
    Logger.info('Attempting to join room', { roomId: trimmedRoomId, userId: user?.id });

    // Simulate navigation to Call screen
    // In a real app, this would involve socket communication and potentially waiting for a response
    // before navigating or after RTC setup.
    // For now, navigate directly after a short delay to simulate some processing.
    // The actual call setup (RTC, socket events for offer/answer) happens in CallScreen.
    setTimeout(() => {
      setIsLoading(false);
      // Navigate to the 'App' stack, then to 'Call' screen within that stack
      // Ensure your AppNavigator can handle this. If CallScreen is a direct child of AppNavigator's Stack.
      navigation.navigate('App', { screen: 'Call', params: {roomId: trimmedRoomId} });
    }, 500);
  };

  const handleLogout = () => {
    Logger.ui('RoomEntryScreen', 'LogoutButton Press', { userId: user?.id });
    Alert.alert(
      t('roomEntry.logoutConfirmationTitle'),
      t('roomEntry.logoutConfirmationMessage'),
      [
        {text: t('common.cancel'), style: 'cancel', onPress: () => Logger.debug('Logout cancelled by user.')},
        {
          text: t('common.logout'),
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            await logout();
            // isLoading will be reset by component re-render or unmount due to auth state change
            // Navigation to LoginScreen is handled by RootNavigator based on isAuthenticated state.
          },
        },
      ],
    );
  };

  const handleConsentModalClose = () => {
    setIsConsentModalVisible(false);
    // After modal closes (user agreed or declined&loggedOut), re-check auth state.
    // This ensures the UI reflects the outcome (e.g., if logged out, navigate to Login; if agreed, proceed).
    Logger.debug('RoomEntryScreen: ConsentModal closed. Re-checking auth state.');
    checkInitialAuth();
  };


  if (isLoadingAuth) {
    return <LoadingOverlay visible={true} text={t('loading.authenticating')} />;
  }

  // If consent modal should be visible (user exists, consent not true), render it.
  // This state (isConsentModalVisible) is primarily driven by the useEffect above.
  if (user && isConsentModalVisible) {
    return <ConsentModal visible={isConsentModalVisible} onClose={handleConsentModalClose} />;
  }

  // If user exists, but consent is not given, and modal is NOT currently set to visible
  // (e.g. user dismissed an alert, or some edge case), show a blocked screen.
  if (user && hasGivenConsent !== true && !isConsentModalVisible) {
     Logger.warn('RoomEntry: Rendering blocked state as consent is not true and modal is not forced active.', { userId: user.id, consentStatus: hasGivenConsent });
    return (
        <View style={tw('flex-1 justify-center items-center p-6 bg-background')}>
            <Icon name="ShieldAlert" size={64} color={Colors.warning} />
            <Text style={tw('text-xl font-semibold text-text-secondary mt-4 text-center')}>{t('roomEntry.consentRequiredTitle')}</Text>
            <Text style={tw('text-base text-text-secondary mt-2 mb-6 text-center')}>{t('roomEntry.consentRequiredMessage')}</Text>
             <Button
                title={t('roomEntry.manageConsent')}
                onPress={() => {
                  Logger.ui('RoomEntryScreen', 'ManageConsentButton Press (Blocked State)');
                  setIsConsentModalVisible(true); // Force modal to re-appear
                }}
                type="primary"
                style={tw('mt-6 w-3/4')}
                leftIcon="ShieldCheck"
             />
             <Button
                title={t('roomEntry.logoutButton')}
                onPress={handleLogout}
                disabled={isLoading}
                type="outline"
                style={tw('mt-4 w-3/4 border-destructive-DEFAULT')}
                textStyle={tw('text-destructive-DEFAULT')}
                leftIcon="LogOut"
                iconColor={Colors.destructive}
            />
             {toastVisible && (
                <Toast
                    message={toastMessage}
                    type={toastType}
                    visible={toastVisible}
                    onDismiss={() => setToastVisible(false)}
                />
            )}
        </View>
    );
  }

  // Default render: User exists, consent is given (hasGivenConsent === true), and modal is not active.
  return (
    <>
    <ScrollView contentContainerStyle={tw('flex-grow justify-center items-center p-6 bg-background')} keyboardShouldPersistTaps="handled">
      <View style={tw('w-full max-w-md')}>
        <View style={tw('items-center mb-8')}>
          <Icon name="Users" size={64} color={Colors.primary} />
          <Text style={tw('text-3xl font-bold text-primary mt-4')}>{t('roomEntry.title')}</Text>
          <Text style={tw('text-base text-text-secondary mt-1 text-center')}>{t('roomEntry.subtitle')}</Text>
        </View>

        {user && (
            <Text style={tw('text-lg text-text-secondary mb-6 text-center')}>
                {t('dashboard.welcome', { name: user.name || 'User' })}
            </Text>
        )}

        <TextInput
          testID="roomIdInput"
          label={t('roomEntry.roomIdPlaceholder')}
          placeholder={t('roomEntry.roomIdPlaceholder')}
          value={roomId}
          onChangeText={setRoomId}
          containerStyle={tw('mb-6')}
          leftIcon="Hash"
          accessibilityLabel={t('roomEntry.roomIdPlaceholder')}
          returnKeyType="go" // Changed from 'join' to a standard value
          onSubmitEditing={handleJoinRoom}
        />

        <Button
          testID="joinRoomButton"
          title={t('roomEntry.joinButton')}
          onPress={handleJoinRoom}
          loading={isLoading && roomId.length > 0}
          disabled={isLoading || (user && hasGivenConsent !== true)} // Also disable if consent somehow not true here
          type="primary"
          fullWidth
          style={tw('mb-4')}
          leftIcon="LogIn"
        />
        <Button
          testID="logoutButton"
          title={t('roomEntry.logoutButton')}
          onPress={handleLogout}
          disabled={isLoading}
          type="outline"
          fullWidth
          leftIcon="LogOut"
          iconColor={Colors.destructive}
          textStyle={tw('text-destructive-DEFAULT')}
          style={[tw('border-destructive-DEFAULT')]}
        />
      </View>
    </ScrollView>
    <LoadingOverlay visible={isLoading && (roomId.length > 0 || (!user && isLoading))} text={isLoading && roomId.length > 0 ? t('loading.joiningRoom') : t('common.pleaseWait')} />
     {toastVisible && (
        <Toast
            message={toastMessage}
            type={toastType}
            visible={toastVisible}
            onDismiss={() => setToastVisible(false)}
        />
    )}
    {/* Fallback modal rendering in case the main conditional isn't met, but should be driven by isConsentModalVisible state */}
    {user && hasGivenConsent !== true && isConsentModalVisible && (
        <ConsentModal visible={isConsentModalVisible} onClose={handleConsentModalClose} />
    )}
    </>
  );
};

export default RoomEntryScreen;
