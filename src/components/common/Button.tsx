import React from 'react';
import {TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, ViewStyle, TextStyle, Platform} from 'react-native';
import {useTailwind} from 'tailwind-rn';
import Icon, { IconName } from './Icon'; // Corrected import
import { Colors } from '@constants/theme';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  type?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  leftIcon?: IconName;
  rightIcon?: IconName;
  iconColor?: string;
  accessibilityLabel?: string;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  type = 'primary',
  size = 'medium',
  leftIcon,
  rightIcon,
  iconColor: customIconColor,
  accessibilityLabel,
  fullWidth = false,
}) => {
  const tw = useTailwind();

  // Base styles
  const baseButtonStyles = `flex-row items-center justify-center rounded-lg shadow-sm`; // Added shadow-sm for soft shadow
  const fullWidthStyle = fullWidth ? 'w-full' : '';

  // Size specific styles
  let sizeButtonStyles = '';
  let sizeTextStyles = '';
  let iconSize: number = 18;

  switch (size) {
    case 'small':
      sizeButtonStyles = 'py-2 px-3';
      sizeTextStyles = 'text-sm';
      iconSize = 16;
      break;
    case 'large':
      sizeButtonStyles = 'py-3.5 px-6'; // Slightly larger padding for large buttons
      sizeTextStyles = 'text-lg';
      iconSize = 22;
      break;
    case 'medium':
    default:
      sizeButtonStyles = 'py-2.5 px-4'; // Adjusted padding for medium
      sizeTextStyles = 'text-base';
      iconSize = 20;
      break;
  }

  // Type specific styles
  let typeButtonTwStyles = '';
  let typeTextTwStyles = '';
  let defaultIconColor = Colors.textContrast; // Default for primary/destructive
  let activityIndicatorColor = Colors.white;


  switch (type) {
    case 'primary':
      typeButtonTwStyles = 'bg-primary-DEFAULT';
      typeTextTwStyles = 'text-text-contrast';
      activityIndicatorColor = Colors.white;
      defaultIconColor = Colors.white;
      break;
    case 'secondary':
      typeButtonTwStyles = 'bg-primary-light border border-primary-light'; // Lighter blue
      typeTextTwStyles = 'text-primary-dark';
      activityIndicatorColor = Colors.primaryDark;
      defaultIconColor = Colors.primaryDark;
      break;
    case 'destructive':
      typeButtonTwStyles = 'bg-destructive-DEFAULT';
      typeTextTwStyles = 'text-text-contrast';
      activityIndicatorColor = Colors.white;
      defaultIconColor = Colors.white;
      break;
    case 'outline':
      typeButtonTwStyles = 'border border-primary-DEFAULT bg-transparent';
      typeTextTwStyles = 'text-primary-DEFAULT';
      activityIndicatorColor = Colors.primary;
      defaultIconColor = Colors.primary;
      break;
    case 'ghost':
      typeButtonTwStyles = 'bg-transparent';
      typeTextTwStyles = 'text-primary-DEFAULT';
      activityIndicatorColor = Colors.primary;
      defaultIconColor = Colors.primary;
      break;
  }

  const finalIconColor = customIconColor || defaultIconColor;

  const finalButtonStyles = [
    tw(`${baseButtonStyles} ${sizeButtonStyles} ${typeButtonTwStyles} ${fullWidthStyle}`),
    (disabled || loading) ? tw('opacity-60') : {},
    style,
    // Applying soft shadow for Android using elevation, iOS uses shadow properties from Tailwind
    Platform.OS === 'android' ? styles.androidShadow : {},
  ];

  const finalTextStyles = [
    tw(`${sizeTextStyles} font-semibold ${typeTextTwStyles}`),
    leftIcon && title ? tw('ml-2') : {},
    rightIcon && title ? tw('mr-2') : {},
    textStyle,
  ];


  return (
    <TouchableOpacity
      style={StyleSheet.flatten(finalButtonStyles)}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{disabled: disabled || loading}}
    >
      {loading ? (
        <ActivityIndicator color={activityIndicatorColor} size={size === 'small' ? "small" : "large"} />
      ) : (
        <>
          {leftIcon && (
            <Icon name={leftIcon} size={iconSize} color={finalIconColor} style={title ? tw('mr-2') : {}} />
          )}
          {title && <Text style={StyleSheet.flatten(finalTextStyles)}>{title}</Text>}
          {rightIcon && (
            <Icon name={rightIcon} size={iconSize} color={finalIconColor} style={title ? tw('ml-2') : {}} />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  androidShadow: { // Basic elevation for Android shadow
    elevation: 2,
  },
});

export default Button;