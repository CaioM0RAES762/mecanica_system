@echo off
echo ============================================
echo   Metalsider - Parando processos PM2
echo ============================================
echo.

pm2 stop all
pm2 delete all

echo.
pm2 status
echo.
echo Todos os processos foram encerrados.
echo.
