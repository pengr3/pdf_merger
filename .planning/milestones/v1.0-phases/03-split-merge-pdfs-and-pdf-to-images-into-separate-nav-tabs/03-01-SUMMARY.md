---
phase: 03-split-merge-pdfs-and-pdf-to-images-into-separate-nav-tabs
plan: "01"
subsystem: frontend-nav
tags: [navigation, merge-pdf, split-tools, html-refactor]
dependency_graph:
  requires: []
  provides: [merge-pdf-nav-tab, merge-pdf-section, pdf-to-images-html-placeholder]
  affects: [index.html]
tech_stack:
  added: []
  patterns: [independent-tool-sections, merge-specific-dom-ids, direct-event-binding]
key_files:
  created: []
  modified: [index.html]
decisions:
  - "Replace single pdf-tools nav button with two separate merge-pdf and pdf-to-images buttons"
  - "Move shared utilities (showStatus, hideStatus, updateProgress, hideProgress, escapeHtml) to own section at top"
  - "Merge section is default active tab — no behavior change for existing merge users"
  - "PDF to Images section exists in HTML but JS is placeholder — Plan 02 wires the JS"
  - "submitBtnMerge binds directly to mergePDFs() — no dispatcher function needed"
metrics:
  duration: "3m54s"
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_modified: 1
---

# Phase 03 Plan 01: Replace PDF Tools with Independent Merge PDFs Nav Tab Summary

**One-liner:** Split unified pdf-tools section into independent merge-pdf nav tab (fully wired) and pdf-to-images placeholder, eliminating radio-button mode selection and all shared state.

## What Was Built

### Task 1: Replace nav buttons and HTML sections

Replaced the single "PDF Tools" nav button (line 895) with two separate buttons:
- `<button class="nav-link active" data-tool="merge-pdf">Merge PDFs</button>` — default active tab
- `<button class="nav-link" data-tool="pdf-to-images">PDF to Images</button>`

Replaced the single `div#pdf-tools` section with two sections:
- `div#merge-pdf class="tool-section active"` — fully structured Merge PDFs section with all -Merge-suffixed IDs
- `div#pdf-to-images class="tool-section"` — placeholder PDF to Images section with -Images-suffixed IDs

Removed the radio-button mode selection entirely (no more `pdfToolMode` in HTML).

**Key files:** `index.html` lines 895-896 (nav), 903-966 (HTML sections)

### Task 2: Merge PDF JS block

Replaced the entire `// ========== PDF TOOLS (UNIFIED) ==========` block with:

1. **Shared Utilities section** — `showStatus`, `hideStatus`, `updateProgress`, `hideProgress`, `escapeHtml` extracted to own section (already generic, unchanged)

2. **Merge PDFs JS block** — complete independent implementation:
   - State: `mergeFiles = []`, `mergeDraggedIndex = null`
   - DOM refs: all -Merge suffixed (`uploadAreaMerge`, `fileInputMerge`, `fileListMerge`, `submitBtnMerge`, `clearBtnMerge`, `reorderHintMerge`, `statsMerge`)
   - Upload handlers: click, dragover, dragleave, drop, change — all using `mergeFiles`
   - `renderMergeFileList()` — always shows drag handles when 2+ files (no mode check)
   - `updateMergeButtons()` — `submitBtnMerge.disabled = mergeFiles.length < 2`
   - `showMergeStats()` / `hideMergeStats()` — renamed from showPdfStats/hidePdfStats
   - All 6 drag handlers renamed: `attachMergeDragListeners`, `handleMergeDragStart/End/Over/Leave/Drop`
   - `mergePDFs()` — fully updated to use merge-specific refs and IDs
   - Direct binding: `submitBtnMerge.addEventListener('click', mergePDFs)`
   - Global exposure: `window.removeMergeFile = removeMergeFile`

3. **PDF to Images placeholder** — `// ========== PDF TO IMAGES SECTION ==========` / `// TODO: Plan 02 will create this block`

4. **beforeunload handler** — updated `selectedPdfFiles` → `mergeFiles`

Dead code removed: `pdfToolMode`, `updatePdfToolMode`, `handlePdfToolSubmit`, `convertPdfToImages`, `downloadImage`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | c9e9a85 | feat(03-01): replace pdf-tools nav button and section with separate merge-pdf and pdf-to-images HTML sections |
| Task 2 | aaac1cf | feat(03-01): replace unified PDF tools JS block with independent Merge PDFs JS block |

## Deviations from Plan

None — plan executed exactly as written. The one-occurrence of `pdfToolMode` remaining in the file is a code comment in the compress section (`// Reuse existing radio-option selected class toggling pattern from pdfToolMode`) — not active code, not in scope to modify.

## Verification Results

- `id="merge-pdf"` section exists with `class="tool-section active"` — PASS
- `id="pdf-to-images"` section exists with `class="tool-section"` (no active) — PASS
- `id="pdf-tools"` does NOT exist anywhere — PASS
- Both nav buttons exist with correct data-tool attributes — PASS
- `merge-pdf` nav button has `class="nav-link active"` — PASS
- No radio buttons for pdfToolMode in HTML — PASS
- All merge DOM IDs use Merge suffix — PASS
- All images DOM IDs use Images suffix — PASS
- `fileInputImages` does NOT have `multiple` attribute — PASS
- `fileInputMerge` HAS `multiple` attribute — PASS
- `mergeFiles` state array declared — PASS
- `mergeDraggedIndex` declared — PASS
- `renderMergeFileList()` calls `attachMergeDragListeners()` — PASS
- All 6 drag handlers renamed to Merge prefix — PASS
- `mergePDFs()` uses merge-specific refs and IDs — PASS
- Direct `submitBtnMerge.addEventListener('click', mergePDFs)` — PASS
- `window.removeMergeFile = removeMergeFile` — PASS
- NO `pdfToolMode` variable in active code — PASS
- NO `selectedPdfFiles` — PASS
- NO `updatePdfToolMode` — PASS
- NO `handlePdfToolSubmit` — PASS
- Shared utilities unchanged — PASS
- PDF to Images placeholder present — PASS

## Self-Check: PASSED

Files modified:
- `C:/Users/franc/dev/pdf_merger/index.html` — FOUND

Commits verified:
- c9e9a85 — FOUND
- aaac1cf — FOUND
