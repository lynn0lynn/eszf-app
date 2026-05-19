#!/bin/bash
# ===== 问数 APP 一键构建脚本 =====
# 方式1: EAS云编译（推荐，无需Android SDK）
# 方式2: 本地编译（需安装Android SDK）

set -e

echo "☯ 问数 · E上智方 APP 构建工具"
echo "=============================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js 18+"
    exit 1
fi

# 安装依赖
echo "📦 安装项目依赖..."
npm install --legacy-peer-deps

echo ""
echo "请选择构建方式："
echo "1) EAS云编译（推荐）— 生成 APK 安装包"
echo "2) 本地开发 — 启动 Expo 开发服务器"
read -p "输入 1 或 2: " choice

case $choice in
    1)
        echo ""
        echo "🔨 EAS 云编译需要 Expo 账号（免费注册: https://expo.dev/signup）"
        echo ""

        # 检查是否已登录
        if npx eas-cli whoami 2>/dev/null; then
            echo "✅ 已登录 Expo"
        else
            echo "🔑 请登录你的 Expo 账号："
            npx eas-cli login
        fi

        echo ""
        echo "🏗️  开始构建 Android APK..."
        echo "（云编译约需 5-10 分钟，完成后会显示下载链接）"
        npx eas-cli build -p android --profile preview
        ;;
    2)
        echo ""
        echo "🚀 启动开发服务器..."
        echo "在手机上安装 Expo Go APP，扫码即可预览"
        npx expo start
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac
