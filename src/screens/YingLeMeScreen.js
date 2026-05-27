// 赢了么 — 比赛预测
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, KeyboardAvoidingView, Alert, Keyboard,
} from 'react-native';
import { colors } from '../theme';
import { api } from '../api';
import { storage } from '../storage';
import LoadingModal from '../components/LoadingModal';
import DateTimePickerModal from '../components/DateTimePickerModal';
import PaymentModal from '../components/PaymentModal';

// 汉字笔画表（精选常见用字）
const STROKE_MAP = {
  '零':13,'一':1,'二':2,'三':3,'四':5,'五':4,'六':4,'七':2,'八':2,'九':2,'十':2,
  '东':5,'南':9,'西':6,'北':5,'中':4,'上':3,'下':3,'左':5,'右':5,'前':9,'后':6,
  '阿':7,'巴':4,'波':8,'德':15,'迪':8,'顿':10,'尔':5,'夫':4,'福':13,'格':10,
  '基':11,'吉':6,'加':5,'杰':8,'金':8,'卡':5,'科':9,'克':7,'拉':8,'莱':10,
  '兰':5,'朗':10,'勒':11,'雷':13,'里':7,'利':7,'连':7,'林':8,'隆':11,'鲁':12,
  '伦':6,'罗':8,'洛':9,'马':3,'曼':11,'梅':11,'门':3,'米':6,'密':11,'莫':10,
  '姆':8,'穆':16,'纳':7,'尼':5,'诺':10,'帕':8,'佩':8,'普':12,'奇':8,'乔':6,
  '萨':11,'塞':13,'桑':10,'森':12,'沙':7,'山':3,'申':5,'斯':12,'塔':12,'泰':10,
  '特':10,'提':12,'图':8,'托':6,'瓦':5,'维':14,'文':4,'沃':7,'锡':13,'夏':10,
  '亚':6,'扬':6,'耶':8,'伊':6,'因':6,'英':8,'约':6,'泽':8,'詹':13,'张':7,
  '联':12,'盟':13,'队':4,'球':11,'足':7,'篮':13,'排':11,'冠':9,'军':6,'赛':14,
  '战':9,'胜':9,'负':6,'王':4,'者':8,'人':2,'大':3,'国':8,'家':10,'州':6,'市':5,
  '城':9,'场':6,'馆':11,'运':7,'动':6,'员':10,'教':11,'练':8,'选':9,'手':4,
  '李':7,'王':4,'张':7,'刘':6,'陈':7,'杨':7,'赵':9,'黄':11,'周':8,'吴':7,
  '徐':10,'孙':6,'胡':9,'朱':6,'高':10,'林':8,'何':7,'郭':10,'梁':11,'宋':7,
  '的':8,'在':6,'有':6,'是':9,'和':8,'不':4,'了':2,'这':7,'那':6,'就':12,
  '年':6,'月':4,'日':4,'时':7,'间':7,'天':4,'地':6,'生':5,'成':6,'如':6,
  '出':5,'而':6,'多':6,'子':3,'他':5,'她':6,'开':4,'于':3,'名':6,'主':5,
  '文':4,'化':4,'学':8,'法':8,'度':9,'次':6,'比':4,'力':2,'等':12,'路':13,
  // ⚽ 队名常用补充
  '皇':9,'圣':5,'耳':6,'拜':9,'仁':4,'慕':14,'黑':12,
  '全':6,'京':8,'现':11,'代':5,'湖':12,'勇':9,'士':3,
  '凯':8,'切':4,'刺':8,'热':10,'火':4,'蒙':13,
  '浦':10,'红':9,'钻':10,'川':3,'崎':11,'锋':12,'蔚':14,
  '海':10,'港':12,'安':6,'广':15,'际':13,'雄':12,'鹿':16,
  '黎':15,'竞':20,'物':8,'耳':6,
};

const TRIGRAM_NAMES = ['','乾☰','兑☱','离☲','震☳','巽☴','坎☵','艮☶','坤☷'];
const TRIGRAM_WX = ['','金','金','火','木','木','水','土','土'];

function calcStrokeCount(text) {
  if (!text) return 0;
  text = text.trim();
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (STROKE_MAP[ch] !== undefined) {
      total += STROKE_MAP[ch];
    } else {
      total += Math.max(1, (ch.charCodeAt(0) % 20) + 4);
    }
  }
  return total;
}

function getToday() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

export default function YingLeMeScreen({ navigation }) {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [matchDate, setMatchDate] = useState(getToday());
  const [matchHour, setMatchHour] = useState('20');
  const [matchMinute, setMatchMinute] = useState('0');
  const [venue, setVenue] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadText, setLoadText] = useState('');
  const [result, setResult] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [processLog, setProcessLog] = useState([]); // 过程日志
  const scrollRef = useRef(null);
  const inputRefA = useRef(null);
  const inputRefB = useRef(null);
  const inputRefVenue = useRef(null);

  const scrollToInput = useCallback((ref) => {
    setTimeout(() => {
      ref.current?.measureLayout?.(scrollRef.current?.getInnerViewNode?.() || scrollRef.current, (x, y) => {
        scrollRef.current?.scrollTo?.({ y: Math.max(0, y - 100), animated: true });
      });
    }, 350);
  }, []);

  useEffect(() => {
    (async () => {
      const token = await storage.getToken();
      setIsLoggedIn(!!token);
    })();
  }, []);

  function addLog(icon, text) {
    setProcessLog(prev => [...prev, { icon, text, key: Date.now() + Math.random() }]);
  }

  function clearLog() {
    setProcessLog([]);
  }

  async function handlePredict() {
    if (!teamA.trim() || !teamB.trim()) {
      Alert.alert('提示', '请填写双方队名/姓名');
      return;
    }
    if (!isLoggedIn) {
      Alert.alert('请先登录', '登录后即可使用预测功能', [
        { text: '取消', style: 'cancel' },
        { text: '去登录', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }

    setLoading(true);
    setLoadText('正在计算...');
    setResult(null);
    clearLog();

    try {
      // Step 1: 真太阳时修正 + 排盘（全部在后台完成）
      addLog('⏳', '第1步：天时勘定（真太阳时校准 + 场地坐标检索）...');
      setLoadText('第1步：天时勘定...');
      const dateTime = matchDate + ' ' + matchHour + ':' + matchMinute;
      
      // 所有计算交给后端：场地坐标查找 → 时区转换 → 真太阳时 → 排盘
      // 前端只需传原始数据
      const res = await api.yingLeMe({
        teamA: teamA.trim(),
        teamB: teamB.trim(),
        matchDate: dateTime,
        venue: venue.trim() || '未指定',
      });
      addLog('✅', '第1步完成：真太阳时已校准');

      // Step 2: 地理方位推演
      addLog('⏳', '第2步：推演地理方位（场地+队伍所属地检索）...');
      setLoadText('第2步：推演地理方位...');
      addLog('✅', '第2步完成：场地/队伍方位已纳入天时');

      // Step 3: AI预测
      addLog('⏳', '第3步：AI天机推演中...');
      setLoadText('第3步：AI天机推演...');
      setResult(res.result || '⚠️ 预测失败，请重试');
      // 查不到地址/队名信息时弹提示，不展示结果
      if (res.warning) {
        Alert.alert('提示', res.warning);
        addLog('⚠️', '信息不全，已中断预测');
        setLoadText('');
        setLoading(false);
        return;
      }
      setResult(res.result || '⚠️ 预测失败，请重试');
      addLog('✅', '第3步完成：预测已定 ✓');
      if (e.message && e.message.includes('配额')) {
        Alert.alert('配额不足', e.message, [
          { text: '取消', style: 'cancel' },
          { text: '去充值', onPress: () => setShowPayment(true) },
        ]);
      } else {
        Alert.alert('预测失败', e.message || '请稍后重试');
      }
      addLog('❌', `出错：${e.message}`);
    } finally {
      setLoading(false);
      setLoadText('');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* 标题 */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>⚔️</Text>
          <View>
            <Text style={styles.headerTitle}>赢了么</Text>
            <Text style={styles.headerSub}>比赛对阵 · 天时方位预测</Text>
          </View>
        </View>

        {/* 主队 */}
        <Text style={styles.label}>🏆 主队/选手A</Text>
        <TextInput
          ref={inputRefA}
          style={styles.input}
          value={teamA}
          onChangeText={setTeamA}
          placeholder="输入队名或人名"
          placeholderTextColor={colors.textMuted}
          onFocus={() => scrollToInput(inputRefA)}
        />

        {/* 客队 */}
        <Text style={styles.label}>🏆 客队/选手B</Text>
        <TextInput
          ref={inputRefB}
          style={styles.input}
          value={teamB}
          onChangeText={setTeamB}
          placeholder="输入队名或人名"
          placeholderTextColor={colors.textMuted}
          onFocus={() => scrollToInput(inputRefB)}
        />

        {/* 比赛时间 */}
        <Text style={styles.label}>📅 比赛时间（当地时间）</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => {
            setShowDatePicker(true);
            // 弹窗前先滚动到顶部，避免被弹窗覆盖后看不到上下文
            setTimeout(() => scrollRef.current?.scrollTo?.({ y: 0, animated: true }), 50);
          }}
        >
          <Text style={[styles.inputText, matchDate ? null : styles.placeholder]}>
            {matchDate
              ? `${matchDate} ${matchHour}:${matchMinute}`
              : '点击选择比赛时间'}
          </Text>
        </TouchableOpacity>

        {/* 场地 */}
        <Text style={styles.label}>📍 比赛场地</Text>
        <TextInput
          ref={inputRefVenue}
          style={styles.input}
          value={venue}
          onChangeText={setVenue}
          placeholder="如：北京国家体育场 / 圣地亚哥伯纳乌"
          placeholderTextColor={colors.textMuted}
          onFocus={() => scrollToInput(inputRefVenue)}
        />

        {/* 预测按钮 */}
        <TouchableOpacity
          style={[styles.predictBtn, loading && styles.predictBtnDisabled]}
          onPress={handlePredict}
          disabled={loading}
        >
          <Text style={styles.predictBtnText}>
            {loading ? '⏳ 预测中...' : '⚔️ 预测胜负'}
          </Text>
        </TouchableOpacity>

        {/* 过程日志（逐步展示） */}
        {processLog.length > 0 && (
          <View style={styles.logCard}>
            {processLog.map((log, i) => (
              <Text key={log.key || i} style={styles.logLine}>
                {log.icon} {log.text}
              </Text>
            ))}
          </View>
        )}

        {/* 结果 */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        )}
      </ScrollView>

      {/* 日期选择器 */}
      <DateTimePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(date, hour, minute) => {
          setMatchDate(date);
          setMatchHour(hour);
          setMatchMinute(minute);
        }}
        initialDate={matchDate}
        initialHour={matchHour}
        initialMinute={matchMinute}
      />

      {/* 加载弹窗 */}
      <LoadingModal visible={loading} text={loadText} />

      {/* 充值弹窗 */}
      <PaymentModal
        visible={showPayment}
        onClose={() => setShowPayment(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    padding: 16, paddingBottom: 80,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 24, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerIcon: { fontSize: 32 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#43b581' },
  headerSub: { fontSize: 13, color: colors.textDim, marginTop: 2 },
  label: {
    fontSize: 13, color: colors.textDim, marginBottom: 6, marginTop: 12,
  },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text,
  },
  inputText: { fontSize: 15, color: colors.text },
  placeholder: { color: colors.textMuted },
  predictBtn: {
    backgroundColor: '#43b581', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 24,
  },
  predictBtnDisabled: { opacity: 0.5 },
  predictBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  logCard: {
    backgroundColor: '#1a2332', borderWidth: 1, borderColor: '#2a3a4a',
    borderRadius: 10, padding: 12, marginTop: 16,
  },
  logLine: {
    fontSize: 12, color: '#8ab4f8', marginBottom: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  resultCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: '#43b58144',
    borderRadius: 12, padding: 16, marginTop: 16,
  },
  resultText: {
    fontSize: 14, color: '#ccc', lineHeight: 22,
  },
});
