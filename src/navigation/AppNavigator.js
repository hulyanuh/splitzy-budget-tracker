import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Users, UserCircle } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../config/theme';
import { LoadingScreen } from '../components/UIComponents';

import LoginScreen           from '../screens/auth/LoginScreen';
import SignupScreen          from '../screens/auth/SignupScreen';
import HomeScreen            from '../screens/dashboard/HomeScreen';
import GroupListScreen       from '../screens/groups/GroupListScreen';
import GroupDetailScreen     from '../screens/groups/GroupDetailScreen';
import CreateEditGroupScreen from '../screens/groups/CreateEditGroupScreen';
import AddExpenseScreen      from '../screens/expenses/AddExpenseScreen';
import ExpenseDetailScreen   from '../screens/expenses/ExpenseDetailScreen';
import SummaryScreen         from '../screens/summary/SummaryScreen';
import SettingsScreen        from '../screens/settings/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function TabIcon({ Icon, label, focused }) {
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconActive]}>
      {focused && (
        <LinearGradient colors={['#ffadd0', '#c084fc']} style={tabStyles.activeGlow} />
      )}
      <Icon
        size={22}
        color={focused ? COLORS.babyPink : COLORS.text.muted}
        strokeWidth={focused ? 2.2 : 1.8}
      />
      <Text style={[tabStyles.label, focused && tabStyles.labelFocused]}>{label}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap:     { alignItems: 'center', justifyContent: 'center', paddingTop: 6, paddingHorizontal: 12 },
  iconActive:   {},
  activeGlow:   { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: RADIUS.lg, opacity: 0.12 },
  label:        { fontSize: 10, color: COLORS.text.muted,  fontWeight: '600', marginTop: 3 },
  labelFocused: { fontSize: 10, color: COLORS.babyPink,    fontWeight: '700' },
});

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:   false,
        tabBarStyle: {
          backgroundColor: '#1c0a32',
          borderTopColor:  'rgba(255,173,208,0.15)',
          borderTopWidth:  1,
          height:          72,
          paddingBottom:   10,
          paddingTop:      4,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon Icon={Home}       label="Home"    focused={focused} /> }}
      />
      <Tab.Screen
        name="GroupList"
        component={GroupListScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon Icon={Users}      label="Groups"  focused={focused} /> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon Icon={UserCircle} label="Profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Login"  component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown:  false,
        animation:    'slide_from_right',
        contentStyle: { backgroundColor: COLORS.background.primary },
      }}
    >
      <Stack.Screen name="MainTabs"    component={MainTabs} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="CreateGroup" component={CreateEditGroupScreen} />
      <Stack.Screen name="EditGroup"   component={CreateEditGroupScreen} />
      <Stack.Screen name="AddExpense"     component={AddExpenseScreen}    options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ExpenseDetail"  component={ExpenseDetailScreen} />
      <Stack.Screen name="Summary"        component={SummaryScreen}       options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen message="Starting Splitzy..." />;
  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
