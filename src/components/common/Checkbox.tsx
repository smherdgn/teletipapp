// src/components/common/Checkbox.tsx
import React from 'react';
import {TouchableOpacity, View, Text, StyleSheet, ViewStyle, TextStyle, Platform} from 'react-native';
import {useTailwind} from 'tailwind-rn';
import Icon from './Icon'; // Assuming Icon component is in the same directory or correctly aliased
import {Colors} from '@constants/theme'; // Your theme colors

interface CheckboxProps {
  label?: string;
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
  containerStyle?: ViewStyle | ViewStyle[];
  checkboxStyle?: ViewStyle | ViewStyle[]; // Style for the checkbox itself
  labelStyle?: TextStyle | TextStyle[];
  checkboxSize?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onPress,
  disabled = false,
  containerStyle,
  checkboxStyle,
  labelStyle,
  checkboxSize = 22, // Adjusted for better touch target and visual balance
  accessibilityLabel,
  accessibilityHint,
}) => {
  const tw = useTailwind();

  const iconColor = disabled 
    ? Colors.textDisabled 
    : (checked ? Colors.white : Colors.textSecondary); // Checkmark color

  const boxBorderColor = disabled
    ? Colors.borderMedium
    : checked
    ? Colors.primaryDark // Border color when checked
    : Colors.borderMedium; // Border color when unchecked

  const boxBackgroundColor = disabled
    ? Colors.gray200 // Background when disabled
    : checked
    ? Colors.primary // Background when checked
    : Colors.card; // Background when unchecked (e.g. white)

  return (
    <TouchableOpacity
      style={StyleSheet.flatten([
        tw('flex-row items-center py-2 pr-2'), // Added pr-2 for spacing if label is long
        disabled ? tw('opacity-70') : {}, // Slightly more subtle opacity for disabled
        containerStyle,
      ])}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityState={{checked, disabled}}
      accessibilityLabel={accessibilityLabel || label || 'Checkbox'}
      accessibilityHint={accessibilityHint}
    >
      <View
        style={StyleSheet.flatten([
          styles.checkboxBase,
          {
            width: checkboxSize,
            height: checkboxSize,
            borderRadius: checkboxSize * 0.2, // Softer rounding
            borderColor: boxBorderColor,
            backgroundColor: boxBackgroundColor,
          },
          checkboxStyle,
        ])}
      >
        {checked && (
             <Icon 
                name="Check" 
                size={checkboxSize * 0.7} // Checkmark size relative to box
                color={iconColor}
                strokeWidth={3} // Make checkmark thicker
            />
        )}
      </View>
      {label && (
        <Text
          style={StyleSheet.flatten([
            tw('ml-3 text-base flex-shrink'), // flex-shrink to allow label to wrap if container is constrained
            disabled ? tw('text-text-disabled') : tw('text-text'),
            labelStyle,
          ])}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  checkboxBase: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Adding a subtle shadow for better visual depth, platform dependent
    ...Platform.select({
        ios: {
            shadowColor: Colors.black,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 1,
        },
        android: {
            elevation: 1,
        },
    }),
  },
});

export default Checkbox;