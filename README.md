# 问数 · E上智方 — 手机 APP

## 项目简介

React Native (Expo) 手机 APP，对接 eszf.com.cn 网站后端 API。
核心功能：八字排盘、五问 AI 解读、追问、用户登录注册。

## 技术架构

```
APP (React Native / Expo)  →  API (eszf.com.cn/api)  →  Node.js 后端 → SQLite/Python
```

## 项目结构

```
eszf-app/
├── App.js                    # 入口（导航配置）
├── app.json                  # Expo 配置
├── eas.json                  # EAS 云编译配置
├── build.sh                  # 一键构建脚本
├── src/
│   ├── theme.js              # 暗黑主题颜色
│   ├── api.js                # API 客户端
│   ├── storage.js            # 本地存储
│   ├── screens/
│   │   ├── LoginScreen.js    # 登录
│   │   ├── RegisterScreen.js # 注册（含手机号）
│   │   ├── BaziScreen.js     # 问数主页（排盘 + 五问 + 追问）
│   │   └── ProfileScreen.js  # 个人中心
│   └── components/
│       ├── PillarsCard.js    # 四柱展示
│       ├── WuWenGrid.js      # 五问按钮
│       ├── AiResultBlock.js  # AI 结果渲染
│       └── LoadingModal.js   # 加载动画
└── assets/                   # 图标、启动画面
```

## 服务端新增接口

已部署在服务器上：

| 接口 | 说明 |
|------|------|
| `POST /api/bazi/mobile-calc` | 排盘计算（服务端执行 JS 引擎） |

## 构建 APK（安装包）

### 方式一：EAS 云编译（推荐）

1. 注册免费 Expo 账号：https://expo.dev/signup
2. 在本项目目录运行：
   ```bash
   cd eszf-app
   npm install --legacy-peer-deps
   npx eas-cli login          # 登录 Expo 账号
   npx eas-cli build -p android --profile preview
   ```
3. 等待云编译完成（约 5-10 分钟）
4. 编译完成后会显示 APK 下载链接，在手机上打开即可安装

### 方式二：本地开发测试

```bash
cd eszf-app
npm install --legacy-peer-deps
npx expo start
```

在手机上安装 **Expo Go** APP，扫码即可预览运行效果。

## 页面功能

| 页面 | 功能 |
|------|------|
| 登录 | 用户名 + 密码登录 |
| 注册 | 用户名 + 昵称 + 手机号 + 密码 |
| 问数 | 排盘输入 → 四柱展示 → 五问AI → 追问 |
| 个人中心 | 昵称/手机号修改、密码修改、退出登录 |

## API 接口（所有接口复用现有后端）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 登录 |
| `/api/auth/register` | POST | 注册 |
| `/api/auth/me` | GET | 用户信息 |
| `/api/auth/profile` | PUT | 更新资料 |
| `/api/bazi/mobile-calc` | POST | 排盘计算 |
| `/api/bazi/ai-ask` | POST | 五问 AI |
| `/api/interact/custom-ask` | POST | 追问 |
| `/api/interact/quota` | GET | 查询配额 |
