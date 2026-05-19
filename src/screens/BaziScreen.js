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
import DatePickerModal from '../components/DatePickerModal';
import CityPickerModal from '../components/CityPickerModal';
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
  const [dailyTip, setDailyTip] = useState(null);
  const [dailyTipLoading, setDailyTipLoading] = useState(false);
  const [monthlyTip, setMonthlyTip] = useState(null);
  const [yearlyTip, setYearlyTip] = useState(null);
  const [pendingWuWen, setPendingWuWen] = useState(null); // {type, label, icon}
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

  // 排盘完成后自动加载今日运势
  React.useEffect(() => {
    if (!baziData || !isLoggedIn) return;
    (async () => {
      setDailyTip(null);
      setMonthlyTip(null);
      setYearlyTip(null);
      setDailyTipLoading(true);
      try {
        // 今日流日运势 - 免费每日提示
        const tipData = await api.aiAsk(baziData, 'daily_tip', '');
        if (tipData && tipData.result) setDailyTip(tipData.result);
      } catch (e) {
        console.log('Daily tip unavailable:', e.message);
      } finally {
        setDailyTipLoading(false);
      }
    })();
  }, [baziData, isLoggedIn]);

  // 五问：第一步 → 展示流运信息 + AI确认按钮
  async function handleWuWen(type) {
    if (!isLoggedIn) {
      alert('请先登录后使用AI分析');
      navigation.navigate('Login');
      return;
    }
    if (!baziData) return;

    // 自由问答 → 弹出输入框
    if (type === 'freeask') {
      setShowFreeAsk(true);
      return;
    }

    // 检查配额
    if (quota) {
      const hasFree = (quota.remainingFree || 0) > 0;
      const hasPaid = (quota.paidQuestions || 0) > 0;
      const hasToken = (quota.tokenBalance || 0) > 0;
      if (!hasFree && !hasPaid && !hasToken) {
        alert('😅 免费次数已用完，需要先充值才能继续分析。\n请在电脑上访问 eszf.com.cn 充值。');
        return;
      }
    }

    const labels = {
      health: { label: '健康养生', icon: '🏥', color: '#4ade80' },
      career: { label: '事业学业', icon: '💼', color: '#667eea' },
      marriage: { label: '婚姻感情', icon: '💑', color: '#f472b6' },
      children: { label: '六亲眷属', icon: '👨‍👩‍👧‍👦', color: '#f0a040' },
      decision: { label: '亨通聚富', icon: '💰', color: '#ffd700' },
    };

    // 设置待确认状态 → 显示流运信息 + AI按钮（不直接调API）
    setPendingWuWen({ type, ...labels[type] });
    setAiResult(null);
    setFollowUpResult(null);
    setFreeAskResult(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
  }

  // 五问：第二步 → 用户点击"AI深度解读"后真正调API
  async function handleConfirmAi() {
    if (!pendingWuWen) return;
    const type = pendingWuWen.type;

    setPendingWuWen(null); // 隐藏确认区
    setLoading(true);
    setLoadText('正在请求AI深度解读...');

    try {
      const data = await api.aiAsk(baziData, type, '');
      setAiResult(data.result);
      setAiTitle('🤖 ' + pendingWuWen.label + ' · AI深度解读');
      // 刷新配额
      if (isLoggedIn) {
        try { const q = await api.getQuota(getBaziId(baziData)); setQuota(q); } catch (e) {}
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e) {
      const msg = e.message;
      if (msg === 'quota_exhausted') {
        alert('😅 免费次数已用完，需要先充值才能继续分析。\n请在电脑上访问 eszf.com.cn 充值。');
      } else {
        alert('AI分析失败：' + msg);
      }
    } finally {
      setLoading(false);
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
        alert('😅 免费次数已用完，需要先充值才能继续分析。\n请在电脑上访问 eszf.com.cn 充值。');
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
      const msg = e.message;
      if (msg === 'quota_exhausted') {
        alert('😅 免费次数已用完，需要先充值才能继续分析。\n请在电脑上访问 eszf.com.cn 充值。');
      } else {
        alert('追问失败：' + msg);
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
      const msg = e.message;
      if (msg === 'quota_exhausted') {
        alert('😅 免费次数已用完，需要先充值才能继续分析。\n请在电脑上访问 eszf.com.cn 充值。');
      } else {
        alert('自由问答失败：' + msg);
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
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateBtnText}>{formatDateDisplay(birthDate)}</Text>
              <Text style={styles.dateIcon}>📅</Text>
            </TouchableOpacity>

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

              {/* 每日运势提醒 */}
              {baziData && isLoggedIn ? (
                <View style={styles.tipCard}>
                  <View style={styles.tipHeader}>
                    <Text style={styles.tipTitle}>📅 今日流日运势</Text>
                    <Text style={styles.tipDate}>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</Text>
                  </View>
                  {dailyTipLoading ? (
                    <Text style={styles.tipLoading}>加载中...</Text>
                  ) : dailyTip ? (
                    <Text style={styles.tipText}>{dailyTip}</Text>
                  ) : null}
                  {/* 本月/今年 + 提醒按钮 */}
                  <View style={styles.tipBtns}>
                    <TouchableOpacity style={styles.tipBtn} onPress={async () => {
                      try {
                        setLoading(true); setLoadText('正在分析本月运势...');
                        const d = await api.aiAsk(baziData, 'monthly_tip', '');
                        setMonthlyTip(d.result);
                        setLoading(false);
                      } catch(e) { setLoading(false); alert('获取失败'); }
                    }}>
                      <Text style={styles.tipBtnText}>📆 本月运势</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tipBtn} onPress={async () => {
                      try {
                        setLoading(true); setLoadText('正在分析今年运势...');
                        const d = await api.aiAsk(baziData, 'yearly_tip', '');
                        setYearlyTip(d.result);
                        setLoading(false);
                      } catch(e) { setLoading(false); alert('获取失败'); }
                    }}>
                      <Text style={styles.tipBtnText}>📅 今年运势</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tipBtn, styles.tipBtnAccent]} onPress={handleSetupReminder}>
                      <Text style={[styles.tipBtnText, styles.tipBtnAccentText]}>🔔 开启每日提醒</Text>
                    </TouchableOpacity>
                  </View>
                  {/* 本月/今年详情 */}
                  {monthlyTip ? (
                    <View style={styles.tipDetail}>
                      <Text style={styles.tipDetailTitle}>📆 本月运势</Text>
                      <Text style={styles.tipText}>{monthlyTip}</Text>
                    </View>
                  ) : null}
                  {yearlyTip ? (
                    <View style={styles.tipDetail}>
                      <Text style={styles.tipDetailTitle}>📅 今年运势</Text>
                      <Text style={styles.tipText}>{yearlyTip}</Text>
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

              {/* 待确认 → 流运信息 + AI按钮 */}
              {pendingWuWen ? (
                <View style={styles.confirmCard}>
                  {/* 流运信息（本地免费展示） */}
                  <View style={styles.flowInfo}>
                    <Text style={styles.flowTitle}>📍 流运信息 · {pendingWuWen.label}</Text>
                    <Text style={styles.flowDate}>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                  </View>
                  <View style={styles.flowBody}>
                    <Text style={styles.flowPillars}>
                      本命：{baziData.yearPillar?.ganZhi || '--'} {baziData.monthPillar?.ganZhi || '--'} {baziData.dayPillar?.ganZhi || '--'} {baziData.hourPillar?.ganZhi || '--'}
                    </Text>
                    {baziData.wxStats?.dayWx ? (
                      <Text style={styles.flowDetail}>
                        日主{baziData.wxStats.dayWx}{baziData.wxStats.isStrong ? '偏旺' : '偏弱'}
                        {baziData.wxStats.maxWx ? ` · 喜${baziData.wxStats.maxWx} 忌${baziData.wxStats.minWx}` : ''}
                      </Text>
                    ) : null}
                    {baziData.shiShen?.day ? (
                      <Text style={styles.flowDetail}>日主十神：{baziData.shiShen.day}</Text>
                    ) : null}
                  </View>

                  {/* AI确认触发按钮 */}
                  <View style={styles.confirmTrigger}>
                    <Text style={styles.confirmLabel}>💡 以上为本地基础流运信息。点击下方按钮获取 AI 深度解读：</Text>
                    <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmAi} disabled={loading}>
                      <Text style={styles.confirmBtnIcon}>{pendingWuWen.icon}</Text>
                      <Text style={styles.confirmBtnText}>🤖 AI深度解读{pendingWuWen.label}</Text>
                    </TouchableOpacity>
                    <Text style={styles.confirmQuota}>
                      配额：🆓 {quota?.remainingFree || 0}次 · 📦 {quota?.paidQuestions || 0}次 · ⚡ {((quota?.tokenBalance || 0) / 10000).toFixed(1)}
                    </Text>
                    <TouchableOpacity onPress={() => setPendingWuWen(null)}>
                      <Text style={styles.confirmCancel}>取消</Text>
                    </TouchableOpacity>
                  </View>
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
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={setBirthDate}
        initialDate={birthDate}
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
  quotaText: { fontSize: 11, color: colors.textDim, textAlign: 'center' },
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
  // 运势提醒卡片
  tipCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary + '44', marginBottom: 12 },
  tipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tipTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  tipDate: { fontSize: 12, color: colors.textMuted },
  tipLoading: { fontSize: 13, color: colors.textDim, textAlign: 'center', padding: 10 },
  tipText: { fontSize: 13, color: colors.textDim, lineHeight: 20 },
  tipBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tipBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBg },
  tipBtnAccent: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  tipBtnText: { fontSize: 12, color: colors.text, fontWeight: '500' },
  tipBtnAccentText: { color: colors.primary },
  tipDetail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  tipDetailTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  // 五问确认卡（流运信息+AI按钮）
  confirmCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.primary + '44', marginBottom: 12,
  },
  flowInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  flowTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  flowDate: { fontSize: 11, color: colors.textMuted },
  flowBody: { backgroundColor: colors.inputBg, borderRadius: 10, padding: 12, marginBottom: 12 },
  flowPillars: { fontSize: 13, color: colors.text, lineHeight: 20 },
  flowDetail: { fontSize: 12, color: colors.textDim, marginTop: 4 },
  confirmTrigger: { alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  confirmLabel: { fontSize: 12, color: colors.textDim, textAlign: 'center', marginBottom: 10, lineHeight: 16 },
  confirmBtn: {
    flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center',
    width: '100%',
  },
  confirmBtnIcon: { fontSize: 20, marginRight: 6 },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  confirmQuota: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
  confirmCancel: { fontSize: 12, color: colors.textDim, marginTop: 10, textDecorationLine: 'underline' },
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
