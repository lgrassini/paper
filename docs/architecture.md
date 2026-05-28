# Architecture Decisions

## Why server-side PDF generation?

Generating PDFs in the browser (via `window.print()` or a JS library like jsPDF) gives poor
typographic control. Puppeteer renders a real HTML/CSS document through Chromium, so the PDF
output is indistinguishable from a well-designed web page printed to PDF — with full font
rendering, page breaks, and header/footer support.

The tradeoff is that Puppeteer adds ~120MB to the server's footprint and cold-start latency.
For this use case (one conversion at a time, not a high-throughput API), this is acceptable.

## Why @mozilla/readability?

It's the same content extraction engine used by Firefox's Reader View and Pocket. It handles
the vast majority of real-world article layouts (blogs, news sites, Wikipedia) without requiring
custom per-site scraping rules. The output is clean HTML we can further transform.

## Why separate fetcher and extractor services?

Single responsibility. The fetcher's job is network I/O. The extractor's job is DOM parsing.
Keeping them separate makes each easier to test, mock, and swap out independently.
For example: upgrading to Puppeteer-based fetching (to handle JS-rendered pages) only
touches `fetcher.ts`, not the extraction logic.

## Why inline CSS for the PDF template?

Puppeteer can load external stylesheets, but it requires either:
a) A running server to serve them, or
b) Reading them from disk and injecting them anyway.

Inlining the CSS in the HTML template passed to Puppeteer keeps the renderer self-contained
and avoids race conditions where the stylesheet hasn't loaded before the PDF is captured.

## Link footnote deduplication strategy

Links are deduplicated by their normalized `href`. The first occurrence sets the footnote
number; subsequent occurrences of the same href reuse that number. This matches the
convention used in academic papers where the same source cited multiple times shares one
reference entry.

Normalization: strip trailing slashes, lowercase the scheme and host.

## Error taxonomy

Three categories of errors, each with a distinct error code:

- `FETCH_FAILED`: Network-level failure (DNS, timeout, 4xx/5xx from the target server).
- `EXTRACTION_FAILED`: Readability returned empty content (paywall, JS-only page, not an article).
- `RENDER_FAILED`: Puppeteer crashed or timed out during PDF generation.

The frontend shows a human-readable message for each, with actionable advice where possible
(e.g. "This page may require JavaScript — try a cached version on web.archive.org").
