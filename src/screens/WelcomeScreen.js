// 欢迎页 — 问数 · E上智方
// 既尘缘皆有定数，敢问天意几何
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { colors } from '../theme';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 背景装饰 */}
      <View style={styles.bgOrb} />

      {/* 主内容 */}
      <View style={styles.main}>
        {/* Logo */}
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>☯</Text>
        </View>
        <Text style={styles.appName}>问数</Text>

        {/* 核心理念 */}
        <View style={styles.sloganCard}>
          <Text style={styles.sloganMain}>既尘缘皆有定数</Text>
          <Text style={styles.sloganMain}>敢问天意几何</Text>
          <View style={styles.divider} />
          <Text style={styles.sloganSub}>
            八字推演 · AI解读 · 知命而为
          </Text>
        </View>

        {/* 描述 */}
        <Text style={styles.desc}>
          输入生辰，AI深度解析您的命理格局、大运流年。{'\n'}
          知天命，尽人事。
        </Text>
      </View>

      {/* 底部按钮 */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.8}
        >
          <Text style={styles.loginBtnText}>登 录</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.8}
        >
          <Text style={styles.registerBtnText}>注册新账号</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>E上智方 · eszf.com.cn</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bg,
    justifyContent: 'space-between', paddingHorizontal: 32,
    paddingTop: 80, paddingBottom: 40,
  },
  bgOrb: {
    position: 'absolute', top: -80, right: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: colors.primary + '10',
  },
  main: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary + '44',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  logoIcon: { fontSize: 40 },
  appName: { fontSize: 28, fontWeight: '700', color: colors.primary, letterSpacing: 4, marginBottom: 24 },
  sloganCard: {
    backgroundColor: colors.card, borderRadius: 16,
    paddingVertical: 20, paddingHorizontal: 28,
    borderWidth: 1, borderColor: colors.primary + '33',
    alignItems: 'center', width: '100%',
  },
  sloganMain: {
    fontSize: 18, color: colors.text, lineHeight: 30,
    letterSpacing: 3, fontWeight: '500',
  },
  divider: { width: 40, height: 1, backgroundColor: colors.primary + '44', marginVertical: 12 },
  sloganSub: { fontSize: 12, color: colors.textMuted, letterSpacing: 1 },
  desc: {
    fontSize: 13, color: colors.textDim, lineHeight: 20,
    textAlign: 'center', marginTop: 24,
  },
  bottom: { width: '100%', alignItems: 'center' },
  loginBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', width: '100%',
    marginBottom: 12,
  },
  loginBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 4 },
  registerBtn: {
    borderRadius: 14, paddingVertical: 13, alignItems: 'center', width: '100%',
    borderWidth: 1, borderColor: colors.border,
  },
  registerBtnText: { color: colors.text, fontSize: 15, fontWeight: '500' },
  footer: { fontSize: 11, color: colors.textMuted, marginTop: 24, letterSpacing: 1 },
});
