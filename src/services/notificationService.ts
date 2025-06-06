
import notifee, { EventType, AndroidImportance, Notification, TriggerType, TimestampTrigger, TriggerNotification, Channel, IOSNotificationCategory, IOSNotificationSettings, AndroidNotificationSetting } from '@notifee/react-native';
import { Platform } from 'react-native';
import Logger from '@utils/logger';
import i18n from '@i18n/index'; // Import i18n instance
// import { useNavigation } from '@react-navigation/native'; // If you need navigation from background handler

// Default channel for general notifications
const DEFAULT_CHANNEL_ID = 'default_channel';
const DEFAULT_CHANNEL_NAME = 'General Notifications';

// Channel for incoming calls
const INCOMING_CALL_CHANNEL_ID = 'incoming_call_channel';
const INCOMING_CALL_CHANNEL_NAME = 'Incoming Calls';

// Channel for appointments
const APPOINTMENT_CHANNEL_ID = 'appointment_channel';
const APPOINTMENT_CHANNEL_NAME = 'Appointments';


export interface ScheduledNotificationDetails {
    title: string;
    body: string;
    triggerTime: Date;
    notificationId?: string; // Optional: if you want to specify an ID for replacement
    data?: Record<string, any>;
    channelId?: string; // Android specific channel
    importance?: AndroidImportance; // Android specific importance
    sound?: string; // General sound for Android, or fallback for iOS
    ios?: {
        categoryId?: string; // For iOS custom actions
        badgeCount?: number;
        critical?: boolean;
        criticalSound?: { name: string; volume: number };
        sound?: string; // iOS specific sound
    };
}

export const NotificationService = {
  initialize: async () => {
    await NotificationService.requestPermissions();
    await NotificationService.createDefaultChannels();

    notifee.onBackgroundEvent(async ({ type, detail }) => {
      const { notification } = detail;
      Logger.debug('[NotificationService] Background Event:', { type: EventType[type], detail });

      if (type === EventType.PRESS && notification?.id) {
        Logger.info('[NotificationService] Notification pressed in background:', { notification });
        if (notification.data?.screen) {
           Logger.info('Navigate to (background):', { screen: notification.data.screen, params: notification.data.params });
        }
        await notifee.cancelNotification(notification.id);
      }

      if (type === EventType.ACTION_PRESS && notification?.id && detail.pressAction) {
        Logger.info('[NotificationService] Action pressed in background:', { actionId: detail.pressAction.id, notification });
        if (detail.pressAction.id === 'accept_call') {
            Logger.info('Call accepted via notification action (background)');
        } else if (detail.pressAction.id === 'decline_call') {
            Logger.info('Call declined via notification action (background)');
        }
        await notifee.cancelNotification(notification.id);
      }
    });

    notifee.onForegroundEvent(({ type, detail }) => {
      const { notification } = detail;
      Logger.debug('[NotificationService] Foreground Event:', { type: EventType[type], detail });
      
      switch (type) {
        case EventType.DISMISSED:
          Logger.info('[NotificationService] User dismissed notification', { notification });
          break;
        case EventType.PRESS:
          Logger.info('[NotificationService] User pressed notification', { notification });
          if (notification?.data?.screen) {
            Logger.info('Navigate to (foreground):', { screen: notification.data.screen, params: notification.data.params });
          }
          if(notification?.id) notifee.cancelNotification(notification.id);
          break;
        case EventType.ACTION_PRESS:
           if (detail.pressAction) {
             Logger.info('[NotificationService] Action pressed in foreground:', { actionId: detail.pressAction.id, notification });
             if (detail.pressAction.id === 'accept_call') {
                  Logger.info('Call accepted via foreground notification action');
              } else if (detail.pressAction.id === 'decline_call') {
                  Logger.info('Call declined via foreground notification action');
              }
             if(notification?.id) notifee.cancelNotification(notification.id);
           }
           break;
      }
    });
    Logger.info('NotificationService initialized.');
  },

  requestPermissions: async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      const settings: IOSNotificationSettings = await notifee.requestPermission();
      Logger.info('iOS Notification permission status:', {settings});
      return settings.authorizationStatus >= 1; // AUTHORIZED or PROVISIONAL
    } else { // Android
      // For Android 13+ (API 33), POST_NOTIFICATIONS permission is needed.
      // Notifee doesn't automatically prompt for this; apps must request it.
      // However, `notifee.requestPermission()` on Android is a wrapper that returns current status
      // and doesn't prompt like on iOS. We typically rely on users granting it from system settings
      // or prompt using PermissionsAndroid if targeting API 33+.
      // For simplicity, assuming Notifee functions if permissions are already granted.
      const settings = await notifee.getNotificationSettings();
      if (settings.android.alarm === AndroidNotificationSetting.ENABLED) {
         Logger.info('Android Notification permissions seem enabled (alarm permission).');
         return true;
      } else {
         Logger.warn('Android Notification permissions (specifically for alarms/scheduled) might not be fully enabled. User may need to grant manually for API 31+ exact alarms.');
         // For Android 13+ POST_NOTIFICATIONS, this check doesn't cover it.
         // A more robust check would involve PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS for API 33+
         return false; // Or true, depending on how strictly we want to enforce this.
      }
    }
  },

  createDefaultChannels: async () => {
    if (Platform.OS === 'android') {
      const channelsToCreate: Channel[] = [
        { id: DEFAULT_CHANNEL_ID, name: DEFAULT_CHANNEL_NAME, importance: AndroidImportance.DEFAULT },
        {
          id: INCOMING_CALL_CHANNEL_ID, name: INCOMING_CALL_CHANNEL_NAME,
          importance: AndroidImportance.HIGH, sound: 'default', vibration: true, vibrationPattern: [300, 500]
        },
        { id: APPOINTMENT_CHANNEL_ID, name: APPOINTMENT_CHANNEL_NAME, importance: AndroidImportance.HIGH, sound: 'default' }
      ];

      for (const channel of channelsToCreate) {
        const channelExists = await notifee.getChannel(channel.id);
        if (!channelExists) {
          await notifee.createChannel(channel);
          Logger.info(`[NotificationService] Channel created: ${channel.name}`);
        }
      }
    }
  },

  displayNotification: async (title: string, body: string, data?: Record<string, any>, channelId?: string): Promise<string | undefined> => {
    try {
      const androidChannelIdToUse = channelId || (data?.type === 'INCOMING_CALL' ? INCOMING_CALL_CHANNEL_ID : DEFAULT_CHANNEL_ID);
      const notificationId = await notifee.displayNotification({
        id: data?.notificationId || undefined,
        title,
        body,
        data,
        android: {
          channelId: androidChannelIdToUse,
          // smallIcon: 'ic_launcher', // Ensure 'ic_launcher' exists in android/app/src/main/res/mipmap-*
          pressAction: { id: 'default' },
          importance: androidChannelIdToUse === INCOMING_CALL_CHANNEL_ID || androidChannelIdToUse === APPOINTMENT_CHANNEL_ID ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
          actions: data?.actions,
        },
        ios: {
          sound: data?.iosSound || data?.sound || 'default', // Prioritize specific iOS sound from data, then general sound, then default
          badgeCount: data?.badgeCount,
          categoryId: data?.categoryId,
        },
      });
      Logger.info('[NotificationService] Notification displayed:', { notificationId, title });
      return notificationId;
    } catch (error) {
      Logger.error('[NotificationService] Error displaying notification:', error, {title});
    }
    return undefined;
  },

  scheduleNotification: async (details: ScheduledNotificationDetails): Promise<string | undefined> => {
    const { title, body, triggerTime, notificationId, data, channelId, importance, sound, ios } = details;

    const triggerTimestamp = triggerTime.getTime();
    if (triggerTimestamp <= Date.now()) {
        Logger.warn('[NotificationService] Scheduled notification time is in the past, not scheduling.', { title, triggerTime });
        return undefined;
    }

    Logger.info(`[NotificationService] Scheduling notification "${title}" at ${triggerTime.toISOString()}`);
    try {
        const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: triggerTimestamp,
            // Optional: alarmManager for more precise delivery on Android API 31+ (requires SCHEDULE_EXACT_ALARM permission)
            // alarmManager: { allowWhileIdle: true }
        };

        const notifId = await notifee.createTriggerNotification(
            {
                id: notificationId,
                title,
                body,
                data,
                android: {
                    channelId: channelId || DEFAULT_CHANNEL_ID,
                    importance: importance || AndroidImportance.DEFAULT,
                    sound: sound, // if undefined, uses channel sound
                },
                ios: {
                    sound: ios?.sound || sound || 'default', // Use specific iOS sound from details.ios, then general sound, then default
                    categoryId: ios?.categoryId,
                    badgeCount: ios?.badgeCount,
                    critical: ios?.critical,
                    criticalSound: ios?.criticalSound,
                },
            },
            trigger,
        );
        Logger.info('[NotificationService] Notification scheduled:', { notificationId: notifId, title });
        return notifId;
    } catch (error) {
        Logger.error('[NotificationService] Error scheduling notification:', error, { title });
    }
    return undefined;
  },

  displayAppointmentNotification: async (type: 'started' | 'completed' | 'reminder', appointmentDetails: { appointmentId: string, participantName: string, time?: Date, userRole: 'doctor' | 'patient'}): Promise<string | undefined> => {
    let titleKey: string;
    let bodyKey: string;
    const { participantName, appointmentId, time, userRole } = appointmentDetails;
    const i18nParams = { participantName, appointmentId: appointmentId.substring(0,8), time };

    switch (type) {
        case 'started':
            titleKey = userRole === 'doctor' ? 'notifications.appointment.started.doctor_title' : 'notifications.appointment.started.patient_title';
            bodyKey = 'notifications.appointment.started.body';
            break;
        case 'completed':
            titleKey = userRole === 'doctor' ? 'notifications.appointment.completed.doctor_title' : 'notifications.appointment.completed.patient_title';
            bodyKey = 'notifications.appointment.completed.body';
            break;
        case 'reminder':
            if (!time) {
                Logger.warn('[NotificationService] Reminder notification cannot be set without time.');
                return undefined;
            }
            titleKey = userRole === 'doctor' ? 'notifications.appointment.reminder.doctor_title' : 'notifications.appointment.reminder.patient_title';
            bodyKey = 'notifications.appointment.reminder.body';
            break;
        default:
            Logger.warn('[NotificationService] Unknown appointment notification type.');
            return undefined;
    }

    const title = i18n.t(titleKey, i18nParams);
    const body = i18n.t(bodyKey, i18nParams);

    Logger.info(`[NotificationService] Displaying appointment notification: ${type}`);
    return NotificationService.displayNotification(
        title,
        body,
        { type: `APPOINTMENT_${type.toUpperCase()}`, appointmentId, screen: 'AppointmentDetails', params: { appointmentId } },
        APPOINTMENT_CHANNEL_ID
    );
  },

  scheduleAppointmentReminder: async (appointmentId: string, appointmentTime: Date, participantName: string, userRole: 'doctor' | 'patient'): Promise<string | undefined> => {
    const reminderTime = new Date(appointmentTime.getTime() - 5 * 60 * 1000); // 5 minutes before

    if (reminderTime.getTime() <= Date.now()) {
      Logger.info('[NotificationService] Reminder time is in the past, not scheduling.', { reminderTime });
      return undefined;
    }

    const i18nParams = { participantName, appointmentId };
    const title = i18n.t(userRole === 'doctor' ? 'notifications.appointment.reminder.doctor_title' : 'notifications.appointment.reminder.patient_title', i18nParams);
    const body = i18n.t('notifications.appointment.reminder.body', i18nParams);
    
    Logger.info(`[NotificationService] Scheduling reminder for appointment ${appointmentId} at ${reminderTime.toISOString()}`);

    return NotificationService.scheduleNotification({
        title,
        body,
        triggerTime: reminderTime,
        data: { type: 'APPOINTMENT_REMINDER', appointmentId, screen: 'AppointmentDetails', params: { appointmentId } },
        channelId: APPOINTMENT_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        ios: { categoryId: 'appointment_reminder' } // Ensure this category is defined in iOS native code if actions are needed
    });
  },

  displayIncomingCallNotification: async (callerName: string, callId: string, roomId: string): Promise<string | undefined> => {
    try {
        const title = i18n.t('notifications.incomingCall.title', { callerName });
        const body = i18n.t('notifications.incomingCall.body');

        const notificationId = await notifee.displayNotification({
            title,
            body,
            data: { callId, roomId, type: 'INCOMING_CALL', screen: 'Call', params: { roomId } }, // Ensure params are correct for CallScreen
            android: {
                channelId: INCOMING_CALL_CHANNEL_ID,
                importance: AndroidImportance.HIGH,
                pressAction: { id: 'default', launchActivity: 'default' },
                actions: [
                    { title: i18n.t('common.accept') || 'Accept', pressAction: { id: 'accept_call' } }, // Add translation for accept/decline
                    { title: i18n.t('common.decline') || 'Decline', pressAction: { id: 'decline_call' }, destructive: true },
                ],
                 // fullScreenAction: { id: 'default', launchActivity: 'default' } // Requires FOREGROUND_SERVICE permission for full effectiveness on some Android versions
            },
            ios: {
                sound: 'default',
                categoryId: 'incoming_call_category', // Define this category with actions in AppDelegate.ts/swift
                // critical: true, // Requires entitlement
                // criticalSound: {name: 'default', volume: 1.0},
            }
        });
        Logger.info('[NotificationService] Incoming call notification displayed:', {notificationId, callId});
        return notificationId;
    } catch (error) {
        Logger.error('[NotificationService] Error displaying incoming call notification:', error, {callId});
    }
    return undefined;
  },

  cancelNotification: async (notificationId: string): Promise<void> => {
    await notifee.cancelNotification(notificationId);
    Logger.info('[NotificationService] Notification cancelled:', {notificationId});
  },

  cancelAllNotifications: async (channelId?: string): Promise<void> => {
    if (channelId) {
        Logger.warn(`[NotificationService] cancelAllNotifications by channelId is not directly supported by Notifee. Cancelling all notifications instead or implement custom logic.`);
        // To cancel by channel, you'd get all trigger notifications and filter by channelId before cancelling.
        // const notifications = await notifee.getTriggerNotifications();
        // const channelNotifications = notifications.filter(n => n.notification.android?.channelId === channelId);
        // for (const n of channelNotifications) {
        //    if (n.notification.id) await notifee.cancelNotification(n.notification.id);
        // }
        await notifee.cancelAllNotifications(); // Fallback to all for simplicity
    } else {
        await notifee.cancelAllNotifications();
    }
    Logger.info('[NotificationService] All notifications cancelled.', {channelIdProvided: channelId});
  },

  getScheduledNotifications: async (): Promise<TriggerNotification[]> => {
    const notifications = await notifee.getTriggerNotifications();
    Logger.info(`[NotificationService] Fetched ${notifications.length} scheduled notifications.`);
    return notifications;
  },
};
