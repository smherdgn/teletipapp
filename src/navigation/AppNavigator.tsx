import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {AppStackParamList} from './types';

// Screens
import RoomEntryScreen from '@screens/RoomEntryScreen';
import CallScreen from '@screens/CallScreen';
import MainTabNavigator from './TabNavigator'; // Import the TabNavigator

const Stack = createStackNavigator<AppStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      id={undefined} // Added to satisfy type '{ id: undefined; }'
      initialRouteName="MainTabs" // Default to MainTabs which includes RoomEntry via nesting or initial tab
      screenOptions={{headerShown: false}}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="Call" component={CallScreen}
        options={{ gestureEnabled: false }} // Disable gestures during call
      />
      {/* RoomEntryScreen is now typically accessed via a tab or as an initial screen within MainTabs if designed that way */}
      {/* If RoomEntry should be a top-level screen in AppStack outside tabs, it can be added here. */}
      {/* <Stack.Screen name="RoomEntry" component={RoomEntryScreen} /> */}
    </Stack.Navigator>
  );
};

export default AppNavigator;