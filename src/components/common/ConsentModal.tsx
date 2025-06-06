
// src/components/common/ConsentModal.tsx
import React, {useState, useEffect, useMemo} from 'react';
import {Modal, View, Text, ScrollView, StyleSheet, Alert, Platform} from 'react-native';
import {useTailwind} from 'tailwind-rn';
import {useTranslation} from 'react-i18next';
import {Button, Checkbox} from '@components/common';
import {Colors} from '@constants/theme';
import {useAuthStore} from '@store/useAuthStore';
import {ConsentLogService, ConsentDetails} from '@services/consentLogService';
import Logger from '@utils/logger';
import { LOG_EVENT_TYPES } from '@constants/index';

interface ConsentItem {
  id: keyof ConsentDetails;
  labelKey: string; // i18n key for the main label
  descriptionKey: string; // i18n key for the detailed description
}

// Ensure these items match the request: Camera, Mic, Secure Transmission, Medical Data Processing
const CONSENT_ITEMS: ConsentItem[] = [
  {id: 'cameraAccess', labelKey: 'consent.cameraAccess', descriptionKey: 'consent.cameraAccessDescription'},
  {id: 'microphoneAccess', labelKey: 'consent.microphoneAccess', descriptionKey: 'consent.microphoneAccessDescription'},
  {id: 'dataTransmission', labelKey: 'consent.dataTransmission', descriptionKey: 'consent.dataTransmissionDescription'},
  {id: 'medicalDataProcessing', labelKey: 'consent.medicalDataProcessing', descriptionKey: 'consent.medicalDataProcessingDescription'},
];

interface ConsentModalProps {
  visible: boolean;
  onClose: () => void; // Called when modal is dismissed either by accept or decline
}

const ConsentModal: React.FC<ConsentModalProps> = ({visible, onClose}) => {
  const tw = useTailwind();
  const {t} = useTranslation();
  const {logout, setConsentStatus, user} = useAuthStore();

  const initialConsentsState = useMemo(() =>
    CONSENT_ITEMS.reduce((acc, item) => {
      acc[item.id] = false;
      return acc;
    }, {} as ConsentDetails),
  []);

  const [consents, setConsents] = useState<ConsentDetails>(initialConsentsState);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setConsents(initialConsentsState); // Reset consents when modal becomes visible
      ConsentLogService.logConsentAction(LOG_EVENT_TYPES.CONSENT_VIEWED);
      Logger.ui('ConsentModal', 'Modal Visible');
    }
  }, [visible, initialConsentsState]);

  const handleConsentChange = (id: keyof ConsentDetails) => {
    setConsents(prev => ({...prev, [id]: !prev[id]}));
  };

  const allConsentsGiven = useMemo(() => {
    return CONSENT_ITEMS.every(item => consents[item.id]);
  }, [consents]);

  const handleAgree = async () => {
    if (!allConsentsGiven) {
      // This should ideally not be reachable if button is disabled, but as a safeguard:
      Alert.alert(t('common.error'), t('consent.allConsentsRequired'));
      return;
    }
    setIsLoading(true);
    Logger.ui('ConsentModal', 'AgreeButton Press', {userId: user?.id});
    try {
      await setConsentStatus(true);
      ConsentLogService.logConsentAction(LOG_EVENT_TYPES.CONSENT_GIVEN, consents);
      Logger.info('User agreed to all consents.', {userId: user?.id, consents});
      onClose();
    } catch (error) {
      Logger.error('Error saving consent status', error, {userId: user?.id});
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    Logger.ui('ConsentModal', 'DeclineButton Press', {userId: user?.id});
    Alert.alert(
      t('consent.declineButton'), // Title: "Reddet"
      t('consent.declinedMessage'), // Message: "Rızayı reddettiniz..."
      [
        {
          text: t('common.ok'), // Button: "Tamam"
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await setConsentStatus(false); // Persist the declined state
              ConsentLogService.logConsentAction(LOG_EVENT_TYPES.CONSENT_DECLINED);
              Logger.info('User declined consent. Logging out.', {userId: user?.id});
              await logout(); // Perform logout from authService via authStore
              // onClose will be called, which in RoomEntryScreen calls checkInitialAuth,
              // leading to navigation to LoginScreen due to !isAuthenticated.
              onClose();
            } catch (error) {
                Logger.error('Error during consent decline process (set status or logout)', error, {userId: user?.id});
                Alert.alert(t('common.error'), t('common.error')); // Show generic error
            } finally {
                setIsLoading(false);
            }
          },
        },
      ],
      {cancelable: false},
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => {
         // For Android back button, prevent easy dismissal if all consents are required.
         // Or, treat as decline. For now, show alert.
         Alert.alert(t('common.oops'), t('consent.allConsentsRequired'));
      }}>
      <View style={styles.centeredView}>
        <View style={StyleSheet.flatten([tw('bg-card rounded-xl shadow-xl p-6'), styles.modalView])}>
          <Text style={tw('text-2xl font-bold text-primary mb-3 text-center')}>
            {t('consent.modalTitle')}
          </Text>
          <Text style={tw('text-sm text-text-secondary mb-5 text-center px-2')}>
            {t('consent.modalDescription')}
          </Text>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
            {CONSENT_ITEMS.map(item => (
              <View key={String(item.id)} style={tw('mb-4 p-3 border border-border rounded-lg bg-gray-50')}>
                <Checkbox
                  label={t(item.labelKey)}
                  checked={consents[item.id]}
                  onPress={() => handleConsentChange(item.id)}
                  labelStyle={tw('font-semibold text-base text-text')}
                  containerStyle={tw('mb-1')}
                  accessibilityLabel={t(item.labelKey)}
                  accessibilityHint={t(item.descriptionKey)}
                />
                <Text style={tw('text-xs text-text-secondary ml-8 pl-1')}>
                  {t(item.descriptionKey)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <Text style={tw('text-xs text-text-secondary mt-4 mb-2 text-center')}>
            {t('consent.legalReference')}
          </Text>
          {!allConsentsGiven && (
            <Text style={tw('text-xs text-destructive-DEFAULT mt-1 mb-3 text-center font-medium')}>
              {t('consent.allConsentsRequired')}
            </Text>
          )}

          <View style={tw('mt-2')}>
            <Button
                title={t('consent.agreeButton')} // "Kabul Et"
                onPress={handleAgree}
                disabled={!allConsentsGiven || isLoading}
                loading={isLoading && allConsentsGiven}
                type="primary"
                fullWidth
                style={tw('mb-3')}
                leftIcon="CheckCircle"
            />
            <Button
                title={t('consent.declineButton')} // "Reddet"
                onPress={handleDecline}
                disabled={isLoading}
                type="outline"
                fullWidth
                textStyle={tw('text-destructive-DEFAULT')}
                style={[tw('border-destructive-DEFAULT')]}
                leftIcon="XCircle"
                iconColor={Colors.destructive}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)', // Darker overlay for more focus
  },
  modalView: {
    width: Platform.OS === 'web' ? '60%' : '92%', // Adjusted width for better readability on web
    maxWidth: Platform.OS === 'web' ? 600 : 400,
    maxHeight: '90%', // Ensure modal fits on various screen heights
    overflow: 'hidden', // Ensure content respects rounded corners
    elevation: 5, // Android shadow
  },
  scrollView: {
    marginVertical: 10, // Space around the scrollable content
  },
  scrollViewContent: {
    paddingBottom: 10, // Padding at the bottom of scroll content
  }
});

export default ConsentModal;
