// 问数页 — 排盘输入 + 结果 + 五问
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, KeyboardAvoidingView,
} from 'react-native';
import { colors } from '../theme';
import { api } from '../api';
import { storage } from '../storage';
import PillarsCard from '../components/PillarsCard';
import WuWenGrid from '../components/WuWenGrid';
import AiResultBlock from '../components/AiResultBlock';
import LoadingModal from '../components/LoadingModal';

// 省份城市经纬度简化数据（仅省级城市）
const PROVINCES = [
  '北京市', '上海市', '广州市', '深圳市', '成都市', '杭州市', '武汉市',
  '南京市', '重庆市', '天津市', '苏州市', '长沙市', '西安市', '郑州市',
  '青岛市', '沈阳市', '宁波市', '昆明市', '大连市', '厦门市',
];
const PROVINCE_COORDS = {
  '北京市': [116.4, 39.9], '上海市': [121.5, 31.2], '广州市': [113.3, 23.1],
  '深圳市': [114.1, 22.5], '成都市': [104.1, 30.6], '杭州市': [120.2, 30.3],
  '武汉市': [114.3, 30.6], '南京市': [118.8, 32.1], '重庆市': [106.5, 29.6],
  '天津市': [117.2, 39.1], '苏州市': [120.6, 31.3], '长沙市': [113.0, 28.2],
  '西安市': [108.9, 34.3], '郑州市': [113.7, 34.8], '青岛市': [120.4, 36.1],
  '沈阳市': [123.4, 41.8], '宁波市': [121.5, 29.9], '昆明市': [102.7, 25.0],
  '大连市': [121.6, 38.9], '厦门市': [118.1, 24.5],
};

function getToday() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function getBaziId(bazi) {
  if (!bazi) return '';
  const raw = (bazi.name || '') + '|' + (bazi.gender || '') + '|' +
    (bazi.yearPillar?.ganZhi || '') + '|' +
    (bazi.monthPillar?.ganZhi || '') + '|' +
    (bazi.dayPillar?.ganZhi || '') + '|' +
    (bazi.hourPillar?.ganZhi || '');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return 'bz_' + Math.abs(hash).toString(36);
}

export default function BaziScreen({ navigation }) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('男');
  const [birthDate, setBirthDate] = useState(getToday());
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('0');
  const [province, setProvince] = useState('北京市');

  const [loading, setLoading] = useState(false);
  const [loadText, setLoadText] = useState('');
  const [baziData, setBaziData] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiTitle, setAiTitle] = useState('');
  const [quota, setQuota] = useState(null);
  const [followUpText, setFollowUpText] = useState('');
  const [followUpResult, setFollowUpResult] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const scrollRef = useRef(null);

  // 检查登录状态
  React.useEffect(() => {
    (async () => {
      const token = await storage.getToken();
      setIsLoggedIn(!!token);
      if (token) {
        try {
          const user = await api.getMe();
          await storage.setUser(user);
        } catch (e) { /* token expired */ }
      }
    })();
  }, []);

  // 排盘
  async function handleCalc() {
    if (!birthDate) { alert('请选择出生日期'); return; }
    setLoading(true);
    setLoadText('正在推算八字...');
    setBaziData(null);
    setAiResult(null);
    setFollowUpResult(null);
    try {
      const coords = PROVINCE_COORDS[province] || [116.4, 39.9];
      // 先获取日期
      const dateObj = new Date(birthDate + 'T' + String(parseInt(hour) || 12).padStart(2,'0') + ':' + String(parseInt(minute) || 0).padStart(2,'0') + ':00');
      const data = await api.calcBazi(dateObj.toISOString(), coords[0], coords[1], gender, name || '来访者');
      setBaziData(data);

      // 加载配额
      if (isLoggedIn) {
        try {
          const q = await api.getQuota(getBaziId(data));
          setQuota(q);
        } catch (e) {}
      }
    } catch (e) {
      alert('排盘失败：' + e.message);
    } finally {
      setLoading(false);
    }
  }

  // 五问
  async function handleWuWen(type) {
    if (!isLoggedIn) {
      alert('请先登录后使用AI分析');
      navigation.navigate('Login');
      return;
    }
    if (!baziData) return;

    setLoading(true);
    setLoadText('正在请求AI分析...');
    setAiResult(null);
    setFollowUpResult(null);

    try {
      const data = await api.aiAsk(baziData, type, '');
      setAiResult(data.result);
      const labels = { health: '健康养生', career: '事业学业', marriage: '婚姻感情', children: '六亲眷属', decision: '亨通聚富' };
      setAiTitle('🤖 ' + (labels[type] || type) + ' · AI深度解读');
      // 刷新配额
      if (isLoggedIn) {
        try { const q = await api.getQuota(getBaziId(baziData)); setQuota(q); } catch (e) {}
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e) {
      alert('AI分析失败：' + e.message);
    } finally {
      setLoading(false);
    }
  }

  // 追问
  async function handleFollowUp() {
    if (!followUpText.trim()) return;
    if (!baziData) { alert('请先排盘'); return; }

    setLoading(true);
    setLoadText('正在追问...');
    try {
      const data = await api.customAsk(
        followUpText.trim(),
        aiResult || '',
        getBaziId(baziData),
        baziData
      );
      setFollowUpResult(data.answer);
      setFollowUpText('');
      if (isLoggedIn) {
        try { const q = await api.getQuota(getBaziId(baziData)); setQuota(q); } catch (e) {}
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e) {
      alert('追问失败：' + e.message);
    } finally {
      setLoading(false);
    }
  }

  // 背景信息（追问用）
  const bgInfo = React.useMemo(() => {
    if (!baziData) return '';
    const parts = [];
    if (baziData.yearPillar) {
      parts.push(`八字：${baziData.yearPillar.ganZhi} ${baziData.monthPillar.ganZhi} ${baziData.dayPillar.ganZhi} ${baziData.hourPillar.ganZhi}`);
    }
    if (baziData.wxStats?.stats) {
      const stats = baziData.wxStats.stats;
      parts.push(`五行：${Object.entries(stats).map(([k, v]) => `${k}${v}`).join(' ')}`);
    }
    return parts.join('\n');
  }, [baziData]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content}>
        {/* 头部 */}
        <View style={styles.header}>
          <Text style={styles.logo}>☯</Text>
          <Text style={styles.headerTitle}>问 数</Text>
          <Text style={styles.headerSub}>八字排盘 · AI解读</Text>
        </View>

        {/* 配额栏 */}
        {quota && isLoggedIn ? (
          <View style={styles.quotaBar}>
            <Text style={styles.quotaText}>
              🎯 免费 {quota.remainingFree || 0}次 · 📦 {quota.paidQuestions || 0}次 · ⚡ {((quota.tokenBalance || 0) / 10000).toFixed(1)}万
            </Text>
          </View>
        ) : null}

        {/* 输入表单 */}
        <View style={styles.form}>
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.label}>姓名</Text>
              <TextInput style={styles.input} placeholder="可选" placeholderTextColor={colors.textMuted}
                value={name} onChangeText={setName} />
            </View>
            <View style={styles.formHalf}>
              <Text style={styles.label}>性别</Text>
              <View style={styles.genderRow}>
                {['男', '女'].map(g => (
                  <TouchableOpacity key={g}
                    style={[styles.genderBtn, gender === g && styles.genderActive]}
                    onPress={() => setGender(g)}>
                    <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.label}>出生日期</Text>
          <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted}
            value={birthDate} onChangeText={setBirthDate} />

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.label}>时</Text>
              <TextInput style={styles.input} placeholder="0-23" placeholderTextColor={colors.textMuted}
                value={hour} onChangeText={setHour} keyboardType="number-pad" />
            </View>
            <View style={styles.formHalf}>
              <Text style={styles.label}>分</Text>
              <TextInput style={styles.input} placeholder="0-59" placeholderTextColor={colors.textMuted}
                value={minute} onChangeText={setMinute} keyboardType="number-pad" />
            </View>
          </View>

          <Text style={styles.label}>出生地点</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.provinceScroll}>
            {PROVINCES.map(p => (
              <TouchableOpacity key={p}
                style={[styles.provinceBtn, province === p && styles.provinceActive]}
                onPress={() => setProvince(p)}>
                <Text style={[styles.provinceText, province === p && styles.provinceTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.calcBtn} onPress={handleCalc} disabled={loading}>
            <Text style={styles.calcBtnText}>🔮 开始排盘</Text>
          </TouchableOpacity>
        </View>

        {/* 排盘结果 */}
        {baziData ? (
          <>
            <PillarsCard bazi={baziData} />

            {/* 五行信息 */}
            {baziData.wxStats?.stats ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>⚖️ 五行能量</Text>
                <Text style={styles.infoContent}>
                  {Object.entries(baziData.wxStats.stats).map(([k, v]) =>
                    `${k}${v}`
                  ).join('  ·  ')}
                </Text>
                {baziData.wxStats.dayWx ? (
                  <Text style={styles.infoContentSmall}>
                    日主{baziData.wxStats.dayWx}
                    {baziData.wxStats.isStrong ? '偏旺' : '偏弱'}
                    {baziData.wxStats.maxWx ? ` · 用神${baziData.wxStats.maxWx} 忌神${baziData.wxStats.minWx}` : ''}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* 大运 */}
            {baziData.currentDaYun && baziData.currentDaYun.length > 0 ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>🔄 当前大运</Text>
                <View style={styles.dayunRow}>
                  {baziData.currentDaYun.slice(0, 6).map((dy, i) => (
                    <View key={i} style={styles.dayunItem}>
                      <Text style={styles.dayunGz}>{dy.ganZhi || '--'}</Text>
                      <Text style={styles.dayunAge}>{dy.fromAge}~{dy.toAge}岁</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* 五问区域 */}
            <View style={styles.wuwenSection}>
              <Text style={styles.sectionTitle}>🤖 AI 深度解读</Text>
              <Text style={styles.sectionDesc}>选择你关心的话题，获取AI命理分析</Text>
              {!isLoggedIn ? (
                <TouchableOpacity style={styles.loginPrompt} onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginPromptText}>🔐 登录后使用AI解读</Text>
                </TouchableOpacity>
              ) : (
                <WuWenGrid onPress={handleWuWen} disabled={loading} />
              )}
            </View>

            {/* AI结果 */}
            {aiResult ? (
              <AiResultBlock result={aiResult} title={aiTitle} />
            ) : null}
            {followUpResult ? (
              <AiResultBlock result={followUpResult} title="💬 追问回答" />
            ) : null}

            {/* 追问输入 */}
            {aiResult && isLoggedIn ? (
              <View style={styles.followUpBox}>
                <Text style={styles.followUpTitle}>💬 追问</Text>
                <TextInput style={styles.followUpInput} placeholder="输入你的追问..." placeholderTextColor={colors.textMuted}
                  value={followUpText} onChangeText={setFollowUpText}
                  multiline numberOfLines={3} />
                <TouchableOpacity style={styles.followUpBtn} onPress={handleFollowUp} disabled={loading}>
                  <Text style={styles.followUpBtnText}>发送追问</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <LoadingModal visible={loading} text={loadText} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginVertical: 16 },
  logo: { fontSize: 48 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.primary, marginTop: 4 },
  headerSub: { fontSize: 13, color: colors.textDim, marginTop: 2 },
  quotaBar: { backgroundColor: colors.card, borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  quotaText: { fontSize: 12, color: colors.textDim, textAlign: 'center' },
  form: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  formRow: { flexDirection: 'row', gap: 12 },
  formHalf: { flex: 1 },
  label: { fontSize: 13, color: colors.textDim, marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: colors.inputBg, borderRadius: 10, padding: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  genderActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  genderText: { fontSize: 14, color: colors.textDim },
  genderTextActive: { color: colors.primary, fontWeight: '600' },
  provinceScroll: { marginTop: 4, marginBottom: 4 },
  provinceBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  provinceActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  provinceText: { fontSize: 13, color: colors.textDim },
  provinceTextActive: { color: colors.primary, fontWeight: '600' },
  calcBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  calcBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  infoCard: { backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  infoContent: { fontSize: 14, color: colors.textDim, lineHeight: 22 },
  infoContentSmall: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  dayunRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayunItem: { alignItems: 'center', minWidth: 60, padding: 6, borderRadius: 8, backgroundColor: colors.inputBg },
  dayunGz: { fontSize: 14, fontWeight: '600', color: colors.accent },
  dayunAge: { fontSize: 11, color: colors.textMuted },
  wuwenSection: { marginVertical: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' },
  sectionDesc: { fontSize: 12, color: colors.textDim, textAlign: 'center', marginTop: 4 },
  loginPrompt: { backgroundColor: colors.primary + '20', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  loginPromptText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  followUpBox: { backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  followUpTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  followUpInput: { backgroundColor: colors.inputBg, borderRadius: 10, padding: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border, minHeight: 60, textAlignVertical: 'top' },
  followUpBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  followUpBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
