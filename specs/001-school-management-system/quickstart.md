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

**⚠️ Important**: This project uses Google OAuth with Supabase. For complete setup instructions including Google credentials, see **[AUTH_SETUP.md](../../AUTH_SETUP.md)**.

### Quick Setup (Existing Google Credentials)


**First-time setup?** See **[AUTH_SETUP.md](../../AUTH_SETUP.md)** for:
1. Creating a Supabase project
2. Setting up Google OAuth 2.0 credentials
3. Configuring the provider in Supabase
4. Testing the authentication flow

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

### Google Sign-In

1. Open [http://localhost:3000](http://localhost:3000).
2. Click **"Sign in with Google"** → Redirects to Google OAuth consent
3. After login:
   - JWT is stored in a cookie
   - Redirected to dashboard
   - User profile displays in sidebar (bottom)

### Dev Login (Bypass)

For testing without Google OAuth:
1. Click **"Dev Login"** button on login page
2. Instantly logged in as `dev@local.test` with SUPER_ADMIN role
3. No Google account required

### Logged-In User Profile Display

**[US12] Feature: Logged-in User Profile**

Once authenticated, the left sidebar displays your profile at the bottom:

```
┌─────────────────────┐
│                     │
│  [Avatar] John Doe  │
│  john@example.com   │
│  ▶ (click to open)  │
│                     │
└─────────────────────┘
```

- **Avatar**: Google profile picture or initials
- **Name**: Full name from Google profile
- **Email**: Email address
- **Dropdown menu** (click to open):
  - View full name and email
  - **Logout** button (with hover highlight)

**Components**:
- [src/components/UserProfile.tsx](../../src/components/UserProfile.tsx) - Fetches user data from Supabase Auth, renders profile UI
- [src/components/NavShell.tsx](../../src/components/NavShell.tsx) - Integrates UserProfile at bottom of sidebar

**Data source**: Supabase `auth.getUser()` returns authenticated user with Google metadata:
```typescript
{
  email: "john@example.com",
  user_metadata: {
    full_name: "John Doe",
    avatar_url: "https://lh3.googleusercontent.com/...",
  }
}
```

**Responsive behavior**:
- **Desktop (≥768px)**: Profile shown in sidebar (always visible)
- **Mobile (<768px)**: Profile hidden to preserve space (can be added to mobile menu if needed)
- **Logout flow**: Clears session and redirects to login page

---

## 7. Deployment (Tier 0)

### Prerequisites

- Supabase project created (see [AUTH_SETUP.md](../../AUTH_SETUP.md))
- Google OAuth credentials configured in Supabase
- Cloud database URL obtained

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
   - `DATABASE_URL` - Supabase cloud DB URL (with URL-encoded password)
   - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (e.g., `https://iybjgpzqmgxeopywkzkz.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
   - `SUPABASE_JWT_SECRET` - Supabase JWT secret
   - `NEXT_PUBLIC_API_URL` - Production API URL (e.g., `https://your-app.vercel.app`)

5. Update Google OAuth in Google Cloud Console:
   - Add your Vercel domain to **Authorized JavaScript origins**
   - Ensure redirect URI still points to Supabase: `https://iybjgpzqmgxeopywkzkz.supabase.co/auth/v1/callback`

---

## 8. Key URLs (Local Development)

| Service | URL |
|---------|-----|
| Frontend + API | http://localhost:3000 |
| Login Page | http://localhost:3000/login |
| API Routes | /api/v1/* |
| API Health | http://localhost:3000/api/v1/health |
| Prisma Studio | run `npx prisma studio` |

---

## 9. Troubleshooting

| Issue | Fix |
|-------|-----|
| Google OAuth: "redirect_uri_mismatch" | See [AUTH_SETUP.md Part 2](../../AUTH_SETUP.md#part-2-set-up-google-oauth-credentials) — ensure Supabase callback URL is registered |
| Backend won't start | Ensure `DATABASE_URL` is set, correctly URL-encoded, and database is accessible |
| Prisma Client not found | Run `npx prisma generate` |
| JWT verification fails | Confirm `SUPABASE_JWT_SECRET` matches Supabase JWT secret from dashboard |
| User profile not showing | Verify user is authenticated; check Supabase dashboard → Authentication → Users |
| Database migration fails | Check `DATABASE_URL` connection; run `npx prisma db execute --stdin < /dev/null` |
| Tests failing | Clear cache: `rm -rf node_modules/.vite`; reinstall: `npm install` |

---

## 10. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│  - Next.js Frontend (React)                              │
│  - Stores JWT in cookie (Supabase client)                │
│  - Displays UserProfile from authenticated session       │
└────────────────────┬────────────────────────────────────┘
                     │ Authorization: Bearer <JWT>
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Next.js Backend (Node.js)                   │
│  - API routes at /api/v1/*                               │
│  - Auth middleware verifies JWT using SUPABASE_JWT_SECRET│
│  - Scopes all queries to user's school_id               │
└────────────────────┬────────────────────────────────────┘
                     │ SQL
                     ↓
┌─────────────────────────────────────────────────────────┐
│         Supabase PostgreSQL (Cloud)                      │
│  - Stores users, schools, courses, enrollments, etc.     │
│  - Connected via DATABASE_URL                            │
└─────────────────────────────────────────────────────────┘

Authentication Flow:
User → Google OAuth (via Supabase) → JWT in cookie → Backend verification → API access
```
