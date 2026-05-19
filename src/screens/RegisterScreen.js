// 注册页
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';
import { storage } from '../storage';

export default function RegisterScreen({ navigation, onRegister }) {
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (!username || !password) { setError('请填写用户名和密码'); return; }
    if (username.length < 2) { setError('用户名至少2个字符'); return; }
    if (password.length < 4) { setError('密码至少4位'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await api.register(username, password, nickname || username, phone);
      await storage.setToken(data.token);
      await storage.setUser(data.user);
      onRegister(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll}>
        <View style={styles.logo}>
          <Text style={styles.title}>📝 注册新用户</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>用户名</Text>
          <TextInput style={styles.input} placeholder="至少2个字符" placeholderTextColor={colors.textMuted}
            value={username} onChangeText={setUsername} autoCapitalize="none" />

          <Text style={styles.label}>昵称（可选）</Text>
          <TextInput style={styles.input} placeholder="显示名称" placeholderTextColor={colors.textMuted}
            value={nickname} onChangeText={setNickname} />

          <Text style={styles.label}>手机号码</Text>
          <TextInput style={styles.input} placeholder="方便与小主联系" placeholderTextColor={colors.textMuted}
            value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Text style={styles.hint}>✏️ 方便与小主联系，为您人工解惑</Text>

          <Text style={styles.label}>密码</Text>
          <TextInput style={styles.input} placeholder="至少4位" placeholderTextColor={colors.textMuted}
            value={password} onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
            <Text style={styles.btnText}>{loading ? '注册中...' : '注 册'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>已有账号？去登录</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24 },
  logo: { alignItems: 'center', marginVertical: 20 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  form: { backgroundColor: colors.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 13, color: colors.textDim, marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: colors.inputBg, borderRadius: 10, padding: 12,
    fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  hint: { fontSize: 11, color: colors.textDim, marginTop: 3 },
  btn: {
    backgroundColor: colors.primary, borderRadius: 12, padding: 14,
    alignItems: 'center', marginTop: 20,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: colors.primary, textAlign: 'center', marginTop: 16, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center', marginBottom: 8, padding: 8, backgroundColor: colors.danger + '15', borderRadius: 8 },
});
