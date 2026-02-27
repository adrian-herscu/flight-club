# End-to-End Testing

## Overview

E2E tests validate the full stack integration between frontend and backend.

## Prerequisites

**Backend must be running:**
```bash
cd backend
python -m uvicorn src.main:app --reload
```

The backend should be accessible at `http://localhost:8000`.

## Running E2E Tests

From the frontend directory:

```bash
# Run all tests (including e2e)
npm test

# Run only e2e tests
npm test e2e

# Run with UI
npm run test:ui
```

## Test Structure

- **`e2e/api.test.ts`** - Basic API connectivity tests
  - Health endpoint validation
  - Authentication requirements
  - CORS headers
  - Request ID tracking
  - Error handling

## What E2E Tests Validate

✅ Backend server is running and responding  
✅ API endpoints return expected status codes  
✅ Error responses follow the correct format  
✅ CORS is properly configured  
✅ Request tracking (request_id) is working  

## Graceful Degradation

If the backend is not running, e2e tests will:
- Display a warning: `⚠️ Backend not running - skipping e2e test`
- Skip the test instead of failing
- Allow unit tests to continue running

This ensures the test suite can run in CI/CD even when backend isn't available.

## Adding New E2E Tests

1. Create a new test file in `src/tests/e2e/`
2. Use the `beforeAll` hook to check backend availability
3. Add graceful handling for when backend is down
4. Test real API calls, not mocked responses

Example:
```typescript
describe('E2E: My Feature', () => {
  let backendAvailable = false;

  beforeAll(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/health`);
      backendAvailable = response.ok;
    } catch {
      backendAvailable = false;
    }
  });

  it('should do something', async () => {
    if (!backendAvailable) {
      console.warn('⚠️ Backend not running - skipping e2e test');
      return;
    }
    
    // Your test here
  });
});
```

## Future Enhancements

- [ ] Add authenticated user flow tests
- [ ] Add course enrollment flow tests
- [ ] Add multi-tenant isolation tests
- [ ] Add performance benchmarks
- [ ] Add database cleanup between tests
