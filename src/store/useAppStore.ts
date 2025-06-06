
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';

type Theme = 'light' | 'dark';
type Language = 'en' | 'tr'; // Supported languages

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  isHydrated: boolean; // To track if store has been rehydrated from AsyncStorage
  _setIsHydrated: (status: boolean) => void; // Internal action
}

const getInitialLanguage = (): Language => {
  const locales = RNLocalize.getLocales();
  if (locales && locales.length > 0) {
    const primaryLocale = locales[0].languageCode;
    if (primaryLocale === 'tr') {
      return 'tr';
    }
  }
  return 'en'; // Default language
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'light', // Default theme
      setTheme: theme => set({theme}),
      language: getInitialLanguage(), // Default language
      setLanguage: language => set({language}),
      isHydrated: false,
      _setIsHydrated: (status: boolean) => set({ isHydrated: status }),
    }),
    {
      name: 'app-storage', // Name of the item in AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Failed to rehydrate app store:', error);
          } else {
            if (state) {
               state._setIsHydrated(true);
            }
            console.log('App store rehydrated');
          }
        };
      },
    },
  ),
);

// Subscribe to hydration status (optional, for specific logic post-hydration)
// useAppStore.subscribe(
//   (isHydrated) => {
//     if (isHydrated) {
//       console.log('AppStore is now hydrated.');
//       // You can run logic here that depends on the store being loaded
//     }
//   },
//   (state) => state.isHydrated
// );
