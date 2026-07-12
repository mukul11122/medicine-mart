@echo off
setlocal
REM JanAushadhiGenerix — one-click launcher (API :3001 + UI :3000)
set PATH=%PATH%;C:\Users\mkg65\.bun\bin
cd /d C:\janaushadhi-app

echo ============================================
echo  JanAushadhiGenerix dev server
echo  - API  : http://localhost:3001  (health: /health)
echo  - UI   : http://localhost:3000
echo ============================================
echo.
echo Starting both servers (Ctrl+C to stop)...
echo.

bun run dev:full

endlocal
pause
