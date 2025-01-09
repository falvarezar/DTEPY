@echo off
title Iniciando KUDE - Node.js

REM ----------------------------------------------------------------------------
REM 1) OBTENER IP LOCAL
REM ----------------------------------------------------------------------------
FOR /F "tokens=2 delims=:" %%A IN ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "Loopback"') DO (
  SET ip=%%A
)

REM Quitar el espacio en blanco inicial (si lo hubiera)
SET ip=%ip:~1%

echo IP local detectada: %ip%


REM 2) VERIFICAR SI LA API ESTÁ CORRIENDO USANDO POWERSHELL 
powershell -NoProfile -ExecutionPolicy Bypass -Command ^ "$ErrorActionPreference='SilentlyContinue'; $r = (Invoke-WebRequest 'http://%ip%:3001/kude' -UseBasicParsing).Content; if(!$r){exit 1} else {Write-Host $r}" > respuesta.txt

IF ERRORLEVEL 1 (
   echo [INFO] No responde o esta caido, se iniciara el servidor...
   GOTO StartServer
)

REM Leemos la respuesta
SET /P CONTENT=<respuesta.txt
DEL respuesta.txt

echo Respuesta de la API: %CONTENT%
IF "%CONTENT%"=="GET en kude" (
   echo [INFO] El servidor KUDE ya esta arriba, no hacemos nada.
   GOTO :EOF
) ELSE (
   echo [INFO] La respuesta no coincide, se (re)iniciara el server...
   GOTO StartServer
)

REM ----------------------------------------------------------------------------
REM 3) INICIAR SERVIDOR SI NO ESTABA ARRIBA
REM ----------------------------------------------------------------------------
:StartServer
echo [INFO] Levantando KUDE con PM2...
npx pm2 start dist/app.js
