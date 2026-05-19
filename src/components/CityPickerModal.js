// 省市选择弹窗 — 上下滚动选省 → 选市
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { PROVINCE_CITIES } from '../data/cityData';

export default function CityPickerModal({ visible, onClose, onSelect, initialProvince, initialCity }) {
  const [step, setStep] = useState('province'); // 'province' | 'city'
  const [selectedProvince, setSelectedProvince] = useState(initialProvince || '');
  const [searchText, setSearchText] = useState('');

  const provinces = useMemo(() => Object.keys(PROVINCE_CITIES).sort(), []);

  const cities = useMemo(() => {
    if (!selectedProvince || !PROVINCE_CITIES[selectedProvince]) return [];
    return PROVINCE_CITIES[selectedProvince];
  }, [selectedProvince]);

  function handleSelectProvince(prov) {
    setSelectedProvince(prov);
    setStep('city');
  }

  function handleSelectCity(city) {
    const coords = PROVINCE_CITIES[selectedProvince].find(c => c.name === city);
    onSelect({
      province: selectedProvince,
      city: city,
      lat: coords?.lat || 0,
      lng: coords?.lng || 0,
    });
    setStep('province');
    setSelectedProvince('');
  }

  function handleBack() {
    setStep('province');
    setSelectedProvince('');
  }

  function handleClose() {
    setStep('province');
    setSelectedProvince('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          {/* 顶部 */}
          <View style={styles.header}>
            {step === 'city' ? (
              <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                <Text style={styles.backText}>← 返回</Text>
              </TouchableOpacity>
            ) : <View />}
            <Text style={styles.title}>
              {step === 'province' ? '选择省份' : selectedProvince}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 省份列表 */}
          {step === 'province' ? (
            <FlatList
              data={provinces}
              keyExtractor={item => item}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.item, item === initialProvince && styles.itemActive]}
                  onPress={() => handleSelectProvince(item)}
                >
                  <Text style={styles.itemText}>{item}</Text>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              )}
            />
          ) : null}

          {/* 城市列表 */}
          {step === 'city' ? (
            <FlatList
              data={cities}
              keyExtractor={item => item.name}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.item, item.name === initialCity && styles.itemActive]}
                  onPress={() => handleSelectCity(item.name)}
                >
                  <Text style={styles.itemText}>{item.name.replace('市', '')}</Text>
                </TouchableOpacity>
              )}
            />
          ) : null}
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
    maxHeight: '75%', minHeight: '50%',
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  backBtn: { padding: 4 },
  backText: { fontSize: 14, color: colors.primary },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18, color: colors.textMuted },
  list: { flex: 1 },
  listContent: { paddingBottom: 30 },
  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  itemActive: { backgroundColor: colors.primary + '15' },
  itemText: { fontSize: 15, color: colors.text },
  arrow: { fontSize: 20, color: colors.textMuted },
});
