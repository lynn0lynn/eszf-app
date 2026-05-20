// 问数页 — 排盘输入 + 结果 + 五问
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, KeyboardAvoidingView, Modal,
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

export default function BaziScreen({ navigation }) {
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
  const [followUpResult, setFollowUpResult] = useState(null);
  const [showFreeAsk, setShowFreeAsk] = useState(false);
  const [freeAskText, setFreeAskText] = useState('');
  const [freeAskResult, setFreeAskResult] = useState(null);
  // 五问本地流运展示
  const [flowInfoType, setFlowInfoType] = useState(null); // 当前选中的五问类型
  const [flowQuestion, setFlowQuestion] = useState('');   // 用户输入的问题
  const [flowResult, setFlowResult] = useState(null);      // AI回答
  const [flowLoading, setFlowLoading] = useState(false);   // AI加载中
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const scrollRef = useRef(null);
  const followUpRef = useRef(null);

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

    // 自由问答(第6个) → 直接弹输入框
    if (type === 'freeask') {
      setShowFreeAsk(true);
      return;
    }

    // 前5个 → 展示流运信息 + 用户可自由提问
    setFlowInfoType(type);
    setAiResult(null);
    setFollowUpResult(null);
    setFreeAskResult(null);
    setFlowResult(null);
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

    setFlowLoading(true);
    try {
      const data = await api.aiAsk(baziData, type, '', true); // free=true 不扣费
      setFlowResult(data.result);
      if (isLoggedIn) {
        try { const q = await api.getQuota(getBaziId(baziData)); setQuota(q); } catch (e) {}
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e) {
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

    setFlowLoading(true);
    try {
      const data = await api.customAsk(question, '', getBaziId(baziData), baziData);
      setFlowResult(data.answer);
      setFlowQuestion('');
      if (isLoggedIn) {
        try { const q = await api.getQuota(getBaziId(baziData)); setQuota(q); } catch (e) {}
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e) {
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
      if (e.message === 'quota_exhausted') {
        setShowPayment(true);
      } else {
        alert('追问失败：' + e.message);
      }
    } finally {
      setLoading(false);
    }
  }

  // 自由问答
  async function handleFreeAsk() {
    if (!freeAskText.trim()) { alert('请输入你想问的问题'); return; }
    if (!baziData) { alert('请先排盘'); return; }
    setShowFreeAsk(false);
    setLoading(true);
    setLoadText('正在思考你的问题...');
    setFreeAskResult(null);
    try {
      const data = await api.customAsk(
        freeAskText.trim(),
        '',
        getBaziId(baziData),
        baziData
      );
      setFreeAskResult(data.answer);
      setFreeAskText('');
      if (isLoggedIn) {
        try { const q = await api.getQuota(getBaziId(baziData)); setQuota(q); } catch (e) {}
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e) {
      if (e.message === 'quota_exhausted') {
        setShowPayment(true);
      } else {
        alert('自由问答失败：' + e.message);
      }
    } finally {
      setLoading(false);
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

  return (
    <>
      <KeyboardAvoidingView style={styles.outer} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* 配额栏 */}
          {quota && isLoggedIn ? (
            <View style={styles.quotaBar}>
              <View style={styles.quotaRow}>
                <Text style={styles.quotaText}>
                  🎯 免费 {quota.remainingFree || 0}/{quota.dailyFree || 3}次 · 📦 {quota.paidQuestions || 0}次 · ⚡ {((quota.tokenBalance || 0) / 10000).toFixed(1)}万
                </Text>
                <TouchableOpacity style={styles.quotaRechargeBtn} onPress={() => setShowPayment(true)}>
                  <Text style={styles.quotaRechargeText}>💰 充值</Text>
                </TouchableOpacity>
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
                <View style={styles.flowCard}>
                  {/* 话题标签 */}
                  <View style={styles.flowTopicRow}>
                    <Text style={styles.flowTopicIcon}>{flowInfoType === 'health' ? '🏥' : flowInfoType === 'career' ? '💼' : flowInfoType === 'marriage' ? '💑' : flowInfoType === 'children' ? '👨‍👩‍👧‍👦' : '💰'}</Text>
                    <Text style={styles.flowTopicText}>{flowInfoType === 'health' ? '健康养生' : flowInfoType === 'career' ? '事业学业' : flowInfoType === 'marriage' ? '婚姻感情' : flowInfoType === 'children' ? '六亲眷属' : '亨通聚富'}</Text>
                  </View>

                  {/* ===== 流运信息（完整数据） ===== */}
                  <View style={styles.flowLocalData}>
                    <Text style={styles.flowLocalTitle}>📅 今日流运 · {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</Text>
                    <View style={styles.flowLocalBody}>

                      {/* ──── 一、本命信息 ──── */}
                      <Text style={styles.flowSecTitle}>🏠 本命信息</Text>
                      {/* 四柱+纳音 */}
                      <Text style={styles.flowLine}>
                        四柱：{baziData.yearPillar?.ganZhi || '--'}（{baziData.naYin?.year || '？'}）
                        {' '}{baziData.monthPillar?.ganZhi || '--'}（{baziData.naYin?.month || '？'}）
                        {' '}{baziData.dayPillar?.ganZhi || '--'}（{baziData.naYin?.day || '？'}）
                        {' '}{baziData.hourPillar?.ganZhi || '--'}（{baziData.naYin?.hour || '？'}）
                      </Text>
                      {/* 日主+五行 */}
                      {baziData.wxStats?.dayWx ? (
                        <Text style={styles.flowLine}>
                          日主：{baziData.dayPillar?.ganName || '？'}{baziData.wxStats.dayWx}
                          {baziData.wxStats.isStrong ? '偏旺' : '偏弱'}
                          {' · '}喜用神{baziData.wxStats.maxWx || '？'} 忌神{baziData.wxStats.minWx || '？'}
                          {' · '}五行能量：{baziData.wxStats.stats ? Object.entries(baziData.wxStats.stats).map(([k,v])=>`${k}${v}`).join(' ') : ''}
                        </Text>
                      ) : null}
                      {/* 十二长生 */}
                      {baziData.shiErChangSheng && baziData.shiErChangSheng.length > 0 ? (
                        <Text style={styles.flowLine}>
                          十二长生：年{baziData.shiErChangSheng[0]?.state || '？'}
                          {' · '}月{baziData.shiErChangSheng[1]?.state || '？'}
                          {' · '}日{baziData.shiErChangSheng[2]?.state || '？'}
                          {' · '}时{baziData.shiErChangSheng[3]?.state || '？'}
                        </Text>
                      ) : null}
                      {/* 天干十神 */}
                      {baziData.shiShen ? (
                        <Text style={styles.flowLine}>
                          十神（天干）：年{baziData.shiShen.year || '？'}
                          {' · '}月{baziData.shiShen.month || '？'}
                          {' · '}日{baziData.shiShen.day || '？'}
                          {' · '}时{baziData.shiShen.hour || '？'}
                        </Text>
                      ) : null}
                      {/* 藏干十神 */}
                      {baziData.cangGanShiShen ? (
                        <Text style={styles.flowSmallLine}>
                          藏干十神：{Object.entries(baziData.cangGanShiShen).map(([pillar, gans]) =>
                            `${pillar}柱[${gans.map(g => g.gan + g.shiShen).join('/')}]`
                          ).join(' ')}
                        </Text>
                      ) : null}
                      {/* 空亡 */}
                      {baziData.kongWang ? (
                        <Text style={styles.flowLine}>空亡：{baziData.kongWang}</Text>
                      ) : null}
                      {/* 胎元+命宫 */}
                      <View style={styles.flowInlineRow}>
                        {baziData.taiYuan ? (
                          <Text style={styles.flowLine}>胎元：{baziData.taiYuan.ganZhi}（{baziData.taiYuan.naYin || '？'}）</Text>
                        ) : null}
                        {baziData.mingGong ? (
                          <Text style={styles.flowLine}>　命宫：{baziData.mingGong.ganZhi}（{baziData.mingGong.naYin || '？'}）</Text>
                        ) : null}
                      </View>
                      {/* 本命神煞（取前6个） */}
                      {baziData.shenSha ? (
                        <Text style={styles.flowSmallLine}>
                          神煞：{Object.entries(baziData.shenSha).slice(0, 6).map(([name, info]) =>
                            `${name}(${info.type}${info.position ? `·${info.position}` : ''})`
                          ).join(' ')}
                          {Object.keys(baziData.shenSha).length > 6 ? '...' : ''}
                        </Text>
                      ) : null}

                      {/* ──── 二、大运 ──── */}
                      {baziData.currentDaYun && baziData.currentDaYun.length > 0 ? (
                        <>
                          <Text style={styles.flowSecTitle}>🏃 大运（{baziData.daYun?.direction === '顺排' ? '顺排' : '逆排'}）</Text>
                          {baziData.qiYunAge ? (
                            <Text style={styles.flowSmallLine}>起运年龄：{baziData.qiYunAge.age}岁{baziData.qiYunAge.months ? `${baziData.qiYunAge.months}个月` : ''}</Text>
                          ) : null}
                          {baziData.currentDaYun.map((dy, i) => (
                            <Text key={i} style={styles.flowSmallLine}>
                              {i + 1}. {dy.yunGanZhi || dy.ganZhi}（{dy.naYin || '？'}）{dy.fromAge && dy.toAge ? ` ${dy.fromAge}-${dy.toAge}岁` : ''}{dy.fromYear && dy.toYear ? ` [${dy.fromYear}-${dy.toYear}]` : ''}
                            </Text>
                          ))}
                        </>
                      ) : null}

                      {/* ──── 三、流年 ──── */}
                      {baziData.liuNian ? (
                        <>
                          <Text style={styles.flowSecTitle}>🌟 流年【{baziData.liuNian.year}年】</Text>
                          <Text style={styles.flowLine}>
                            干支：{baziData.liuNian.ganZhi || '？'}
                            {' · '}生肖：{baziData.liuNian.shengXiao || '？'}
                            {' · '}纳音：{baziData.liuNian.naYin || '？'}
                          </Text>
                          <Text style={styles.flowSmallLine}>
                            五行：{baziData.liuNian.wuXing || '？'}
                            {' · '}十神：{baziData.liuNian.shiShen || '？'}
                          </Text>
                          {/* 流年神煞 */}
                          {baziData.liuShenSha?.year ? (
                            <Text style={styles.flowSmallLine}>
                              神煞：{Object.entries(baziData.liuShenSha.year).map(([name, info]) =>
                                `${name}(${info.type})`
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
                              神煞：{Object.entries(baziData.liuShenSha.month).map(([name, info]) =>
                                `${name}(${info.type})`
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
                              神煞：{Object.entries(baziData.liuShenSha.day).map(([name, info]) =>
                                `${name}(${info.type})`
                              ).join('、')}
                            </Text>
                          ) : null}
                        </>
                      ) : null}

                    </View>
                  </View>

                  {/* 配额状态 */}
                  {quota ? (
                    <View style={styles.flowQuotaRow}>
                      <Text style={styles.flowQuotaFree}>🆓 免费 {quota.remainingFree || 0}次</Text>
                      <Text style={styles.flowQuotaPaid}>📦 {quota.paidQuestions || 0}次 · ⚡ {((quota.tokenBalance || 0) / 10000).toFixed(1)}万</Text>
                    </View>
                  ) : null}

                  {/* AI分析按钮（触发AI分析该话题） */}
                  {flowLoading ? (
                    <View style={styles.flowLoadingBox}>
                      <Text style={styles.flowLoadingIcon}>🤖</Text>
                      <Text style={styles.flowLoadingText}>AI分析中...</Text>
                      <Text style={styles.flowLoadingSub}>正在结合八字+流运进行分析</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.flowAiBtn} onPress={handleFlowAiAsk}>
                      <Text style={styles.flowAiBtnText}>🤖 AI深度分析{flowInfoType === 'health' ? '健康' : flowInfoType === 'career' ? '事业' : flowInfoType === 'marriage' ? '婚姻' : flowInfoType === 'children' ? '六亲' : '财运'}</Text>
                    </TouchableOpacity>
                  )}

                  {/* AI回答结果 */}
                  {flowResult ? (
                    <>
                      <AiResultBlock result={flowResult} title="🤖 AI分析结果" />
                      {/* 自由提问框（AI结果下方） */}
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
                        <TouchableOpacity style={styles.flowSendBtn} onPress={handleFlowSend}>
                          <Text style={styles.flowSendText}>发送追问</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : null}

                  {/* 关闭按钮 */}
                  <TouchableOpacity onPress={() => { setFlowInfoType(null); setFlowResult(null); setFlowQuestion(''); }}>
                    <Text style={styles.flowCancel}>关闭</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* AI结果 */}
              {aiResult ? (
                <AiResultBlock result={aiResult} title={aiTitle} />
              ) : null}
              {followUpResult ? (
                <AiResultBlock result={followUpResult} title="💬 追问回答" />
              ) : null}
              {freeAskResult ? (
                <AiResultBlock result={freeAskResult} title="💬 自由问答" />
              ) : null}

              {/* 追问输入 */}
              {aiResult && isLoggedIn ? (
                <View style={styles.followUpBox}>
                  <Text style={styles.followUpTitle}>💬 追问</Text>
                  <TextInput ref={followUpRef} style={styles.followUpInput}
                    placeholder="输入你的追问..." placeholderTextColor={colors.textMuted}
                    value={followUpText} onChangeText={setFollowUpText}
                    multiline numberOfLines={3}
                    returnKeyType="default"
                  />
                  <TouchableOpacity style={styles.followUpBtn} onPress={handleFollowUp} disabled={loading}>
                    <Text style={styles.followUpBtnText}>发送追问</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingModal visible={loading} text={loadText} />
      {/* 自由问答弹窗 */}
      <Modal transparent visible={showFreeAsk} animationType="fade" onRequestClose={() => setShowFreeAsk(false)}>
        <View style={freeModalStyles.overlay}>
          <View style={freeModalStyles.box}>
            <Text style={freeModalStyles.title}>💬 自由问答</Text>
            <Text style={freeModalStyles.desc}>有什么想问的？AI结合你的八字和流运进行分析</Text>
            <TextInput style={freeModalStyles.input}
              placeholder="输入你想问的问题..." placeholderTextColor={colors.textMuted}
              value={freeAskText} onChangeText={setFreeAskText}
              multiline numberOfLines={4}
              autoFocus
            />
            <View style={freeModalStyles.btnRow}>
              <TouchableOpacity style={freeModalStyles.cancelBtn} onPress={() => { setShowFreeAsk(false); setFreeAskText(''); }}>
                <Text style={freeModalStyles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={freeModalStyles.sendBtn} onPress={handleFreeAsk}>
                <Text style={freeModalStyles.sendBtnText}>发送</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
});

const freeModalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  box: { backgroundColor: colors.card, borderRadius: 20, padding: 24, width: '88%', borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 6 },
  desc: { fontSize: 13, color: colors.textDim, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  input: { backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, minHeight: 100, textAlignVertical: 'top' },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { fontSize: 14, color: colors.textDim },
  sendBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
  sendBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
});
