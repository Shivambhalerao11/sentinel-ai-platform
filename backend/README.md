# Sentinel AI — Crime Intelligence & Emergency Response Platform
### Backend API — Production-Ready FastAPI Application

> Built for the Indian Police & Ministry of Home Affairs  
> Implements BNS 2023 · AI Triage · Real-time GIS · RBAC · JWT Security

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Quick Start](#quick-start)
5. [Environment Variables](#environment-variables)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [AI Pipeline](#ai-pipeline)
9. [Authentication & RBAC](#authentication--rbac)
10. [Security Features](#security-features)
11. [Running Tests](#running-tests)
12. [Docker Deployment](#docker-deployment)
13. [Demo Credentials](#demo-credentials)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    NGINX Reverse Proxy                   │
│              Rate Limiting · SSL · Headers               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                   FastAPI Application                    │
│  ┌──────────┐  ┌───────────┐  ┌────────────────────┐   │
│  │  Routes  │  │ Middleware │  │ Exception Handlers │   │
│  └────┬─────┘  └─────┬─────┘  └────────────────────┘   │
│       │              │                                   │
│  ┌────▼──────────────▼──────────────────────────────┐   │
│  │              Service Layer                        │   │
│  │  AuthService · ComplaintService · AnalyticsService│   │
│  └────────────────────┬──────────────────────────────┘   │
│                       │                                   │
│  ┌────────────────────▼──────────────────────────────┐   │
│  │            Repository Layer                       │   │
│  │  UserRepo · ComplaintRepo · AuditRepo · NotifRepo │   │
│  └────────────────────┬──────────────────────────────┘   │
│                       │                                   │
│  ┌────────────────────▼──────────────────────────────┐   │
│  │              AI Pipeline                          │   │
│  │  Gemini · SentenceTransformers · InsightsEngine   │   │
│  └───────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                PostgreSQL 16 Database                    │
│       18 Tables · Indexes · Foreign Keys · JSONB        │
└─────────────────────────────────────────────────────────┘
```

**Clean Architecture layers:**
- `routes/` → validate input, call service, return response
- `services/` → all business logic, orchestration
- `repositories/` → pure data access, no logic
- `models/` → SQLAlchemy ORM table definitions
- `schemas/` → Pydantic request/response validation
- `ai/` → Gemini client, complaint analyzer, chatbot, insights
- `middleware/` → JWT auth, security headers, rate limiting

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI 0.115 |
| Language | Python 3.12 |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic 1.14 |
| Validation | Pydantic v2 |
| Auth | JWT (python-jose) + bcrypt |
| AI | Google Gemini 1.5 Flash |
| Embeddings | Sentence Transformers |
| Web Server | Uvicorn + Nginx |
| Containers | Docker + Docker Compose |

---

## Project Structure

```
backend/
├── app/
│   ├── ai/                    # AI pipeline
│   │   ├── gemini_client.py   # Gemini API wrapper
│   │   ├── complaint_analyzer.py  # Triage + duplicate detection
│   │   ├── chatbot.py         # Citizen AI chatbot
│   │   └── insights_engine.py # Analytics AI
│   ├── api/v1/endpoints/      # Route handlers
│   │   ├── auth.py            # Login, register, tokens
│   │   ├── complaints.py      # CRUD + SOS + media
│   │   ├── analytics.py       # Dashboard metrics
│   │   ├── locations.py       # Stations, patrol units
│   │   ├── notifications.py   # In-app notifications
│   │   ├── chatbot.py         # Chatbot endpoint
│   │   ├── audit.py           # Audit logs
│   │   └── officers.py        # Officer management
│   ├── core/
│   │   ├── config.py          # All settings (env vars)
│   │   ├── security.py        # JWT, bcrypt, OTP
│   │   └── logging.py         # Structured logging
│   ├── db/
│   │   ├── base.py            # DeclarativeBase + mixins
│   │   └── session.py         # Engine, session factory
│   ├── exceptions/
│   │   └── handlers.py        # Centralized error handling
│   ├── middleware/
│   │   ├── auth.py            # JWT dependency injection
│   │   └── security.py        # CORS, headers, logging
│   ├── models/                # SQLAlchemy ORM models
│   │   ├── user.py            # User, CitizenProfile, PoliceProfile, tokens
│   │   ├── complaint.py       # Complaint, Media, Timeline, AIAnalysis
│   │   ├── location.py        # District, PoliceStation, PatrolUnit
│   │   ├── notification.py    # Notification
│   │   ├── audit.py           # AuditLog
│   │   ├── chat.py            # ChatHistory
│   │   └── enums.py           # All enum types
│   ├── repositories/          # Data access layer
│   ├── schemas/               # Pydantic models
│   ├── services/              # Business logic
│   ├── utils/
│   │   └── seed.py            # Demo data seeder
│   └── main.py                # FastAPI app entry point
├── migrations/
│   └── versions/
│       └── 001_initial_schema.py
├── tests/
│   ├── conftest.py            # Fixtures + test DB
│   ├── unit/                  # Unit tests (no DB)
│   └── integration/           # Integration tests
├── docker/
│   ├── nginx/                 # Nginx config
│   └── postgres/              # DB init SQL
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── alembic.ini
├── pytest.ini
├── setup.py                   # One-click setup
├── start_dev.bat              # Windows dev server
└── start_dev.sh               # Linux/Mac dev server
```

---

## Quick Start

### Prerequisites

- Python 3.10+
- PostgreSQL 16
- Git

### Option A — Automated Setup (Recommended)

```bash
# 1. Clone and enter backend directory
cd backend

# 2. Run the one-click setup script
python setup.py

# 3. Edit .env — set your DATABASE_URL and GEMINI_API_KEY

# 4. Start the development server
# Windows:
start_dev.bat

# Linux/Mac:
bash start_dev.sh
```

### Option B — Manual Setup

```bash
# 1. Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your database credentials and API keys

# 4. Create PostgreSQL database
psql -U postgres -c "CREATE USER sentinel WITH PASSWORD 'sentinel_pass';"
psql -U postgres -c "CREATE DATABASE sentinel_db OWNER sentinel;"

# 5. Run database migrations
alembic upgrade head

# 6. Seed demo data
python -m app.utils.seed

# 7. Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API Base**: `http://localhost:8000`
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Health Check**: `http://localhost:8000/health`

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required
DATABASE_URL=postgresql://sentinel:sentinel_pass@localhost:5432/sentinel_db
SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_urlsafe(64))">
JWT_SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_urlsafe(64))">
GEMINI_API_KEY=<your Gemini API key from aistudio.google.com>

# Optional (AI works with heuristic fallback without Gemini)
GEMINI_MODEL=gemini-1.5-flash

# For production file storage
USE_S3=true
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=sentinel-evidence-storage
```

---

## Database Schema

18 tables with full normalization, indexes, and foreign keys:

| Table | Description |
|-------|-------------|
| `users` | Core auth table for all roles |
| `citizen_profiles` | Extended citizen data |
| `police_profiles` | Officer rank, badge, station |
| `refresh_tokens` | JWT refresh token store (revocable) |
| `password_reset_tokens` | Single-use reset tokens |
| `email_verification_tokens` | Email OTP tokens |
| `districts` | Administrative districts |
| `police_stations` | Station locations and metadata |
| `patrol_units` | Live GPS patrol unit tracking |
| `complaints` | Core complaint entity |
| `complaint_media` | Evidence files (images/videos/docs) |
| `complaint_timeline` | Immutable status audit trail |
| `complaint_status_history` | Status change analytics |
| `officer_notes` | Internal investigation notes |
| `ai_analysis` | AI triage results per complaint |
| `notifications` | In-app notifications |
| `audit_logs` | Tamper-evident system audit trail |
| `chat_history` | AI chatbot conversation history |

---

## API Reference

All endpoints follow this response format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register/citizen` | Citizen registration | Public |
| POST | `/api/auth/login/citizen` | Citizen login | Public |
| POST | `/api/auth/login/police` | Police login | Public |
| POST | `/api/auth/refresh` | Rotate refresh token | Public |
| POST | `/api/auth/logout` | Revoke tokens | Bearer |
| POST | `/api/auth/password/reset/request` | Request reset link | Public |
| POST | `/api/auth/password/reset/confirm` | Set new password | Public |
| POST | `/api/auth/verify/email` | Verify email | Public |
| GET  | `/api/auth/me` | Get current user | Bearer |
| POST | `/api/auth/admin/officers` | Create police account | Admin only |

### Complaints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/complaints` | Submit complaint | Optional |
| GET  | `/api/complaints` | List/search complaints | Optional |
| GET  | `/api/complaints/{id}` | Get complaint by ID | Optional |
| PATCH | `/api/complaints/{id}/status` | Update status | Police |
| POST | `/api/complaints/{id}/assign` | Assign officer | Police |
| POST | `/api/complaints/{id}/notes` | Add internal note | Police |
| POST | `/api/complaints/{id}/media` | Upload evidence | Optional |
| DELETE | `/api/complaints/{id}` | Delete complaint | Auth |
| POST | `/api/emergency/sos` | Trigger SOS | Optional |

### Analytics & AI

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/analytics` | Dashboard KPIs | Police |
| GET | `/api/ai-insights` | AI crime intelligence | Police |

### Map & Locations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/stations` | All police stations | Public |
| POST | `/api/stations` | Create station | Admin |
| GET | `/api/patrol-units` | All patrol units | Public |
| PATCH | `/api/patrol-units/{id}` | Update unit GPS/status | Police |
| GET | `/api/districts` | All districts | Public |

### Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/notifications` | Get notifications | Bearer |
| GET | `/api/notifications/unread-count` | Unread count | Bearer |
| PATCH | `/api/notifications/{id}/read` | Mark read | Bearer |
| PATCH | `/api/notifications/mark-all-read` | Mark all read | Bearer |
| DELETE | `/api/notifications/{id}` | Delete notification | Bearer |

### Chatbot & Audit

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/chatbot` | AI chatbot message | Optional |
| GET | `/api/audit-logs` | System audit logs | Admin |
| GET | `/api/admin/users` | List officers | Police |

---

## AI Pipeline

Every complaint submission automatically triggers a 7-step AI pipeline:

```
Complaint Submitted
       │
       ▼
1. Crime Category Classification
       │
       ▼
2. Severity Assessment (Critical/High/Medium/Low)
       │
       ▼
3. Priority Assignment (CRITICAL/HIGH/ROUTINE)
       │
       ▼
4. Fake Complaint Detection (0-100% probability)
       │
       ▼
5. Duplicate Detection (Sentence Transformers + cosine similarity)
       │
       ▼
6. Nearest Station Calculation (Haversine distance formula)
       │
       ▼
7. BNS/IPC Section Recommendation + AI Summary
       │
       ▼
    Stored in ai_analysis table
    Complaint priority updated
    Timeline event added
    Notifications sent
```

**Fallback**: If Gemini is unavailable (no API key), the heuristic engine activates automatically using keyword matching, geographic data, and crime category rules. The system never fails silently.

---

## Authentication & RBAC

### Roles

| Role | Permissions |
|------|-------------|
| `citizen` | Own profile, own complaints, own notifications, chatbot |
| `police_officer` | All complaints, assign, update status, add notes |
| `police_admin` | Everything above + manage officers, audit logs, analytics |

### Token Flow

```
Login → Access Token (1hr) + Refresh Token (30 days)
         │                        │
         ▼                        ▼
  Used in requests          Stored in DB (hashed)
  Authorization: Bearer     Revocable at logout
         │
         ▼ (when expired)
  POST /auth/refresh → New token pair
  Old refresh token revoked immediately (rotation)
```

### Security Controls

- Passwords hashed with bcrypt (12 rounds)
- Account locked after 5 failed login attempts (30 min)
- Refresh tokens stored as SHA-256 hashes (never plaintext)
- JWT tokens verified on every request
- Citizens cannot access police endpoints (returns 403)
- All token operations are audit logged

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| Password Hashing | bcrypt (12 rounds) |
| JWT Auth | HS256, 1hr access + 30d refresh |
| Refresh Token Rotation | Old token revoked on each refresh |
| Account Lockout | 5 attempts → 30 min lock |
| Rate Limiting | 60 req/min general, 10/min auth |
| CORS | Configurable allowed origins |
| Security Headers | X-Frame-Options, X-XSS-Protection, HSTS |
| SQL Injection | SQLAlchemy ORM (parameterized queries) |
| XSS Prevention | HTML tag stripping in descriptions |
| Input Validation | Pydantic v2 with regex validators |
| File Upload Security | Extension + magic bytes validation |
| Audit Logging | Every action logged with IP + timestamp |
| Soft Delete | Data never hard-deleted, is_deleted flag |

---

## Running Tests

```bash
# Activate venv first
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows

# Run all tests
pytest

# Run with coverage report
pytest --cov=app --cov-report=html

# Run only unit tests (no database needed)
pytest tests/unit/ -v

# Run only integration tests
pytest tests/integration/ -v

# Run a specific test file
pytest tests/integration/test_auth.py -v

# Run a specific test
pytest tests/integration/test_auth.py::TestCitizenLogin::test_login_with_email_success -v
```

Tests use SQLite in-memory database — no PostgreSQL required for testing.

---

## Docker Deployment

### Development

```bash
# Start all services (PostgreSQL + Redis + API + Nginx)
docker-compose up -d

# With PgAdmin for database management
docker-compose --profile dev up -d

# View logs
docker-compose logs -f api

# Run migrations inside container
docker-compose exec api alembic upgrade head

# Rebuild after code changes
docker-compose up -d --build api
```

### Production

```bash
# Set production environment
export APP_ENV=production
export SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(64))")
export JWT_SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(64))")
export GEMINI_API_KEY=your_key_here

# Deploy
docker-compose up -d

# Health check
curl http://localhost/health
```

---

## Demo Credentials

After running `python -m app.utils.seed`:

| Role | Email / Badge | Password |
|------|--------------|----------|
| Police Admin | `c.sterling@delhipolice.gov.in` | `Admin@12345` |
| Police Admin | `rk.sharma@delhipolice.gov.in` | `Admin@12345` |
| Police Officer | `priya.sharma@delhipolice.gov.in` | `Officer@12345` |
| Citizen | `rahul.k@example.com` | `Citizen@12345` |
| Citizen | `priya.citizen@example.com` | `Citizen@12345` |

---

## Frontend Integration

The backend exposes all APIs at `/api/*` matching the existing frontend `api.ts` service layer exactly:

```typescript
// These all work with zero changes to the frontend:
fetch("/api/auth/login", ...)
fetch("/api/complaints", ...)
fetch("/api/stations", ...)
fetch("/api/patrol-units", ...)
fetch("/api/analytics", ...)
fetch("/api/ai-insights", ...)
fetch("/api/notifications", ...)
fetch("/api/chatbot", ...)
fetch("/api/audit-logs", ...)
```

---

## License

Government of India — Ministry of Home Affairs  
AI Crime Intelligence Division — Internal Use Only
