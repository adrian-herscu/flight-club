# End-to-End Testing

## Overview

E2E tests validate the full stack integration within the Next.js application.
The backend is now integrated into the same application as the frontend.

## Prerequisites

**Development server must be running:**
```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

## Running E2E Tests

From the project root:

```bash
# First, start the dev server in another terminal
npm run dev

# Then in your test terminal, run tests
npm test

# Run only e2e tests
npm test e2e

# Run with UI
npm run test:ui
```

## Test Structure

- **`e2e/api.test.ts`** - API endpoint validation
  - Health endpoint status
  - Authentication requirements
  - Error response format
  - Request ID tracking

## What E2E Tests Validate

✅ Dev server is running and responding  
✅ API endpoints return expected status codes  
✅ Error responses follow the correct format  
✅ Authentication requirements are enforced  
✅ Request tracking (request_id) is working  

## Running Tests

These integration tests require the dev server to be running. Start in two terminals:

**Terminal 1 - Start dev server:**
```bash
npm run dev
```

**Terminal 2 - Run tests:**
```bash
npm test
npm run test:watch  # Watch mode
npm run test:ui     # With visual UI
```

## Adding New Integration Tests

1. Create a test file in `tests/integration/` or `tests/e2e/`
2. Tests will connect to `http://localhost:3000` by default
3. They run against the live dev server
4. No mocking - tests real API behavior

Example:
```typescript
describe('E2E: My Feature', () => {
  it('should do something', async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/my-endpoint`);
    expect(response.status).toBe(200);
  });
});
```

## CI/CD Considerations

In automated testing environments:
- Integration/E2E tests may be skipped if dev server not running
- Use contract tests for component isolation
- Use unit tests for business logic
- Save integration tests for local dev and staging
