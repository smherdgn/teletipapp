
import React from 'react';
import {View, StyleSheet} from 'react-native';
import {RTCView, MediaStream} from 'react-native-webrtc';
import {useTailwind} from 'tailwind-rn';

interface LocalStreamViewProps {
  stream: MediaStream | null;
  style?: any; // Allow custom styling
}

const LocalStreamView: React.FC<LocalStreamViewProps> = ({stream, style}) => {
  const tw = useTailwind();

  if (!stream) {
    return null; // Or a placeholder
  }

  return (
    <View style={StyleSheet.flatten([tw('bg-black'), style])}>
      <RTCView
        streamURL={stream.toURL()}
        style={tw('flex-1')}
        mirror={true} // Local view is usually mirrored
        objectFit={'cover'}
        accessibilityLabel="Your local video stream"
      />
    </View>
  );
};

export default LocalStreamView;
