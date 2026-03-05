@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0publish-portable.ps1" -Arch x64
pause
