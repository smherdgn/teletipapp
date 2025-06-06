import React from 'react';
import { ViewStyle } from 'react-native';
import { lucideIcons, Icon as LucideIconInternal, LucideProps } from 'lucide-react-native';
import { Colors } from '@constants/theme'; // Your theme colors

export type IconName = keyof typeof lucideIcons;

export interface IconProps extends Omit<LucideProps, 'name'> {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = Colors.text, // Default color from your theme
  style,
  ...props
}) => {
  const LucideIcon = lucideIcons[name] as LucideIconInternal;

  if (!LucideIcon) {
    // console.warn(`Icon "${name}" not found in lucide-react-native library.`);
    // Return a placeholder or null
    return null; // Or a default placeholder icon component
  }

  return <LucideIcon size={size} color={color} style={style} {...props} />;
};

export default Icon;
