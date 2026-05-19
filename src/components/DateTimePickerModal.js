// 日期+时间选择弹窗 — 年/月/日/时/分 全部可滚动选择
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Platform, ScrollView,
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
const HOURS = range(0, 23);
const MINUTES = range(0, 59);

export default function DateTimePickerModal({ visible, onClose, onConfirm, initialDate, initialHour, initialMinute }) {
  const today = new Date();
  const [selYear, setSelYear] = useState(initialDate ? new Date(initialDate).getFullYear() : today.getFullYear());
  const [selMonth, setSelMonth] = useState(initialDate ? new Date(initialDate).getMonth() + 1 : today.getMonth() + 1);
  const [selDay, setSelDay] = useState(initialDate ? new Date(initialDate).getDate() : today.getDate());
  const [selHour, setSelHour] = useState(parseInt(initialHour) || 12);
  const [selMinute, setSelMinute] = useState(parseInt(initialMinute) || 0);

  const yearRef = useRef(null);
  const monthRef = useRef(null);
  const dayRef = useRef(null);
  const hourRef = useRef(null);
  const minuteRef = useRef(null);

  useEffect(() => {
    if (visible && initialDate) {
      try {
        const d = new Date(initialDate);
        if (!isNaN(d.getTime())) {
          setSelYear(d.getFullYear());
          setSelMonth(d.getMonth() + 1);
          setSelDay(d.getDate());
        }
      } catch (e) {}
    }
    if (visible) {
      setSelHour(parseInt(initialHour) || 12);
      setSelMinute(parseInt(initialMinute) || 0);
    }
  }, [visible]);

  const days = range(1, getDaysInMonth(selYear, selMonth));
  // 修正天数
  useEffect(() => {
    const maxDay = getDaysInMonth(selYear, selMonth);
    if (selDay > maxDay) setSelDay(maxDay);
  }, [selYear, selMonth]);

  // 选中项滚动到可见区域
  function scrollToSelected(ref, items, selected) {
    setTimeout(() => {
      if (ref.current && items.length > 0) {
        const idx = items.indexOf(selected);
        if (idx >= 0) {
          ref.current.scrollTo({ y: Math.max(0, idx * 38 - 100), animated: false });
        }
      }
    }, 100);
  }

  useEffect(() => {
    if (visible) {
      scrollToSelected(yearRef, YEARS, selYear);
      scrollToSelected(monthRef, MONTHS, selMonth);
      scrollToSelected(dayRef, days, selDay);
      scrollToSelected(hourRef, HOURS, selHour);
      scrollToSelected(minuteRef, MINUTES, selMinute);
    }
  }, [visible]);

  function handleConfirm() {
    const dateStr = `${selYear}-${String(selMonth).padStart(2, '0')}-${String(selDay).padStart(2, '0')}`;
    const hour = String(selHour).padStart(2, '0');
    const minute = String(selMinute).padStart(2, '0');
    onConfirm(dateStr, hour, minute);
    onClose();
  }

  function renderCol(label, items, value, setter, ref) {
    return (
      <View style={styles.column}>
        <Text style={styles.columnLabel}>{label}</Text>
        <ScrollView
          ref={ref}
          style={styles.scrollCol}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {items.map(v => (
            <TouchableOpacity
              key={v}
              style={[styles.item, value === v && styles.itemActive]}
              onPress={() => setter(v)}
            >
              <Text style={[styles.itemText, value === v && styles.itemTextActive]}>
                {String(v).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.picker}>
          {/* 顶部 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelBtn}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.title}>选择出生时间</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.confirmBtn}>确定</Text>
            </TouchableOpacity>
          </View>

          {/* 年月日 */}
          <Text style={styles.sectionLabel}>📅 日期</Text>
          <View style={styles.columns}>
            {renderCol('年', YEARS, selYear, setSelYear, yearRef)}
            {renderCol('月', MONTHS, selMonth, setSelMonth, monthRef)}
            {renderCol('日', days, selDay, setSelDay, dayRef)}
          </View>

          {/* 时分 */}
          <Text style={styles.sectionLabel}>⏰ 时间</Text>
          <View style={styles.columns}>
            {renderCol('时', HOURS, selHour, setSelHour, hourRef)}
            {renderCol('分', MINUTES, selMinute, setSelMinute, minuteRef)}
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
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cancelBtn: { fontSize: 15, color: colors.textDim },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  confirmBtn: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  sectionLabel: {
    fontSize: 11, color: colors.textMuted, marginTop: 10, marginBottom: 4,
    marginLeft: 16, fontWeight: '500',
  },
  columns: {
    flexDirection: 'row', paddingHorizontal: 12,
  },
  column: { flex: 1, alignItems: 'center', marginHorizontal: 3 },
  columnLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4, fontWeight: '500' },
  scrollCol: { maxHeight: 160 },
  scrollContent: { paddingVertical: 4 },
  item: {
    paddingVertical: 7, paddingHorizontal: 8, borderRadius: 8,
    marginVertical: 1, alignItems: 'center',
  },
  itemActive: { backgroundColor: colors.primary + '30' },
  itemText: { fontSize: 15, color: colors.text, textAlign: 'center' },
  itemTextActive: { color: colors.primary, fontWeight: '700' },
});
