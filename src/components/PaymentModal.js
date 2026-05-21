// 充值弹窗 — 套餐选择 + 支付宝支付（含支付后反馈）
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, Linking, AppState } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';

const PACKAGES = {
  count: [
    { id: 'count_1',  name: '1次包',   price: 1.00,  unit: '次',  quantity: 1    },
    { id: 'count_30', name: '30次包',  price: 10.00, unit: '次',  quantity: 30   },
  ],
  token: [
    { id: 'token_1m',  name: '100万包',      price: 30.00, unit: 'Tokens', quantity: 1000000  },
    { id: 'token_10m', name: '🎉 限时特价 1000万包', price: 50.00, unit: 'Tokens', quantity: 10000000 },
  ],
};

export default function PaymentModal({ visible, onClose, onSuccess }) {
  const [tab, setTab] = useState('count');
  const [paying, setPaying] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false); // 已打开浏览器，等待支付完成
  const appStateRef = useRef(AppState.currentState);

  // 监测APP从后台回到前台 → 自动刷新配额提示
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // 用户从浏览器返回APP → 提示刷新
        if (paymentPending) {
          // 不自动刷新，让用户手动点按钮确认
        }
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [paymentPending]);

  // 重置状态
  useEffect(() => {
    if (!visible) {
      setPaymentPending(false);
      setPaying(false);
    }
  }, [visible]);

  async function handlePay(pkgId) {
    setPaying(true);
    try {
      const data = await api.createOrder(pkgId);
      let payUrl = data.payUrl || '';
      if (!payUrl && typeof data.payHtml === 'string') {
        if (data.payHtml.startsWith('http')) {
          payUrl = data.payHtml;
        }
      }
      if (payUrl) {
        // 记录当前套餐名
        const pkg = [...PACKAGES.count, ...PACKAGES.token].find(p => p.id === pkgId);
        // 在系统浏览器中打开支付宝支付页面
        const opened = await Linking.openURL(payUrl).catch(() => false);
        if (!opened) {
          alert('请复制以下链接到浏览器中完成支付：\n' + payUrl.substring(0, 100) + '...');
        }
        // 切换到"等待支付"状态
        setPaymentPending(true);
        setPaying(false);
        return; // 不关闭弹窗，让用户手动确认
      } else {
        alert('无法获取支付链接，请稍后重试');
      }
    } catch (e) {
      alert('创建订单失败：' + e.message);
    } finally {
      setPaying(false);
    }
  }

  /** 用户手动确认支付完成 → 刷新配额 */
  async function handlePaymentDone() {
    try {
      await onSuccess(); // 刷新配额
      setPaymentPending(false);
      onClose();
      alert('✅ 充值成功！配额已更新');
    } catch (e) {
      // 配额可能还没更新（异步通知延迟），提示用户稍后重试
      alert('配额尚未更新，请确认支付已完成。\n如已支付成功，稍后重新打开即可。');
    }
  }

  // ===== 支付进行中状态 =====
  if (paymentPending) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.box}>
            <View style={styles.header}>
              <Text style={styles.title}>⏳ 等待支付</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeBtn}>&times;</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pendingBox}>
              <Text style={styles.pendingIcon}>🛒</Text>
              <Text style={styles.pendingTitle}>已打开支付宝页面</Text>
              <Text style={styles.pendingDesc}>
                请在浏览器中完成支付，支付成功后点击下方按钮确认
              </Text>

              <View style={styles.pendingSteps}>
                <Text style={styles.pendingStep}>1. 在支付宝中完成支付</Text>
                <Text style={styles.pendingStep}>2. 支付成功后会显示"✅ 充值成功"</Text>
                <Text style={styles.pendingStep}>3. 返回本APP，点击下方按钮</Text>
              </View>

              <TouchableOpacity style={styles.pendingDoneBtn} onPress={handlePaymentDone}>
                <Text style={styles.pendingDoneBtnText}>✅ 已完成支付，刷新配额</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }}>
                <Text style={styles.footerLink}>暂不处理，稍后再说</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ===== 套餐选择 =====
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          {/* 顶部 */}
          <View style={styles.header}>
            <Text style={styles.title}>💰 选择套餐</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>&times;</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'count' && styles.tabActive]}
              onPress={() => setTab('count')}
            >
              <Text style={[styles.tabText, tab === 'count' && styles.tabTextActive]}>📦 按次</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'token' && styles.tabActive]}
              onPress={() => setTab('token')}
            >
              <Text style={[styles.tabText, tab === 'token' && styles.tabTextActive]}>⚡ Tokens</Text>
            </TouchableOpacity>
          </View>

          {/* 套餐列表 */}
          <View style={styles.pkgList}>
            {PACKAGES[tab].map(pkg => (
              <TouchableOpacity
                key={pkg.id}
                style={styles.pkgCard}
                onPress={() => handlePay(pkg.id)}
                disabled={paying}
              >
                <View>
                  <Text style={styles.pkgName}>{pkg.name}</Text>
                  <Text style={styles.pkgUnit}>{pkg.quantity.toLocaleString()} {pkg.unit}</Text>
                </View>
                <View style={styles.pkgRight}>
                  <Text style={styles.pkgPrice}>¥{pkg.price.toFixed(2)}</Text>
                  {paying ? (
                    <Text style={styles.pkgPaying}>处理中...</Text>
                  ) : (
                    <Text style={styles.pkgBuy}>购买套餐</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* 底部 */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.footerLink}>暂不购买，继续免费使用</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  box: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  closeBtn: { fontSize: 24, color: colors.textMuted, padding: 4 },
  tabs: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 16,
    borderRadius: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.inputBg },
  tabActive: { backgroundColor: colors.primary + '30' },
  tabText: { fontSize: 14, color: colors.textDim, fontWeight: '500' },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  pkgList: { paddingHorizontal: 20, paddingTop: 12 },
  pkgCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.inputBg, borderRadius: 12,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  pkgName: { fontSize: 15, fontWeight: '600', color: colors.text },
  pkgUnit: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  pkgRight: { alignItems: 'flex-end' },
  pkgPrice: { fontSize: 18, fontWeight: '700', color: colors.primary },
  pkgBuy: { fontSize: 12, color: colors.primary, marginTop: 2, fontWeight: '500' },
  pkgPaying: { fontSize: 11, color: colors.warning, marginTop: 2 },
  footer: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  footerLink: { fontSize: 12, color: colors.textDim, textDecorationLine: 'underline' },
  // 等待支付
  pendingBox: { paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' },
  pendingIcon: { fontSize: 48, marginBottom: 12 },
  pendingTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
  pendingDesc: { fontSize: 13, color: colors.textDim, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  pendingSteps: { alignSelf: 'stretch', paddingHorizontal: 8, marginBottom: 20 },
  pendingStep: { fontSize: 13, color: colors.textMuted, lineHeight: 24, paddingLeft: 8 },
  pendingDoneBtn: {
    backgroundColor: colors.success || '#238636', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', alignSelf: 'stretch',
  },
  pendingDoneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
