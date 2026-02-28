# Testing Guide

## Overview

Flight Club now uses a unified full-stack Next.js architecture. All tests run against the same integrated application - there is no separate backend server.

## Test Types

### 1. **Unit Tests** ✅ 
Run without server - test business logic, utilities, components in isolation

```bash
npm test
npm run test:watch
npm run test:ui
```

**Examples:**
- `tests/sample.test.ts` - Sample unit tests
- `tests/contract/` - API contract tests (testing route handlers directly)

### 2. **Integration Tests** (require dev server)
Test the full-stack app with real API calls

Run these with dev server:
```bash
# Terminal 1
npm run dev

# Terminal 2
npm test
npm run test:watch
```

**Location:** `tests/integration/`

### 3. **End-to-End Tests** (require dev server)
Test complete user workflows

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:e2e
npm run test:e2e:only
```

**Location:** `tests/e2e/`

## Architecture Changes

### Before (Separate Services)
```
flight-club/
├── src/           # Next.js app
└── (dev server runs on :3000)
```

### Now (Unified Full-Stack)
```
flight-club/
├── src/           # All application code
├── tests/         # All tests at root level
└── (dev server runs on :3000)
```

## Running Tests

### Quick Start
```bash
# Run all unit & contract tests (no server needed)
npm test

# Watch mode
npm run test:watch

# Visual UI
npm run test:ui

# With coverage
npm test -- --coverage
```

### With Dev Server
```bash
# Terminal 1 - Start server
npm run dev

# Terminal 2 - Run tests
npm test              # All tests
npm run test:watch   # Watch mode
npm run test:e2e     # Only e2e tests
npm run test:e2e:only # Only vitest e2e (vs playwright)
```

## Test Organization

| Test Type | Location | Runs Without Server | Purpose |
|-----------|----------|-------------------|---------|
| Unit | `tests/sample.test.ts` | ✅ | Test utilities, logic, components |
| Contract | `tests/contract/` | ✅ | Test API route handlers directly |
| Integration | `tests/integration/` | ❌ | Test full app with real API calls |
| E2E | `tests/e2e/` | ❌ | Test complete user workflows |

## Key Changes from Multi-Service to Full-Stack

1. **API Base URL**: Now uses `http://localhost:3000`
2. **Backend Setup**: No separate server startup needed - API routes are built into Next.js
3. **Test Expectations**: 
   - Tests run against the same integrated application
   - All tests can be unit tests (mocking) or integration tests (hitting real endpoints)

## Common Issues

### Tests Failing with "fetch failed"?
Make sure dev server is running:
```bash
npm run dev
```

### Need to skip integration tests in CI?
Run only unit tests:
```bash
npm test -- tests/sample.test.ts tests/contract/
```

### Test expects specific API URL?
Check `tests/setup.ts` and `.env.local` to ensure NEXT_PUBLIC_API_URL is set correctly:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## VS Code Integration

### Test Explorer
- Vitest Explorer extension recommended (see `.vscode/extensions.json`)
- Press Ctrl+Shift+D → Select "Debug Tests" to debug individual tests
- Click beaker icon in sidebar to see all tests

### Run Tasks
- Terminal → Run Task → npm: dev (start dev server)
- Terminal → Run Task → npm: test (run tests)

## Next Steps

- [ ] Increase test coverage to 80%+
- [ ] Add authenticated user flow tests
- [ ] Add course enrollment flow tests
- [ ] Add multi-tenant isolation tests
- [ ] Add performance benchmarks
- [ ] Set up GitHub Actions CI with test reporting
