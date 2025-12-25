# Backend Testing

## Current State

No test infrastructure exists. API routes defined but not implemented:
- @app/api/clients
- @app/api/geocode
- @app/api/routes

## Testing Guidelines (from project standards)

### Test-First Approach
- Write tests first for bug fixes
- Never mock functional components

### API Testing Standards
- Test API endpoints as integration tests
- Validate request/response schemas with Zod
- Test error handling explicitly
- No silent errors - throw early

### Structure Principles
- Keep tests small and focused
- Express intent through naming
- Make dependencies explicit
- Minimize state and side effects

## Recommended Setup

### Testing Stack
- Next.js built-in testing (when configured)
- Zod for schema validation
- Test API routes against actual Supabase test database

### Testing Patterns
```typescript
// API route test structure
describe('POST /api/routes', () => {
  it('creates route with valid data', async () => {
    // Arrange: prepare request
    // Act: call API
    // Assert: verify response + side effects
  })

  it('rejects invalid schema', async () => {
    // Test Zod validation
  })
})
```

### Coverage Focus
1. Schema validation (Zod)
2. Error handling
3. Database operations
4. Business logic

## Status
Testing infrastructure not yet implemented. Follow guidelines when adding tests.
