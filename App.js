// ESZF App — 问数 · E上智方
import React, { useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme';
import { storage } from './src/storage';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import BaziScreen from './src/screens/BaziScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();

function ProfileBtn({ navigation }) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ marginRight: 4 }}>
      <Text style={{ fontSize: 22 }}>👤</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await storage.getToken();
      setIsLoggedIn(!!token);
      setInitializing(false);
    })();
  }, []);

  const handleLogin = useCallback(() => setIsLoggedIn(true), []);
  const handleRegister = useCallback(() => setIsLoggedIn(true), []);
  const handleLogout = useCallback(() => setIsLoggedIn(false), []);

  if (initializing) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: colors.primary,
            background: colors.bg,
            card: colors.card,
            text: colors.text,
            border: colors.border,
            notification: colors.primary,
          },
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          {!isLoggedIn ? (
            <>
              <Stack.Screen name="Login" options={{ headerShown: false }}>
                {props => <LoginScreen {...props} onLogin={handleLogin} />}
              </Stack.Screen>
              <Stack.Screen name="Register" options={{ title: '注册' }}>
                {props => <RegisterScreen {...props} onRegister={handleRegister} />}
              </Stack.Screen>
            </>
          ) : (
            <>
              <Stack.Screen name="Bazi" options={({ navigation }) => ({
                title: '☯ 问数',
                headerRight: () => <ProfileBtn navigation={navigation} />,
              })}>
                {props => <BaziScreen {...props} />}
              </Stack.Screen>
              <Stack.Screen name="Profile" options={{ title: '个人中心' }}>
                {props => <ProfileScreen {...props} onLogout={handleLogout} />}
              </Stack.Screen>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
