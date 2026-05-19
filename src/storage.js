// 持久化存储工具
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@eszf_token',
  USER: '@eszf_user',
};

export const storage = {
  async setToken(token) {
    try { await AsyncStorage.setItem(KEYS.TOKEN, token); } catch (e) {}
  },
  async getToken() {
    try { return await AsyncStorage.getItem(KEYS.TOKEN); } catch (e) { return null; }
  },
  async removeToken() {
    try { await AsyncStorage.removeItem(KEYS.TOKEN); } catch (e) {}
  },
  async setUser(user) {
    try { await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user)); } catch (e) {}
  },
  async getUser() {
    try {
      const raw = await AsyncStorage.getItem(KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  async removeUser() {
    try { await AsyncStorage.removeItem(KEYS.USER); } catch (e) {}
  },
  async clear() {
    try {
      await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER]);
    } catch (e) {}
  },
};
