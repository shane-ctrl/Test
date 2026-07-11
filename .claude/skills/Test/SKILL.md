```markdown
# Test Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the "Test" TypeScript repository. It covers file naming, import/export styles, commit message patterns, and testing practices. While no specific framework is detected, the repository follows clear conventions for code organization and testing.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.

**Example:**
```plaintext
userService.ts
orderProcessor.test.ts
```

### Import Style
- Use **alias imports** to reference modules.

**Example:**
```typescript
import { fetchData as getData } from './dataFetcher';
```

### Export Style
- Use **named exports** for all modules.

**Example:**
```typescript
// In utils.ts
export function parseDate(dateStr: string): Date { ... }

// In another file
import { parseDate } from './utils';
```

### Commit Patterns
- Commit messages are **freeform** (no strict prefix), averaging around 60 characters.
- No enforced type or scope prefixes.

**Example:**
```plaintext
Fix bug in order processing when quantity is zero
```

## Workflows

### General Development
**Trigger:** When adding or updating code in the repository  
**Command:** `/dev-update`

1. Create or update files using camelCase naming.
2. Use alias imports and named exports as per conventions.
3. Write clear, concise commit messages (no strict format required).
4. If adding tests, follow the testing pattern described below.

### Testing Code
**Trigger:** When writing or updating tests  
**Command:** `/run-tests`

1. Create test files with the `.test.` infix in the filename (e.g., `userService.test.ts`).
2. Use the unknown (custom or default) testing framework as per project setup.
3. Run tests using the project's standard test runner (refer to project docs if available).

## Testing Patterns

- Test files are named using the pattern: `*.test.*` (e.g., `orderProcessor.test.ts`).
- The specific testing framework is not detected; refer to project documentation or existing test files for setup.
- Place test files alongside the modules they test or in a designated test directory.

**Example:**
```typescript
// userService.test.ts
import { getUser } from './userService';

describe('getUser', () => {
  it('should return user data for a valid ID', () => {
    // test implementation
  });
});
```

## Commands
| Command      | Purpose                                    |
|--------------|--------------------------------------------|
| /dev-update  | Start or update code following conventions |
| /run-tests   | Run or update tests in the repository      |
```
