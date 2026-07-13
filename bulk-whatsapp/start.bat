@echo off
cd /d "%~dp0"
echo ============================================
echo  JanAushadhiGenerix — Bulk WhatsApp Sender
echo ============================================
echo.
echo Installing dependencies (first run only, needs internet)...
call npm install
echo.
echo Starting server and opening browser...
start "" http://localhost:3000
node server.mjs
pause
