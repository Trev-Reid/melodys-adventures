@echo off
rem Double-click to play Melody's Adventures on this computer.
rem It starts the game and opens it in your browser. Close this window to stop it.
cd /d "%~dp0"
title Melody's Adventures
where npm >NUL 2>NUL || (echo Node.js is not installed. Get it from https://nodejs.org then try again. & pause & exit /b 1)
if not exist node_modules (
  echo Installing the game's parts - first time only, takes a minute...
  call npm install
)
echo.
echo Starting Melody's Adventures... your browser will open in a moment.
echo Keep this window open while you play. Close it to stop the game.
echo.
call npm run dev -- --open
pause
