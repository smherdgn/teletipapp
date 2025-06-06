import React, { useEffect } from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {RootNavigatorParamList} from './types';
import {useAuthStore} from '@store/useAuthStore';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';
import LoadingScreen from '@screens/LoadingScreen'; // Re-using existing LoadingScreen
import { SocketService } from '@services/socketService'; // For connecting/disconnecting socket

const Stack = createStackNavigator<RootNavigatorParamList>();

const RootNavigator: React.FC = () => {
  const {isAuthenticated, isLoadingAuth, checkInitialAuth} = useAuthStore();
  const socketService = SocketService.getInstance();

  useEffect(() => {
    checkInitialAuth(); // Check auth status when RootNavigator mounts
  }, [checkInitialAuth]);

  useEffect(() => {
    if (isAuthenticated) {
        if (!socketService.isConnected()) {
            socketService.connect();
        }
    } else {
        if (socketService.isConnected()) {
            socketService.disconnect();
        }
    }
    // No cleanup needed for socket here as it's a singleton managed elsewhere for connect/disconnect
  }, [isAuthenticated, socketService]);


  if (isLoadingAuth) {
    return <LoadingScreen />; // Show loading screen while checking auth state
  }

  return (
    <Stack.Navigator
      id={undefined} // Added to satisfy type '{ id: undefined; }'
      screenOptions={{headerShown: false}}
    >
      {isAuthenticated ? (
        <Stack.Screen name="App" component={AppNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
      {/*
        The LoadingInitial screen could be part of this navigator if preferred,
        but often isLoadingAuth condition above is sufficient to show a global LoadingScreen.
        If LoadingInitial was a specific screen:
        <Stack.Screen name="LoadingInitial" component={LoadingScreen} />
        And then navigate from LoadingInitial to App or Auth.
        Current approach is simpler.
      */}
    </Stack.Navigator>
  );
};

export default RootNavigator;