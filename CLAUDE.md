# CLAUDE.md — paper Project Constitution

## What This Project Is

A web tool that converts any article URL into a clean, distraction-free PDF in the style of an
academic paper. Inline hyperlinks are replaced with numbered footnotes `[N]`, and all referenced
links are listed at the bottom of the document with a brief description — turning a typical
link-heavy web article into a focused, printable read.

**The user experience in one sentence:**
Paste a URL → receive a beautiful, self-contained PDF you can read without falling into link rabbit holes.

---

## Vibe-Coding Ground Rules

These rules exist so every Claude Code session produces coherent, maintainable output without
requiring constant re-explanation.

### Always do this
- Read this file at the start of every session before writing a single line of code.
- Keep the stack simple and boring where possible — complexity is a last resort, not a first instinct.
- Write TypeScript strictly (`"strict": true`). No `any` unless explicitly justified in a comment.
- Every new module gets a brief JSDoc comment explaining its single responsibility.
- Prefer explicit over clever. Code should read like prose.
- When adding a dependency, say why in a comment near the import.
- Run the formatter before considering a task done (`prettier --write .`).

### Never do this
- Do not introduce a new library without first checking if the existing stack already handles it.
- Do not mix backend and frontend code in the same file or directory.
- Do not hard-code URLs, ports, or secrets — use `.env` and the config module.
- Do not silently swallow errors. Every `catch` block must log or rethrow.
- Do not skip types to move faster. Slower and correct beats faster and broken.

---

## Architecture Overview

```
paper/
├── CLAUDE.md                  ← you are here
├── docs/
│   ├── architecture.md        ← system design decisions
│   ├── pdf-style-guide.md     ← typography and layout rules for the PDF output
│   └── tdd-guide.md           ← TDD workflow, testing conventions, and examples
├── frontend/                  ← React + TypeScript + Vite
│   ├── src/
│   │   ├── components/        ← UI components (one responsibility each)
│   │   ├── hooks/             ← custom React hooks
│   │   ├── api/               ← typed fetch wrappers for backend calls
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── backend/                   ← Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/            ← Express route handlers
│   │   ├── services/
│   │   │   ├── fetcher.ts     ← HTTP fetch + HTML retrieval
│   │   │   ├── extractor.ts   ← Readability content extraction
│   │   │   ├── transformer.ts ← Link → footnote transformation
│   │   │   └── renderer.ts    ← Puppeteer HTML → PDF rendering
│   │   ├── config.ts          ← All env vars in one place
│   │   └── server.ts          ← Express app entry point
│   ├── tests/
│   │   ├── unit/              ← one file per service (fetcher.test.ts, etc.)
│   │   ├── integration/       ← route-level tests with a real Express app
│   │   └── fixtures/          ← sample HTML files, mock responses
│   ├── tsconfig.json
│   └── package.json
└── .env.example
```

---

## The Core Pipeline (never break this contract)

```
URL input
  → fetcher.ts        : fetch raw HTML from the URL
  → extractor.ts      : run Readability to get clean article content + metadata
  → transformer.ts    : walk DOM, collect <a> hrefs, replace with [N] superscripts,
                        build FootnoteList, append to article
  → renderer.ts       : inject into HTML template, run Puppeteer, return PDF buffer
  → Express route     : stream PDF as response with correct Content-Type headers
  → Frontend          : receive blob, trigger browser download or inline preview
```

Each service is a pure function (or close to it): input in, output out, no hidden state.

---

## TDD Is Non-Negotiable

This project is built test-first. See `docs/tdd-guide.md` for the full workflow,
but the rules in brief:

- **Write the test before the implementation.** Always. No exceptions.
- **Red → Green → Refactor.** The cycle is the discipline.
- Every service in `src/services/` has a corresponding `tests/unit/*.test.ts`.
- Tests are written at the same time as the service — not after, not "later".
- Claude Code must show the failing test first, then the implementation that makes it pass.
- `npm test` must pass before a PR is opened. A PR with failing tests is never merged.

---



| Concern | Choice | Why |
|---|---|---|
| Content extraction | `@mozilla/readability` + `jsdom` | Battle-tested, same engine as Firefox Reader View |
| PDF generation | `puppeteer` (headless Chrome) | Best typographic fidelity; renders real CSS |
| Frontend build | Vite + React 18 | Fast HMR, minimal config |
| HTTP server | Express 5 | Familiar, well-documented, minimal magic |
| Styling (PDF) | Inline CSS in HTML template | Puppeteer needs self-contained HTML |
| Styling (UI) | CSS Modules or plain CSS | No runtime overhead, scoped styles |
| Test runner | Vitest | Native TypeScript, fast, same config for backend and frontend |
| HTTP mocking | `msw` (Mock Service Worker) | Intercepts fetch at the network level; no monkey-patching |

---

## PDF Output Style Contract

The generated PDF must feel like reading a well-typeset article. See `docs/pdf-style-guide.md`
for the full spec, but the non-negotiables are:

- **Font:** A serif body font (e.g. Georgia, or a Google Font loaded at render time).
- **Line length:** Max ~70 characters (~680px at 10pt). Readable, not exhausting.
- **Footnotes:** Numbered sequentially `[1]`, `[2]`, … in the body text as superscripts.
- **Footer section title:** "References" (matching academic convention).
- **Each footnote entry format:** `[N] Link anchor text — URL`
- **No orphan links:** Every `<a href>` in the extracted article MUST appear in the footnote list.
  Internal fragment links (`#section`) are skipped.
- **Page numbers** in the footer: `Page N of M`.
- **Article title** as the PDF document title (metadata).

---

## API Contract

### `POST /api/convert`

**Request body:**
```json
{
  "url": "https://example.com/some-article"
}
```

**Success response:**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="article-title.pdf"`
- Body: raw PDF bytes

**Error response:**
```json
{
  "error": "FETCH_FAILED" | "EXTRACTION_FAILED" | "RENDER_FAILED",
  "message": "Human-readable description"
}
```

HTTP status codes: 400 (bad input), 422 (unprocessable URL), 500 (internal error), 504 (fetch timeout).

---

## Environment Variables

Defined in `.env` (never committed). See `.env.example` for the full list.

```
PORT=3001
FRONTEND_ORIGIN=http://localhost:5173
PUPPETEER_TIMEOUT_MS=30000
FETCH_TIMEOUT_MS=10000
```

---

## Development Workflow

```bash
# From backend/
npm install
npm run dev          # ts-node-dev with hot reload

# From frontend/
npm install
npm run dev          # Vite dev server on :5173
```

CORS is configured in `backend/src/config.ts` to allow `FRONTEND_ORIGIN` only.

---

## What Good Looks Like (Definition of Done per feature)

A task is done when:
1. The test was written first and was failing (red) before implementation.
2. `npm test` passes with no skipped or pending tests.
3. TypeScript compiles with zero errors (`tsc --noEmit`).
4. The happy path works end-to-end (paste URL → PDF downloads).
5. At least one error case is handled and has a corresponding test.
6. No `console.log` debugging left in committed code (use a proper logger).
7. The code could be understood by a new developer reading it cold.

---

## Known Constraints & Edge Cases to Handle

- **Paywalled / JS-rendered pages:** Puppeteer could be used for fetching too, but adds latency.
  First implementation uses plain `fetch`. Log a clear error if Readability returns nothing.
- **Very long articles:** Footnote lists could be huge. That's fine — it's the point.
- **Relative URLs in links:** Must be resolved to absolute before storing in footnotes.
  Use the `URL` constructor with the article's base URL.
- **Duplicate links:** Same href appearing multiple times should get the same footnote number,
  not a new one. De-duplicate by href.
- **Fragment-only links (`#section`):** Skip — they're internal navigation, not references.
- **Rate limiting / bot detection:** Some sites will block. Return a clear 422, not a crash.

---

## Session Starter Checklist for Claude Code

At the start of every session, confirm:
- [ ] `CLAUDE.md` read in full
- [ ] Current task is one clearly scoped unit of work
- [ ] The relevant service file(s) identified before writing code
- [ ] Test file created and failing before implementation starts
- [ ] Error handling strategy decided before the happy path