# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — CLMC Tools MVP

**Shipped:** 2026-03-03
**Phases:** 5 | **Plans:** 12

### What Was Built
- Split PDF — upload, thumbnails, page range selection, extract all/selected, ZIP download
- Compress PDF — Fast (lossless client-side) + Deep Compress (server-side Ghostscript via Firebase)
- Firebase Cloud Function — Ghostscript compression with 3 quality presets, text selectability preserved
- Nav tab separation — each of 5 tools gets its own independent tab with isolated state
- UI/UX overhaul — monochrome palette, CLMC logo, zero emojis, flat Notion/Linear card design

### What Worked
- Section-per-tool pattern from Phase 1 made all subsequent tools fast to add
- Inserting Phase 2.1 (server-side compression) as a decimal phase was seamless — pivoted from insufficient client-side JPEG quality
- Single HTML file architecture kept deployment trivial despite growing to ~2,854 LOC
- Phase planning with success criteria prevented scope creep in each phase

### What Was Inefficient
- Phase 2 Plan 02 was never executed standalone — Phase 2.1 absorbed its functionality, resulting in an orphan plan
- Phases 1 and 2 lacked VERIFICATION.md (verifier wasn't integrated yet), requiring manual audit confirmation later
- DPI label mismatch in Phase 2.1 required a fix commit after initial completion

### Patterns Established
- `data-tool` attribute pattern for nav routing — add a button, section auto-routes
- `isEncryptedPdf()` — check first 2KB for `/Encrypt` header, reject before processing
- `downloadAsZip()` — JSZip for all multi-file downloads to avoid popup blocker
- Independent tool state pattern — each tool has its own file array, DOM refs, upload handlers
- CSS status indicators (`.status-icon` spans) replacing emojis for cross-platform consistency

### Key Lessons
1. Client-side PDF compression has hard quality limits — server-side Ghostscript is worth the complexity for image-heavy PDFs
2. Decimal phase insertion (2.1) works well for urgent pivots without disrupting phase numbering
3. Single HTML file scales to ~3K LOC but will need splitting if v2 features add significantly more
4. Busboy (not Multer) for Firebase Cloud Functions multipart parsing — Multer is broken due to body pre-parsing middleware

### Cost Observations
- Model mix: Balanced profile (mix of sonnet/haiku for agents)
- Execution was fast — ~2min average per plan, ~26min total
- Notable: Phase 4 (UI/UX) was 3 plans but purely cosmetic — fast execution

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 5 | 12 | Established section-per-tool pattern, decimal phase insertion |

### Top Lessons (Verified Across Milestones)

1. Section-per-tool pattern makes adding new tools predictable and fast
2. Server-side compression is necessary for production-quality PDF size reduction
