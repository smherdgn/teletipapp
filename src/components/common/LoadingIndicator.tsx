
import React from 'react';
import {View, ActivityIndicator, StyleSheet, Text} from 'react-native';
import {useTailwind} from 'tailwind-rn';

interface LoadingIndicatorProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  fullscreen?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'large',
  color,
  text,
  fullscreen = false,
}) => {
  const tw = useTailwind();
  const indicatorColor = color || (tw('text-primary').color as string);

  const containerStyle = fullscreen 
    ? tw('flex-1 justify-center items-center bg-background bg-opacity-50') 
    : tw('justify-center items-center p-4');

  return (
    <View style={StyleSheet.flatten([containerStyle])} accessibilityLiveRegion="polite">
      <ActivityIndicator size={size} color={indicatorColor} />
      {text && <Text style={tw('mt-2 text-sm text-gray-600')}>{text}</Text>}
    </View>
  );
};

export default LoadingIndicator;
