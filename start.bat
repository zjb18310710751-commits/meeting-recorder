@echo off
chcp 65001 >nul
title 会议录音助手 - 服务器

:: 会议录音助手 - 启动脚本
:: 支持：本机访问 + 局域网 + serveo.net 公网隧道

set PROJECT_DIR=D:\会议记录网站

cd /d "%PROJECT_DIR%"

echo ╔══════════════════════════════════════════════╗
echo ║     🎙️  会议录音助手 - 启动中...             ║
echo ╚══════════════════════════════════════════════╝
echo.

:: 检查 node_modules
if not exist "node_modules\" (
    echo ⚠️  首次运行，正在安装依赖...
    call npm install express
    echo ✅ 依赖安装完成
    echo.
)

:: 启动服务器
node server.js

echo.
echo ⚠️  服务器已停止
pause
