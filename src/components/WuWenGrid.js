// 五问网格按钮
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';

const WU_WEN = [
  { key: 'health',    icon: '🏥', label: '健康养生',  color: '#4ade80' },
  { key: 'career',    icon: '💼', label: '事业学业',  color: '#667eea' },
  { key: 'marriage',  icon: '💑', label: '婚姻感情',  color: '#f472b6' },
  { key: 'children',  icon: '👨‍👩‍👧‍👦', label: '六亲眷属',  color: '#f0a040' },
  { key: 'decision',  icon: '💰', label: '亨通聚富',  color: '#ffd700' },
];

function Btn({ w, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.btn, { borderColor: w.color + '44' }]}
      onPress={() => onPress(w.key)}
      disabled={disabled}
    >
      <Text style={styles.icon}>{w.icon}</Text>
      <Text style={[styles.label, { color: w.color }]}>{w.label}</Text>
    </TouchableOpacity>
  );
}

export default function WuWenGrid({ onPress, disabled }) {
  return (
    <View style={styles.wrapper}>
      {/* 第一行：3个按钮 */}
      <View style={styles.row}>
        {WU_WEN.slice(0, 3).map(w => (
          <Btn key={w.key} w={w} onPress={onPress} disabled={disabled} />
        ))}
      </View>
      {/* 第二行：2个按钮居中 */}
      <View style={styles.rowCenter}>
        {WU_WEN.slice(3).map(w => (
          <Btn key={w.key} w={w} onPress={onPress} disabled={disabled} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 12,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 10,
  },
  rowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  btn: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    width: '28%',
    minWidth: 90,
    borderWidth: 1,
  },
  icon: { fontSize: 28, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600' },
});
