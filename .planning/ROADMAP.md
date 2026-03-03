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
- [ ] 02-01-PLAN.md -- Foundation + UI: nav button, HTML section, CSS, mode toggle, quality slider, upload handlers, file list
- [ ] 02-02-PLAN.md -- Compression logic + results: Fast/Heavy engines, orchestrator, before/after display, individual download, human verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Split PDF | 3/3 | UAT Complete |  |
| 2. Compress PDF | 0/2 | Planned | - |

### Phase 3: Split Merge PDFs and PDF to Images into separate nav tabs

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 2
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 3 to break down)

### Phase 4: UI/UX overhaul — replace gradient color scheme, remove emojis, add company logo, overall polish

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 3
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 4 to break down)
