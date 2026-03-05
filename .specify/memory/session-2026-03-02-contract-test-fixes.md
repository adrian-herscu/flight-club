# Session Introspection: Contract Test Fixes

**Date**: 2 March 2026  
**Session Type**: Bug Fix & Test Alignment  
**Files Modified**: `tests/contract/api-v1-routes.contract.test.ts`

---

## Session Summary

Fixed failing contract tests for `/api/v1/me` endpoint by aligning test expectations with actual authentication implementation.

### What Happened

**Initial State**:
- 2 out of 4 contract tests failing
- Tests expecting HTTP 200, receiving HTTP 401
- Root cause: test authentication tokens didn't match implementation requirements

**Resolution**:
- Updated tests to use correct dev token: `dev-mode-local-testing-token`
- Changed `NODE_ENV` from `"test"` to `"development"` where appropriate
- Aligned test structure with actual route authentication logic
- All 4 tests now passing

---

## Key Insights

### 1. **Test-Implementation Alignment Gap**

**Discovery**: The `/api/v1/me` route has a specific dev-mode bypass that requires:
- Exact token match: `"dev-mode-local-testing-token"`
- Environment check: `NODE_ENV === "development"`
- Optional dev headers: `x-dev-user-email`, `x-dev-user-name`, `x-dev-user-role`

**Contract tests were using**:
- Arbitrary tokens: `"test-token-123"`, `"dev-token-123"`
- Wrong environment: `"test"` instead of `"development"`

**Lesson**: Contract tests must be written **after** understanding implementation details, or implementation must be written **to match** pre-existing test contracts. The current codebase chose implementation-first for auth middleware.

### 2. **Dev Mode Authentication Pattern**

The codebase uses a **dual-mode authentication strategy**:

```typescript
// Production: Validate JWT against Supabase JWKS
// Development: Accept magic token for local testing

if (token === "dev-mode-local-testing-token" && process.env.NODE_ENV === "development") {
  // Return mock user based on headers
}
```

**Files implementing this**:
- `/src/lib/middleware/auth.ts` (line 72)
- `/src/app/api/v1/me/route.ts` (same pattern)

**Gap**: This pattern is **not documented** in:
- `AUTH_SETUP.md` (only covers Google OAuth + Supabase)
- `TESTING.md` (doesn't explain dev token requirement)
- API contract docs (`specs/001-school-management-system/contracts/api-v1.md`)

### 3. **Missing Documentation: Dev Authentication**

**What should be documented**:
1. How to test authenticated endpoints locally without Google OAuth
2. The magic token value and required environment
3. How dev headers control mock user attributes
4. Difference between contract tests (direct route imports) vs integration tests (HTTP calls)

---

## Constitution Compliance Review

### ✅ Principle III: Test-First Development

**Status**: Partially violated, now remediated

- Tests existed but were misaligned with implementation
- Tests were not written **before** implementation
- However: tests now enforce the authentication contract going forward

**Recommendation**: Add to constitution clarification that contract tests must be updated **immediately** when authentication logic changes, even if that change is retroactive to implementation.

### ✅ Principle V: Test Infrastructure

**Status**: Compliant

- Test failures were true FAILURE (missing implementation match), not ERROR (broken infrastructure)
- Tests ran successfully, assertions failed - correct TDD failure mode
- Resolution was straightforward once implementation was understood

---

## Documentation Gaps Identified

### 1. **TESTING.md** - Missing Dev Auth Section

**Current state**: Explains test types, doesn't explain authentication in tests

**Needs**:
```markdown
## Authentication in Tests

### Development Mode Bypass

For contract and integration tests, use the dev token:

```typescript
const request = new Request("http://localhost:3000/api/v1/me", {
  headers: {
    authorization: "Bearer dev-mode-local-testing-token",
    "x-dev-user-email": "test@example.com",
    "x-dev-user-name": "Test User",
    "x-dev-user-role": "admin" // or "super-admin", "instructor", "student"
  }
});
```

**Requirements**:
- `NODE_ENV` must be `"development"`
- Token must be exactly `"dev-mode-local-testing-token"`
- Dev headers are optional but control mock user attributes

**Production Mode**:
- Dev token is rejected
- Must use valid Supabase JWT
- No header-based user override
```

### 2. **AUTH_SETUP.md** - Missing Test Scenarios Section

**Current state**: Covers Google OAuth setup, doesn't cover testing

**Needs**:
```markdown
## Part 6: Testing Without OAuth

### Local Development Testing

The `/api/v1/me` endpoint supports a dev mode bypass for local testing:

**Usage**:
```bash
# In .env
NODE_ENV=development

# In tests or API clients
curl -H "Authorization: Bearer dev-mode-local-testing-token" \
     -H "x-dev-user-role: admin" \
     http://localhost:3000/api/v1/me
```

**Mock User Attributes**:
- `x-dev-user-email`: Defaults to "dev@local.com"
- `x-dev-user-name`: Defaults to "Dev User"
- `x-dev-user-role`: Defaults to "super-admin"
  - Maps to: `super_admin`, `school_admin` (admin), `instructor`, `student`

⚠️ **Security Note**: This bypass is **disabled** in production (`NODE_ENV !== "development"`).
```

### 3. **API Contracts** - Missing Auth Bypass Documentation

**File**: `specs/001-school-management-system/contracts/api-v1.md`

**Current section**: "Auth / Profile → GET /api/v1/me" (line ~35)

**Needs addition**:
```markdown
### `GET /api/v1/me`

Returns the authenticated user's profile and all their role memberships.

**Development Mode**: Accepts `Authorization: Bearer dev-mode-local-testing-token` 
with optional override headers:
- `x-dev-user-email`: Override email
- `x-dev-user-name`: Override display name
- `x-dev-user-role`: Override role (`super-admin`, `admin`, `instructor`, `student`)

**Production Mode**: Requires valid Supabase JWT; dev token is rejected.
```

---

## Recommended Updates

### Priority 1: Documentation (Immediate)

1. **TESTING.md**: Add "Authentication in Tests" section
2. **AUTH_SETUP.md**: Add "Part 6: Testing Without OAuth"
3. **api-v1.md**: Document dev mode bypass for `/api/v1/me`

### Priority 2: Constitution (Next Review Cycle)

Add clarification to **Principle III**:

```markdown
### III. Test-First Development (NON-NEGOTIABLE)

...existing content...

**Contract Test Maintenance**: When authentication or authorization logic changes,
contract tests in `tests/contract/` MUST be updated in the same commit. Contract
tests verify the API surface area matches documented behavior; misaligned tests
are equivalent to outdated documentation and MUST NOT persist across PR reviews.
```

### Priority 3: Copilot Instructions (Enhancement)

Add to **Technology-Specific Guidelines → TypeScript / Next.js**:

```markdown
- **Dev Mode Auth Bypass**: The `/api/v1/me` endpoint and auth middleware accept
  `Authorization: Bearer dev-mode-local-testing-token` when `NODE_ENV === "development"`.
  Contract tests MUST use this exact token. Integration tests calling live endpoints
  MUST either use the dev token (if testing in development) or valid Supabase JWTs
  (if testing against production-like config).
```

---

## Action Items

- [ ] Update `TESTING.md` with auth bypass instructions
- [ ] Update `AUTH_SETUP.md` with testing section
- [ ] Update `specs/001-school-management-system/contracts/api-v1.md` with dev mode docs
- [ ] Review `.github/copilot/copilot-instructions.md` for auth testing guidance
- [ ] Consider: Extract `dev-mode-local-testing-token` to environment variable for easier discovery

---

## Metrics

- **Test failures before**: 2
- **Test failures after**: 0
- **Tests added**: 0
- **Tests modified**: 2
- **Documentation gaps identified**: 3
- **Time to resolution**: ~10 minutes
- **Root cause**: Missing documentation + test-implementation misalignment

---

## Conclusion

This session revealed that the authentication contract is **implemented** but **undocumented** for testing scenarios. The fix was straightforward but required source code inspection to discover the magic token requirement. Future developers will benefit from explicit documentation of the dev mode bypass pattern.

**Key Takeaway**: Test failures are often symptoms of documentation gaps, not just code bugs.
