@echo off
echo ============================================
echo   Metalsider - Iniciando em segundo plano
echo ============================================
echo.

pm2 start ecosystem.config.js
if %ERRORLEVEL% neq 0 (
  echo.
  echo ERRO: Falha ao iniciar os processos. Verifique se o PM2 esta instalado:
  echo   npm install -g pm2
  exit /b 1
)

pm2 save

echo.
echo ============================================
echo   Status dos processos:
echo ============================================
pm2 status

echo.
echo Acesse:
echo   Frontend : http://localhost:3000
echo   API      : http://localhost:4000
echo   Health   : http://localhost:4000/api/v1/health
echo.
echo Para ver os logs: logs.bat
echo Para parar tudo : stop-bg.bat
echo.
