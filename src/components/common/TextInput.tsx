import React, {useState} from 'react';
import {TextInput as RNTextInput, View, Text, StyleSheet, TextInputProps as RNTextInputProps, ViewStyle, TextStyle, Platform, TouchableOpacity} from 'react-native';
import {useTailwind} from 'tailwind-rn';
import Icon, { IconName } from './Icon'; // Corrected import
import { Colors } from '@constants/theme';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string | boolean; // Can be a boolean for error state or string for message
  containerStyle?: ViewStyle | ViewStyle[];
  inputStyle?: TextStyle | TextStyle[]; // Style for the TextInput element itself
  inputWrapperStyle?: ViewStyle | ViewStyle[]; // Style for the view wrapping input and icons
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  rightIconColor?: string;
  leftIconColor?: string;
  'aria-label'?: string;
  disabled?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  inputWrapperStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  leftIconColor = Colors.textSecondary,
  rightIconColor = Colors.textSecondary,
  disabled = false,
  ...rest
}) => {
  const tw = useTailwind();
  const [isFocused, setIsFocused] = useState(false);

  const hasError = !!error;

  // Determine border color based on state
  let borderColorStyle = tw('border-border-DEFAULT'); // gray-300
  if (disabled) {
    borderColorStyle = tw('border-border-medium'); // gray-400
  } else if (hasError) {
    borderColorStyle = tw('border-destructive-DEFAULT'); // red-500
  } else if (isFocused) {
    borderColorStyle = tw('border-primary-DEFAULT'); // blue-500
  }
  
  const backgroundColorStyle = disabled ? tw('bg-gray-100') : tw('bg-card'); // bg-gray-100 or bg-white


  return (
    <View style={StyleSheet.flatten([tw('w-full'), containerStyle])}>
      {label && <Text style={tw('mb-1.5 text-sm font-medium text-text-secondary')}>{label}</Text>}
      <View
        style={StyleSheet.flatten([
          tw('flex-row items-center rounded-lg border px-3'),
          backgroundColorStyle,
          borderColorStyle,
          // Apply soft shadow when focused and not error, or always a very subtle one
          isFocused && !hasError && !disabled ? styles.focusedShadow : styles.defaultShadow,
          inputWrapperStyle,
        ])}
      >
        {leftIcon && (
          <Icon name={leftIcon} size={20} color={disabled? Colors.textDisabled : leftIconColor} style={tw('mr-2.5')} />
        )}
        <RNTextInput
          style={StyleSheet.flatten([
            tw('flex-1 py-2.5 text-base text-text-DEFAULT'), // Adjusted padding
            disabled ? tw('text-text-disabled') : {},
            Platform.OS === 'web' ? { outline: 'none' } : {}, // Remove outline for web
            inputStyle,
          ])}
          placeholderTextColor={Colors.textDisabled} // gray-400
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          editable={!disabled}
          {...rest}
          aria-label={rest['aria-label'] || label}
          aria-invalid={hasError}
          accessibilityHint={typeof error === 'string' ? error : undefined}
          accessibilityState={{ disabled }}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} disabled={!onRightIconPress || disabled}>
            <Icon name={rightIcon} size={20} color={disabled ? Colors.textDisabled : rightIconColor} style={tw('ml-2.5')} />
          </TouchableOpacity>
        )}
      </View>
      {typeof error === 'string' && error.length > 0 && (
          <Text style={tw('mt-1.5 text-xs text-destructive-DEFAULT')}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  defaultShadow: Platform.select({
    ios: {
      shadowColor: Colors.gray400,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
    },
    android: {
      elevation: 1,
    },
  }),
  focusedShadow: Platform.select({
    ios: {
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    android: {
      elevation: 3, // Slightly more pronounced shadow on focus
    },
  }),
});


export default TextInput;