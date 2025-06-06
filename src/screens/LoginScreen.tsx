import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, StyleSheet, Platform} from 'react-native';
import {useTailwind} from 'tailwind-rn';
import {LoginScreenProps} from '@navigation/types';
import {AuthService} from '@services/authService';
import {useAuthStore} from '@store/useAuthStore';
import {Button, TextInput, Toast, LoadingOverlay} from '@components/common';
import Icon from '@components/common/Icon'; // Corrected import
import { useTranslation } from 'react-i18next';
import { useBiometrics } from '@hooks/useBiometrics';
import { Colors } from '@constants/theme';
import Logger from '@utils/logger';

const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const tw = useTailwind();
  const {t} = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const {login} = useAuthStore();
  const { isBiometricAvailable, biometryType, authenticateWithBiometrics, checkBiometricAvailability } = useBiometrics();
  
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const [showPassword, setShowPassword] = useState(false);

  // Re-check biometric availability on screen focus if desired
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkBiometricAvailability();
    });
    return unsubscribe;
  }, [navigation, checkBiometricAvailability]);

  const displayToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      displayToast(t('login.fillFieldsError'));
      return;
    }
    setIsLoading(true);
    try {
      Logger.info('Login attempt initiated', { email });
      const {user, token} = await AuthService.login(email, password);
      await login(user, token); // This will trigger navigation via RootNavigator
      // displayToast(t('toastMessages.loginSuccess'), 'success'); // Not usually needed as screen changes
      Logger.info('Login successful', { userId: user.id });
    } catch (error: any) {
      Logger.error('Login failed in LoginScreen', error, { email });
      const errorMessage = error?.message?.includes('Invalid credentials') || error?.message?.includes('User not found')
        ? t('login.genericError')
        : t('common.error');
      displayToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (await isBiometricAvailable()) { // Use the function for on-demand check
      setIsLoading(true);
      try {
        const success = await authenticateWithBiometrics(t('login.biometricPrompt'));
        if (success) {
          Logger.info('Biometric authentication successful');
          // This is a placeholder. In a real app, you'd retrieve a stored token
          // or use a biometric-specific backend endpoint.
          // For this demo, we can't directly log in without credentials.
          // We can simulate it or prompt for email if biometrics only verify identity.
          displayToast(t('login.biometricSuccessMessage'), 'info');
          // Example: If biometrics were tied to a specific user/token:
          // const { user, token } = await AuthService.loginWithBiometrics(biometryType); // Fictional
          // await login(user, token);
          Alert.alert(t('login.biometricSuccessTitle'), t('login.biometricSuccessMessage') + "\n" + t('common.featureComingSoon'));
        } else {
           Logger.warn('Biometric authentication was not successful (e.g. cancelled by user).');
        }
      } catch (error: any) {
        Logger.error('Biometric login failed', error);
        displayToast(error.message || t('login.biometricErrorGeneric'));
      } finally {
        setIsLoading(false);
      }
    } else {
      displayToast(t('login.biometricNotAvailableMessage'), 'warning'); // Corrected type
    }
  };


  return (
    <>
    <ScrollView contentContainerStyle={tw('flex-grow justify-center items-center p-6 bg-background')} keyboardShouldPersistTaps="handled">
      <View style={tw('w-full max-w-md')}>
        <View style={tw('items-center mb-8')}>
            <Icon name="ShieldCheck" size={64} color={Colors.primary} />
            <Text style={tw('text-3xl font-bold text-primary mt-4')}>{t('common.appName')}</Text>
            <Text style={tw('text-base text-text-secondary mt-1')}>{t('login.subtitle')}</Text>
        </View>

        <TextInput
          testID="emailInput"
          label={t('common.email')}
          placeholder={t('login.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          containerStyle={tw('mb-4')}
          leftIcon="Mail"
          accessibilityLabel={t('login.emailPlaceholder')}
          returnKeyType="next"
          onSubmitEditing={() => { /* focus next field */ }}
        />
        <TextInput
          testID="passwordInput"
          label={t('common.password')}
          placeholder={t('login.passwordPlaceholder')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          containerStyle={tw('mb-6')}
          leftIcon="Lock"
          rightIcon={showPassword ? "EyeOff" : "Eye"}
          onRightIconPress={() => setShowPassword(!showPassword)}
          accessibilityLabel={t('login.passwordPlaceholder')}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
        
        <Button
          testID="loginButton"
          title={t('login.loginButton')}
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading}
          type="primary"
          fullWidth
          style={tw('mb-4')}
          leftIcon="LogIn"
        />

        {isBiometricAvailable && biometryType && ( // Check both state and function result
           <Button
            testID="biometricLoginButton"
            title={t('login.biometricLoginButton')}
            onPress={handleBiometricLogin}
            loading={isLoading}
            disabled={isLoading}
            type="outline"
            fullWidth
            style={tw('mb-4')}
            leftIcon="Fingerprint" // Example icon
          />
        )}
        
        <View style={tw('flex-row justify-center mt-6')}>
            <Text style={tw('text-text-secondary')}>{t('login.noAccount')}{' '}</Text>
            <TouchableOpacity onPress={() => Alert.alert(t('login.signUp'), t('common.featureComingSoon'))}>
                <Text style={tw('text-primary font-semibold')}>{t('login.signUp')}</Text>
            </TouchableOpacity>
        </View>
         <TouchableOpacity style={tw('mt-3 items-center')} onPress={() => Alert.alert(t('login.forgotPassword'), t('common.featureComingSoon'))}>
          <Text style={tw('text-sm text-text-secondary')}>{t('login.forgotPassword')}</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
    <LoadingOverlay visible={isLoading} text={t('loading.authenticating')} />
    {toastVisible && (
        <Toast
            message={toastMessage}
            type={toastType}
            visible={toastVisible}
            onDismiss={() => setToastVisible(false)}
        />
    )}
    </>
  );
};

export default LoginScreen;
