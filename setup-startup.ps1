# 会议录音助手 - 设置开机自启
# 右键此文件 → "使用 PowerShell 运行"

$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder "会议录音助手.lnk"
$targetPath = "D:\会议记录网站\startup-auto.bat"
$workingDir = "D:\会议记录网站"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetPath
$Shortcut.WorkingDirectory = $workingDir
$Shortcut.WindowStyle = 7      # 最小化
$Shortcut.Description = "会议录音助手 - 开机自启"
$Shortcut.IconLocation = "shell32.dll,13"
$Shortcut.Save()

Write-Host "✅ 开机自启已设置！" -ForegroundColor Green
Write-Host "快捷方式: $shortcutPath"
Write-Host ""
Write-Host "如需取消：删除该快捷方式即可"
Write-Host ""
Read-Host "按 Enter 退出"
