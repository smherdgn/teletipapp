import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import DashboardScreen from '@screens/DashboardScreen';
import ProfileScreen from '@screens/ProfileScreen';
import SettingsScreen from '@screens/SettingsScreen';
import DebugScreen from '@screens/DebugScreen'; // Import DebugScreen
import RoomEntryScreen from '@screens/RoomEntryScreen'; // Import RoomEntryScreen
import {MainTabParamList} from './types';
import {useTailwind} from 'tailwind-rn';
import { Text, Platform } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '@constants/theme';
import Icon from '@components/common/Icon'; // Using common Icon component

const Tab = createBottomTabNavigator<MainTabParamList>();

// TabBarIcon component using Lucide icons
const TabBarIcon: React.FC<{ name: keyof MainTabParamList; focused: boolean; color: string; size: number }> = ({ name, focused, color, size }) => {
  let iconName: React.ComponentProps<typeof Icon>['name'] = 'AlertCircle'; // Default icon

  if (name === 'RoomEntryTab') iconName = 'Home'; // Or 'LogIn' if more appropriate
  else if (name === 'DashboardTab') iconName = 'LayoutDashboard';
  else if (name === 'ProfileTab') iconName = 'User';
  else if (name === 'SettingsTab') iconName = 'Settings';
  else if (name === 'DebugTab') iconName = 'Bug';

  return <Icon name={iconName} size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
};


const TabNavigator: React.FC = () => {
  const tw = useTailwind();

  const isDevelopmentMode = typeof __DEV__ !== 'undefined' ? __DEV__ : (Platform.OS === 'web' ? process.env.NODE_ENV === 'development' : false);


  return (
    <Tab.Navigator
      id={undefined} // Added to satisfy type '{ id: undefined; }'
      initialRouteName="RoomEntryTab" // Set RoomEntry as the initial tab
      screenOptions={({route}: { route: RouteProp<MainTabParamList, keyof MainTabParamList>; navigation: any; }) => ({
        tabBarIcon: ({focused, color, size}) => {
          return <TabBarIcon name={route.name} focused={focused} color={color} size={size} />;
        },
        tabBarActiveTintColor: Colors.primary as string,
        tabBarInactiveTintColor: Colors.gray500 as string,
        headerShown: false,
        tabBarStyle: tw('bg-card border-t border-border'), // Use theme colors
        tabBarLabelStyle: tw('font-semibold text-xs'),
      })}>
      <Tab.Screen name="RoomEntryTab" component={RoomEntryScreen} options={{ title: 'Join' }} />
      <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: 'Settings' }} />
      {isDevelopmentMode && (
        <Tab.Screen name="DebugTab" component={DebugScreen} options={{ title: 'Debug' }} />
      )}
    </Tab.Navigator>
  );
};

export default TabNavigator;