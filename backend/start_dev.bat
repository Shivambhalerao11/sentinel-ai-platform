@echo off
echo ============================================
echo  SENTINEL AI BACKEND - Development Server
echo ============================================

if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found.
    echo Run: python setup.py
    pause
    exit /b 1
)

echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

echo [INFO] Running migrations...
alembic upgrade head

echo [INFO] Starting Uvicorn server on http://localhost:8000
echo [INFO] API Docs: http://localhost:8000/docs
echo.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info

pause
