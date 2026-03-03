---
status: complete
phase: 01-split-pdf
source: [01-split-pdf-01-SUMMARY.md, 01-split-pdf-02-SUMMARY.md, 01-split-pdf-03-SUMMARY.md]
started: 2026-03-02T10:40:00Z
updated: 2026-03-03T00:00:00Z
---

## Current Test

All tests complete.

## Tests

### 1. Split PDF nav button
expected: Clicking "Split PDF" in the navbar shows the Split PDF section (upload area, subtitle text) and hides all other tool sections.
result: pass

### 2. Upload via click
expected: Clicking the upload area opens a file picker dialog. After selecting a PDF, the tool starts processing it.
result: pass

### 3. Upload via drag-and-drop
expected: Dragging a PDF file onto the upload area loads it (same result as clicking to upload). Dragging a non-PDF shows an error message.
result: pass (after fix — drag-and-drop file reference was lost by clearSplitTool() in loadSplitPdfThumbnails)

### 4. Thumbnail grid renders
expected: After uploading a PDF, a grid of page thumbnails appears — one card per page, each showing the actual page content as a small image.
result: pass

### 5. Progress bar during thumbnail render
expected: A progress bar is visible and advances while thumbnails are rendering. It hides when rendering is complete.
result: pass

### 6. File info bar
expected: After upload, a bar appears above the thumbnail grid showing the filename and total page count (e.g. "document.pdf — 5 pages (1.2 MB)").
result: pass

### 7. Thumbnail click selection
expected: Clicking a thumbnail card toggles its selected state — selected cards get a blue border and a checkmark badge. The page range text input updates automatically to reflect the selection (e.g. clicking pages 1 and 3 shows "1, 3" in the input).
result: pass

### 8. Range input Apply
expected: Typing a page range (e.g. "2") in the range text field and clicking Apply (or pressing Enter) selects those pages in the thumbnail grid — the corresponding cards get the blue border/checkmark style.
result: pass

### 9. Invalid range error
expected: Typing an invalid range ("0", "abc", "5-3") in the range input and clicking Apply shows a red error message below the input. The thumbnail selection does not change.
result: pass

### 10. Extract Every Page
expected: Clicking "Extract Every Page" triggers a progress bar, then downloads a single .zip file. The ZIP contains one PDF per page, named {filename}-page-1.pdf, -page-2.pdf, etc. Each extracted PDF has exactly 1 page.
result: pass

### 11. Extract Selected Pages
expected: After selecting pages via thumbnails or range input, clicking "Extract Selected Pages" downloads a .zip containing a single PDF with all the selected pages grouped together.
result: pass

### 12. Encrypted PDF rejection
expected: Uploading a known encrypted/password-protected PDF shows an error message and no thumbnails are rendered. No crash or JS error in the console.
result: skipped (no encrypted PDF available for testing)

### 13. No regressions — existing tools
expected: Clicking "PDF Tools" shows the merge/image tool and the Split PDF section hides. Uploading PDFs to merge and clicking Merge PDFs still works. Clicking "Watermark Inserter" shows that section correctly.
result: pass

## Summary

total: 13
passed: 12
issues: 1 (fixed during UAT)
pending: 0
skipped: 1

## Issues Found & Fixed

### Issue 1: Drag-and-drop upload broken
- **Test:** 3
- **Root cause:** `loadSplitPdfThumbnails()` called `clearSplitTool()` which set `splitPdfFile = null`, then tried `fileInputSplit.files[0] || splitPdfFile` — but for drag-and-drop, `fileInputSplit.files[0]` is empty and `splitPdfFile` was already nulled
- **Fix:** Save file reference before clear: `const pendingFile = splitPdfFile || fileInputSplit.files[0]` then restore after clear

## Gaps

- Test 12 (encrypted PDF) skipped — consider adding automated test or manual retest when an encrypted PDF is available

## Feature Request (captured during UAT)

- User requested option to extract selected pages as individual PDFs (currently always groups into one PDF). Capture as enhancement todo.
