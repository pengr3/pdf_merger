---
status: testing
phase: 01-split-pdf
source: [01-split-pdf-01-SUMMARY.md, 01-split-pdf-02-SUMMARY.md, 01-split-pdf-03-SUMMARY.md]
started: 2026-03-02T10:40:00Z
updated: 2026-03-02T10:40:00Z
---

## Current Test

number: 2
name: Upload via click
expected: |
  Clicking the upload area opens a file picker dialog. After selecting a PDF, the tool starts processing it.
awaiting: user response

## Tests

### 1. Split PDF nav button
expected: Clicking "Split PDF" in the navbar shows the Split PDF section (upload area, subtitle text) and hides all other tool sections.
result: pass

### 2. Upload via click
expected: Clicking the upload area opens a file picker dialog. After selecting a PDF, the tool starts processing it.
result: [pending]

### 3. Upload via drag-and-drop
expected: Dragging a PDF file onto the upload area loads it (same result as clicking to upload). Dragging a non-PDF shows an error message.
result: [pending]

### 4. Thumbnail grid renders
expected: After uploading a PDF, a grid of page thumbnails appears — one card per page, each showing the actual page content as a small image.
result: [pending]

### 5. Progress bar during thumbnail render
expected: A progress bar is visible and advances while thumbnails are rendering. It hides when rendering is complete.
result: [pending]

### 6. File info bar
expected: After upload, a bar appears above the thumbnail grid showing the filename and total page count (e.g. "document.pdf — 5 pages (1.2 MB)").
result: [pending]

### 7. Thumbnail click selection
expected: Clicking a thumbnail card toggles its selected state — selected cards get a blue border and a checkmark badge. The page range text input updates automatically to reflect the selection (e.g. clicking pages 1 and 3 shows "1, 3" in the input).
result: [pending]

### 8. Range input Apply
expected: Typing a page range (e.g. "2") in the range text field and clicking Apply (or pressing Enter) selects those pages in the thumbnail grid — the corresponding cards get the blue border/checkmark style.
result: [pending]

### 9. Invalid range error
expected: Typing an invalid range ("0", "abc", "5-3") in the range input and clicking Apply shows a red error message below the input. The thumbnail selection does not change.
result: [pending]

### 10. Extract Every Page
expected: Clicking "Extract Every Page" triggers a progress bar, then downloads a single .zip file. The ZIP contains one PDF per page, named {filename}-page-1.pdf, -page-2.pdf, etc. Each extracted PDF has exactly 1 page.
result: [pending]

### 11. Extract Selected Pages
expected: After selecting pages via thumbnails or range input, clicking "Extract Selected Pages" downloads a .zip containing a single PDF with all the selected pages grouped together.
result: [pending]

### 12. Encrypted PDF rejection
expected: Uploading a known encrypted/password-protected PDF shows an error message and no thumbnails are rendered. No crash or JS error in the console.
result: [pending]

### 13. No regressions — existing tools
expected: Clicking "PDF Tools" shows the merge/image tool and the Split PDF section hides. Uploading PDFs to merge and clicking Merge PDFs still works. Clicking "Watermark Inserter" shows that section correctly.
result: [pending]

## Summary

total: 13
passed: 1
issues: 0
pending: 12
skipped: 0

## Gaps

[none yet]
