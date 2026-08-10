@echo off
echo ============================================
echo   Metalsider - Iniciando em segundo plano
echo ============================================
echo.

echo Buildando API...
call pnpm --dir apps\api build
if %ERRORLEVEL% neq 0 (
  echo.
  echo ERRO: Falha ao buildar a API.
  exit /b 1
)

echo Buildando WEB...
call pnpm --dir apps\web build
if %ERRORLEVEL% neq 0 (
  echo.
  echo ERRO: Falha ao buildar o WEB.
  exit /b 1
)

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
echo   Frontend : http://localhost:3001
echo   API      : http://localhost:4001
echo   Health   : http://localhost:4001/api/v1/health
echo.
echo Para ver os logs: logs.bat
echo Para parar tudo : stop-bg.bat
echo.
