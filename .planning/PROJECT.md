# CLMC Tools

## What This Is

CLMC Tools is an internal, client-side web application that handles PDF and document operations entirely in the browser. It is CLMC's private alternative to ilovepdf.com — all file processing happens locally, no files are ever uploaded or transmitted to any server.

## Core Value

Files never leave the user's device. Every operation — merge, split, compress, convert, watermark — runs 100% in-browser using pdf-lib and PDF.js.

## Requirements

### Validated

- ✓ Merge multiple PDFs into one — existing
- ✓ Convert PDF pages to images (PNG/JPEG) — existing
- ✓ Apply CLMC watermark to PDFs and images (corner, center, diagonal) — existing
- ✓ Drag-and-drop file upload with reordering — existing
- ✓ Progress indicators and status feedback — existing

### Active

- [ ] Split PDF — extract pages or page ranges into separate files
- [ ] Compress PDF — reduce file size while preserving readability
- [ ] PDF to PowerPoint (PPT) — convert PDF pages to editable slides
- [ ] PowerPoint to PDF (PPT → PDF) — convert PPTX files to PDF

### Out of Scope

- Server-side processing — defeats core privacy guarantee
- User accounts / authentication — internal tool, no auth needed
- Mobile app — web-first only
- Cloud storage integration — files stay local

## Context

- Single `index.html` file with embedded CSS + JS — no build system
- Dependencies loaded via CDN: pdf-lib 1.17.1, pdfjs-dist 3.11.174
- Hosted as static file (GitHub Pages or equivalent)
- CLMC registered logo PNG used as default watermark source
- Navigation tabs switch between tool sections; each section is independent
- No testing framework currently in place

## Constraints

- **Architecture**: Single HTML file — all additions must remain embedded or CDN-loaded
- **Privacy**: Zero network calls for file processing — all work done via browser APIs
- **Compatibility**: Must work in Chrome, Firefox, Safari, Edge (modern versions)
- **Dependencies**: CDN-only (no npm, no build step)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single HTML file | No build tooling needed, easy to deploy/share | — Pending |
| CDN dependencies (pdf-lib, PDF.js) | No install required, works anywhere | ✓ Good |
| Client-side only processing | Privacy-first for CLMC internal files | ✓ Good |
| Watermark source from GitHub CDN | Avoids bundling binary in HTML | ⚠️ Revisit (CDN fetch could fail) |

---
*Last updated: 2026-03-02 after initialization*
