// 充值弹窗 — 套餐选择 + 支付宝支付
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, Linking } from 'react-native';
import { colors } from '../theme';
import { api } from '../api';

const PACKAGES = {
  count: [
    { id: 'count_1',  name: '1次包',   price: 1.00,  unit: '次',  quantity: 1    },
    { id: 'count_30', name: '30次包',  price: 10.00, unit: '次',  quantity: 30   },
  ],
  token: [
    { id: 'token_1m',  name: '100万包',   price: 30.00,  unit: 'Token', quantity: 1000000  },
    { id: 'token_10m', name: '1000万包',  price: 100.00, unit: 'Token', quantity: 10000000 },
  ],
};

export default function PaymentModal({ visible, onClose, onSuccess }) {
  const [tab, setTab] = useState('count');
  const [paying, setPaying] = useState(false);

  async function handlePay(pkgId) {
    setPaying(true);
    try {
      const data = await api.createOrder(pkgId);
      // 从响应中提取支付宝支付URL
      let payUrl = '';
      if (typeof data.payHtml === 'string') {
        // GET模式：payHtml 就是完整的支付宝URL
        if (data.payHtml.startsWith('http')) {
          payUrl = data.payHtml;
        } else {
          // POST模式：从form的action属性提取URL
          const match = data.payHtml.match(/action="([^"]+)"/);
          if (match) {
            payUrl = match[1].replace(/&amp;/g, '&');
          }
        }
      }
      if (payUrl) {
        // 在系统浏览器中打开支付宝支付页面
        const opened = await Linking.openURL(payUrl).catch(() => false);
        if (!opened) {
          alert('请复制以下链接到浏览器中完成支付：\n' + payUrl.substring(0, 100) + '...');
        }
      } else {
        alert('无法获取支付链接，请稍后重试');
        setPaying(false);
        return;
      }
      alert('✅ 订单已创建！请在支付宝中完成支付。\n支付成功后返回APP，刷新即可看到配额更新。');
      onSuccess && onSuccess();
      onClose();
    } catch (e) {
      alert('创建订单失败：' + e.message);
    } finally {
      setPaying(false);
    }
  }

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
              <Text style={[styles.tabText, tab === 'token' && styles.tabTextActive]}>⚡ Token</Text>
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
});
