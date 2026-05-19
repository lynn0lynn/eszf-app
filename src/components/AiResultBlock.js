// AI 结果展示块
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function AiResultBlock({ result, title }) {
  if (!result) return null;

  // 解析可能的 markdown（简化处理：只分段）
  const paragraphs = result.split('\n').filter(p => p.trim());

  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {paragraphs.map((p, i) => {
          // 粗体行（### 或 **xxx**）
          if (p.startsWith('**') && p.endsWith('**')) {
            return <Text key={i} style={styles.bold}>{p.replace(/\*\*/g, '')}</Text>;
          }
          if (p.startsWith('###') || p.startsWith('---')) {
            return <View key={i} style={styles.divider} />;
          }
          return (
            <Text key={i} style={styles.text}>
              {p.split('**').map((seg, j) =>
                j % 2 === 1 ? <Text key={j} style={styles.boldInline}>{seg}</Text> : seg
              )}
            </Text>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  title: { fontSize: 15, fontWeight: '600', color: colors.primary, marginBottom: 8 },
  scroll: { maxHeight: 500 },
  text: { fontSize: 14, color: '#ccc', lineHeight: 22, marginBottom: 4 },
  bold: { fontSize: 15, fontWeight: '700', color: colors.text, marginVertical: 6 },
  boldInline: { fontWeight: '700', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
});
