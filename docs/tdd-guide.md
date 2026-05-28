# TDD Guide — paper

This document defines how Test-Driven Development is practiced in this project.
It is part of the project constitution. Claude Code must follow it.

---

## The Core Discipline: Red → Green → Refactor

Every piece of logic follows this exact cycle — no shortcuts:

1. **Red:** Write a test that describes the behaviour you want. Run it. It must fail.
   If it passes without implementation, the test is wrong — fix it before continuing.
2. **Green:** Write the minimum code needed to make the test pass. Nothing more.
   Resist the urge to build ahead. Trust the cycle.
3. **Refactor:** Clean up the implementation without changing behaviour.
   Tests stay green throughout. This is when you make the code readable and well-typed.

The failing test is proof that the test is actually testing something.
Skipping the red step is the most common TDD mistake — it silently produces tests
that pass regardless of the implementation.

---

## Test Runner: Vitest

We use **Vitest** for all tests — backend and frontend. It understands TypeScript
natively, runs fast, and uses the same `expect` API as Jest so examples online
translate directly.

```bash
# Run all tests once
npm test

# Run in watch mode during development (reruns on file save)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

---

## File Conventions

| Source file | Test file |
|---|---|
| `backend/src/services/fetcher.ts` | `backend/tests/unit/fetcher.test.ts` |
| `backend/src/services/extractor.ts` | `backend/tests/unit/extractor.test.ts` |
| `backend/src/services/transformer.ts` | `backend/tests/unit/transformer.test.ts` |
| `backend/src/routes/convert.ts` | `backend/tests/integration/convert.test.ts` |
| `frontend/src/hooks/useConvert.ts` | `frontend/src/hooks/useConvert.test.ts` |

Rules:
- Test files live next to or below their source, never above.
- One test file per source file.
- Test file name mirrors source file name exactly, with `.test.ts` suffix.

---

## What to Test

### Unit tests (pure logic, no I/O)

These are the easiest and most valuable tests. Every service function gets them.

**transformer.ts** is the richest unit test target — it transforms HTML and has
many edge cases:
- Replaces `<a href>` with `[N]` superscripts
- Deduplicates links with the same href
- Skips fragment-only links (`#section`)
- Resolves relative URLs to absolute
- Builds a correctly formatted References section

**extractor.ts:**
- Returns article title, byline, and content from valid HTML
- Throws `EXTRACTION_FAILED` when Readability finds no article content

### Integration tests (HTTP layer)

Test the Express routes with a real in-process server (no network):
- `POST /api/convert` with a valid URL returns 200 and a PDF content-type header
- `POST /api/convert` with a malformed URL returns 400
- `POST /api/convert` when fetcher throws `FETCH_FAILED` returns 504

Use `supertest` to make requests against the Express app without starting a real server.

### What NOT to unit test

- `renderer.ts` (Puppeteer): too slow and too infrastructure-dependent for unit tests.
  Cover it with a single integration smoke test if needed, or test it manually.
- `fetcher.ts` network calls: mock the network (see below), test error handling only.
- Configuration loading: not worth testing, just keep it simple.

---

## Mocking Strategy

### Mocking fetch (for fetcher.ts tests)

Use `vitest`'s built-in `vi.fn()` to mock the global `fetch`:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fetchHtml } from '../../src/services/fetcher';

describe('fetchHtml', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns HTML string on 200 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><body>Hello</body></html>',
    } as Response);

    const result = await fetchHtml('https://example.com');
    expect(result).toContain('Hello');
  });

  it('throws FETCH_FAILED on non-200 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(fetchHtml('https://example.com')).rejects.toMatchObject({
      code: 'FETCH_FAILED',
    });
  });
});
```

### Mocking Readability (for extractor.ts tests)

Pass raw HTML fixtures directly — no need to mock Readability itself.
Store fixture HTML files in `backend/tests/fixtures/`:

```
backend/tests/fixtures/
  wikipedia-article.html     ← a real saved Wikipedia page
  no-content-page.html       ← a page Readability can't extract from
  relative-links.html        ← article with relative hrefs for transformer tests
```

---

## Example: Full TDD Cycle for transformer.ts

### Step 1 — Write the failing test first

```typescript
// backend/tests/unit/transformer.test.ts
import { describe, it, expect } from 'vitest';
import { transformLinks } from '../../src/services/transformer';

describe('transformLinks', () => {
  it('replaces a link with a superscript and adds a reference entry', () => {
    const html = `<p>Read more <a href="https://example.com">here</a>.</p>`;
    const result = transformLinks(html, 'https://base.com');

    expect(result.html).toContain('[1]');
    expect(result.html).not.toContain('<a href');
    expect(result.footnotes).toHaveLength(1);
    expect(result.footnotes[0]).toMatchObject({
      index: 1,
      text: 'here',
      url: 'https://example.com',
    });
  });
});
```

Run `npm test` → test fails (red). `transformLinks` doesn't exist yet.

### Step 2 — Write minimum implementation

```typescript
// backend/src/services/transformer.ts

/** Replaces all <a> tags in HTML with [N] footnote references. */
export function transformLinks(
  html: string,
  baseUrl: string
): { html: string; footnotes: Footnote[] } {
  // minimum implementation to pass the test above
  // ...
}
```

Run `npm test` → test passes (green).

### Step 3 — Add more tests, then extend implementation

Add tests for: duplicate links, fragment links, relative URLs, empty articles.
Each test: red first, then green.

---

## PR Rule

A PR that introduces a new service file must include its test file in the same commit.
Claude Code should never open a PR where `npm test` has failing or skipped tests.