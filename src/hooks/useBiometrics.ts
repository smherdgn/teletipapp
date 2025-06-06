
import {useState, useEffect, useCallback} from 'react';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { Platform } from 'react-native';

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });


export const useBiometrics = () => {
  const [biometryType, setBiometryType] = useState<BiometryTypes | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    const checkSensor = async () => {
      try {
        const { available, biometryType: type } = await rnBiometrics.isSensorAvailable();
        if (available) {
          setIsAvailable(true);
          setBiometryType(type || null); // type can be undefined
        } else {
          setIsAvailable(false);
          setBiometryType(null);
        }
      } catch (error) {
        console.error('Biometric sensor check failed:', error);
        setIsAvailable(false);
        setBiometryType(null);
      }
    };
    checkSensor();
  }, []);

  const isBiometricAvailable = useCallback(async () => {
    try {
      const { available } = await rnBiometrics.isSensorAvailable();
      return available;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  }, []);

  const authenticateWithBiometrics = useCallback(async (promptMessage: string): Promise<boolean> => {
    if (!isAvailable) {
      console.log('Biometrics not available on this device.');
      throw new Error('Biometrics not available.');
    }
    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage,
        // cancelButtonText: 'Cancel', // Optional
        // fallbackPromptMessage: 'Use Passcode', // Optional for iOS FaceID/TouchID fallback
      });
      return success;
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      // Handle specific errors, e.g., user cancellation, too many attempts
      // error.code might give more details on Android
      if (Platform.OS === 'ios' && error.name === 'LAErrorUserCancel') {
         // User cancelled
         return false;
      }
      throw new Error('Biometric authentication failed or was cancelled.');
    }
  }, [isAvailable]);
  
  // You can add more functions like createKeys, signPayload, deleteKeys etc. if needed for more advanced scenarios.

  return {
    isBiometricAvailable: isAvailable, // This is the state from useEffect
    checkBiometricAvailability: isBiometricAvailable, // This is the function for on-demand check
    biometryType,
    authenticateWithBiometrics,
  };
};
