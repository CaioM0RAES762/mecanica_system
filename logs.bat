@echo off
echo ============================================
echo   Metalsider - Logs em tempo real (Ctrl+C para sair)
echo ============================================
echo.
echo Dica: para ver apenas um processo, use:
echo   pm2 logs mecanica-api
echo   pm2 logs mecanica-web
echo.

pm2 logs
