# Milestones

## v1.0 CLMC Tools MVP (Shipped: 2026-03-03)

**Phases:** 5 (Phases 1, 2, 2.1, 3, 4) | **Plans:** 12 | **Requirements:** 32/32
**Timeline:** 45 days (2026-01-18 → 2026-03-03) | **Commits:** 91
**LOC:** ~3,063 (2,854 index.html + 209 functions/index.js)

**Key accomplishments:**
1. Split PDF tool — upload, thumbnail grid, page range selection, extract all/selected pages, ZIP download
2. Compress PDF dual-mode — Fast (lossless client-side) + Deep Compress (Ghostscript via Firebase Cloud Functions)
3. Server-side compression — Firebase Cloud Function with 3 quality presets (Best/Balanced/Compressed), text selectability preserved
4. Nav tab separation — split combined PDF Tools into independent Merge PDFs and PDF to Images tabs
5. UI/UX overhaul — monochrome palette, CLMC logo, zero emojis, flat Notion/Linear card design

**Git range:** d9e3ddd → b0523e1

**See:** `.planning/milestones/v1.0-ROADMAP.md` for full phase details

---
