# Prisma Error Code Reference

This document maps Prisma error codes to their domain meanings and corresponding `APIError` types in the Flight Club CRM.

## Error Mapping Table

| Prisma Code | Prisma Meaning | Mapped APIError | HTTP Status | Example Scenario |
|-------------|----------------|-----------------|-------------|------------------|
| P2002 | Unique constraint failed | `CONFLICT` | 409 | Email already exists when creating user |
| P2003 | Foreign key constraint failed | `NOT_FOUND` | 404 | Syllabus ID doesn't exist when creating course |
| P2004 | Database constraint violated | `CONFLICT` | 409 | Check constraint failed (e.g., `endDate > startDate`) |
| P2025 | Record to update/delete not found | `NOT_FOUND` | 404 | Attempting to update non-existent course |

## Implementation

All mappings are centralized in `src/lib/prisma.ts` middleware:

```typescript
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          throw new APIError("CONFLICT", "Duplicate entry");
        case "P2003":
        case "P2025":
          throw new APIError("NOT_FOUND", "Related record not found");
        case "P2004":
          throw new APIError("CONFLICT", "Operation violates database constraint");
      }
    }
    throw error;
  }
});
```

## Usage Guidelines

### Services

**❌ Don't** wrap Prisma calls in try/catch:
```typescript
// WRONG
try {
  const course = await prisma.course.create({ data });
} catch (error) {
  if (error.code === "P2002") {
    throw new APIError("CONFLICT", "Duplicate");
  }
}
```

**✅ Do** let middleware handle it:
```typescript
// CORRECT
const course = await prisma.course.create({ data });
// Middleware automatically maps P2002 → CONFLICT
```

### Routes

Error middleware (`src/lib/middleware/error-handler.ts`) maps `APIError` types to HTTP responses:

```typescript
app.use((err, req, res, next) => {
  if (err instanceof APIError) {
    const statusMap = {
      NOT_FOUND: 404,
      CONFLICT: 409,
      FORBIDDEN: 403,
      // ...
    };
    return res.status(statusMap[err.type]).json({
      error: err.message,
      request_id: req.id
    });
  }
  // ...
});
```

## Common Scenarios

### Unique Constraint (P2002)

**Schema**:
```prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
}
```

**Code**:
```typescript
// This will throw P2002 if email exists
const user = await prisma.user.create({
  data: { email: "test@example.com" }
});
// Middleware maps to: APIError("CONFLICT", "Duplicate entry")
```

**API Response**: `409 Conflict`

### Foreign Key Constraint (P2003)

**Schema**:
```prisma
model Course {
  id         Int      @id
  syllabusId Int
  syllabus   Syllabus @relation(fields: [syllabusId], references: [id])
}
```

**Code**:
```typescript
// This will throw P2003 if syllabusId=999 doesn't exist
const course = await prisma.course.create({
  data: { syllabusId: 999, name: "Test" }
});
// Middleware maps to: APIError("NOT_FOUND", "Related record not found")
```

**API Response**: `404 Not Found`

### Record Not Found (P2025)

**Code**:
```typescript
// This will throw P2025 if course ID doesn't exist
const course = await prisma.course.update({
  where: { id: 999 },
  data: { name: "Updated" }
});
// Middleware maps to: APIError("NOT_FOUND", "Related record not found")
```

**API Response**: `404 Not Found`

### Check Constraint (P2004)

**Schema**:
```prisma
model Course {
  id        Int      @id
  startDate DateTime
  endDate   DateTime
  
  @@check("endDate > startDate", map: "valid_date_range")
}
```

**Code**:
```typescript
// This will throw P2004 if endDate <= startDate
const course = await prisma.course.create({
  data: {
    startDate: new Date("2025-12-01"),
    endDate: new Date("2025-11-01") // INVALID
  }
});
// Middleware maps to: APIError("CONFLICT", "Operation violates database constraint")
```

**API Response**: `409 Conflict`

## Debugging

When debugging Prisma errors:

1. **Check logs**: Middleware logs the original Prisma error before mapping
2. **Inspect `error.meta`**: Prisma includes metadata about constraint violations
3. **Read the constraint name**: PostgreSQL constraint names appear in `error.meta.constraint_name`

Example:
```typescript
// Original Prisma error structure
{
  code: "P2002",
  meta: {
    target: ["email"],
    constraint_name: "User_email_key"
  }
}
```

## Related Documentation

- [ADR 003: Centralized Error Handling](./adr/003-centralized-error-handling.md)
- [Prisma Error Reference (Official)](https://www.prisma.io/docs/reference/api-reference/error-reference)
- [Constitution Principle VII](../.specify/memory/constitution.md#vii-error-handling-architecture)

## Maintenance

When adding new Prisma error code mappings:

1. Update the middleware in `src/lib/prisma.ts`
2. Add the mapping to this reference table
3. Update the switch statement documentation
4. Add test case in `tests/integration/error-handling.test.ts` (if exists)
