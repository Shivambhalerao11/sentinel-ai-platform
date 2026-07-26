#!/bin/bash
set -e

echo "============================================"
echo " SENTINEL AI BACKEND - Development Server"
echo "============================================"

# Check venv
if [ ! -f "venv/bin/python" ]; then
    echo "[ERROR] Virtual environment not found."
    echo "Run: python setup.py"
    exit 1
fi

# Activate
source venv/bin/activate

# Run migrations
echo "[INFO] Running database migrations..."
alembic upgrade head

# Start server
echo "[INFO] Starting Uvicorn on http://localhost:8000"
echo "[INFO] API Docs: http://localhost:8000/docs"
echo ""
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info
