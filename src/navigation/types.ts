import type { StackScreenProps } from '@react-navigation/stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams, CompositeScreenProps } from '@react-navigation/native';
// Removed unused imports: RouteProp, CallSession, User

// Root Navigator: Switches between Auth and App stacks
export type RootNavigatorParamList = {
  LoadingInitial: undefined; // For initial auth check
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppStackParamList>; // App can be a StackNavigator containing Tabs or other Stacks
};

// Auth Navigator: Handles login flow
export type AuthStackParamList = {
  Login: undefined;
  // SignUp: undefined;
  // ForgotPassword: undefined;
};

// Main Tab Navigator: Handles the main tab-based navigation
export type MainTabParamList = {
  RoomEntryTab: undefined; // Added for RoomEntryScreen as a tab
  DashboardTab: undefined;
  ProfileTab: { userId?: string }; // userId is optional for tab context (view own profile)
  SettingsTab: undefined;
  DebugTab: undefined; // Added for the Debug Screen
};

// App Stack Navigator: Can include RoomEntry, Call, and potentially the TabNavigator as a screen
export type AppStackParamList = {
  // RoomEntry: undefined; // RoomEntry is now part of MainTabs
  MainTabs: NavigatorScreenParams<MainTabParamList>; // TabNavigator is a screen within AppStack
  Call: { roomId: string }; // roomId is essential for joining/creating a call
};


// Screen prop types for individual screens

// Root Navigator Screens
export type LoadingInitialScreenProps = StackScreenProps<RootNavigatorParamList, 'LoadingInitial'>;
export type AppScreenProps = StackScreenProps<RootNavigatorParamList, 'App'>; // For navigating to App stack screens

// Auth Stack Screen Props
export type LoginScreenProps = StackScreenProps<AuthStackParamList, 'Login'>;

// App Stack Screen Props
// export type RoomEntryScreenProps = StackScreenProps<AppStackParamList, 'RoomEntry'>; // No longer direct child of AppStack
export type CallScreenProps = StackScreenProps<AppStackParamList, 'Call'>;

// If TabNavigator is nested within AppStack, props for screens inside TabNavigator
// need to be composed if they need to navigate to screens outside the TabNavigator but within AppStack.

// Main Tab Screen Props
export type RoomEntryScreenProps = CompositeScreenProps< // Added for RoomEntryScreen as a tab
  BottomTabScreenProps<MainTabParamList, 'RoomEntryTab'>,
  // StackScreenProps<AppStackParamList> // This was causing issues when navigating to Call from RoomEntry
  StackScreenProps<RootNavigatorParamList, 'App'> // Use RootNavigator's App stack for broader navigation
>;
export type DashboardScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'DashboardTab'>,
  StackScreenProps<RootNavigatorParamList, 'App'> 
>;
export type ProfileScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'ProfileTab'>,
  StackScreenProps<RootNavigatorParamList, 'App'>
>;
export type SettingsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'SettingsTab'>,
  StackScreenProps<RootNavigatorParamList, 'App'>
>;
export type DebugScreenProps = CompositeScreenProps< // Added for Debug Screen
  BottomTabScreenProps<MainTabParamList, 'DebugTab'>,
  StackScreenProps<RootNavigatorParamList, 'App'>
>;


// Fallback types if not using CompositeScreenProps or if tabs are root of App stack
// export type DashboardScreenProps = BottomTabScreenProps<MainTabParamList, 'DashboardTab'>;
// export type ProfileScreenProps = BottomTabScreenProps<MainTabParamList, 'ProfileTab'>;
// export type SettingsScreenProps = BottomTabScreenProps<MainTabParamList, 'SettingsTab'>;
// export type DebugScreenProps = BottomTabScreenProps<MainTabParamList, 'DebugTab'>;