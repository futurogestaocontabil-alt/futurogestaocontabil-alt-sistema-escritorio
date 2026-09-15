@echo off
cd /d "%~dp0"
if not exist "dist\index.html" (
  echo Compile o sistema com npm run build antes de iniciar.
  pause
  exit /b 1
)
echo Abra http://127.0.0.1:4318 no navegador.
echo Mantenha esta janela aberta durante o uso.
call npm start
pause
