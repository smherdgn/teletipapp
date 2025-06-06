// src/services/consentLogService.ts
import Logger from '@utils/logger';
import { useAuthStore } from '@store/useAuthStore'; // To get user ID if needed for context
import { ConsentDetails } from '@customtypes/index';
import { LOG_EVENT_TYPES } from '@constants/index';
import { Platform } from 'react-native';
import i18n from '@i18n/index';


export const ConsentLogService = {
  logConsentAction: (
    actionType: typeof LOG_EVENT_TYPES.CONSENT_GIVEN | typeof LOG_EVENT_TYPES.CONSENT_DECLINED | typeof LOG_EVENT_TYPES.CONSENT_VIEWED,
    consents?: ConsentDetails, // Only relevant if action is GIVEN
  ): void => {
    const timestamp = Date.now();
    const user = useAuthStore.getState().user;
    // The user ID will be automatically masked by the Logger's sanitizeObject method if present in details
    const userId = user?.id; 

    const logDetails: any = {
      userId: userId, // Logger will mask this
      action: actionType, // Using predefined event types
      timestamp: new Date(timestamp).toISOString(),
      locale: i18n.language,
      platform: Platform.OS, // Example of adding more context
    };

    if (actionType === LOG_EVENT_TYPES.CONSENT_GIVEN && consents) {
      logDetails.consentsGiven = consents; // These are booleans, generally not PII themselves
    }
    
    // Using the specific logAuditEvent method from Logger for structured audit logging
    Logger.logAuditEvent(actionType, logDetails);
  },
};

// Re-export ConsentDetails if it's primarily used through this service externally
export type { ConsentDetails };