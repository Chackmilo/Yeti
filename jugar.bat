@echo off
cd /d "%~dp0"
title Otter Escape: Yeti Chase - Centro de Lanzamiento
chcp 65001 >nul
cls

echo =======================================================================
echo        🦦  OTTER ESCAPE: YETI CHASE — SUITE ALPINA COMPLETA
echo =======================================================================
echo.
echo   [1] Portal de Juegos (Hub Principal - Acceso a las 3 ediciones)
echo   [2] Suite completa en servidor local (http://localhost:4173, requiere Node.js)
echo   [3] Otter Escape 2D Retro (Canvas SkiFree clásico)
echo   [4] Otter Escape 3D Standalone (Three.js ultra-ligero)
echo.
echo =======================================================================
set /p opt="Selecciona una opción (1-4) [Por defecto: 1]: "

if "%opt%"=="2" goto opt_server
if "%opt%"=="3" goto opt_2d
if "%opt%"=="4" goto opt_3d

:opt_hub
echo Abriendo Portal de Juegos...
start "" "index.html"
exit /b

:opt_server
if not exist "games\3d-pro\node_modules" call npm run setup
if not exist "games\3d-pro\dist\index.html" call npm run build
echo Sirviendo la suite completa en http://localhost:4173/ (Ctrl+C para salir)...
call npm run serve
exit /b

:opt_2d
echo Abriendo Otter Escape 2D...
start "" "games\2d-retro\index.html"
exit /b

:opt_3d
echo Abriendo Otter Escape 3D Standalone...
start "" "games\3d-standalone\index.html"
exit /b
