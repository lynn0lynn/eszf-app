// 问数页 — 排盘输入 + 结果 + 五问
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, KeyboardAvoidingView, Alert,
} from 'react-native';
import { colors } from '../theme';
import { api } from '../api';
import { storage } from '../storage';
import PillarsCard from '../components/PillarsCard';
import WuWenGrid from '../components/WuWenGrid';
import AiResultBlock from '../components/AiResultBlock';
import LoadingModal from '../components/LoadingModal';
import DateTimePickerModal from '../components/DateTimePickerModal';
import CityPickerModal from '../components/CityPickerModal';
import PaymentModal from '../components/PaymentModal';
import { PROVINCE_CITIES } from '../data/cityData';

// 快速获取省会/直辖市坐标
function getCoords(province, city) {
  if (!province) return [116.4, 39.9]; // default Beijing
  const cities = PROVINCE_CITIES[province];
  if (!cities || cities.length === 0) return [116.4, 39.9];
  // If city provided, use its coords
  if (city) {
    const matched = cities.find(c => c.name === city);
    if (matched && (matched.lat || matched.lng)) return [matched.lng, matched.lat];
  }
  // Fallback to first city in the province
  const first = cities[0];
  if (first && (first.lat || first.lng)) return [first.lng, first.lat];
  return [116.4, 39.9];
}

function getToday() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '点击选择日期';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
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

export default function BaziScreen({ navigation, route }) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('男');
  const [birthDate, setBirthDate] = useState(getToday());
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('0');
  const [province, setProvince] = useState('北京');
  const [city, setCity] = useState('北京市');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadText, setLoadText] = useState('');
  const [baziData, setBaziData] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiTitle, setAiTitle] = useState('');
  const [quota, setQuota] = useState(null);
  const [followUpText, setFollowUpText] = useState('');
  // 追问历史（非五问区底部追问）
  const [followUpHistory, setFollowUpHistory] = useState([]); // [{type:'question'|'answer', content}]
  const [followUpLoading, setFollowUpLoading] = useState(false);
  // 五问本地流运展示
  const [flowInfoType, setFlowInfoType] = useState(null); // 当前选中的五问类型
  const [flowQuestion, setFlowQuestion] = useState('');   // 用户输入的问题
  const [flowHistory, setFlowHistory] = useState([]);      // [{type:'question'|'answer', content}] 全部问答历史
  const [flowLoading, setFlowLoading] = useState(false);   // AI加载中
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [chargeType, setChargeType] = useState('count');
  const [flowCardY, setFlowCardY] = useState(0); // 记录五问卡片在ScrollView中的Y偏移
  const scrollRef = useRef(null);
  const followUpRef = useRef(null);
  const flowCardRef = useRef(null);

  // 检查登录状态
  React.useEffect(() => {
    (async () => {
      const token = await storage.getToken();
      setIsLoggedIn(!!token);
      // 加载用户偏好：扣费方式
      const ct = await storage.getChargeType();
      setChargeType(ct);
      if (token) {
        try {
          const user = await api.getMe();
          await storage.setUser(user);
        } catch (e) { /* token expired */ }
      }
    })();
  }, []);

  // 处理排盘记录跳转：预填表单后自动排盘
  const pendingCalcRef = useRef(false);
  React.useEffect(() => {
    (async () => {
      const record = route?.params?.historyRecord;
      if (!record) return;
      setName(record.name || '');
      setGender(record.gender || '男');
      setBirthDate(record.birth_date?.substring(0, 10) || getToday());
      setHour(String(record.birth_hour ?? 12));
      setMinute(String(record.birth_minute ?? 0));
      setProvince(record.province || '北京');
      setCity(record.city || (record.province ? record.province + '市' : '北京市'));
      // 清除params避免下次导航重复触发
      navigation.setParams({ historyRecord: undefined });
      pendingCalcRef.current = true;
    })();
  }, [route?.params?.historyRecord]);

  // 等状态更新后自动排盘
  React.useEffect(() => {
    if (pendingCalcRef.current) {
      pendingCalcRef.current = false;
      const timer = setTimeout(() => handleCalc(), 100);
      return () => clearTimeout(timer);
    }
  }, [name, gender, birthDate, hour, minute, province, city]);

  // 排盘
  async function handleCalc() {
    if (!birthDate) { alert('请选择出生日期'); return; }
    setLoading(true);
    setLoadText('正在推算八字...');
    setBaziData(null);
    setAiResult(null);
    setFollowUpHistory([]);
    setFollowUpText('');
    try {
      const coords = getCoords(province, city);
      const hh = String(Math.min(Math.max(parseInt(hour) || 12, 0), 23)).padStart(2,'0');
      const mm = String(Math.min(Math.max(parseInt(minute) || 0, 0), 59)).padStart(2,'0');
      const dateObj = new Date(birthDate + 'T' + hh + ':' + mm + ':00');
      if (isNaN(dateObj.getTime())) {
        alert('日期格式有误，请使用 YYYY-MM-DD 格式');
        setLoading(false);
        return;
      }
      const data = await api.calcBazi(dateObj.toISOString(), coords[0], coords[1], gender, name || '来访者');
      setBaziData(data);

      // 如果是新盘且已登录，提示保存排盘记录
      if (isLoggedIn && data.isExistingReading === false) {
        setTimeout(() => {
          Alert.alert(
            '📝 保存排盘记录',
            '是否将此八字排盘保存到个人中心？保存后可在「排盘记录」中随时查看。',
            [
              { text: '不保存', style: 'cancel' },
              { text: '保存', onPress: async () => {
                  try {
                    await api.saveReading({
                      name: name || '未命名',
                      gender,
                      birthDate,
                      birthHour: parseInt(hour) || 12,
                      birthMinute: parseInt(minute) || 0,
                      province,
                      city,
                      lng: coords[0],
                      lat: coords[1],
                      resultData: data,
                    });
                    // 不弹成功提示，静默保存
                  } catch (e) {
                    // 保存失败也不影响使用
                  }
                }},
            ]
          );
        }, 500);
      }

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

  // 五问：点击前5个 → 展示流运信息 + 提问框
  function handleWuWen(type) {
    if (!isLoggedIn) {
      alert('请先登录后使用AI分析');
      navigation.navigate('Login');
      return;
    }
    if (!baziData) return;

    // 前5个 → 展示流运信息 + 用户可自由提问
    setFlowInfoType(type);
    setAiResult(null);
    setFlowHistory([]);
    setFlowQuestion('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
  }

  // 五问：用户点击"AI分析"按钮 → 调API分析该话题
  async function handleFlowAiAsk() {
    if (!flowInfoType) return;
    const typeMap = {
      health: 'health', career: 'career', marriage: 'marriage',
      children: 'children', decision: 'decision',
    };
    const type = typeMap[flowInfoType] || flowInfoType;
    const labels = {
      health: { label: '健康养生', icon: '🏥' },
      career: { label: '事业学业', icon: '💼' },
      marriage: { label: '婚姻感情', icon: '💑' },
      children: { label: '六亲眷属', icon: '👨‍👩‍👧‍👦' },
      decision: { label: '亨通聚富', icon: '💰' },
    };
    const info = labels[flowInfoType] || { label: '分析', icon: '🔮' };

    // 追加问题标记到历史
    setFlowHistory(prev => [...prev, { type: 'question', content: `🤖 ${info.icon} AI分析${info.label}` }]);
    setFlowLoading(true);
    try {
      const data = await api.aiAsk(baziData, type, '', true, chargeType);
      setFlowHistory(prev => [...prev, { type: 'answer', content: data.result || '暂无分析结果' }]);
      setAiResult(data.result || ''); // 供底部追问使用
      if (isLoggedIn) {
        try { const q = await api.getQuota(getBaziId(baziData)); setQuota(q); } catch (e) {}
      }
      // 回答出现后滚动到五问卡片顶部，展示完整对话
      setTimeout(() => {
        if (flowCardY > 0) {
          scrollRef.current?.scrollTo({ y: flowCardY - 10, animated: true });
        }
      }, 500);
    } catch (e) {
      setFlowHistory(prev => prev.slice(0, -1)); // 移除问题标记
      if (e.message === 'quota_exhausted') {
        setShowPayment(true);
      } else {
        alert('AI分析失败：' + e.message);
      }
    } finally {
      setFlowLoading(false);
    }
  }

  // 五问：用户输入自由问题后发送AI
  async function handleFlowSend() {
    if (!flowQuestion.trim()) { alert('请输入你想问的问题'); return; }
    const labels = {
      health: { label: '健康养生', icon: '🏥', color: '#4ade80' },
      career: { label: '事业学业', icon: '💼', color: '#667eea' },
      marriage: { label: '婚姻感情', icon: '💑', color: '#f472b6' },
      children: { label: '六亲眷属', icon: '👨‍👩‍👧‍👦', color: '#f0a040' },
      decision: { label: '亨通聚富', icon: '💰', color: '#ffd700' },
    };
    const info = labels[flowInfoType] || { label: '分析', icon: '🔮' };

    // 构建问题上下文：带上选中的话题
    const question = `【${info.label}相关】${flowQuestion.trim()}`;
    const qText = flowQuestion.trim();

    // 追加问题到历史
    setFlowHistory(prev => [...prev, { type: 'question', content: `💬 ${qText}` }]);
    setFlowQuestion('');
    setFlowLoading(true);
    try {
      // 获取最近一条AI回答作为上下文，保证对话连续性
      const lastAiResult = [...flowHistory].reverse().find(i => i.type === 'answer');
      const context = lastAiResult ? lastAiResult.content : aiResult || '';
      const data = await api.customAsk(question, context, getBaziId(baziData), baziData, chargeType);
      setFlowHistory(prev => [...prev, { type: 'answer', content: data.answer || '暂无结果' }]);
      setAiResult(data.answer || ''); // 供关闭flowCard后独立追问使用
      if (isLoggedIn) {
        try { const q = await api.getQuota(getBaziId(baziData)); setQuota(q); } catch (e) {}
      }
      // 回答后滚动到五问卡片顶部，展示完整对话
      setTimeout(() => {
        if (flowCardY > 0) {
          scrollRef.current?.scrollTo({ y: flowCardY - 10, animated: true });
        }
      }, 500);
    } catch (e) {
      setFlowHistory(prev => prev.slice(0, -1)); // 移除问题标记
      if (e.message === 'quota_exhausted') {
        setShowPayment(true);
      } else {
        alert('分析失败：' + e.message);
      }
    } finally {
      setFlowLoading(false);
    }
  }

  // 追问
  async function handleFollowUp() {
    if (!followUpText.trim()) return;
    if (!baziData) { alert('请先排盘'); return; }

    // 检查是否有剩余次数
    if (quota) {
      const hasFree = (quota.remainingFree || 0) > 0;
      const hasPaid = (quota.paidQuestions || 0) > 0;
      const hasToken = (quota.tokenBalance || 0) > 0;
      if (!hasFree && !hasPaid && !hasToken) {
        setShowPayment(true);
        return;
      }
    }

    const qText = followUpText.trim();

    // 追加问题到历史（内联加载，不用全屏LoadingModal）
    setFollowUpHistory(prev => [...prev, { type: 'question', content: `💬 ${qText}` }]);
    setFollowUpText('');
    setFollowUpLoading(true);
    try {
      const data = await api.customAsk(
        qText,
        aiResult || '',
        getBaziId(baziData),
        baziData,
        chargeType
      );
      setFollowUpHistory(prev => [...prev, { type: 'answer', content: data.answer || '暂无结果' }]);
      if (isLoggedIn) {
        try { const q = await api.getQuota(getBaziId(baziData)); setQuota(q); } catch (e) {}
      }
      // 回答后滚动到底部，展示最新消息
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 500);
    } catch (e) {
      setFollowUpHistory(prev => prev.slice(0, -1)); // 移除问题标记
      if (e.message === 'quota_exhausted') {
        setShowPayment(true);
      } else {
        alert('追问失败：' + e.message);
      }
    } finally {
      setFollowUpLoading(false);
    }
  }

  // 开启每日提醒 → 日历+推送
  async function handleSetupReminder() {
    try {
      const { scheduleDailyNotification, createFortuneCalendar, addDailyCalendarEvent, requestPermissions } = await import('../services/notificationService');
      const perms = await requestPermissions();
      if (!perms.notif) {
        alert('请在系统设置中允许通知权限，以便接收每日运势提醒');
        return;
      }
      await scheduleDailyNotification();
      if (perms.cal) {
        const calId = await createFortuneCalendar();
        if (calId) await addDailyCalendarEvent(calId);
      }
      alert('✅ 每日运势提醒已开启！每天早上7:00推送当日运势到你的手机。');
    } catch (e) {
      alert('设置提醒失败：' + e.message);
    }
  }

  // ===== ⚔️ 赢了么 已移入独立页面 YingLeMeScreen =====

  return (
    <>
      <KeyboardAvoidingView style={styles.outer} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* 配额栏 */ }
          {quota && isLoggedIn ? (
            <View style={styles.quotaBar}>
              <View style={styles.quotaRow}>
                <Text style={styles.quotaText}>
                  🎯 免费 {quota.remainingFree || 0}/{quota.dailyFree || 3}次 · 📦 {quota.paidQuestions || 0}次 · ⚡ {((quota.tokenBalance || 0) / 10000).toFixed(1)}万
                </Text>
                <TouchableOpacity style={styles.quotaRechargeBtn} onPress={() => setShowPayment(true)}>
                  <Text style={styles.quotaRechargeText}>💰 购买</Text>
                </TouchableOpacity>
              </View>
              {/* 扣费方式选择 */ }
              <View style={styles.chargeTypeRow}>
                <TouchableOpacity
                  style={[styles.chargeTypeBtn, chargeType === 'count' && styles.chargeTypeActive]}
                  onPress={() => { setChargeType('count'); storage.setChargeType('count'); }}>
                  <Text style={[styles.chargeTypeText, chargeType === 'count' && styles.chargeTypeTextActive]}>📦 次数</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chargeTypeBtn, chargeType === 'token' && styles.chargeTypeActive]}
                  onPress={() => { setChargeType('token'); storage.setChargeType('token'); }}>
                  <Text style={[styles.chargeTypeText, chargeType === 'token' && styles.chargeTypeTextActive]}>⚡ Tokens</Text>
                </TouchableOpacity>
                <Text style={styles.chargeTypeHint}>扣费方式</Text>
              </View>
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

            <Text style={styles.label}>出生日期与时间</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateBtnText}>{formatDateDisplay(birthDate)} {String(hour).padStart(2,'0')}:{String(minute).padStart(2,'0')}</Text>
              <Text style={styles.dateIcon}>📅</Text>
            </TouchableOpacity>

            <Text style={styles.label}>出生地点</Text>
            <TouchableOpacity style={styles.cityBtn} onPress={() => setShowCityPicker(true)}>
              <Text style={styles.cityBtnText}>
                {province}{city ? ' · ' + city.replace('市','') : ''}
              </Text>
              <Text style={styles.cityBtnIcon}>📍</Text>
            </TouchableOpacity>

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

              {/* 本命十神 */}
              {baziData.shiShen ? (
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>📊 本命十神</Text>
                  <View style={styles.shishenGrid}>
                    {[['年', baziData.shiShen.year], ['月', baziData.shiShen.month], ['日', baziData.shiShen.day], ['时', baziData.shiShen.hour]].map(([label, ss], i) => {
                      const colorMap = {
                        '正官': '#4ade80', '七杀': '#f87171',
                        '正印': '#60a5fa', '偏印': '#818cf8',
                        '正财': '#fbbf24', '偏财': '#f59e0b',
                        '食神': '#34d399', '伤官': '#fb923c',
                        '劫财': '#c084fc', '比肩': '#a78bfa',
                        '日主': '#667eea',
                      };
                      const ssColor = colorMap[ss] || colors.text;
                      return (
                        <View key={label} style={styles.shishenItem}>
                          <Text style={styles.shishenLabel}>{label}柱</Text>
                          <Text style={[styles.shishenValue, { color: ssColor }]}>{ss}</Text>
                        </View>
                      );
                    })}
                  </View>
                  {/* 地支藏干十神 */}
                  {baziData.cangGanShiShen ? (
                    <View style={styles.cangganBox}>
                      <Text style={styles.cangganTitle}>藏干十神</Text>
                      <View style={styles.cangganRow}>
                        {Object.entries(baziData.cangGanShiShen).map(([pillar, gans]) => (
                          <View key={pillar} style={styles.cangganPillar}>
                            <Text style={styles.cangganPillarLabel}>{pillar}</Text>
                            {gans.map((g, i) => (
                              <Text key={i} style={styles.cangganText}>{g.gan}{g.shiShen}</Text>
                            ))}
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
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

              {/* 流运信息 + 提问框（点五问后出现） */}
              {flowInfoType ? (
                <View
                  ref={flowCardRef}
                  onLayout={(e) => setFlowCardY(e.nativeEvent.layout.y)}
                  style={styles.flowCard}
                >
                  {/* 话题标签 */}
                  <View style={styles.flowTopicRow}>
                    <Text style={styles.flowTopicIcon}>{flowInfoType === 'health' ? '🏥' : flowInfoType === 'career' ? '💼' : flowInfoType === 'marriage' ? '💑' : flowInfoType === 'children' ? '👨‍👩‍👧‍👦' : '💰'}</Text>
                    <Text style={styles.flowTopicText}>{flowInfoType === 'health' ? '健康养生' : flowInfoType === 'career' ? '事业学业' : flowInfoType === 'marriage' ? '婚姻感情' : flowInfoType === 'children' ? '六亲眷属' : '亨通聚富'}</Text>
                  </View>

                  {/* ===== 流运信息 ===== */}
                  <View style={styles.flowLocalData}>
                    <Text style={styles.flowLocalTitle}>📅 今日流运 · {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</Text>
                    <View style={styles.flowLocalBody}>

                      {/* ──── 一、本命（精简：仅四柱） ──── */}
                      <Text style={styles.flowLine}>本命：{baziData.yearPillar?.ganZhi || '--'} {baziData.monthPillar?.ganZhi || '--'} {baziData.dayPillar?.ganZhi || '--'} {baziData.hourPillar?.ganZhi || '--'}</Text>

                      {/* ──── 二、大运 ──── */}
                      {baziData.currentDaYun && baziData.currentDaYun.length > 0 ? (
                        <>
                          <Text style={styles.flowSecTitle}>🏃 大运（{baziData.daYun?.direction === '顺排' ? '顺排' : '逆排'}）{baziData.qiYunAge ? `· 起运${baziData.qiYunAge.age}岁` : ''}</Text>
                          {baziData.currentDaYun.slice(0, 8).map((dy, i) => (
                            <Text key={i} style={styles.flowSmallLine}>
                              {i + 1}. {dy.yunGanZhi || dy.ganZhi}（{dy.naYin || '？'}）{dy.fromAge && dy.toAge ? ` ${dy.fromAge}-${dy.toAge}岁` : ''}
                            </Text>
                          ))}
                        </>
                      ) : null}

                      {/* ──── 三、流年 ──── */}
                      {baziData.liuNian ? (
                        <>
                          <Text style={styles.flowSecTitle}>🌟 流年【{baziData.liuNian.year}年】</Text>
                          <Text style={styles.flowLine}>
                            {baziData.liuNian.ganZhi || '？'} · {baziData.liuNian.shengXiao || '？'} · 纳音{baziData.liuNian.naYin || '？'}
                            {' · '}五行{baziData.liuNian.wuXing || '？'} · 十神{baziData.liuNian.shiShen || '？'}
                          </Text>
                          {/* 流年神煞 */}
                          {baziData.liuShenSha?.year ? (
                            <Text style={styles.flowSmallLine}>
                              神煞：{Object.entries(baziData.liuShenSha.year).map(([name, info]) =>
                                `${name}（${info.type}）`
                              ).join('、')}
                            </Text>
                          ) : null}
                        </>
                      ) : null}

                      {/* ──── 四、流月 + 流日 ──── */}
                      {baziData.liuRiShen?.todayPillars ? (
                        <>
                          <Text style={styles.flowSecTitle}>📆 本月 · 今日</Text>
                          {/* 流月 */}
                          <Text style={styles.flowLine}>
                            流月：{baziData.liuRiShen.todayPillars.month?.gan || '？'}{baziData.liuRiShen.todayPillars.month?.zhi || '？'}
                          </Text>
                          {/* 流月神煞 */}
                          {baziData.liuShenSha?.month ? (
                            <Text style={styles.flowSmallLine}>
                              流月神煞：{Object.entries(baziData.liuShenSha.month).map(([name, info]) =>
                                `${name}（${info.type}）`
                              ).join('、')}
                            </Text>
                          ) : null}
                          {/* 流日 */}
                          <Text style={styles.flowLine}>
                            流日：{baziData.liuRiShen.todayPillars.day?.gan || '？'}{baziData.liuRiShen.todayPillars.day?.zhi || '？'}
                          </Text>
                          {/* 流日神煞 */}
                          {baziData.liuShenSha?.day ? (
                            <Text style={styles.flowSmallLine}>
                              流日神煞：{Object.entries(baziData.liuShenSha.day).map(([name, info]) =>
                                `${name}（${info.type}）`
                              ).join('、')}
                            </Text>
                          ) : null}
                        </>
                      ) : null}

                    </View>
                  </View>

                  {/* 免费引流提示 */}
                  <View style={styles.flowFreeNote}>
                    <Text style={styles.flowFreeNoteText}>
                      💡 每日流运自动生成，免费查看不扣费。更多详情请访问 
                      <Text style={styles.flowFreeNoteLink}>eszf.com.cn</Text>
                    </Text>
                  </View>

                  {/* 配额状态 */}
                  {quota ? (
                    <View style={styles.flowQuotaRow}>
                      <Text style={styles.flowQuotaFree}>🆓 免费 {quota.remainingFree || 0}次</Text>
                      <Text style={styles.flowQuotaPaid}>📦 {quota.paidQuestions || 0}次 · ⚡ {((quota.tokenBalance || 0) / 10000).toFixed(1)}万</Text>
                    </View>
                  ) : null}

                  {/* AI分析按钮 — 仅在没有问答历史时显示 */}
                  {flowHistory.length === 0 && !flowLoading ? (
                    <TouchableOpacity style={styles.flowAiBtn} onPress={handleFlowAiAsk}>
                      <Text style={styles.flowAiBtnText}>🤖 AI深度分析{flowInfoType === 'health' ? '健康' : flowInfoType === 'career' ? '事业' : flowInfoType === 'marriage' ? '婚姻' : flowInfoType === 'children' ? '六亲' : '财运'}</Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* 全部问答历史 */}
                  {flowHistory.map((item, i) => (
                    item.type === 'question' ? (
                      <View key={i} style={styles.historyQuestion}>
                        <Text style={styles.historyQuestionText}>{item.content}</Text>
                      </View>
                    ) : (
                      <AiResultBlock key={i} result={item.content} title="🤖 AI分析" />
                    )
                  ))}

                  {/* AI思考中内联加载态 */}
                  {flowLoading ? (
                    <View style={styles.flowLoadingBox}>
                      <Text style={styles.flowLoadingIcon}>🤖</Text>
                      <Text style={styles.flowLoadingText}>AI深度解读中...</Text>
                      <Text style={styles.flowLoadingSub}>正在结合八字+流运进行分析</Text>
                    </View>
                  ) : null}

                  {/* 自由提问框 — 历史不为空时展示 */}
                  {flowHistory.length > 0 ? (
                    <View style={styles.flowFreeBox}>
                      <Text style={styles.flowFreeLabel}>💬 还想问什么？自由提问</Text>
                      <TextInput
                        style={styles.flowInput}
                        placeholder="输入你想追问的问题..."
                        placeholderTextColor={colors.textMuted}
                        value={flowQuestion}
                        onChangeText={setFlowQuestion}
                        multiline
                        numberOfLines={2}
                      />
                      <TouchableOpacity style={styles.flowSendBtn} onPress={handleFlowSend} disabled={flowLoading}>
                        <Text style={styles.flowSendText}>发送追问</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {/* 关闭按钮 */}
                  <TouchableOpacity onPress={() => { setFlowInfoType(null); setFlowHistory([]); setFlowQuestion(''); }}>
                    <Text style={styles.flowCancel}>关闭</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* 追问结果历史 */}
              {followUpHistory.map((item, i) => (
                item.type === 'question' ? (
                  <View key={i} style={styles.historyQuestion}>
                    <Text style={styles.historyQuestionText}>{item.content}</Text>
                  </View>
                ) : (
                  <AiResultBlock key={i} result={item.content} title="💬 追问回答" />
                )
              ))}

              {/* 追问内联加载 */}
              {followUpLoading ? (
                <View style={styles.followUpLoadingBox}>
                  <Text style={styles.followUpLoadingText}>🤖 思考中...</Text>
                </View>
              ) : null}

              {/* 追问输入 — flowCard关闭时显示 */}
              {!flowInfoType && isLoggedIn ? (
                <View style={styles.followUpBox}>
                  <Text style={styles.followUpTitle}>💬 追问</Text>
                  <TextInput ref={followUpRef} style={styles.followUpInput}
                    placeholder="输入你的追问..." placeholderTextColor={colors.textMuted}
                    value={followUpText} onChangeText={setFollowUpText}
                    multiline numberOfLines={3}
                    returnKeyType="default"
                  />
                  <TouchableOpacity style={styles.followUpBtn} onPress={handleFollowUp} disabled={followUpLoading}>
                    <Text style={styles.followUpBtnText}>发送追问</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : null}

          </ScrollView>
      </KeyboardAvoidingView>

      <LoadingModal visible={loading} text={loadText} />
      <DateTimePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(dateStr, hourStr, minuteStr) => {
          setBirthDate(dateStr);
          setHour(hourStr);
          setMinute(minuteStr);
        }}
        initialDate={birthDate}
        initialHour={hour}
        initialMinute={minute}
      />
      <CityPickerModal
        visible={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        onSelect={(loc) => {
          setProvince(loc.province);
          setCity(loc.city);
          setShowCityPicker(false);
        }}
        initialProvince={province}
        initialCity={city}
      />
      <PaymentModal
        visible={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={() => {
          if (isLoggedIn && baziData) {
            api.getQuota(getBaziId(baziData)).then(q => setQuota(q)).catch(() => {});
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: 8, paddingBottom: 16 },
  headerCompact: { paddingVertical: 1, marginBottom: 2 },
  headerTagline: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  quotaBar: { backgroundColor: colors.card, borderRadius: 8, padding: 6, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  quotaText: { fontSize: 11, color: colors.textDim, textAlign: 'center', flex: 1 },
  quotaRow: { flexDirection: 'row', alignItems: 'center' },
  quotaRechargeBtn: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 6 },
  quotaRechargeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  chargeTypeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, gap: 4 },
  chargeTypeBtn: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBg },
  chargeTypeActive: { borderColor: colors.primary, backgroundColor: colors.primary + '30' },
  chargeTypeText: { fontSize: 10, color: colors.textDim },
  chargeTypeTextActive: { fontSize: 10, color: colors.primary, fontWeight: '700' },
  chargeTypeHint: { fontSize: 9, color: colors.textMuted, marginLeft: 2 },
  form: { backgroundColor: colors.card, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  formRow: { flexDirection: 'row', columnGap: 6 },
  formHalf: { flex: 1 },
  label: { fontSize: 11, color: colors.textDim, marginBottom: 2, marginTop: 4 },
  input: { backgroundColor: colors.inputBg, borderRadius: 8, padding: 7, fontSize: 13, color: colors.text, borderWidth: 1, borderColor: colors.border },
  dateBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.inputBg, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  dateBtnText: { fontSize: 14, color: colors.text },
  dateIcon: { fontSize: 16 },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  genderActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  genderText: { fontSize: 14, color: colors.textDim },
  genderTextActive: { color: colors.primary, fontWeight: '600' },
  cityBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.inputBg, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: colors.border, marginTop: 2,
  },
  cityBtnText: { fontSize: 14, color: colors.text },
  cityBtnIcon: { fontSize: 16 },
  calcBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  calcBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  infoCard: { backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  infoContent: { fontSize: 14, color: colors.textDim, lineHeight: 22 },
  infoContentSmall: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  shishenGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  shishenItem: { alignItems: 'center', minWidth: 60 },
  shishenLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  shishenValue: { fontSize: 18, fontWeight: '700' },
  cangganBox: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 },
  cangganTitle: { fontSize: 11, color: colors.textMuted, marginBottom: 6 },
  cangganRow: { flexDirection: 'row', justifyContent: 'space-around' },
  cangganPillar: { alignItems: 'center', minWidth: 60 },
  cangganPillarLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  cangganText: { fontSize: 11, color: colors.textDim, lineHeight: 16 },
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
  // 五问流运卡片
  flowCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.primary + '44', marginBottom: 12,
  },
  flowTopicRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  flowTopicIcon: { fontSize: 22 },
  flowTopicText: { fontSize: 16, fontWeight: '700', color: colors.text },
  flowLocalData: {
    backgroundColor: colors.inputBg, borderRadius: 10, padding: 12, marginBottom: 10,
  },
  flowLocalTitle: { fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 2 },
  flowLocalDate: { fontSize: 11, color: colors.textMuted, marginBottom: 8 },
  flowLocalBody: {},
  flowLine: { fontSize: 13, color: colors.text, lineHeight: 20 },
  flowSmallLine: { fontSize: 11, color: colors.textDim, lineHeight: 17, marginLeft: 4, marginTop: 1 },
  flowSecTitle: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 8, marginBottom: 3, borderBottomWidth: 1, borderBottomColor: colors.border + '66', paddingBottom: 2 },
  flowInlineRow: { flexDirection: 'row', flexWrap: 'wrap' },
  flowQuotaRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, paddingHorizontal: 4, marginBottom: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  flowQuotaFree: { fontSize: 12, color: colors.success },
  flowQuotaPaid: { fontSize: 12, color: colors.textDim },
  flowAiBtn: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  flowAiBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  flowLoadingBox: {
    alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16,
    backgroundColor: colors.inputBg, borderRadius: 14,
    borderWidth: 1, borderColor: colors.primary + '33',
    marginBottom: 6,
  },
  flowLoadingIcon: { fontSize: 36, marginBottom: 10 },
  flowLoadingText: { fontSize: 15, fontWeight: '600', color: colors.primary, marginBottom: 4 },
  flowLoadingSub: { fontSize: 12, color: colors.textMuted },
  flowFreeBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  flowFreeLabel: { fontSize: 12, color: colors.textDim, marginBottom: 6 },
  flowFreeNote: { marginTop: 8, marginBottom: 4, paddingHorizontal: 4 },
  flowFreeNoteText: { fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 16 },
  flowFreeNoteLink: { fontSize: 11, color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
  flowInput: {
    backgroundColor: colors.inputBg, borderRadius: 10, padding: 10,
    fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border,
    minHeight: 50, textAlignVertical: 'top',
  },
  flowSendBtn: {
    backgroundColor: colors.primary, borderRadius: 10, padding: 12,
    alignItems: 'center', marginTop: 8,
  },
  flowSendText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  flowCancel: { fontSize: 12, color: colors.textDim, marginTop: 10, textAlign: 'center', textDecorationLine: 'underline' },
  // 问答历史样式
  historyQuestion: {
    backgroundColor: colors.primary + '18',
    borderRadius: 10, padding: 8, paddingHorizontal: 12,
    marginBottom: 6, alignSelf: 'flex-end', maxWidth: '90%',
  },
  historyQuestionText: { fontSize: 13, color: colors.primary, lineHeight: 20 },
  // 追问内联加载
  followUpLoadingBox: {
    alignItems: 'center', paddingVertical: 16,
    backgroundColor: colors.inputBg, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginTop: 8,
  },
  followUpLoadingText: { fontSize: 13, color: colors.textDim },
});




