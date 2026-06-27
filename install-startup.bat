@echo off
chcp 65001 >nul
title 安装开机自启 - 会议录音助手
echo ══════════════════════════════════════════════
echo    🔧 安装会议录音助手开机自动启动
echo ══════════════════════════════════════════════
echo.
echo 正在创建 Windows 计划任务...

schtasks /create /tn "SmartMeeting" /tr "D:\会议记录网站\start-silent.vbs" /sc onlogon /delay 0000:30 /rl highest /f

if %errorlevel%==0 (
    echo.
    echo ✅ 安装成功！下次开机会自动启动服务器
    echo.
    echo 📁 快捷方式已复制到桌面
    copy "D:\会议记录网站\start-server.bat" "%USERPROFILE%\Desktop\会议录音助手.lnk" >nul 2>&1
    echo.
    echo 💡 手动启动: 双击桌面「会议录音助手」
    echo 💡 查看地址: 浏览器打开 http://localhost:3000
) else (
    echo.
    echo ⚠️ 安装失败，请右键此文件选择「以管理员身份运行」
)

echo.
pause
