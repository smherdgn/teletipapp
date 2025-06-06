
import React, { useState } from 'react';
import {View, Text, Switch, TouchableOpacity, ScrollView, Alert} from 'react-native';
import {useTailwind} from 'tailwind-rn';
import {SettingsScreenProps} from '@navigation/types';
import {useAppStore} from '@store/useAppStore';
import { useAuthStore } from '@store/useAuthStore';
import { useTranslation } from 'react-i18next';
import i18n from '@i18n/index'; // Direct import for language change

const SettingsScreen: React.FC<SettingsScreenProps> = ({navigation}) => {
  const tw = useTailwind();
  const {t} = useTranslation();
  const {theme, setTheme, language, setLanguage: setAppLanguage} = useAppStore();
  const {logout} = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true); // Example state

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  const handleLanguageChange = (lang: 'en' | 'tr') => {
    i18n.changeLanguage(lang); // Change i18next language
    setAppLanguage(lang); // Update Zustand store
  };

  const handleLogout = async () => {
    await logout();
    // AppNavigator will handle redirection to LoginScreen
  };


  return (
    <ScrollView style={tw('flex-1 bg-background')}>
      <View style={tw('p-6')}>
        <Text style={tw('text-2xl font-bold text-text mb-6')}>{t('settings.title')}</Text>

        {/* Theme Settings */}
        <SettingSection title={t('settings.theme.title')}>
          <View style={tw('flex-row justify-around')}>
            <TouchableOpacity onPress={() => handleThemeChange('light')} style={tw(`p-3 border rounded-md ${theme === 'light' ? 'bg-primary border-primary' : 'border-gray-300'}`)}>
              <Text style={tw(`${theme === 'light' ? 'text-white' : 'text-text'}`)}>{t('settings.theme.light')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleThemeChange('dark')} style={tw(`p-3 border rounded-md ${theme === 'dark' ? 'bg-primary border-primary' : 'border-gray-300'}`)}>
              <Text style={tw(`${theme === 'dark' ? 'text-white' : 'text-text'}`)}>{t('settings.theme.dark')}</Text>
            </TouchableOpacity>
          </View>
        </SettingSection>

        {/* Language Settings */}
        <SettingSection title={t('settings.language.title')}>
         <View style={tw('flex-row justify-around')}>
            <TouchableOpacity onPress={() => handleLanguageChange('en')} style={tw(`p-3 border rounded-md ${language === 'en' ? 'bg-primary border-primary' : 'border-gray-300'}`)}>
              <Text style={tw(`${language === 'en' ? 'text-white' : 'text-text'}`)}>{t('settings.language.english')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleLanguageChange('tr')} style={tw(`p-3 border rounded-md ${language === 'tr' ? 'bg-primary border-primary' : 'border-gray-300'}`)}>
              <Text style={tw(`${language === 'tr' ? 'text-white' : 'text-text'}`)}>{t('settings.language.turkish')}</Text>
            </TouchableOpacity>
          </View>
        </SettingSection>

        {/* Notification Settings */}
        <SettingSection title={t('settings.notifications.title')}>
          <SettingRow label={t('settings.notifications.enable')}>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{false: '#767577', true: tw('text-primary-light').color as string || '#81b0ff'}}
              thumbColor={notificationsEnabled ? tw('text-primary').color as string : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
            />
          </SettingRow>
        </SettingSection>
        
        {/* Account Settings */}
        <SettingSection title={t('settings.account.title')}>
            <SettingLink label={t('settings.account.editProfile')} onPress={() => navigation.navigate('Profile', {})} />
            <SettingLink label={t('settings.account.changePassword')} onPress={() => Alert.alert(t('settings.account.changePassword'), t('common.featureComingSoon'))} />
        </SettingSection>

        {/* About Section */}
        <SettingSection title={t('settings.about.title')}>
            <SettingLink label={t('settings.about.privacyPolicy')} onPress={() => Alert.alert(t('settings.about.privacyPolicy'), t('common.featureComingSoon'))} />
            <SettingLink label={t('settings.about.termsOfService')} onPress={() => Alert.alert(t('settings.about.termsOfService'), t('common.featureComingSoon'))} />
            <View style={tw('mt-2')}>
                <Text style={tw('text-sm text-gray-500')}>{t('settings.about.version', {version: '1.0.0'})}</Text>
            </View>
        </SettingSection>


        <TouchableOpacity 
            onPress={handleLogout} 
            style={tw('mt-8 bg-red-500 p-4 rounded-lg items-center')}
            accessibilityRole="button"
            accessibilityLabel={t('settings.logoutButton')}
        >
          <Text style={tw('text-white font-semibold text-base')}>{t('settings.logoutButton')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const SettingSection: React.FC<{title: string, children: React.ReactNode}> = ({title, children}) => {
  const tw = useTailwind();
  return (
    <View style={tw('mb-6')}>
      <Text style={tw('text-lg font-semibold text-text mb-3')}>{title}</Text>
      {children}
    </View>
  );
};

const SettingRow: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => {
  const tw = useTailwind();
  return (
    <View style={tw('flex-row justify-between items-center py-3 border-b border-gray-200')}>
      <Text style={tw('text-base text-text')}>{label}</Text>
      {children}
    </View>
  );
};

const SettingLink: React.FC<{label: string, onPress: () => void}> = ({label, onPress}) => {
    const tw = useTailwind();
    return (
        <TouchableOpacity onPress={onPress} style={tw('py-3 border-b border-gray-200')}>
            <Text style={tw('text-base text-primary')}>{label}</Text>
        </TouchableOpacity>
    )
}

export default SettingsScreen;
