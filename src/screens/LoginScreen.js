// 登录页
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';
import { storage } from '../storage';

export default function LoginScreen({ navigation, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!username || !password) { setError('请填写用户名和密码'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await api.login(username, password);
      await storage.setToken(data.token);
      await storage.setUser(data.user);
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.logo}>
        <Text style={styles.logoIcon}>☯</Text>
        <Text style={styles.logoText}>E上智方</Text>
        <Text style={styles.tagline}>传统文化 · 问数解惑</Text>
      </View>

      <View style={styles.form}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>用户名</Text>
        <TextInput
          style={styles.input} placeholder="输入用户名"
          placeholderTextColor={colors.textMuted}
          value={username} onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Text style={styles.label}>密码</Text>
        <TextInput
          style={styles.input} placeholder="输入密码"
          placeholderTextColor={colors.textMuted}
          value={password} onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          <Text style={styles.btnText}>{loading ? '登录中...' : '登 录'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>还没有账号？立即注册</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24 },
  logo: { alignItems: 'center', marginBottom: 40 },
  logoIcon: { fontSize: 60 },
  logoText: { fontSize: 28, fontWeight: '700', color: colors.primary, marginTop: 8 },
  tagline: { fontSize: 13, color: colors.textDim, marginTop: 4 },
  form: { backgroundColor: colors.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 13, color: colors.textDim, marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: colors.inputBg, borderRadius: 10, padding: 12,
    fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  btn: {
    backgroundColor: colors.primary, borderRadius: 12, padding: 14,
    alignItems: 'center', marginTop: 20,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: colors.primary, textAlign: 'center', marginTop: 16, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center', marginBottom: 8, padding: 8, backgroundColor: colors.danger + '15', borderRadius: 8 },
});
