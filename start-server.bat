@echo off
chcp 65001 >nul
title 会议录音助手 - 服务器
cd /d "D:\会议记录网站"
echo.
echo ══════════════════════════════════════════════
echo      🎙️  会议录音助手 SmartMeeting Pro
echo ══════════════════════════════════════════════
echo.
echo 📡 正在启动服务器 + 公网隧道...
echo.
node server.js
pause
