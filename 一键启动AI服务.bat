@echo off
chcp 65001 >nul
echo 正在启动 CircleLearn AI 代理服务...
echo 请保持此窗口不关闭，否则 AI 聊天将无法使用！
echo ------------------------------------------------

set PORT=5174
node server.js

pause
