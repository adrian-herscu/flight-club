# Flight Club - School Management System

Multi-tenant SaaS platform for managing paragliding and hang gliding schools.

## ✅ Consolidation Complete

**Single Tech Stack: Next.js Full-Stack**

- **Application**: Next.js 14 (TypeScript, React 18, API routes)
- **Database**: PostgreSQL 16 via Supabase
- **Tests**: Vitest (unit/integration), Playwright (E2E)
- **Deployment**: Vercel

---

## Quick Start

### 🔐 Authentication Setup

**First time?** Complete authentication setup is documented in **[AUTH_SETUP.md](AUTH_SETUP.md)**

This includes:
- Creating a Supabase project
- Setting up Google OAuth 2.0 credentials
- Configuring environment variables
- Testing locally with Google sign-in

### Prerequisites
- Node.js >= 20.0.0
- PostgreSQL 16 (via Supabase cloud)
- Google account (for Google OAuth testing)

### Setup (Cloud Supabase)

```bash
npm install
npx prisma generate


# Deploy migrations to cloud database
export DATABASE_URL="postgresql://..."  # URL-encoded password
npx prisma migrate deploy
npm run seed  # Optional: load sample data

npm run dev:restart
```

App: `http://localhost:3000`  
API: `http://localhost:3000/api/v1/`  
**Login with**: Google OAuth or Dev Login button

---

## Architecture

- **Single Full-Stack App**: Next.js 14 with integrated API routes
- **Pages**: React 18 components at `/` routes
- **API**: Next.js API routes at `/api/v1/*`
- **Database**: PostgreSQL 16 via Supabase
- **Auth**: Supabase Auth (Google OAuth 2.0) + JWT verification (see [AUTH_SETUP.md](AUTH_SETUP.md))
- **User Profile**: Displays logged-in user with Google profile info (see [src/components/UserProfile.tsx](src/components/UserProfile.tsx))
- **ORM**: Prisma 5
- **Validation**: Zod 3
- **Deployment**: Vercel (single deployment)
- **Testing**: Vitest (80%+ coverage), Playwright (E2E)

---

## Documentation

- **Specs**: `specs/001-school-management-system/`
  - `spec.md` - Feature specification
  - `plan.md` - Technical plan
  - `tasks.md` - Implementation tasks
  - `data-model.md` - Database schema
  - `quickstart.md` - Getting started guide
  - `contracts/api-v1.md` - API contracts

- **Session Retrospectives**:
  - [docs/session-retrospective-2026-03-02.md](docs/session-retrospective-2026-03-02.md) - Acceptance validation findings, fixes, and process introspection

- **Migration History**: `docs/migration/`
  - Migration documentation from multi-service to Next.js full-stack

- **Source Code**: 
  - `src/app/api/v1/` - All API endpoints
  - `src/lib/services/` - Business logic
  - `src/lib/middleware/` - Auth, RBAC, error handling

---

## Testing

### Backend APIs
```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:ui      # UI mode
```

### E2E Tests
```bash
npm run test:e2e     # E2E tests (auto-starts dev server)
```

---

## Development Commands

```bash
npm run dev           # Start dev server
npm run build         # Build for production
npm run start         # Run production build
npm run lint          # Run ESLint
npm run format:write  # Format code

npm run migrate:dev   # Run Prisma migrations
npm run prisma:studio # Open Prisma Studio
```

---

## API Endpoints

All 49 endpoints are available at `http://localhost:3000/api/v1/`

See [contracts/api-v1.md](specs/001-school-management-system/contracts/api-v1.md) for complete API specification.

**Main resources:**
- `/schools` - School management
- `/courses` - Course management
- `/syllabuses` - Curriculum management
- `/enrollments` - Student enrollments
- `/instructors` - Instructor assignments
- `/evaluations` - Student evaluations

---

## Deployment

Deploy to Vercel with a single command:

```bash
vercel deploy
```

Vercel automatically:
- Builds the Next.js app
- Deploys frontend pages
- Deploys API routes at `/api/v1/*`
- Runs Prisma migrations
- Handles environment variables

See `vercel.json` for deployment configuration.

---

## Why Single Stack?

For a solo team building a prototype (target: <1000 concurrent users):
- ✅ Single `npm install` and deployment
- ✅ One tech stack to maintain
- ✅ No operational complexity (separate backend server)
- ✅ Simpler debugging and testing
- ✅ Easier auth sharing (same process)
- ✅ All 49 API endpoints still preserved with `/api/v1/` versioning

The architecture is still modular - services, middleware, and routes are cleanly separated in `src/lib/` despite being deployed together.

# Pipeline test - 1772522027
