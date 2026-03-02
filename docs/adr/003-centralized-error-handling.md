# ADR 003: Centralized Error Handling via Prisma Middleware

**Status**: Accepted  
**Date**: 2025-03-02  
**Deciders**: Development Team  
**Related**: Constitution Principle VII

## Context

Prior to this decision, error handling in the service layer suffered from significant code duplication:

1. **Database constraint violations** (Prisma error codes P2002, P2003, P2004, P2025) were manually mapped to `APIError` instances in every service function
2. **Null-check patterns** were inconsistent across services (3 different styles observed)
3. **Type-safety issues** where TypeScript couldn't narrow types after null checks
4. **~150 lines of boilerplate** across 7 service files performing identical error mapping

Example of the previous pattern:
```typescript
export async function getCourseById(id: number) {
  try {
    const course = await prisma.course.findUnique({ where: { id } });
    
    if (!course) {
      throw new APIError("NOT_FOUND", "Course not found");
    }
    
    return course;
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new APIError("CONFLICT", "Unique constraint violation");
      }
      // ... repeat for P2003, P2004, P2025
    }
    throw error;
  }
}
```

This pattern was repeated across every service function that touched the database.

## Decision

We will centralize error handling using two complementary mechanisms:

### 1. Prisma Middleware for Database Errors

All Prisma error-to-APIError mapping happens in `src/lib/prisma.ts` middleware:

```typescript
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002": // Unique constraint
          throw new APIError("CONFLICT", "Duplicate entry");
        case "P2003": // FK constraint
        case "P2025": // Record not found
          throw new APIError("NOT_FOUND", "Related record not found");
        case "P2004": // DB constraint violated
          throw new APIError("CONFLICT", "Operation violates constraint");
      }
    }
    throw error;
  }
});
```

**Consequence**: Services no longer contain try/catch blocks around Prisma calls.

### 2. Type-Safe Null Assertion Helper

Business logic null checks use `requireNotNull<T>()` from `src/lib/require-not-null.ts`:

```typescript
export function requireNotNull<T>(value: T | null | undefined, message: string): T {
  if (value == null) {
    throw new APIError("NOT_FOUND", message);
  }
  return value;
}
```

**Critical Usage Pattern**: Must assign the return value for TypeScript type narrowing:

```typescript
// ✅ CORRECT — TypeScript narrows type to non-null
const courseRaw = await prisma.course.findUnique({ where: { id } });
const course = requireNotNull(courseRaw, "Course not found");
console.log(course.name); // Type-safe access

// ❌ WRONG — TypeScript still thinks 'course' might be null
const course = await prisma.course.findUnique({ where: { id } });
requireNotNull(course, "Course not found");
console.log(course.name); // ERROR: 'course' is possibly 'null'
```

## Consequences

### Positive

1. **Massive code reduction**: 150 lines of boilerplate eliminated across 7 service files
2. **Type safety**: `requireNotNull` with assignment provides compile-time null-check guarantees
3. **Single source of truth**: Error mapping logic lives in one place, easy to maintain
4. **Consistent API responses**: All database constraint violations map to the same error types
5. **Separation of concerns**: Services contain only business logic, no infrastructure error handling
6. **Zero regressions**: All 20 existing tests pass without modification

### Negative

1. **Learning curve**: Developers must remember to assign `requireNotNull` return value
2. **Indirect mapping**: Error messages from middleware may need context from caller
3. **Debugging difficulty**: Error stack traces now pass through middleware layer

### Neutral

1. **Middleware execution order**: Error mapping runs before retry middleware (by registration order)
2. **Generic error messages**: Middleware provides generic messages; specific context added in services via `requireNotNull`

## Alternatives Considered

### Alternative 1: Service-Level Wrapper Functions

**Approach**: Create `wrapDbOperation()` helper that services explicitly call:

```typescript
return wrapDbOperation(() => prisma.course.findUnique({ where: { id } }));
```

**Rejected because**:
- Still requires boilerplate (wrapping every call)
- Harder to enforce (easy to forget to wrap)
- Doesn't solve type-narrowing issue

### Alternative 2: Custom Prisma Client Extension

**Approach**: Use Prisma's client extension API to override methods:

```typescript
const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async findUnique({ args, query }) {
        const result = await query(args);
        if (!result) throw new APIError("NOT_FOUND", "Record not found");
        return result;
      }
    }
  }
});
```

**Rejected because**:
- Too aggressive (forces all `findUnique` to throw on null, breaks intentional null returns)
- Requires wrapping every Prisma method (`findFirst`, `findMany`, etc.)
- Doesn't generalize well to business-logic null checks (non-Prisma nulls)

### Alternative 3: Keep Status Quo, Document Pattern

**Approach**: Accept duplication, create linter rule to enforce consistency

**Rejected because**:
- Linter can't fix existing code, only flag new violations
- Documentation doesn't prevent copy-paste errors
- 150 lines of boilerplate still exist

## Implementation

**Files Modified**:
- `src/lib/prisma.ts` — added error-mapping middleware
- `src/lib/require-not-null.ts` — created type-safe helper (14 lines)
- 7 service files — removed try/catch blocks, applied `requireNotNull` pattern

**Validation**:
- ✅ TypeScript compilation: 0 errors
- ✅ Test suite: 20/20 passing
- ✅ Integration tests: All E2E scenarios pass
- ✅ Contract tests: API behavior unchanged

**Rollout**: Implemented in single session (2025-03-02), all services updated simultaneously to prevent divergent patterns.

## References

- [Session Summary](./.specify/memory/session-2025-03-02-error-handling-refactor.md)
- [Constitution Principle VII](../.specify/memory/constitution.md#vii-error-handling-architecture)
- [Copilot Instructions: Error Handling](../.github/copilot-instructions.md#error-handling-patterns)
- [Prisma Middleware Documentation](https://www.prisma.io/docs/concepts/components/prisma-client/middleware)

## Related Decisions

- ADR-001: API-First Design (establishes APIError as domain abstraction)
- ADR-002: Prisma as ORM (established reliance on Prisma error codes)

## Notes

**TypeScript Type Narrowing Gotcha**: The necessity of assigning `requireNotNull`'s return value is due to TypeScript's control-flow analysis limitations. The compiler doesn't track that a function throwing an exception narrows the type in the caller's scope. By returning the narrowed value, we provide explicit type-level proof.

**Future Extensions**:
- Consider `requireAuthorized(condition, message)` for permission checks
- Consider `requireValid(schema, data)` for Zod validation unification
- Add structured logging to middleware for error diagnostics
