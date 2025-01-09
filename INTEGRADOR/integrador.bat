@echo off
setlocal

:: Definir el nombre del proceso
set "PROCESS_NAME=integrador.exe"

:: Verificar si el proceso está en ejecución
tasklist /FI "IMAGENAME eq %PROCESS_NAME%" | find /I "%PROCESS_NAME%" >nul
if not errorlevel 1 (
    echo El proceso %PROCESS_NAME% ya está en ejecución.
    exit /b
)


:: Iniciar el proceso minimizado
start /min %PROCESS_NAME%

endlocal
