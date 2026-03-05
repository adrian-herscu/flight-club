# Deployment Guide

This guide explains how to deploy the Flight Club CRM to Vercel with automatic preview deployments for every PR.

## Overview

The application uses Vercel for hosting with the following features:
- **Automatic deployments** on every commit to PRs
- **Preview URLs** for each PR (e.g., `https://flight-club-pr-123.vercel.app`)
- **Production deployment** when merging to `main`
- **Auto-role assignment**: New Google OAuth users get STUDENT role by default
- **Super Admin access**: `adrian.herscu@gmail.com` has SUPER_ADMIN privileges

## Prerequisites

1. **Vercel Account**: Create a free account at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Database**: PostgreSQL database (Supabase, Railway, Neon, etc.)
4. **Supabase Project**: For authentication

## Initial Setup

### 1. Import Project to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js configuration
4. **Do not deploy yet** - configure environment variables first

### 2. Configure Environment Variables

In Vercel Project Settings → Environment Variables, add:

#### Required Variables

| Variable | Value | Environments |
|----------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Production, Preview, Development |
| `DATABASE_URL` | PostgreSQL connection string | Production, Preview, Development |

**Important**: Check all three environments (Production, Preview, Development) for each variable.

#### Getting Supabase Values

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

#### Getting Database URL

**For this project**, use the Supabase database:

```
postgresql://postgres:AYYC>yt6R*]Vx_s@db.iybjgpzqmgxeopywkzkz.supabase.co:5432/postgres
```

**Important**: Use the **Transaction Pooling** connection string from Supabase for Vercel:
- Go to Supabase → Settings → Database
- Look for "Connection Pooling" section
- Use the "Transaction" mode connection string
- Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

For other database providers:
- **Railway/Neon**: Copy the connection string from your dashboard
- Format: `postgresql://user:password@host:port/database`

### 3. Configure GitHub Secrets

For automated deployments via GitHub Actions, add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | How to Get It |
|-------------|---------------|
| `VERCEL_TOKEN` | Vercel Dashboard → Settings → Tokens → Create Token |
| `VERCEL_ORG_ID` | Run `vercel whoami` in terminal after installing Vercel CLI |
| `VERCEL_PROJECT_ID` | Vercel Project Settings → General → Project ID |

#### Getting Vercel IDs

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Get your Org ID
vercel whoami
# Look for "id:" in the output

# Get Project ID from .vercel/project.json after linking
cat .vercel/project.json
```

### 4. Run Database Migrations

After deploying, run migrations on your database:

```bash
# If using Vercel CLI locally
DATABASE_URL="your-production-db-url" npx prisma migrate deploy

# Or use the database provider's CLI/dashboard
```

### 5. Seed the Database

Run the seed script to create:
- Demo super-admin user (`adrian.herscu@gmail.com`)
- Sample school
- Development users (for local testing)

```bash
DATABASE_URL="your-production-db-url" npm run seed
```

## Deployment Workflow

### Automatic PR Previews

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and push**
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin feature/my-feature
   ```

3. **Open a Pull Request**
   - GitHub Actions will automatically deploy a preview
   - A comment will be added to the PR with the preview URL
   - Example: `https://flight-club-git-feature-my-feature-yourorg.vercel.app`

4. **Each new commit updates the preview**
   - Push additional commits
   - Preview deployment updates automatically
   - Share the URL with team members for testing

### Production Deployment

When you merge a PR to `main`:
1. Vercel automatically deploys to production
2. Production URL: `https://flight-club.vercel.app` (or your custom domain)

## User Access Model

### New Users (Demo)

When someone logs in with Google OAuth for the first time:
1. Their account is created automatically
2. They are assigned the **STUDENT** role
3. They are enrolled in the first school in the database
4. They can access student dashboard and features

### Super Admin

The email `adrian.herscu@gmail.com` is pre-configured as SUPER_ADMIN:
- Full access to all schools
- Can manage syllabuses, courses, and users
- Access to super-admin dashboard

### Customizing Roles

To add more admins or instructors, update the database:

```sql
-- Find user ID
SELECT id, email FROM "User" WHERE email = 'user@example.com';

-- Add ADMIN role for a school
INSERT INTO "UserRole" (user_id, school_id, role_type)
VALUES ('user-id-here', 'school-id-here', 'ADMIN');

-- Add SUPER_ADMIN role (no school_id)
INSERT INTO "UserRole" (user_id, role_type)
VALUES ('user-id-here', 'SUPER_ADMIN');
```

## Vercel Configuration

The `vercel.json` file defines:
- Build command: `npm run build`
- Install command: `npm install`
- Framework detection: Next.js
- Environment variable requirements

## Troubleshooting

### Preview Deployment Fails

1. **Check build logs** in Vercel dashboard
2. **Verify environment variables** are set for Preview environment
3. **Check database connection** - ensure DATABASE_URL is accessible

### Authentication Not Working

1. **Verify Supabase variables** are correct
2. **Check Supabase redirect URLs**:
   - Go to Supabase → Authentication → URL Configuration
   - Add your Vercel preview domain: `https://*.vercel.app/**`
   - Add your production domain

### Database Connection Issues

1. **Check DATABASE_URL** format
2. **Verify database is accessible** from Vercel's region
3. **Check connection pooling** - use PgBouncer for Vercel
4. **Run migrations**: Ensure database schema is up-to-date

### GitHub Actions Not Running

1. **Check GitHub Secrets** are set correctly
2. **Verify workflow file** is in `.github/workflows/vercel-preview.yml`
3. **Check repository permissions** - Actions must be enabled

## Commands Reference

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy manually
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs <deployment-url>

# Run migrations on production
DATABASE_URL="prod-url" npx prisma migrate deploy

# Run seed script
DATABASE_URL="prod-url" npm run seed
```

## Security Notes

- **Dev-mode bypass is DISABLED in production**: The `dev-mode-local-testing-token` authentication bypass only works when `NODE_ENV=development`. Vercel automatically sets `NODE_ENV=production`, so this bypass is completely disabled in deployments.
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret - it has admin privileges
- Rotate secrets regularly in Vercel and Supabase dashboards
- Review Vercel access logs periodically
- The database credentials are configured in Vercel environment variables, not in code

## Custom Domain (Optional)

To add a custom domain:

1. Go to Vercel Project Settings → Domains
2. Add your domain (e.g., `flightclub.yourdomain.com`)
3. Configure DNS records as instructed by Vercel
4. Update Supabase redirect URLs to include your custom domain

## Cost Considerations

- **Vercel Free Tier**: 100 GB bandwidth, serverless functions included
- **Database**: Choose appropriate plan (Supabase free tier is generous)
- **Upgrade when needed**: Monitor usage in Vercel dashboard

## Support

For issues:
1. Check Vercel deployment logs
2. Review GitHub Actions logs
3. Check Supabase auth logs
4. Review database connection pooling settings
