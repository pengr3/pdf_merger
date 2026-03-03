# Roadmap: CLMC Tools

## Overview

This milestone delivers two new PDF tools — Split and Compress — to CLMC's existing client-side PDF web app. Both features run entirely in the browser with zero server calls. Phase 1 adds Split PDF, which is the lower-risk feature and establishes the section-per-tool code pattern. Phase 2 adds Compress PDF, which reuses the PDF.js page-render pipeline proven in Phase 1. v2 features (PDF-to-PPTX, PPTX-to-PDF) are deferred pending further research.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Split PDF** - User can extract any subset of pages from a PDF and download results as a ZIP
- [ ] **Phase 2: Compress PDF** - User can reduce PDF file size with honest before/after feedback and a clear UX warning for text-heavy files

## Phase Details

### Phase 1: Split PDF
**Goal**: Users can split any PDF into individual pages or custom page ranges and download the results without triggering browser popup blockers
**Depends on**: Nothing (first phase)
**Requirements**: SPLT-01, SPLT-02, SPLT-03, SPLT-04, SPLT-05, SPLT-06, SPLT-07, SPLT-08
**Success Criteria** (what must be TRUE):
  1. User can upload a PDF via click or drag-and-drop and immediately see a page count and thumbnail grid
  2. User can type a page range string (e.g. "1-3, 5, 7-9") or click individual thumbnails to select the pages to extract
  3. User can click "Extract Every Page" and receive all pages as separate PDFs in a single ZIP download
  4. When the uploaded PDF is encrypted, the app shows a clear error message and does not attempt to process it
  5. A progress indicator is visible during split and ZIP generation so the user knows the operation is running
**Plans**: TBD

### Phase 2: Compress PDF
**Goal**: Users can reduce PDF file size in their chosen quality mode and immediately see whether the compression was effective, with a clear warning before heavy mode destroys the text layer
**Depends on**: Phase 1
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-08
**Success Criteria** (what must be TRUE):
  1. User can upload a PDF and choose between Fast mode (lossless structural optimization) and Heavy mode (JPEG re-render)
  2. After compression, user sees the before and after file size for each PDF so they can confirm the tool worked
  3. In Heavy mode, user can drag a quality slider (50-100%) to control JPEG compression before downloading
  4. Before starting Heavy mode, a visible warning explains that the text layer will be destroyed and text will no longer be selectable
  5. When the uploaded PDF is encrypted, the app shows a clear error and does not attempt to process it
**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md -- Foundation + UI: nav button, HTML section, CSS, mode toggle, quality slider, upload handlers, file list
- [ ] 02-02-PLAN.md -- Compression logic + results: Fast/Heavy engines, orchestrator, before/after display, individual download, human verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Split PDF | 3/3 | Complete | 2026-03-03 |
| 2. Compress PDF | 2/2 | Complete | 2026-03-03 |
| 2.1. Server-Side Compression | 2/2 | Complete | 2026-03-03 |
| 3. Split Merge PDFs / PDF to Images | 2/2 | Complete | 2026-03-03 |
| 4. UI/UX Overhaul | 3/3 | Complete | 2026-03-03 |

### Phase 02.1: Server-Side PDF Compression via Firebase (INSERTED)

**Goal:** Replace client-side Heavy (JPEG Re-render) mode with server-side Ghostscript compression via Firebase Cloud Functions, preserving text selectability while achieving effective image downsampling across three quality presets
**Depends on:** Phase 02
**Requirements**: SCOMP-01, SCOMP-02, SCOMP-03, SCOMP-04, SCOMP-05, SCOMP-06
**Success Criteria** (what must be TRUE):
  1. User can select Server (Ghostscript) mode and compress a PDF using one of three presets (Best Quality 300DPI, Balanced 150DPI, Compressed 72DPI)
  2. Text remains selectable in server-compressed PDFs (Ghostscript preserves text vectors)
  3. A privacy disclosure is visible when server mode is selected, informing the user files are sent to the server
  4. Fast (Lossless) client-side mode continues to work unchanged
  5. Old Heavy (JPEG Re-render) mode and its text-destruction warning are fully removed from the UI
**Plans:** 4/2 plans complete

Plans:
- [x] 02.1-01-PLAN.md -- Firebase Cloud Function: create functions/index.js with Ghostscript compressPdf endpoint, project config, user deploys
- [x] 02.1-02-PLAN.md -- Frontend integration: replace Heavy mode with Server mode, add privacy disclosure, wire compressFileServer(), end-to-end verification

### Phase 3: Split Merge PDFs and PDF to Images into separate nav tabs

**Goal:** Split the combined "PDF Tools" nav tab (radio-toggle between Merge PDFs and PDF to Images) into two independent nav tabs, each with their own HTML section, state, DOM references, and upload handlers — eliminating the confusing radio-toggle UX
**Depends on:** Phase 02.1
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. Merge PDFs has its own nav tab with independent file list, drag reorder, and merge functionality
  2. PDF to Images has its own nav tab with single-file upload and page-to-image conversion
  3. Each tool's file state persists independently when switching tabs
  4. The old combined pdf-tools section, radio toggle, and mode dispatcher are fully removed
**Plans:** 2/2 plans complete

Plans:
- [x] 03-01-PLAN.md -- HTML refactoring (nav buttons + both sections) + Merge PDF JS block with independent state and handlers
- [x] 03-02-PLAN.md -- PDF to Images JS block + dead code cleanup + beforeunload guard update + human verification

### Phase 4: UI/UX overhaul — replace gradient color scheme, remove emojis, add company logo, overall polish

**Goal:** Replace the purple gradient color scheme with a monochrome palette derived from the CLMC logo, remove all emojis, add the company logo to the navbar, and apply flat Notion/Linear card styling — purely cosmetic, all tools remain functionally identical
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Depends on:** Phase 3
**Success Criteria** (what must be TRUE):
  1. No purple or gradient colors visible anywhere in the app — entire palette is black/gray/white monochrome
  2. CLMC logo image displayed in navbar at 48px height with "TOOLS" text suffix
  3. No emoji characters visible in nav buttons, headings, privacy badges, upload areas, or status messages
  4. Status messages show CSS-styled colored dot indicators (green/red/yellow) instead of emoji
  5. Cards and containers have flat design with subtle borders, no heavy shadows, and 4-8px border-radius
  6. Primary buttons are solid black with dark gray hover state, no gradient or lift effect
**Plans:** 3/3 plans complete

Plans:
- [x] 04-01-PLAN.md -- CSS palette swap: replace all purple colors with monochrome, flatten card/button styles, add status indicator and logo CSS classes
- [x] 04-02-PLAN.md -- HTML/JS emoji removal: navbar logo integration, remove all HTML emojis, replace JS emoji status indicators with CSS spans
- [x] 04-03-PLAN.md -- Human verification: visual inspection of all five tool tabs
