@echo off
echo Stopping Trading Journal server and client processes...
taskkill /f /im node.exe
echo.
echo All Node.js backend/frontend processes stopped successfully!
pause
