"""
Sentinel Backend - One-click setup script.
Run: python setup.py
This script installs dependencies, sets up the database, runs migrations, and seeds data.
"""
import os
import subprocess
import sys


def run(cmd: str, check: bool = True) -> int:
    print(f"\n>>> {cmd}")
    result = subprocess.run(cmd, shell=True)
    if check and result.returncode != 0:
        print(f"[ERROR] Command failed: {cmd}")
        sys.exit(result.returncode)
    return result.returncode


def main():
    print("=" * 60)
    print("  SENTINEL AI CRIME INTELLIGENCE PLATFORM")
    print("  Backend Setup Script")
    print("=" * 60)

    # 1. Check Python version
    if sys.version_info < (3, 10):
        print("[ERROR] Python 3.10+ is required.")
        sys.exit(1)
    print(f"[OK] Python {sys.version_info.major}.{sys.version_info.minor}")

    # 2. Create virtual environment if it doesn't exist
    if not os.path.exists("venv"):
        print("\n[STEP 1] Creating virtual environment...")
        run(f"{sys.executable} -m venv venv")
    else:
        print("\n[STEP 1] Virtual environment already exists.")

    # 3. Determine venv python/pip paths
    if sys.platform == "win32":
        venv_python = r"venv\Scripts\python.exe"
        venv_pip    = r"venv\Scripts\pip.exe"
    else:
        venv_python = "venv/bin/python"
        venv_pip    = "venv/bin/pip"

    # 4. Install dependencies
    print("\n[STEP 2] Installing Python dependencies...")
    run(f"{venv_pip} install --upgrade pip")
    run(f"{venv_pip} install -r requirements.txt")

    # 5. Copy .env if missing
    if not os.path.exists(".env"):
        print("\n[STEP 3] Creating .env from .env.example...")
        if os.path.exists(".env.example"):
            import shutil
            shutil.copy(".env.example", ".env")
            print("[ACTION REQUIRED] Edit .env and set DATABASE_URL, JWT_SECRET_KEY, and GEMINI_API_KEY")
        else:
            print("[WARN] .env.example not found. Create .env manually.")
    else:
        print("\n[STEP 3] .env already exists.")

    # 6. Run database migrations
    print("\n[STEP 4] Running Alembic database migrations...")
    rc = run(f"{venv_python} -m alembic upgrade head", check=False)
    if rc != 0:
        print("[WARN] Migration failed. Ensure PostgreSQL is running and DATABASE_URL is correct in .env")
        print("       You can run migrations manually later: alembic upgrade head")
    else:
        print("[OK] Migrations complete.")

    # 7. Seed database
    print("\n[STEP 5] Seeding database with demo data...")
    rc = run(f"{venv_python} -m app.utils.seed", check=False)
    if rc != 0:
        print("[WARN] Seed failed. Run manually: python -m app.utils.seed")
    else:
        print("[OK] Database seeded.")

    print("\n" + "=" * 60)
    print("  SETUP COMPLETE")
    print("=" * 60)
    print("\nTo start the development server:")
    if sys.platform == "win32":
        print(r"  venv\Scripts\uvicorn app.main:app --reload --port 8000")
    else:
        print("  venv/bin/uvicorn app.main:app --reload --port 8000")
    print("\nAPI Docs: http://localhost:8000/docs")
    print("Health:   http://localhost:8000/health")
    print("\nDemo credentials:")
    print("  Police Admin : c.sterling@delhipolice.gov.in / Admin@12345")
    print("  Citizen      : rahul.k@example.com / Citizen@12345")
    print("=" * 60)


if __name__ == "__main__":
    main()
