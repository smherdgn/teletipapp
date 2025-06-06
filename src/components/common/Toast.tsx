import React, {useEffect, useState, forwardRef, useImperativeHandle} from 'react';
import {View, Text, StyleSheet, Animated, SafeAreaView, Platform} from 'react-native';
import {useTailwind} from 'tailwind-rn';
import Icon, { IconName } from './Icon'; // Corrected import
import { Colors } from '@constants/theme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number; // milliseconds
  visible: boolean;
  onDismiss: () => void;
  position?: 'top' | 'bottom';
}

export interface ToastRef {
  show: (message: string, type?: ToastType, duration?: number) => void;
  hide: () => void;
}

const Toast: React.FC<ToastProps> = ({
    message,
    type = 'info',
    duration = 3000,
    visible,
    onDismiss,
    position = 'bottom',
}) => {
  const tw = useTailwind();
  const [fadeAnim] = useState(new Animated.Value(0)); // Initial value for opacity: 0
  const [isActuallyVisible, setIsActuallyVisible] = useState(visible);


  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (visible) {
      setIsActuallyVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      timer = setTimeout(() => {
        handleDismiss();
      }, duration);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsActuallyVisible(false)); // Set to false after animation
    }
    return () => clearTimeout(timer);
  }, [visible, duration, fadeAnim]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
        onDismiss();
        setIsActuallyVisible(false);
    });
  };


  let backgroundColor = Colors.gray700; // Default for info
  let textColor = Colors.white;
  let iconName: IconName | undefined;

  switch (type) {
    case 'success':
      backgroundColor = Colors.success; // green-500
      iconName = 'CheckCircle';
      break;
    case 'error':
      backgroundColor = Colors.destructive; // red-500
      iconName = 'AlertOctagon';
      break;
    case 'warning':
      backgroundColor = Colors.warning; // orange-500
      iconName = 'AlertTriangle';
      break;
    case 'info':
    default:
      backgroundColor = Colors.primary; // blue-500
      iconName = 'Info';
      break;
  }
  
  // Render null if not supposed to be visible at all (initial state or after fade out)
  if (!isActuallyVisible && (fadeAnim as any)._value === 0) { // Check internal value after ensuring isActuallyVisible is false
    return null;
  }


  return (
    <SafeAreaView style={[styles.safeArea, position === 'top' ? styles.top : styles.bottom]} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.container,
          {backgroundColor},
          tw('rounded-lg shadow-lg p-3 flex-row items-center'),
          {opacity: fadeAnim, transform: [{
            translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: position === 'top' ? [-20, 0] : [20, 0]
            })
          }]}
        ]}
      >
        {iconName && <Icon name={iconName} size={20} color={textColor} style={tw('mr-2.5')} />}
        <Text style={[styles.message, {color: textColor}, tw('text-sm flex-shrink')]}>{message}</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000, // Ensure Toast is on top
  },
  top: {
    top: Platform.OS === 'ios' ? 20 : 40, // Adjust as needed for status bar etc.
  },
  bottom: {
    bottom: Platform.OS === 'ios' ? 20 : 40,
  },
  container: {
    maxWidth: '90%',
    minHeight: 50,
    elevation: Platform.OS === 'android' ? 5 : undefined, // For Android shadow
  },
  message: {
    fontWeight: '500',
  },
});


// Example of a global Toast provider setup (Conceptual - not implemented in this change)
// export const ToastContext = React.createContext<ToastRef | null>(null);
// export const useToast = () => React.useContext(ToastContext);

// export const GlobalToastProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
//   const [toastConfig, setToastConfig] = React.useState<{message: string, type?: ToastType, duration?: number, key: number} | null>(null);
//   const [visible, setVisible] = React.useState(false);

//   const show = (message: string, type: ToastType = 'info', duration: number = 3000) => {
//     setToastConfig({ message, type, duration, key: Date.now() });
//     setVisible(true);
//   };
//   const hide = () => {
//     setVisible(false);
//   };

//   return (
//     <ToastContext.Provider value={{ show, hide }}>
//       {children}
//       {toastConfig && (
//         <Toast
//           key={toastConfig.key}
//           message={toastConfig.message}
//           type={toastConfig.type}
//           duration={toastConfig.duration}
//           visible={visible}
//           onDismiss={hide}
//         />
//       )}
//     </ToastContext.Provider>
//   );
// };


export default Toast;