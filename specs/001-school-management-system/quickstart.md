# Quickstart: School Management System

**Feature**: `001-school-management-system`  
**Date**: 24 February 2026

---

## Prerequisites

| Tool | Min Version | Install |
|------|-------------|---------|
| Python | 3.12 | `pyenv install 3.12` |
| Node.js | 20 LTS | `nvm install 20` |
| Docker | 24+ | [docker.com](https://docker.com) |
| Supabase CLI | 1.x | `brew install supabase/tap/supabase` |
| Make | any | pre-installed on Linux/macOS |

---

## Repository Structure

```
flight-club/
├── backend/       # FastAPI (Python 3.12)
├── frontend/      # Next.js 14
├── infra/         # Supabase CLI migrations, Render/Vercel configs
├── docs/          # ADRs, diagrams
└── Makefile       # Single entry-point for all dev commands
```

---

## 1. Clone & Bootstrap

```bash
git clone https://github.com/your-org/flight-club.git
cd flight-club
git checkout 001-school-management-system
```

---

## 2. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt        # FastAPI, SQLAlchemy, Alembic, etc.
pip install -r requirements-dev.txt    # pytest, httpx, ruff, mypy
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

```dotenv
# .env (backend)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:54322/postgres
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_JWT_SECRET=<jwt-secret>          # from Supabase project settings
RESEND_API_KEY=re_...                     # from resend.com dashboard
FRONTEND_URL=http://localhost:3000
```

### Start Supabase Locally

```bash
supabase start          # starts local Postgres + Auth on port 54322
make migrate            # runs Alembic migrations
make seed               # loads reference/seed data
```

### Run Backend

```bash
cd backend
uvicorn src.main:app --reload --port 8000
```

API docs available at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 3. Frontend Setup

```bash
cd frontend
npm install
```

### Environment Variables

```bash
cp .env.local.example .env.local
```

```dotenv
# .env.local (frontend)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>   # output of `supabase start`
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Run Frontend

```bash
npm run dev
# → http://localhost:3000
```

---

## 4. Running Tests

```bash
# All tests (CI-equivalent)
make test

# Backend unit + integration tests only
cd backend && pytest --cov=src --cov-report=term-missing

# E2E (requires both backend + frontend running)
cd frontend && npx playwright test
```

**Coverage gate**: `make test` fails if backend line coverage < 80%.

---

## 5. Make Commands

| Command | Description |
|---------|-------------|
| `make test` | Run all tests (lint + pytest + playwright) |
| `make lint` | ruff + mypy (backend), ESLint (frontend) |
| `make build` | Production build check |
| `make migrate` | Run Alembic migrations against local DB |
| `make seed` | Load reference/seed data |
| `make format` | Auto-format backend (ruff) + frontend (prettier) |

---

## 6. First-Time User Flow (Development)

1. Open [http://localhost:3000](http://localhost:3000).
2. Click **Sign in with Google** — redirects to Supabase local Auth (Google OIDC via configured OAuth app).
3. On first login, a `User` record is created. No roles are assigned yet.
4. To bootstrap a super-admin, run:
   ```bash
   make seed-superadmin EMAIL=your@email.com
   ```
5. Log in again — you should see the super-admin dashboard.
6. From the super-admin dashboard:
   - Create a school (e.g., "Sky High School").
   - Create a syllabus with lessons.
   - Assign a school admin role to another user.
7. Log in as school admin → create a course → assign instructor → enroll student.

---

## 7. Deployment (Tier 0)

### Backend → Render (Free)

1. Connect Render to the GitHub repo.
2. Set **Root Directory** to `backend/`.
3. Set **Build Command**: `pip install -r requirements.txt && alembic upgrade head`.
4. Set **Start Command**: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`.
5. Add environment variables (same as `.env` above, pointing to Supabase cloud project).

### Frontend → Vercel (Hobby)

1. Import GitHub repo in Vercel dashboard.
2. Set **Root Directory** to `frontend/`.
3. Add environment variables from `.env.local` above (pointing to Supabase cloud project).
4. Every push to `main` auto-deploys. PRs get preview URLs.

### Database + Auth → Supabase (Free)

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Enable Google OAuth under **Authentication → Providers**.
3. Run migrations via Supabase CLI: `supabase db push` (or `make migrate` with `DATABASE_URL` pointing to cloud DB).
4. Commit `infra/supabase/` to version control.

---

## 8. Key URLs (local)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |
| Supabase Studio | http://localhost:54323 |

---

## 9. Troubleshooting

| Issue | Fix |
|-------|-----|
| Render free tier cold start (15 min) | Hit the backend URL directly to wake it before testing |
| JWT verification fails locally | Confirm `SUPABASE_JWT_SECRET` matches the Supabase local instance secret (`supabase status`) |
| Google OAuth redirect error | Ensure `http://localhost:3000` is in your Google OAuth app's Authorized Redirect URIs |
| Migration fails | Run `alembic history` to check state; `alembic downgrade -1` to roll back one step |
