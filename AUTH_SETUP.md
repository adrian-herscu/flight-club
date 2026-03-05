# Authentication Setup Guide

**Date**: 28 February 2026  
**Status**: ✅ Google OAuth + Supabase Cloud Configuration  
**Feature**: `001-school-management-system`

---

## Overview

The School Management System uses:
- **Supabase Auth** for OAuth provider management
- **Google OAuth 2.0** for user authentication
- **Cloud-hosted Postgres** (Supabase) for data
- **JWT verification** on the Next.js backend

This guide covers setup for both **local development** (with dev login bypass) and **production** (Google OAuth flow).

---

## Part 1: Create Your Supabase Project

### 1.1 Create Cloud Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Enter:
   - **Project name**: e.g., `flight-club-dev`
   - **Database password**: Save this securely
   - **Region**: Pick closest to your users
4. Wait for provisioning (~2 minutes)
5. Note your project details from Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key
   - `DATABASE_URL`: From Settings → Database → Connection Pooling (use this for Prisma)

---

## Part 2: Set Up Google OAuth Credentials

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable **Google+ API**:
   - Search for "Google+ API" in the search bar
   - Click **Enable**

### 2.2 Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → **OAuth 2.0 Client ID**
3. **Configure OAuth consent screen** (if prompted):
   - **User Type**: External
   - **App name**: Flight Club
   - **Scopes**: Select `openid`, `email`, `profile`
   - Publish the app
4. **Create OAuth Client**:
   - **Application type**: Web application
   - **Name**: Flight Club Dev
   - **Authorized JavaScript origins**: Add both:
     - `http://localhost:3000` (development)
     - `https://iybjgpzqmgxeopywkzkz.supabase.co` (Supabase domain)
   - **Authorized redirect URIs**: Add:
     - `https://iybjgpzqmgxeopywkzkz.supabase.co/auth/v1/callback` (Supabase callback)
5. Click **Create**
6. Copy your **Client ID** and **Client Secret**

⚠️ **Important**: The redirect URI must point to Supabase, not your app. Supabase handles the OAuth callback and exchanges the code for a JWT.

---

## Part 3: Configure Supabase Google Provider

### 3.1 Add Google Credentials to Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers** → **Google**
3. Enable the provider and paste:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console (click eye icon to reveal)
4. Click **Save**

### 3.2 Verify Callback URL

1. Still in **Authentication** → **Providers** → **Google**
2. Confirm the callback URL is:
   ```
   https://iybjgpzqmgxeopywkzkz.supabase.co/auth/v1/callback
   ```
   (This is automatically set by Supabase)

---

## Part 4: Configure Project Environment

### 4.1 Get JWT Secret

1. In Supabase dashboard, go to **Settings** → **API** → **JWT Settings**
2. Under **Legacy JWT Secret**, copy the secret value

---

## Part 5: Testing Without OAuth

### 5.1 Development Mode Bypass

The `/api/v1/me` endpoint supports a dev mode bypass for local testing and contract tests:

**Usage in Tests**:
```typescript
const request = new Request("http://localhost:3000/api/v1/me", {
  headers: {
    authorization: "Bearer dev-mode-local-testing-token",
    "x-dev-user-email": "dev@local.test",
    "x-dev-user-name": "Dev User",
    "x-dev-user-role": "admin"
  }
});
```

**Usage with curl**:
```bash
curl -H "Authorization: Bearer dev-mode-local-testing-token" \
     -H "x-dev-user-role: admin" \
     http://localhost:3000/api/v1/me
```

**Mock User Attributes**:
- `x-dev-user-email`: Defaults to `"dev@local.com"`
- `x-dev-user-name`: Defaults to `"Dev User"`
- `x-dev-user-role`: Defaults to `"super-admin"`
  - Valid values: `"super-admin"`, `"admin"`, `"instructor"`, `"student"`
  - Maps to roles: `super_admin`, `school_admin`, `instructor`, `student`

**Requirements**:
- `NODE_ENV` must be `"development"` (not `"test"` or `"production"`)
- Token must be exactly `"dev-mode-local-testing-token"`

⚠️ **Security Note**: This bypass is **disabled** in production. Any attempt to use the dev token when `NODE_ENV !== "development"` returns HTTP 401.
3. This is needed for backend JWT verification


---

## Part 5: Deploy Migrations & Seed Data

### 5.1 Create Database Schema

```bash
export DATABASE_URL="postgresql://postgres:PASSWORD%3Eyt6R%2A%5DVx_s@db.iybjgpzqmgxeopywkzkz.supabase.co:5432/postgres"
npx prisma migrate deploy
```

### 5.2 Populate Seed Data (Optional)

```bash
npm run seed
```

This creates sample data:
- Dev school
- Sample syllabus with lessons
- Sample course
- Admin user

---

## Part 6: Test Authentication

### 6.1 Start Dev Server

```bash
npm run dev:restart
# Server runs on http://localhost:3000
```

### 6.2 Test Google Sign-In

1. Visit `http://localhost:3000`
2. You should see the login page with two buttons:
   - **"Sign in with Google"** — Redirects to Google OAuth
   - **"Dev Login"** — Instant login (dev mode only)

3. Click **"Sign in with Google"**:
   - You're redirected to Google
   - After login, redirected to `https://iybjgpzqmgxeopywkzkz.supabase.co/auth/v1/callback`
   - Supabase exchanges the code for a JWT
   - You're redirected back to `http://localhost:3000/auth/callback`
   - JWT is stored in a cookie
   - You see the dashboard with your Google profile info

### 6.3 Verify Profile Display

Once logged in:
- Look at the **left sidebar** (or mobile menu)
- At the **bottom**, you should see:
  - Your avatar (Google profile picture or initials)
  - Your full name
  - Your email address
  - Click to open a dropdown with **Logout** button

---

## Part 7: For Production Deployment

### 7.1 Update Google OAuth Redirect URIs

Add your production domain to Google Cloud Console:

**APIs & Services** → **Credentials** → Edit OAuth 2.0 Client:

```
Authorized redirect URIs:
- https://iybjgpzqmgxeopywkzkz.supabase.co/auth/v1/callback
- https://yourdomain.com/auth/v1/callback  ← Add this for production
```

No changes needed to your app code or `.env` — the OAuth flow automatically detects the redirect source.

### 7.2 Update `.env.production`

Create `.env.production` with:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://iybjgpzqmgxeopywkzkz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_cPSqn0JW_g21z_tvDQn98Q_2SrLFm_u
DATABASE_URL="postgresql://..."  # Your production DB URL
SUPABASE_JWT_SECRET="..."
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

---

## Architecture: How Auth Works

### Login Flow

```
User clicks "Sign in with Google"
          ↓
Browser redirected to: https://iybjgpzqmgxeopywkzkz.supabase.co/oauth/authorize?...
          ↓
Supabase redirects to Google OAuth consent screen
          ↓
User grants permission
          ↓
Google redirects back to Supabase callback URL with authorization code
          ↓
Supabase exchanges code for JWT token
          ↓
Supabase redirects to localhost:3000/auth/callback with JWT in URL
          ↓
Next.js page [src/app/(auth)/callback/page.tsx] extracts JWT
          ↓
JWT stored in cookie via Supabase client
          ↓
User redirected to dashboard
```

### API Request Flow

```
Frontend needs data (e.g., GET /api/v1/syllabuses)
          ↓
Frontend sends request with: Authorization: Bearer <JWT>
          ↓
Next.js middleware [src/lib/middleware/auth.ts] extracts JWT
          ↓
Middleware uses SUPABASE_JWT_SECRET to verify JWT signature
          ↓
If valid → Extract user ID and school_id from JWT claims
          ↓
Route handler queries database scoped to user's school
          ↓
Response sent to frontend
```

### Dev Login (Bypass)

In development (`NODE_ENV=development`), the auth middleware recognizes a special token:

```typescript
if (token === "dev-mode-local-testing-token" && NODE_ENV === "development") {
  // Create/find dev user, grant SUPER_ADMIN role
  // Proceed with request
}
```

This allows testing without Google OAuth. Click **"Dev Login"** button to use this.

---

## Troubleshooting

### "Error 400: redirect_uri_mismatch"

**Cause**: Google OAuth redirect URI doesn't match configuration.

**Fix**:
1. Verify Google Cloud Console has: `https://iybjgpzqmgxeopywkzkz.supabase.co/auth/v1/callback`
2. NOT `http://localhost:3000/auth/callback` (that's for your app, not Google)
3. Allow ~5 minutes for Google to apply changes

### "Environment variable not found: DATABASE_URL"

**Cause**: `.env` not loaded into shell.

**Fix**:
```bash
export DATABASE_URL="postgresql://..."
npx prisma db pull  # or any prisma command
```

Or use a new terminal session after updating `.env`.

### User profile not showing

**Cause**: Supabase returns no user metadata.

**Fix**:
1. Verify Google OAuth is set up correctly
2. Check Supabase dashboard → Authentication → Users
3. Manually verify the user record has `raw_user_meta_data` with Google profile

---

## Key Files

| File | Purpose |
|------|---------|
| `.env` | Local development environment variables |
| `src/services/supabaseClient.ts` | Supabase client initialization |
| `src/lib/middleware/auth.ts` | JWT verification & user extraction |
| `src/app/(auth)/login/page.tsx` | Login page with Google & dev buttons |
| `src/app/(auth)/callback/page.tsx` | OAuth callback handler |
| `src/components/UserProfile.tsx` | Displays logged-in user info |
| `src/components/NavShell.tsx` | Navigation with embedded UserProfile |

---

## References

- [Supabase Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2/web-server-flow)
- [Supabase JWT Settings](https://supabase.com/docs/guides/api/api-keys-and-tokens)
