@echo off
title Servidor Puente Drosophila LIF (Fly-Brain)
cd /d "%~dp0"
echo ========================================================
echo   PUENTE NEURONAL DROSOPHILA MELANOGASTER (FLY-BRAIN)
echo ========================================================
echo.
echo Iniciando servidor WebSocket en ws://127.0.0.1:8765 ...
echo Presiona Ctrl+C para detener el servidor.
echo.
python bridge_server.py
pause
