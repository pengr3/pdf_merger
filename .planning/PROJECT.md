# CLMC Tools

## What This Is

CLMC Tools is an internal web application with five PDF tools — Merge, Split, Compress, PDF to Images, and Watermark — plus a server-side Deep Compress option via Firebase/Ghostscript. All client-side tools run 100% in-browser. The app uses a monochrome flat design with the CLMC company logo.

## Core Value

Files never leave the user's device for client-side operations. Server-side compression (Deep Compress) is opt-in and clearly labeled.

## Requirements

### Validated

- ✓ Merge multiple PDFs into one — existing (pre-v1.0)
- ✓ Convert PDF pages to images (PNG/JPEG) — existing (pre-v1.0)
- ✓ Apply CLMC watermark to PDFs and images — existing (pre-v1.0)
- ✓ Drag-and-drop file upload with reordering — existing (pre-v1.0)
- ✓ Progress indicators and status feedback — existing (pre-v1.0)
- ✓ Split PDF — extract pages or page ranges into separate files — v1.0
- ✓ Compress PDF (Fast lossless mode) — v1.0
- ✓ Server-side Ghostscript compression with 3 quality presets — v1.0
- ✓ Encrypted PDF detection and rejection — v1.0
- ✓ Independent nav tabs for each tool — v1.0
- ✓ Monochrome flat UI with CLMC logo, zero emojis — v1.0

### Active

- [ ] PDF to PowerPoint (PPT) — convert PDF pages to image-based slides
- [ ] PowerPoint to PDF (PPT → PDF) — convert PPTX files to PDF
- [ ] Split PDF advanced — batch split multiple input files
- [ ] Compress PDF advanced — batch compress with ZIP download
- [ ] Extract Selected toggle — group into one PDF vs. individual PDFs

### Out of Scope

- User accounts / authentication — internal tool, no auth needed
- Mobile app — web-first only
- Cloud storage integration — files stay local
- Text extraction / OCR — not feasible with current stack
- Offline mode — CDN dependencies require network

## Context

Shipped v1.0 with ~3,063 LOC across 2 files (index.html + functions/index.js).
Tech stack: Single HTML file with embedded CSS/JS, CDN-loaded pdf-lib 1.17.1 + pdfjs-dist 3.11.174 + JSZip 3.10.1, Firebase Cloud Functions v6 with Ghostscript.
5 tool tabs: Merge PDFs, Split PDF, Compress PDF, PDF to Images, Watermark.
91 commits over 45 days (2026-01-18 → 2026-03-03).

## Constraints

- **Architecture**: Single HTML file — all additions must remain embedded or CDN-loaded
- **Privacy**: Zero network calls for client-side tools; server mode is opt-in
- **Compatibility**: Must work in Chrome, Firefox, Safari, Edge (modern versions)
- **Dependencies**: CDN-only for client-side (no npm, no build step)
- **Server**: Firebase Cloud Functions for server-side compression only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single HTML file | No build tooling needed, easy to deploy/share | ✓ Good — 2,854 LOC manageable |
| CDN dependencies (pdf-lib, PDF.js, JSZip) | No install required, works anywhere | ✓ Good |
| Client-side only processing (default) | Privacy-first for CLMC internal files | ✓ Good |
| Split PDF before Compress PDF | Lower risk, establishes section-per-tool pattern | ✓ Good |
| JSZip for all downloads | Avoids popup blocker issues with multiple file downloads | ✓ Good |
| Encrypted PDF detection via /Encrypt header scan | Prevents silent failures on protected PDFs | ✓ Good |
| Firebase + Ghostscript for server compression | Client-side JPEG re-render quality was insufficient | ✓ Good — text preserved |
| Busboy over Multer for Cloud Functions | Multer broken in Cloud Functions (body pre-parsed) | ✓ Good |
| Phase 2.1 inserted for server-side compression | Client-side Heavy mode quality insufficient | ✓ Good — pivoted quickly |
| Independent nav tabs per tool | Radio toggle UX was confusing | ✓ Good |
| Monochrome flat design | Matches CLMC branding, professional look | ✓ Good |
| Privacy notice removed (SCOMP-04) | Internal tool, no external users | ✓ Good — user decision |

---
*Last updated: 2026-03-03 after v1.0 milestone*
