// API 客户端 — 对接 eszf.com.cn 后端
import { storage } from './storage';

const BASE_URL = 'https://eszf.com.cn/api';
const TIMEOUT = 45000; // 45秒超时（AI分析需要较长时间）

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
      const msg = data.message || data.error || data.detail || `请求失败(${res.status})`;
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
    request('POST', '/bazi/mobile-calc', { birthDate, lng, lat, gender, name }, true), // 带auth用于检测是否已有记录

  // 五问 AI
  aiAsk: (baziData, questionType, backgroundContext, free = false, chargeType = null) =>
    request('POST', '/bazi/ai-ask', { baziData, questionType, backgroundContext, free, chargeType }, true),

  // 追问
  customAsk: (question, backgroundContext, baziId, baziData, chargeType = null) =>
    request('POST', '/interact/custom-ask', { question, backgroundContext, baziId, baziData, chargeType }, true),

  // 配额
  getQuota: (baziId) =>
    request('GET', `/interact/quota?baziId=${encodeURIComponent(baziId || '')}`, null, true),

  // 充值
  createOrder: (packageId) =>
    request('POST', '/alipay/create-order', { packageId, source: 'web' }, true),

  getPackages: () =>
    request('GET', '/interact/packages'),

  // 全局配额
  getUserQuota: () =>
    request('GET', '/user/quota', null, true),

  // 排盘记录
  getBaziHistory: (limit = 20, offset = 0) =>
    request('GET', `/user/bazi-history?limit=${limit}&offset=${offset}`, null, true),

  // 保存排盘记录
  saveReading: (data) =>
    request('POST', '/bazi/readings', data, true),

  // 赢了么·比赛预测
  yingLeMe: (data) =>
    request('POST', '/bazi/yingleme-predict', data, true),
};
