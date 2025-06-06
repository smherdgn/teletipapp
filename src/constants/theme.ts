// These colors are supplementary to Tailwind config and can be used in JS logic if needed
// Or, they can be directly used by Tailwind if configured in tailwind.config.js

export const Colors = {
  primary: '#3B82F6', // blue-500 from Tailwind
  primaryLight: '#60A5FA', // blue-400
  primaryDark: '#2563EB',  // blue-600
  
  secondary: '#93C5FD', // blue-300
  secondaryDark: '#BFDBFE', // blue-200

  destructive: '#EF4444', // red-500
  destructiveDark: '#DC2626', // red-600

  success: '#22C55E', // green-500
  successDark: '#16A34A', // green-600

  warning: '#F97316', // orange-500
  warningDark: '#EA580C', // orange-600

  background: '#F3F4F6', // gray-100
  card: '#FFFFFF',

  text: '#1F2937',        // gray-800
  textSecondary: '#6B7280', // gray-500
  textDisabled: '#9CA3AF',  // gray-400
  textContrast: '#FFFFFF',  // For text on dark/colored backgrounds
  textPrimary: '#3B82F6',    // Text in primary color

  border: '#D1D5DB',      // gray-300
  borderMedium: '#9CA3AF', // gray-400

  // Grays (from Tailwind)
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  black: '#000000',
  white: '#FFFFFF',
  transparent: 'transparent',
};

export const Fonts = {
  // Define font families if you are using custom fonts
  // e.g., sans: 'Inter-Regular',
  // sansBold: 'Inter-Bold',
};

export const Spacing = {
  xxs: 2, // 2px
  xs: 4,  // 4px
  s: 8,   // 8px
  m: 12,  // 12px
  l: 16,  // 16px
  xl: 24, // 24px
  xxl: 32, // 32px
  xxxl: 48, // 48px
};

export const BorderRadius = {
  xs: 2, // 2px
  s: 4,  // 4px (rounded-sm)
  m: 6,  // 6px (rounded-md)
  l: 8,  // 8px (rounded-lg)
  xl: 12, // 12px (rounded-xl)
  '2xl': 16, // 16px (rounded-2xl)
  full: 9999, // (rounded-full)
};

const AppTheme = {
  colors: Colors,
  fonts: Fonts,
  spacing: Spacing,
  borderRadius: BorderRadius,
};

export default AppTheme;