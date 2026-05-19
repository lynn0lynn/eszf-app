// 四柱八字展示组件
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

const pillarKeys = ['year', 'month', 'day', 'hour'];
const pillarLabels = ['年', '月', '日', '时'];

export default function PillarsCard({ bazi }) {
  if (!bazi) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>📜 四柱八字</Text>
      <View style={styles.grid}>
        {pillarKeys.map((key, i) => {
          const p = bazi[key + 'Pillar'];
          if (!p) return null;
          return (
            <View key={key} style={styles.pillar}>
              <Text style={styles.label}>{pillarLabels[i]}柱</Text>
              <Text style={styles.gz}>{p.ganZhi || '--'}</Text>
              {p.naYin ? <Text style={styles.sub}>{p.naYin}</Text> : null}
            </View>
          );
        })}
      </View>
      {bazi.name ? (
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>{bazi.name} · {bazi.gender}</Text>
          {bazi.solarTime ? (
            <Text style={styles.infoText}>真太阳时 {bazi.solarTime.hour}:{String(bazi.solarTime.minute || 0).padStart(2,'0')}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.primary, marginBottom: 12, textAlign: 'center' },
  grid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  pillar: { alignItems: 'center', minWidth: 70 },
  label: { fontSize: 11, color: colors.textDim, marginBottom: 4 },
  gz: { fontSize: 20, fontWeight: '700', color: colors.gold, marginBottom: 2 },
  sub: { fontSize: 11, color: colors.textMuted },
  infoRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  infoText: { fontSize: 12, color: colors.textDim },
});
