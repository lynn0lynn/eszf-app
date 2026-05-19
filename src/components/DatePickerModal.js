// 日期选择弹窗 — 年/月/日 滚动选择
import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { colors } from '../theme';

function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

const YEARS = range(1920, 2030);
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MONTH_NAMES = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];

export default function DatePickerModal({ visible, onClose, onConfirm, initialDate }) {
  const today = new Date();
  const [selYear, setSelYear] = useState(today.getFullYear());
  const [selMonth, setSelMonth] = useState(today.getMonth() + 1);
  const [selDay, setSelDay] = useState(today.getDate());

  useEffect(() => {
    if (initialDate) {
      try {
        const d = new Date(initialDate);
        if (!isNaN(d.getTime())) {
          setSelYear(d.getFullYear());
          setSelMonth(d.getMonth() + 1);
          setSelDay(d.getDate());
        }
      } catch (e) {}
    }
  }, [initialDate, visible]);

  const days = range(1, getDaysInMonth(selYear, selMonth));
  // 如果当前选择的天数超过本月最大天数，修正
  useEffect(() => {
    const maxDay = getDaysInMonth(selYear, selMonth);
    if (selDay > maxDay) setSelDay(maxDay);
  }, [selYear, selMonth]);

  function handleConfirm() {
    const dateStr = `${selYear}-${String(selMonth).padStart(2, '0')}-${String(selDay).padStart(2, '0')}`;
    onConfirm(dateStr);
    onClose();
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.picker}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelBtn}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.title}>选择日期</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.confirmBtn}>确定</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.columns}>
            {/* 年 */}
            <View style={styles.column}>
              <Text style={styles.columnLabel}>年</Text>
              <View style={styles.scrollCol}>
                {YEARS.map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.item, selYear === y && styles.itemActive]}
                    onPress={() => setSelYear(y)}
                  >
                    <Text style={[styles.itemText, selYear === y && styles.itemTextActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 月 */}
            <View style={styles.column}>
              <Text style={styles.columnLabel}>月</Text>
              <View style={styles.scrollCol}>
                {MONTHS.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.item, selMonth === m && styles.itemActive]}
                    onPress={() => setSelMonth(m)}
                  >
                    <Text style={[styles.itemText, selMonth === m && styles.itemTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 日 */}
            <View style={styles.column}>
              <Text style={styles.columnLabel}>日</Text>
              <View style={styles.scrollCol}>
                {days.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.item, selDay === d && styles.itemActive]}
                    onPress={() => setSelDay(d)}
                  >
                    <Text style={[styles.itemText, selDay === d && styles.itemTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)',
  },
  picker: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '65%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cancelBtn: { fontSize: 15, color: colors.textDim },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  confirmBtn: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  columns: {
    flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8,
  },
  column: { flex: 1, alignItems: 'center', marginHorizontal: 4 },
  columnLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 6, fontWeight: '500' },
  scrollCol: { maxHeight: 280 },
  item: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
    marginVertical: 2, alignItems: 'center',
  },
  itemActive: { backgroundColor: colors.primary + '30' },
  itemText: { fontSize: 16, color: colors.text, textAlign: 'center' },
  itemTextActive: { color: colors.primary, fontWeight: '700' },
});
