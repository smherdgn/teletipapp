/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.js'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6', // blue-500
          light: '#60A5FA',  // blue-400
          dark: '#2563EB',   // blue-600
        },
        secondary: { // A lighter blue or neutral gray
          DEFAULT: '#93C5FD', // blue-300
          dark: '#BFDBFE',   // blue-200
        },
        destructive: {
          DEFAULT: '#EF4444', // red-500
          dark: '#DC2626',   // red-600
        },
        success: {
          DEFAULT: '#22C55E', // green-500
          dark: '#16A34A',   // green-600
        },
        warning: {
          DEFAULT: '#F97316', // orange-500
          dark: '#EA580C',   // orange-600
        },
        background: '#F3F4F6', // gray-100 (Light gray background)
        card: '#FFFFFF',       // White for card elements
        text: {
          DEFAULT: '#1F2937', // gray-800 (Dark gray for primary text)
          secondary: '#6B7280',// gray-500 (Medium gray for secondary text)
          disabled: '#9CA3AF', // gray-400
          contrast: '#FFFFFF', // White text for dark backgrounds
          primary: '#3B82F6',   // Text in primary color
        },
        border: {
          DEFAULT: '#D1D5DB', // gray-300 (Light gray for borders)
          medium: '#9CA3AF',  // gray-400
        },
        // Additional grays if needed directly in JS, Tailwind handles shades well
        // gray: {
        //   50: '#F9FAFB',
        //   100: '#F3F4F6',
        //   200: '#E5E7EB',
        //   300: '#D1D5DB',
        //   400: '#9CA3AF',
        //   500: '#6B7280',
        //   600: '#4B5563',
        //   700: '#374151',
        //   800: '#1F2937',
        //   900: '#111827',
        // },
      },
      borderRadius: {
        'sm': '0.25rem', // 4px
        'md': '0.375rem', // 6px
        'lg': '0.5rem',  // 8px
        'xl': '0.75rem', // 12px
        '2xl': '1rem',   // 16px
        'full': '9999px',
      },
      // Add custom spacing, fonts, or other theme extensions if needed
      // fontFamily: {
      //   sans: ['Inter', 'sans-serif'], // Example if using Inter font
      // },
    },
  },
  plugins: [],
  // tailwind-rn specific:
  corePlugins: require('tailwind-rn/unsupported-core-plugins'),
};