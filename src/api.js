// API 客户端 — 对接 eszf.com.cn 后端
import { storage } from './storage';

// 实际部署时改成你的域名
const BASE_URL = 'https://eszf.com.cn/api';

async function request(method, path, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await storage.getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
  }
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    const msg = data.error || data.message || `请求失败(${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// 已验证的接口
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
