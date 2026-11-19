@echo off
rem Start from this checkout and prefer its local virtual environment.
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" start.py
) else (
  python start.py
)
pause
