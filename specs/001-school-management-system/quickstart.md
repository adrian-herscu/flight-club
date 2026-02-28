# Quickstart: School Management System

**Feature**: `001-school-management-system`  
**Date**: 24 February 2026  
**Status**: ✅ Unified Full-Stack Next.js Architecture

---

## Prerequisites

| Tool | Min Version | Install |
|------|-------------|---------|
| Node.js | 20 LTS | `nvm install 20` |
| Docker | 24+ | [docker.com](https://docker.com) |
| Supabase CLI | 1.x | `brew install supabase/tap/supabase` |

---

## Repository Structure

```
flight-club/
├── src/           # Unified Next.js app (frontend + API routes)
├── tests/         # All tests at root level
├── prisma/        # Prisma schema
├── scripts/       # Helper scripts
├── docs/          # ADRs, diagrams
└── package.json   # Single entry-point for all commands
```

---

## 1. Clone & Bootstrap

```bash
git clone https://github.com/your-org/flight-club.git
cd flight-club

# Install dependencies
npm install
```

---

## 2. Setup Supabase & Database

```bash
# Start local Supabase (Postgres + Auth)
supabase start

# Run migrations
npx prisma migrate dev

# Optional: Load seed data
npm run seed  # (if seed script exists)
```

---

## 3. Environment Configuration

Create `.env.local` in the project root:

```dotenv
# Database (from Supabase)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Supabase Auth (from `supabase start` output)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>

# API URL (unified - same server)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 4. Run Development Server

```bash
npm run dev
# → http://localhost:3000 (Frontend + API Routes)
```

API endpoints available at `/api/v1/*`  
API health check: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

---

## 5. Running Tests

```bash
# All tests (unit + contract tests, no server needed)
npm test

# Watch mode
npm run test:watch

# Visual UI
npm run test:ui

# Integration/E2E tests (auto-starts dev server)
npm run test:e2e

# With coverage
npm test -- --coverage
```

**Test Organization:**
- `tests/sample.test.ts` - Unit tests (run without server)
- `tests/contract/` - API route handler tests (run without server)
- `tests/integration/` - Full-stack API tests (auto-start server)
- `tests/e2e/` - User workflow tests (auto-start server)

---

## 6. First-Time User Flow (Development)

1. Open [http://localhost:3000](http://localhost:3000).
2. Click **Sign in with Google** → redirects to Supabase local Auth.
3. On first login, a `User` record is auto-created in the database.
4. To bootstrap a super-admin:
   ```bash
   npx prisma studio
   # Manually create UserRole: userId, roleType: SUPER_ADMIN, schoolId: null
   ```
5. Log in again → should see super-admin dashboard.
6. From super-admin dashboard:
   - Create a school (e.g., "Sky High School").
   - Create a syllabus with lessons.
   - Assign school-admin role to another user.
7. Log in as school-admin → create course → assign instructor → enroll student.

---

## 7. Deployment (Tier 0)

### Full-Stack → Vercel

1. Import GitHub repo in Vercel dashboard.
2. Set **Build Command**:
   ```bash
   npm install && npm run build
   ```
3. Set **Start Command**:
   ```bash
   npm start
   ```
4. Set **Environment Variables**:
   - `DATABASE_URL` - Supabase cloud DB URL
   - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
   - `NEXT_PUBLIC_API_URL` - Production API URL (e.g., https://your-app.vercel.app)

---

## 8. Troubleshooting

**Tests fail with "fetch failed"?**
- Make sure dev server is running: `npm run dev` in a separate terminal

**Port 3000 already in use?**
- Kill the process: `lsof -ti:3000 | xargs kill -9`
- Or start on different port: `PORT=3001 npm run dev`

**Database connection fails?**
- Check Supabase is running: `supabase status`
- Verify DATABASE_URL in .env.local matches your local Supabase setup
2. Set **Root Directory** to `frontend/`.
3. Add **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` - Supabase cloud URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
   - `NEXT_PUBLIC_API_URL` - Render backend URL

### Database + Auth → Supabase (Free)

1. Create Supabase project at [supabase.com](https://supabase.com).
2. Enable **Google OAuth** under Authentication → Providers.
3. Create database tables (Prisma migrations):
   ```bash
   # Use Supabase connection string in prisma/.env
   npx prisma migrate deploy
   ```
4. Update frontend OAuth redirect URIs to include Vercel URL.

---

## 8. Key URLs (Local)

| Service | URL |
|---------|-----|
| Frontend + API | http://localhost:3000 |
| API Routes | /api/v1/* |
| API Health | http://localhost:3000/api/v1/health |
| Prisma Studio | run `npx prisma studio` |
| Supabase Studio | http://localhost:54323 |

---

## 9. Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend won't start | Ensure `DATABASE_URL` is set and database is accessible; check Node.js version ≥ 20 |
| Prisma Client not found | Run `npx prisma generate` |
| JWT verification fails | Confirm `SUPABASE_JWT_SECRET` matches Supabase instance (check `supabase status`) |
| Google OAuth fails | Add `http://localhost:3000` to Supabase Google OAuth redirect URIs |
| Database migration fails | Check `DATABASE_URL` connection; run `npx prisma db execute --stdin < /dev/null` |
| Tests failing | Clear cache: `rm -rf node_modules/.vite`; reinstall: `npm install` |
