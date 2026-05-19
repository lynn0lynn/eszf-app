// 加载组件
import React from 'react';
import { View, ActivityIndicator, Text, Modal, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function LoadingModal({ visible, text }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.text}>{text || '加载中...'}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  box: {
    backgroundColor: colors.card, borderRadius: 16, padding: 36,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    minWidth: 160,
  },
  text: { color: colors.textDim, fontSize: 14, marginTop: 16 },
});
