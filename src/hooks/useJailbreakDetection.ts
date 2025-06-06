
import {useState, useEffect} from 'react';
import JailMonkey from 'jail-monkey';

interface JailbreakInfo {
  isJailBroken: boolean;
  canMockLocation: boolean;
  trustFall: boolean; // A more comprehensive check
  isOnExternalStorage?: boolean; // Android only
  adbEnabled?: boolean; // Android only, developer mode check
}

export const useJailbreakDetection = () => {
  const [jailbreakInfo, setJailbreakInfo] = useState<JailbreakInfo>({
    isJailBroken: false,
    canMockLocation: false,
    trustFall: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkDeviceStatus = async () => {
      setIsLoading(true);
      try {
        const info: JailbreakInfo = {
          isJailBroken: JailMonkey.isJailBroken(),
          canMockLocation: JailMonkey.canMockLocation(),
          trustFall: JailMonkey.trustFall(),
        };
        if (typeof JailMonkey.isOnExternalStorage === 'function') {
            info.isOnExternalStorage = JailMonkey.isOnExternalStorage();
        }
        if (typeof JailMonkey.AdbEnabled === 'function') {
             info.adbEnabled = JailMonkey.AdbEnabled();
        }
        setJailbreakInfo(info);
      } catch (error) {
        console.error("Error checking device status:", error);
        // Set to a default secure state or handle error appropriately
        setJailbreakInfo({
          isJailBroken: false, // Assume secure on error, or handle as compromised
          canMockLocation: false,
          trustFall: false,
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkDeviceStatus();
  }, []);

  return {jailbreakInfo, isLoading};
};
