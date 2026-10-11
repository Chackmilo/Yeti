@echo off
title Snow Escape - Centro de Lanzamiento
chcp 65001 >nul
cls

echo =======================================================================
echo          ⛷️  SNOW ESCAPE — SUITE ALPINA COMPLETA
echo =======================================================================
echo.
echo   [1] Portal de Juegos (Hub Principal - Acceso a los 3 juegos)
echo   [2] Snow Escape PRO (Modo Producción con servidor local Vite)
echo   [3] Snow Escape 2D Retro (Canvas SkiFree clásico)
echo   [4] Snow Escape 3D Standalone (Three.js ultra-ligero)
echo.
echo =======================================================================
set /p opt="Selecciona una opción (1-4) [Por defecto: 1]: "

if "%opt%"=="2" goto opt_pro
if "%opt%"=="3" goto opt_2d
if "%opt%"=="4" goto opt_3d

:opt_hub
echo Abriendo Portal de Juegos...
start "" "index.html"
exit /b

:opt_pro
echo Iniciando servidor local Vite para Snow Escape PRO...
start "" http://localhost:4173/
call npm --workspace=games/3d-pro run preview
exit /b

:opt_2d
echo Abriendo Snow Escape 2D...
start "" "games\2d-retro\index.html"
exit /b

:opt_3d
echo Abriendo Snow Escape 3D Standalone...
start "" "games\3d-standalone\index.html"
exit /b
