
import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {RTCView, MediaStream} from 'react-native-webrtc';
import {useTailwind} from 'tailwind-rn';
import { useTranslation } from 'react-i18next';

interface RemoteStreamViewProps {
  stream: MediaStream | null;
  style?: any; // Allow custom styling
  isLoading?: boolean;
}

const RemoteStreamView: React.FC<RemoteStreamViewProps> = ({stream, style, isLoading}) => {
  const tw = useTailwind();
  const {t} = useTranslation();

  if (isLoading) {
    return (
      <View style={StyleSheet.flatten([tw('flex-1 justify-center items-center bg-gray-700'), style])}>
        <Text style={tw('text-white')}>{t('videoCall.connecting')}</Text>
      </View>
    );
  }

  if (!stream) {
    return (
      <View style={StyleSheet.flatten([tw('flex-1 justify-center items-center bg-gray-800'), style])}>
        <Text style={tw('text-white')}>{t('videoCall.waitingForVideo')}</Text>
      </View>
    );
  }

  return (
    <View style={StyleSheet.flatten([tw('bg-black'), style])}>
      <RTCView
        streamURL={stream.toURL()}
        style={tw('flex-1')}
        mirror={false}
        objectFit={'cover'}
        accessibilityLabel="Remote participant's video stream"
      />
    </View>
  );
};

export default RemoteStreamView;
