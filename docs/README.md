# Flight Club Documentation

## Unified Full-Stack Architecture

As of 2026-02-28, Flight Club is a **unified Next.js full-stack application**.

- **Application**: Next.js 14 full-stack (React frontend + API routes backend on port 3000)
- **All 49 API endpoints**: Integrated as Next.js API routes at `/api/v1/*`
- **Database**: PostgreSQL 16 via Supabase
- **Auth**: JWT verification + Google OIDC (Supabase)
- **RBAC**: Super-admin, Admin, Instructor, Student roles with scope-based access control

### Architecture

- **Single Next.js Application**: Frontend pages + API routes in one deployment
- **Frontend**: React 18 components (SSR/CSR)
- **Backend**: Next.js API routes at `/api/v1/*` with Express-like routing
- **ORM**: Prisma 5 + PostgreSQL
- **Database**: PostgreSQL 16 via Supabase
- **Auth**: JWT verification + Google OIDC (Supabase)

### Local Development

```bash
# Start unified Next.js app (frontend + API routes)
npm install
npm run dev        # Runs on http://localhost:3000
```

Everything runs in one process - no separate backend server needed.

### Testing

```bash
# All tests (unit + contract tests, no server needed)
npm test

# Watch mode
npm run test:watch

# Integration/E2E tests (auto-starts dev server)
npm run test:e2e

# Full test suite
npm test -- --run   # All tests (20 passing)
```

See [../TESTING.md](../TESTING.md) for detailed testing guide.
