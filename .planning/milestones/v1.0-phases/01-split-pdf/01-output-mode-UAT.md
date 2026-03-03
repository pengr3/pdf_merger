---
status: complete
phase: 01-split-pdf
source: [implementation — extract selected pages output mode toggle]
started: 2026-03-03T12:00:00Z
updated: 2026-03-03T12:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Radio group visibility on load
expected: Upload a multi-page PDF. After thumbnails render, two radio buttons appear between the selection summary area and the action buttons: "As one PDF" (selected by default) and "As individual PDFs".
result: pass

### 2. Extract Selected — grouped (default)
expected: Select 2+ pages, leave "As one PDF" selected, click "Extract Selected Pages". A ZIP downloads containing a single PDF with all selected pages combined.
result: pass

### 3. Extract Selected — individual
expected: Select 2+ pages, switch to "As individual PDFs", click "Extract Selected Pages". A ZIP downloads containing one separate PDF per selected page (e.g. 3 pages selected → 3 PDFs in the ZIP).
result: pass

### 4. Extract Every Page unaffected
expected: Regardless of which radio is selected, clicking "Extract Every Page" produces a ZIP with one PDF per page of the entire document (same behavior as before).
result: pass

### 5. Clear hides radio group
expected: Click "Clear". The radio group disappears along with thumbnails and action buttons. Re-uploading a PDF shows the radio group again with "As one PDF" selected by default.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
