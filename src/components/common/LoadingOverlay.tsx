import React from 'react';
import {View, ActivityIndicator, Text, StyleSheet, Modal} from 'react-native';
import {useTailwind} from 'tailwind-rn';
import { Colors } from '@constants/theme';

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({visible, text}) => {
  const tw = useTailwind();

  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent={true}
      animationType="none"
      visible={visible}
      onRequestClose={() => { /* Android back button, do nothing or handle */ }}
    >
      <View style={styles.modalBackground}>
        <View style={[tw('p-6 rounded-lg items-center'), styles.activityIndicatorWrapper]}>
          <ActivityIndicator size="large" color={Colors.primary} />
          {text && (
            <Text style={tw('mt-4 text-base text-text-DEFAULT font-medium')}>
              {text}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Dimmed background
  },
  activityIndicatorWrapper: {
    backgroundColor: Colors.card, // White card background
    // height: 120, // Fixed height
    // width: 120, // Fixed width
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    minWidth: 150, // Ensure it's not too small if text is short
  },
});

export default LoadingOverlay;