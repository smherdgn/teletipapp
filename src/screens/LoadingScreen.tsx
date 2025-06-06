import React from 'react';
import {View, ActivityIndicator, Text, StyleSheet} from 'react-native';
import {useTailwind} from 'tailwind-rn';
import { useTranslation } from 'react-i18next';
import { LoadingScreenProps } from '@navigation/types'; // If you need props
import { Colors } from '@constants/theme';

const LoadingScreen: React.FC<LoadingScreenProps> = () => {
  const tw = useTailwind();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={[tw('mt-4 text-lg font-medium'), styles.text]}>
        {t('loading.default')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background, // Use theme background
    },
    text: {
        color: Colors.textSecondary, // Use theme text color
    }
})

export default LoadingScreen;