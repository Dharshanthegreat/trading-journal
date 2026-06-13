@echo off
cd /d "%~dp0"
npm run dev > run-dev-error.log 2>&1
