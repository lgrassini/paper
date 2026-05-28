# PDF Style Guide

This document defines the visual contract for the generated PDFs.
The renderer must produce output consistent with these rules.

## Overall Aesthetic

Academic paper meets editorial magazine. Clean, typographically considered, comfortable to read
for 20+ minutes. Not a browser printout. Not a corporate report template.

## Page Setup

- **Paper size:** A4 (210mm × 297mm). Rationale: international default; US Letter as fallback.
- **Margins:** 25mm top/bottom, 28mm left/right. Generous — readability over density.
- **Page numbers:** Bottom center. Format: `— N —`. Small, unobtrusive.
- **Running header:** Article title, truncated to 60 chars, top right. 8pt, light gray.

## Typography

### Body text
- **Font family:** `"Lora", Georgia, serif` — Lora is a Google Font optimized for screen/print.
  Load via Google Fonts URL in the HTML template (Puppeteer fetches it at render time).
- **Size:** 10.5pt
- **Line height:** 1.6
- **Color:** `#1a1a1a` (near-black, slightly softer than pure black)
- **Max line width:** Achieved via `max-width: 680px` on the article container.

### Headings
- **H1 (article title):** 22pt, font-weight 700, margin-bottom 6pt, color `#111`
- **H2:** 16pt, font-weight 600, margin-top 24pt, margin-bottom 8pt
- **H3:** 13pt, font-weight 600, margin-top 18pt, margin-bottom 6pt
- **Font:** Same serif as body. No display font — unity over contrast.

### Footnote superscripts (inline)
- `font-size: 0.7em`, `vertical-align: super`, `color: #555`
- No brackets visible in body — just the number: ¹ ² ³ (or [1] [2] if HTML superscripts are tricky)
- Actually: use `[1]` style (square brackets) — more accessible and copy-paste friendly.

### References section
- **Section title:** "References", same style as H2.
- **Divider:** 1px solid `#ddd` above the references section, 24pt margin.
- **Each entry:** `[N] Anchor text — URL` on a single line if it fits; URL wraps if needed.
- **Font size:** 9pt
- **Line height:** 1.5
- **URL color:** `#333` (not blue — we're in print land)
- **Spacing between entries:** 6pt

## Images

- Images in the extracted article are included.
- Max-width: 100% of the column. Height auto.
- Caption (if any `<figcaption>` is present): 8.5pt, italic, centered, color `#555`.

## Blockquotes

- Left border: 3px solid `#ccc`
- Padding-left: 16pt
- Font-style: italic
- Color: `#444`

## Code blocks

- Font: `"JetBrains Mono", "Courier New", monospace`
- Font size: 9pt
- Background: `#f5f5f5`
- Padding: 8pt
- Border-radius: 3pt
- `white-space: pre-wrap` to avoid overflow

## Page Breaks

- `break-inside: avoid` on headings, blockquotes, figures.
- Do NOT force page breaks — let Puppeteer flow naturally.
- `orphans: 3; widows: 3` on body text.

## What to Strip

The renderer should NOT include:
- Navigation menus
- Social sharing buttons
- Comment sections
- "Related articles" widgets
- Cookie banners
- Any element Readability already removes (it handles most of this)

Readability handles extraction. The renderer trusts the extracted HTML.
