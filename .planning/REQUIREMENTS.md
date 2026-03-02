# Requirements: CLMC Tools

**Defined:** 2026-03-02
**Core Value:** Files never leave the user's device. Every PDF operation runs 100% in-browser.

## v1 Requirements

Requirements for this milestone — Split PDF and Compress PDF features.

### Split PDF

- [ ] **SPLT-01**: User can upload one or more PDF files to the Split tool via click or drag-and-drop
- [ ] **SPLT-02**: User can see a thumbnail grid of all pages in the uploaded PDF
- [ ] **SPLT-03**: User can click individual page thumbnails to select/deselect them for extraction
- [ ] **SPLT-04**: User can type a page range string (e.g. "1-3, 5, 7-9") to select pages
- [ ] **SPLT-05**: User can click "Extract Every Page" to split all pages into individual files in one action
- [x] **SPLT-06**: User can download all split files as a single ZIP archive
- [x] **SPLT-07**: App detects encrypted PDFs and shows a clear error before attempting to process
- [ ] **SPLT-08**: App shows progress indicator during split and ZIP generation

### Compress PDF

- [ ] **COMP-01**: User can upload one or more PDF files to the Compress tool via click or drag-and-drop
- [ ] **COMP-02**: User can choose between Fast mode (lossless structural optimization) and Heavy mode (JPEG re-render)
- [ ] **COMP-03**: User sees before/after file size for each compressed PDF
- [ ] **COMP-04**: In Heavy mode, user can adjust JPEG quality via a slider (50–100%)
- [ ] **COMP-05**: Heavy mode shows a clear warning that text layer will be destroyed (non-selectable)
- [ ] **COMP-06**: App shows progress indicator during compression
- [ ] **COMP-07**: User can download each compressed PDF individually
- [ ] **COMP-08**: App detects encrypted PDFs and shows a clear error before attempting to process

## v2 Requirements

Deferred to future release.

### PDF to PowerPoint

- **PPT-01**: User can convert PDF pages to image-based PowerPoint slides (.pptx)
- **PPT-02**: User can choose slide size (Standard 4:3 / Widescreen 16:9)
- **PPT-03**: User can select image quality (low/medium/high)
- **PPT-04**: App displays disclaimer that output slides contain images, text is not selectable

### PPT to PDF

- **PPTPDF-01**: Feasibility research and spike against real CLMC PPTX files

### Split PDF — Advanced

- **SPLT-ADV-01**: Split a multi-PDF batch (multiple input files, split each separately)

### Compress PDF — Advanced

- **COMP-ADV-01**: Batch compress multiple PDFs and download all as ZIP

## Out of Scope

| Feature | Reason |
|---------|--------|
| PPT to PDF (v1) | No viable free CDN-only client-side library in 2026 — all roads lead to server-side or paid SDK |
| PDF to PPT (v1) | Deferred — focus on Split and Compress first |
| Server-side processing | Violates core privacy guarantee — files must never leave device |
| User accounts / authentication | Internal tool, no auth needed |
| Mobile app | Web-first only |
| Cloud storage integration | Files stay local |
| Text extraction from PDFs | OCR is not feasible with current stack |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPLT-01 | Phase 1 - Split PDF | Pending |
| SPLT-02 | Phase 1 - Split PDF | Pending |
| SPLT-03 | Phase 1 - Split PDF | Pending |
| SPLT-04 | Phase 1 - Split PDF | Pending |
| SPLT-05 | Phase 1 - Split PDF | Pending |
| SPLT-06 | Phase 1 - Split PDF | Complete |
| SPLT-07 | Phase 1 - Split PDF | Complete |
| SPLT-08 | Phase 1 - Split PDF | Pending |
| COMP-01 | Phase 2 - Compress PDF | Pending |
| COMP-02 | Phase 2 - Compress PDF | Pending |
| COMP-03 | Phase 2 - Compress PDF | Pending |
| COMP-04 | Phase 2 - Compress PDF | Pending |
| COMP-05 | Phase 2 - Compress PDF | Pending |
| COMP-06 | Phase 2 - Compress PDF | Pending |
| COMP-07 | Phase 2 - Compress PDF | Pending |
| COMP-08 | Phase 2 - Compress PDF | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after roadmap creation*
