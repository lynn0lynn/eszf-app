// 个人中心 — 含配额信息、排盘记录、账号设置
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';
import { storage } from '../storage';

export default function ProfileScreen({ navigation, onLogout }) {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [quota, setQuota] = useState(null);
  const [baziHistory, setBaziHistory] = useState([]);
  const [loadingQuota, setLoadingQuota] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await storage.getUser();
      setUser(u);
      if (u) {
        setNickname(u.nickname || '');
        setPhone(u.phone || '');
      }
      // 刷新用户信息
      try {
        const data = await api.getMe();
        setUser(data);
        await storage.setUser(data);
        setNickname(data.nickname || '');
        setPhone(data.phone || '');
      } catch (e) {}

      // 加载全局配额
      try {
        const q = await api.getUserQuota();
        setQuota(q);
      } catch (e) {}
      setLoadingQuota(false);

      // 加载排盘记录
      try {
        const h = await api.getBaziHistory(20);
        setBaziHistory(h.readings || []);
      } catch (e) {}
      setLoadingHistory(false);
    })();
  }, []);

  async function updateNickname() {
    if (!nickname.trim()) { alert('请输入昵称'); return; }
    try {
      await api.updateProfile({ nickname: nickname.trim() });
      user.nickname = nickname.trim();
      await storage.setUser(user);
      alert('昵称已更新');
    } catch (e) { alert('更新失败：' + e.message); }
  }

  async function updatePhone() {
    if (!phone.trim()) { alert('请输入手机号码'); return; }
    try {
      await api.updateProfile({ phone: phone.trim() });
      user.phone = phone.trim();
      await storage.setUser(user);
      setEditingPhone(false);
      alert('手机号已更新');
    } catch (e) { alert('更新失败：' + e.message); }
  }

  async function changePassword() {
    if (!oldPw || !newPw) { alert('请填写原密码和新密码'); return; }
    if (newPw.length < 4) { alert('新密码至少4位'); return; }
    try {
      await api.updateProfile({ oldPassword: oldPw, newPassword: newPw });
    } catch (e) {
      // 尝试直接调用密码修改
      try {
        const res = await fetch('https://eszf.com.cn/api/auth/password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await storage.getToken()) },
          body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
        });
        const data = await res.json();
        if (res.ok) { alert('密码修改成功'); setOldPw(''); setNewPw(''); }
        else { alert(data.error || '修改失败'); }
      } catch (e2) { alert('修改失败：' + e2.message); }
    }
  }

  async function handleLogout() {
    Alert.alert('退出登录', '确定退出当前账号？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: async () => {
        await storage.clear();
        onLogout();
      }},
    ]);
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>未登录</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginBtnText}>去登录</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 用户信息头 */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user.nickname || user.username)[0]}</Text>
        </View>
        <Text style={styles.nickname}>{user.nickname || user.username}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        {user.created_at ? (
          <Text style={styles.meta}>注册时间：{user.created_at?.substring(0, 10)}</Text>
        ) : null}
      </View>

      {/* ===== 配额信息 ===== */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 我的配额</Text>
        {loadingQuota ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : quota ? (
          <View style={styles.quotaGrid}>
            <View style={styles.quotaItem}>
              <Text style={styles.quotaValue}>{quota.remaining_questions}</Text>
              <Text style={styles.quotaLabel}>剩余次数</Text>
            </View>
            <View style={styles.quotaItem}>
              <Text style={styles.quotaValue}>{quota.total_questions}</Text>
              <Text style={styles.quotaLabel}>总购买次数</Text>
            </View>
            <View style={styles.quotaItem}>
              <Text style={styles.quotaValue}>{((quota.remaining_tokens || 0) / 10000).toFixed(1)}万</Text>
              <Text style={styles.quotaLabel}>剩余Token</Text>
            </View>
            <View style={styles.quotaItem}>
              <Text style={styles.quotaValue}>{((quota.total_tokens || 0) / 10000).toFixed(1)}万</Text>
              <Text style={styles.quotaLabel}>总购买Token</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noData}>暂无数据</Text>
        )}
      </View>

      {/* ===== 排盘记录 ===== */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📜 排盘记录</Text>
        {loadingHistory ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : baziHistory.length > 0 ? (
          baziHistory.map((r, i) => (
            <View key={r.id} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyName}>{r.name || '未命名'}</Text>
                <Text style={styles.historyInfo}>
                  {r.gender} · {r.birth_date?.substring(0, 10)} {String(r.birth_hour || 0).padStart(2,'0')}:{String(r.birth_minute || 0).padStart(2,'0')}
                </Text>
                <Text style={styles.historyPlace}>{r.province}{r.city ? ' · ' + r.city.replace('市','') : ''}</Text>
              </View>
              <Text style={styles.historyDate}>{r.created_at?.substring(0, 10)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noData}>暂无排盘记录</Text>
        )}
      </View>

      {/* ===== 账号设置 ===== */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ 账号设置</Text>

        <Text style={styles.label}>昵称</Text>
        <TextInput style={styles.input} placeholder="输入昵称" placeholderTextColor={colors.textMuted}
          value={nickname} onChangeText={setNickname} />
        <TouchableOpacity style={styles.smallBtn} onPress={updateNickname}>
          <Text style={styles.smallBtnText}>更新昵称</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 16 }]}>手机号码</Text>
        {!editingPhone ? (
          <View style={styles.phoneRow}>
            <Text style={styles.phoneValue}>{phone ? '📞 ' + phone : '未填写'}</Text>
            <TouchableOpacity onPress={() => setEditingPhone(true)}>
              <Text style={styles.editLink}>✏️ 修改</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <TextInput style={styles.input} placeholder="输入手机号码" placeholderTextColor={colors.textMuted}
              value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.smallBtn} onPress={updatePhone}>
                <Text style={styles.smallBtnText}>保存</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingPhone(false)}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={[styles.label, { marginTop: 16 }]}>修改密码</Text>
        <TextInput style={styles.input} placeholder="原密码" placeholderTextColor={colors.textMuted}
          value={oldPw} onChangeText={setOldPw} secureTextEntry />
        <TextInput style={[styles.input, { marginTop: 6 }]} placeholder="新密码（至少4位）" placeholderTextColor={colors.textMuted}
          value={newPw} onChangeText={setNewPw} secureTextEntry />
        <TouchableOpacity style={styles.smallBtn} onPress={changePassword}>
          <Text style={styles.smallBtnText}>修改密码</Text>
        </TouchableOpacity>
      </View>

      {/* 退出 */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>退出登录</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 16, color: colors.textDim, marginBottom: 16 },
  loginBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, paddingHorizontal: 40 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  header: { alignItems: 'center', marginVertical: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  nickname: { fontSize: 20, fontWeight: '700', color: colors.text },
  username: { fontSize: 14, color: colors.textDim, marginTop: 2 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  section: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  // 配额样式
  quotaGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  quotaItem: { width: '50%', alignItems: 'center', paddingVertical: 8 },
  quotaValue: { fontSize: 24, fontWeight: '700', color: colors.primary },
  quotaLabel: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  // 排盘记录
  historyItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.inputBg, borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  historyLeft: { flex: 1 },
  historyName: { fontSize: 14, fontWeight: '600', color: colors.text },
  historyInfo: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  historyPlace: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  historyDate: { fontSize: 11, color: colors.textMuted },
  noData: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 10 },
  // 账号设置
  label: { fontSize: 13, color: colors.textDim, marginBottom: 4 },
  input: { backgroundColor: colors.inputBg, borderRadius: 10, padding: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border },
  smallBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 8, paddingHorizontal: 16, alignSelf: 'flex-start', marginTop: 8 },
  smallBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  phoneValue: { fontSize: 14, color: colors.text },
  editLink: { fontSize: 13, color: colors.primary },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { backgroundColor: colors.inputBg, borderRadius: 8, padding: 8, paddingHorizontal: 16 },
  cancelBtnText: { color: colors.textDim, fontSize: 13 },
  logoutBtn: { marginTop: 20, borderWidth: 1, borderColor: colors.danger + '44', borderRadius: 12, padding: 14, alignItems: 'center' },
  logoutBtnText: { color: colors.danger, fontSize: 15, fontWeight: '500' },
});
