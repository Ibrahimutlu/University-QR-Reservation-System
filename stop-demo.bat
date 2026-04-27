@echo off
chcp 65001 >nul
title RoomLink - Stop demo

echo.
echo Stopping RoomLink services...
echo.

REM Close the spawned cmd windows by their title
taskkill /FI "WINDOWTITLE eq RoomLink Backend*"  /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq RoomLink Frontend*" /T /F >nul 2>&1

REM Kill any orphan processes still bound to the ports
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000.*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000.*LISTENING"') do taskkill /PID %%a /F >nul 2>&1

echo Done.
echo.
pause
