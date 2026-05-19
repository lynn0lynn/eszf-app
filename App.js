// ESZF App — 问数 · E上智方
import React, { useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, Text, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme';
import { storage } from './src/storage';
import ErrorBoundary from './src/components/ErrorBoundary';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import BaziScreen from './src/screens/BaziScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// 屏蔽不必要的警告
LogBox.ignoreLogs(['Non-serializable values']);

const Stack = createNativeStackNavigator();

function ProfileBtn({ navigation }) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ marginRight: 8 }}>
      <Text style={{ fontSize: 24 }}>👤</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await storage.getToken();
        setIsLoggedIn(!!token);
      } catch (e) {
        console.error('Init error:', e);
      }
      setInitializing(false);
    })();
  }, []);

  const handleLogin = useCallback(() => setIsLoggedIn(true), []);
  const handleRegister = useCallback(() => setIsLoggedIn(true), []);
  const handleLogout = useCallback(() => setIsLoggedIn(false), []);

  if (initializing) return null;

  return (
    <ErrorBoundary>
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
            fonts: {
              regular: { fontFamily: 'System', fontWeight: '400' },
              medium: { fontFamily: 'System', fontWeight: '500' },
              bold: { fontFamily: 'System', fontWeight: '700' },
              heavy: { fontFamily: 'System', fontWeight: '800' },
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
                <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Login" options={{ title: '登录', headerBackTitle: '返回' }}>
                  {props => <LoginScreen {...props} onLogin={handleLogin} />}
                </Stack.Screen>
                <Stack.Screen name="Register" options={{ title: '注册', headerBackTitle: '返回' }}>
                  {props => <RegisterScreen {...props} onRegister={handleRegister} />}
                </Stack.Screen>
              </>
            ) : (
              <>
                <Stack.Screen name="Bazi" options={({ navigation }) => ({
                  title: '问数',
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
    </ErrorBoundary>
  );
}
