import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

import en from './locales/en.json';
import tr from './locales/tr.json';
import { useAppStore } from '@store/useAppStore'; // To get persisted language

const resources = {
  en: {
    translation: en,
  },
  tr: {
    translation: tr,
  },
};

const getInitialLanguage = () => {
  // 1. Try to get from persisted store first (if hydrated)
  const persistedLanguage = useAppStore.getState().language;
  if (persistedLanguage && useAppStore.getState().isHydrated) { // isHydrated might not be set yet during cold start
    return persistedLanguage;
  }

  // 2. Fallback to device locale
  const locales = RNLocalize.getLocales();
  if (locales && locales.length > 0) {
    const primaryLocale = locales[0].languageCode;
    if (primaryLocale === 'tr') {
      return 'tr';
    }
  }
  return 'en'; // Default language
};


export const initializeI18n = () => {
  const lng = getInitialLanguage();

  i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
      compatibilityJSON: 'v4', // For Android, updated from v3
      resources,
      lng, // Initial language
      fallbackLng: 'en', // Fallback language if current language translations are missing
      interpolation: {
        escapeValue: false, // react already safes from xss
      },
      react: {
        useSuspense: false, // Set to true if you want to use Suspense
      },
    });
};

// Listen to Zustand store language changes to update i18n
// This ensures that if the language is changed via app settings, i18n also updates.
useAppStore.subscribe(
  (newLanguage) => {
    if (i18n.language !== newLanguage) {
      i18n.changeLanguage(newLanguage);
    }
  },
  (state) => state.language
);


export default i18n;