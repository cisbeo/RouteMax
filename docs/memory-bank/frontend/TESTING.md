# Frontend Testing

## Current State

**No testing infrastructure exists.**

No test files, no testing framework installed, no test scripts configured.

## Testing Guidelines

Following project standards from @CLAUDE.md:

### Core Principles

- Write tests first for bug fixes
- Never mock functional components
- Throw exceptions early, no silent errors
- Keep tests simple and focused

### Recommended Setup

When implementing tests:

**Framework**: Install testing framework (e.g., Jest + React Testing Library)
- `npm install --save-dev jest @testing-library/react @testing-library/jest-dom`
- Add test script to @package.json: `"test": "jest"`

**File Conventions**:
- `*.test.tsx` for component tests
- `__tests__/` directories for test suites
- Co-locate tests with source files

### Component Testing

**Patterns to follow**:
- Test user behavior, not implementation
- Use semantic queries (getByRole, getByLabelText)
- Avoid mocking React components
- Test integration over units

**Focus areas**:
- User interactions (clicks, form inputs)
- Data display and transformations
- Error states and validation
- Accessibility (ARIA roles, keyboard nav)

### Integration Testing

**Approach**:
- Test feature flows end-to-end
- Use real components (no mocks)
- Mock external services (APIs, Supabase)
- Validate state changes and side effects

### Quality Standards

Per @CLAUDE.md:
- Eliminate duplication
- Express intent clearly through test names
- Keep tests small and focused
- Minimize setup complexity
