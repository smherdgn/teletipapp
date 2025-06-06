
import React from 'react';
import {TextInput, View, Text, StyleSheet, TextInputProps, ViewStyle} from 'react-native';
import {useTailwind} from 'tailwind-rn';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle | ViewStyle[];
  inputStyle?: ViewStyle | ViewStyle[];
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  'aria-label'?: string; // For accessibility
}

const CommonInput: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  leftIcon,
  rightIcon,
  ...rest
}) => {
  const tw = useTailwind();

  return (
    <View style={StyleSheet.flatten([tw('w-full'), containerStyle])}>
      {label && <Text style={tw('mb-1 text-sm font-medium text-gray-700')}>{label}</Text>}
      <View 
        style={StyleSheet.flatten([
          tw('flex-row items-center bg-white border border-gray-300 rounded-lg'),
          error ? tw('border-red-500') : {},
          inputStyle // This could be problematic if inputStyle has padding/margin, better to use specific props
        ])}
      >
        {leftIcon && <View style={tw('pl-3 pr-2')}>{leftIcon}</View>}
        <TextInput
          style={StyleSheet.flatten([
            tw('flex-1 p-3 text-base text-text'),
            // Ensure no conflicting styles from inputStyle prop here, or handle merging carefully
          ])}
          placeholderTextColor={tw('text-gray-400').color as string}
          {...rest}
          aria-label={rest['aria-label'] || label} // Ensure aria-label is passed
          aria-invalid={!!error}
          accessibilityHint={error}
        />
        {rightIcon && <View style={tw('pr-3 pl-2')}>{rightIcon}</View>}
      </View>
      {error && <Text style={tw('mt-1 text-xs text-red-500')}>{error}</Text>}
    </View>
  );
};

export default CommonInput;
