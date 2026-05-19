// API 客户端 — 对接 eszf.com.cn 后端
import { storage } from './storage';

const BASE_URL = 'https://eszf.com.cn/api';
const TIMEOUT = 15000; // 15秒超时

async function request(method, path, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await storage.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
  }
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  // 用 AbortController 实现超时
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  opts.signal = controller.signal;

  try {
    const res = await fetch(`${BASE_URL}${path}`, opts);
    clearTimeout(timeout);
    const data = await res.json();
    if (!res.ok) {
      const msg = data.error || data.message || `请求失败(${res.status})`;
      throw new Error(msg);
    }
    return data;
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw e;
  }
}

export const api = {
  // 认证
  login: (username, password) =>
    request('POST', '/auth/login', { username, password }),

  register: (username, password, nickname, phone) =>
    request('POST', '/auth/register', { username, password, nickname, phone }),

  getMe: () =>
    request('GET', '/auth/me', null, true),

  updateProfile: (data) =>
    request('PUT', '/auth/profile', data, true),

  // 八字排盘
  calcBazi: (birthDate, lng, lat, gender, name) =>
    request('POST', '/bazi/mobile-calc', { birthDate, lng, lat, gender, name }),

  // 五问 AI
  aiAsk: (baziData, questionType, backgroundContext) =>
    request('POST', '/bazi/ai-ask', { baziData, questionType, backgroundContext }, true),

  // 追问
  customAsk: (question, backgroundContext, baziId, baziData) =>
    request('POST', '/interact/custom-ask', { question, backgroundContext, baziId, baziData }, true),

  // 配额
  getQuota: (baziId) =>
    request('GET', `/interact/quota?baziId=${encodeURIComponent(baziId || '')}`, null, true),
};
