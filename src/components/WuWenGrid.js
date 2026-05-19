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
  { key: 'freeask',   icon: '💬', label: '自由问答',  color: '#a78bfa' },
];

export default function WuWenGrid({ onPress, disabled }) {
  return (
    <View style={styles.grid}>
      {WU_WEN.map(w => (
        <TouchableOpacity
          key={w.key}
          style={[styles.btn, { borderColor: w.color + '44' }]}
          onPress={() => onPress(w.key)}
          disabled={disabled}
        >
          <Text style={styles.icon}>{w.icon}</Text>
          <Text style={[styles.label, { color: w.color }]}>{w.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', marginVertical: 12,
    gap: 8,
  },
  btn: {
    backgroundColor: colors.card, borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 8, alignItems: 'center', width: '30%', minWidth: 100,
    borderWidth: 1,
  },
  icon: { fontSize: 28, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600' },
});
