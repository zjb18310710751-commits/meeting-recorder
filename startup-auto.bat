@echo off
:: 会议录音助手 - 开机自启脚本（后台静默启动）
:: 放到 Windows 启动文件夹：shell:startup

set PROJECT_DIR=D:\会议记录网站
set LOG_FILE=%PROJECT_DIR%\server-output.log

echo ========================================= >> "%LOG_FILE%"
echo   会议录音助手 - 开机启动 [%date% %time%] >> "%LOG_FILE%"
echo ========================================= >> "%LOG_FILE%"

cd /d "%PROJECT_DIR%"

:: 后台启动服务器（最小化窗口）
start "" /MIN cmd /c "node server.js >> '%LOG_FILE%' 2>&1"

echo [INFO] 服务器已启动 >> "%LOG_FILE%"
exit /b 0
