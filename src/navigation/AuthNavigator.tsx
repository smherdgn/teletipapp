import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {AuthStackParamList} from './types';

// Screens
import LoginScreen from '@screens/LoginScreen';
// Import SignUpScreen, ForgotPasswordScreen etc. if you add them

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      id={undefined} // Added to satisfy type '{ id: undefined; }'
      screenOptions={{headerShown: false}}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* Add other auth screens here */}
      {/* <Stack.Screen name="SignUp" component={SignUpScreen} /> */}
    </Stack.Navigator>
  );
};

export default AuthNavigator;