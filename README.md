# Sentinel AI Platform — National Crime Intelligence Network

Professional enterprise monorepo architecture for the **Sentinel AI Police & Crime Intelligence Platform**.

## Project Architecture

```
Sentinel-AI-Platform/
├── frontend/             # React + Vite + TypeScript Frontend Application
│   ├── src/              # React components, pages, design system & API services
│   ├── assets/           # Static media assets & images
│   ├── index.html        # Main HTML entry point
│   ├── server.ts         # Express server wrapper with Vite SSR / API proxy
│   ├── vite.config.ts    # Vite configuration & dev server proxy
│   ├── tsconfig.json     # TypeScript configuration
│   └── package.json      # Frontend dependencies & scripts
│
├── backend/              # FastAPI Python Backend
│   ├── app/              # FastAPI application routers, models, schemas, services
│   ├── migrations/       # Alembic database migrations
│   ├── requirements.txt  # Python package dependencies
│   ├── alembic.ini       # Alembic configuration
│   ├── Dockerfile        # Docker deployment image configuration
│   └── .env              # Backend environment configuration
│
├── README.md             # Project documentation
└── .gitignore            # Git exclusion rules
```

## Getting Started

### Prerequisites
- **Node.js**: v18+ & `npm`
- **Python**: v3.10+ & `pip` (for backend)

---

### Quick Start (Frontend)

```bash
# Navigate to frontend directory or run from root
npm install

# Start development server
npm run dev
```

The frontend application will be running on `http://localhost:3000`.

---

### Quick Start (Backend)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run FastAPI server
uvicorn app.main:app --reload --port 8000
```

The backend API docs will be available at `http://localhost:8000/docs`.

---

## Features
- **Citizen Portal**: Instant e-FIR filing, GPS emergency SOS, real-time case tracking, AI legal guidance.
- **Police & Admin Portal**: Incident command & dispatch, AI crime triage, GIS tactical mapping, predictive analytics, officer management, audit logging.
- **Theme System**: Complete Light/Dark Mode with high-contrast UI and instant theme persistence.
