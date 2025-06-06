import {Platform, PermissionsAndroid, Permission, Rationale} from 'react-native';

type PermissionType = 'camera' | 'microphone' | 'storageRead' | 'storageWrite' | 'location' | 'biometrics'; // Add more as needed

const getAndroidPermission = (type: PermissionType): Permission | null => {
  switch (type) {
    case 'camera':
      return PermissionsAndroid.PERMISSIONS.CAMERA;
    case 'microphone':
      return PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    case 'storageRead':
      // For Android 13+ (API 33), use READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, or READ_MEDIA_AUDIO
      // For older versions, use READ_EXTERNAL_STORAGE
      if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        return PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES; // Or specific media type
      }
      return PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    case 'storageWrite':
      // WRITE_EXTERNAL_STORAGE is largely restricted/deprecated on newer Android versions.
      // Consider Scoped Storage or MediaStore API.
      // This permission is mainly for < Android 10 (API 29).
      if (Platform.OS === 'android' && Number(Platform.Version) < 29) {
         return PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
      }
      return null; // No direct equivalent for general write post Android 10 for non-media files without special access.
    case 'location':
      return PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION; // Or ACCESS_COARSE_LOCATION
    // Biometrics permission is typically handled by react-native-biometrics library itself
    // No direct PermissionsAndroid constant for it.
    default:
      return null;
  }
};

const getPermissionRationale = (type: PermissionType): Rationale => {
  switch (type) {
    case 'camera':
      return {
        title: 'Camera Permission Needed',
        message: 'This app needs access to your camera for video calls and taking photos.',
        buttonPositive: 'OK',
        buttonNegative: 'Cancel',
      };
    case 'microphone':
      return {
        title: 'Microphone Permission Needed',
        message: 'This app needs access to your microphone for voice and video calls.',
        buttonPositive: 'OK',
        buttonNegative: 'Cancel',
      };
    case 'storageRead':
      return {
        title: 'Storage Read Permission Needed',
        message: 'This app needs to read files from your storage for sharing documents or media.',
        buttonPositive: 'OK',
        buttonNegative: 'Cancel',
      };
    case 'storageWrite':
       return {
        title: 'Storage Write Permission Needed',
        message: 'This app needs to write files to your storage for saving documents or media (Required for older Android versions).',
        buttonPositive: 'OK',
        buttonNegative: 'Cancel',
      };
    case 'location':
        return {
        title: 'Location Permission Needed',
        message: 'This app needs access to your location for XYZ feature.', // Be specific
        buttonPositive: 'OK',
        buttonNegative: 'Cancel',
        };
    default:
      return {
        title: 'Permission Needed',
        message: 'This app needs certain permissions to function correctly.',
        buttonPositive: 'OK',
        buttonNegative: 'Cancel',
      };
  }
};


export const PermissionUtils = {
  checkPermission: async (type: PermissionType): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const androidPermission = getAndroidPermission(type);
      if (!androidPermission) return true; // No specific permission or handled by library
      try {
        const granted = await PermissionsAndroid.check(androidPermission);
        return granted;
      } catch (err) {
        console.warn(`Error checking ${type} permission:`, err);
        return false;
      }
    } else if (Platform.OS === 'ios') {
      // iOS permissions are typically checked implicitly when the feature is used,
      // or by specific library functions (e.g., react-native-camera, react-native-permissions).
      // For this generic util, we can't cover all iOS cases without a dedicated permission library.
      // `react-native-permissions` is recommended for comprehensive iOS/Android permission handling.
      console.warn(`iOS ${type} permission check needs a specific library like react-native-permissions.`);
      return true; // Placeholder: assume granted or handled by feature usage
    }
    return true; // Default for other platforms or if no specific check
  },

  requestPermission: async (type: PermissionType): Promise<'granted' | 'denied' | 'never_ask_again'> => {
    if (Platform.OS === 'android') {
      const androidPermission = getAndroidPermission(type);
      if (!androidPermission) return 'granted'; // No specific permission or handled by library

      try {
        // First check if already granted
        const alreadyGranted = await PermissionsAndroid.check(androidPermission);
        if (alreadyGranted) {
          return 'granted';
        }
        // If not granted, request it
        const rationale = getPermissionRationale(type);
        const status = await PermissionsAndroid.request(androidPermission, rationale);
        if (status === PermissionsAndroid.RESULTS.GRANTED) {
          return 'granted';
        } else if (status === PermissionsAndroid.RESULTS.DENIED) {
          return 'denied';
        } else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          return 'never_ask_again';
        }
      } catch (err) {
        console.warn(`Error requesting ${type} permission:`, err);
        return 'denied'; // Assume denied on error
      }
    } else if (Platform.OS === 'ios') {
      // As above, iOS permission requests are better handled by `react-native-permissions` or feature-specific libraries.
      console.warn(`iOS ${type} permission request needs a specific library like react-native-permissions.`);
      // Example (conceptual, requires react-native-permissions):
      // import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
      // const iosPermission = type === 'camera' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.IOS.MICROPHONE;
      // const result = await request(iosPermission);
      // if (result === RESULTS.GRANTED) return 'granted';
      // if (result === RESULTS.BLOCKED) return 'never_ask_again';
      // return 'denied';
      return 'granted'; // Placeholder
    }
    return 'granted'; // Default for other platforms
  },

  // Request multiple permissions
  requestMultiplePermissions: async (types: PermissionType[]): Promise<Record<PermissionType, 'granted' | 'denied' | 'never_ask_again'>> => {
    const results: Record<PermissionType, 'granted' | 'denied' | 'never_ask_again'> = {} as any;
    if (Platform.OS === 'android') {
        const androidPermissionsToRequest: Permission[] = types
            .map(type => getAndroidPermission(type))
            .filter(p => p !== null) as Permission[];

        if (androidPermissionsToRequest.length > 0) {
            const statuses = await PermissionsAndroid.requestMultiple(androidPermissionsToRequest);
            types.forEach(type => {
                const androidPerm = getAndroidPermission(type);
                if (androidPerm && statuses[androidPerm]) {
                    const status = statuses[androidPerm];
                    if (status === PermissionsAndroid.RESULTS.GRANTED) {
                        results[type] = 'granted';
                    } else if (status === PermissionsAndroid.RESULTS.DENIED) {
                        results[type] = 'denied';
                    } else {
                        results[type] = 'never_ask_again';
                    }
                } else if (!androidPerm) { // Handled by library or no specific perm
                    results[type] = 'granted';
                }
            });
            return results;
        }
    }
    // For iOS or if no Android permissions to request, resolve individually (or use react-native-permissions)
    for (const type of types) {
        results[type] = await PermissionUtils.requestPermission(type);
    }
    return results;
  },
};