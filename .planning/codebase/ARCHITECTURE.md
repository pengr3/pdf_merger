# Architecture

**Analysis Date:** 2026-03-02

## Pattern Overview

**Overall:** Single-Page Application (SPA) with embedded CSS and JavaScript - Client-side MVC pattern

**Key Characteristics:**
- All processing occurs in the browser (client-side only)
- No backend server required or used
- Responsive, tab-based interface for multiple tools
- State managed in JavaScript module scope
- DOM manipulation for rendering and interaction

## Layers

**Presentation Layer:**
- Purpose: Render UI components, handle user interactions, display results
- Location: Inline HTML markup in `<body>` (lines 606-744) and CSS styling in `<head>` (lines 7-603)
- Contains: HTML elements for navigation, upload areas, file lists, forms, canvas for preview
- Depends on: Application logic layer for event handling and state updates
- Used by: User interactions trigger event listeners defined in application layer

**Application Logic Layer:**
- Purpose: Handle file operations, state management, event routing, UI updates
- Location: Inline `<script>` section (lines 756-1606) in `index.html`
- Contains: Event listeners, file processing functions, state variables, utility functions
- Depends on: External libraries (pdf-lib, PDF.js) for PDF operations and Canvas API for image conversion
- Used by: Called by event listeners and form submissions

**Business Logic Layer:**
- Purpose: Implement core features - PDF merging, PDF to image conversion, watermark application
- Location: Functions in script section: `mergePDFs()` (line 1040), `convertPdfToImages()` (line 1123), `applyWatermarkToPdf()` (line 1423), `applyWatermarkToImage()` (line 1479)
- Contains: PDF processing algorithms, image transformation, canvas drawing operations
- Depends on: pdf-lib for PDF manipulation, PDF.js for page rendering, native Canvas API
- Used by: Application logic layer via form submission handlers

**Data/State Layer:**
- Purpose: Store application state and user-selected files
- Location: Module-scoped variables in script section
- Contains: `selectedPdfFiles` (line 792), `watermarkFiles` (line 1221), `pdfToolMode` (line 794), `draggedIndex` (line 793), `watermarkPreviewImage` (line 1333)
- Depends on: Nothing
- Used by: All application logic functions

## Data Flow

**PDF Merge Flow:**

1. User selects multiple PDF files via file input or drag-drop
2. Files validated (must be PDFs) and stored in `selectedPdfFiles` array
3. `renderPdfFileList()` renders file list with drag handles
4. User can reorder files via drag-and-drop (triggers `handlePdfDragStart`, `handlePdfDrop`, etc.)
5. User clicks "Merge PDFs" button → `handlePdfToolSubmit()` → `mergePDFs()`
6. `mergePDFs()` loads each PDF, creates new merged document, downloads result

**PDF to Images Conversion Flow:**

1. User selects single PDF file
2. File stored in `selectedPdfFiles` array
3. User clicks "Convert to Images" button → `handlePdfToolSubmit()` → `convertPdfToImages()`
4. `convertPdfToImages()` renders each page to canvas, creates image blob
5. Images displayed in grid (lines 539-572 CSS styles)
6. User downloads individual page images

**Watermark Application Flow:**

1. User uploads PDF or image files to watermark section
2. Files stored in `watermarkFiles` array
3. `renderWatermarkFileList()` displays uploaded files
4. Watermark image (CLMC logo) loaded from GitHub CDN
5. User selects watermark style (corner/center/diagonal) and opacity
6. `updateWatermarkPreview()` renders preview on canvas as user adjusts settings
7. User clicks "Apply Watermark" → `applyWatermarks()`
8. For each file: `applyWatermarkToPdf()` or `applyWatermarkToImage()` applies watermark
9. Watermarked files downloaded individually

**State Management:**
- Simple global variables in module scope capture application state
- No state management library - direct mutations and re-rendering
- UI updates triggered by explicit function calls (not reactive)
- File arrays (`selectedPdfFiles`, `watermarkFiles`) are source of truth

## Key Abstractions

**File Processing Pipeline:**

Purpose: Unified handling of files across different tool types
Examples: `renderPdfFileList()` (line 887), `renderWatermarkFileList()` (line 1304), `removeWatermarkFile()` (line 1298)
Pattern: Files stored in typed arrays, rendered to DOM, processed based on mode/type

**Upload Area Handler:**

Purpose: Unified file input handling via click and drag-drop
Examples: Lines 828-858 (PDF tools upload), lines 1224-1246 (watermark upload)
Pattern: Click triggers file input dialog, drag-drop validated and processed through same handler

**Preview System:**

Purpose: Real-time visualization of settings before processing
Examples: Canvas-based watermark preview (lines 1335-1405)
Pattern: Canvas element updated on input change events, settings reflected immediately

**Error/Status Display:**

Purpose: Consistent user feedback for errors, success, and warnings
Examples: `showStatus()` (line 932), `hideStatus()` (line 939)
Pattern: Status divs (`statusPdf`, `statusWatermark`) toggled with message and type class

**Progress Tracking:**

Purpose: Visual feedback during long operations
Examples: `updateProgress()` (line 969), used in `mergePDFs()`, `convertPdfToImages()`, `applyWatermarks()`
Pattern: Progress bar fill width updated based on completion percentage

## Entry Points

**Page Load:**
- Location: Inline script (lines 756-1606) executes on page load
- Triggers: Window DOMContentLoaded event (implicit for inline scripts)
- Responsibilities: Initialize PDF.js worker, set up event listeners, initialize state variables, attach DOM references

**Navigation (Tool Switching):**
- Location: `.nav-link` click handlers (lines 766-776)
- Triggers: User clicks "PDF Tools" or "Watermark Inserter" button
- Responsibilities: Switch active nav link styling, toggle tool section visibility, clear UI state

**File Upload:**
- Location: Upload area click (line 828), file input change (line 860), drag-drop (line 839)
- Triggers: User interaction with upload UI
- Responsibilities: Accept files, validate file type, add to state array, re-render file list, update button state

**Form Submission:**
- Location: Submit button click (line 1207 for PDF, line 1596 for watermark)
- Triggers: User clicks "Merge PDFs", "Convert to Images", or "Apply Watermark"
- Responsibilities: Call appropriate processing function, show progress, handle errors, download results

## Error Handling

**Strategy:** Try-catch with user-facing status messages and console logging

**Patterns:**
- File validation checks before processing (e.g., line 842-847: validate dropped files are PDFs)
- Try-catch blocks in async functions (e.g., lines 1051, 1541)
- Error messages displayed via `showStatus(message, 'error', statusId)`
- Console logging for debugging (e.g., line 1589: `console.error('Watermark error:', error)`)
- Graceful fallbacks (e.g., image load error in watermark: line 1418)
- Button disabling during processing to prevent double-submission (e.g., lines 1047-1048)

## Cross-Cutting Concerns

**Logging:** Uses native `console.error()` for error tracking. No centralized logging system.

**Validation:**
- File type validation by MIME type and extension (lines 842-844, 1238-1240)
- Minimum file count validation for merge mode (lines 922-926)
- Canvas element existence check (line 1337)

**Authentication:** Not applicable - client-side processing only

**Security:**
- HTML escaping in `escapeHtml()` (lines 979-983) prevents XSS when rendering filenames
- All file processing in-browser, no server uploads
- Privacy badge displayed to users (lines 621-623, 680-682)
- Watermark image fetched from public GitHub repository

**File Handling:**
- Files remain in memory (arrays) during session
- URL.createObjectURL() for blob download (lines 1073, 1566-1572)
- URL.revokeObjectURL() called after download to prevent memory leaks (line 1572, similar patterns)

**Performance Considerations:**
- Large PDF merging uses streaming if available from pdf-lib
- Canvas operations for image conversion done in main thread (potential janky UI for large PDFs)
- Watermark preview canvas redraws on every setting change (could optimize with requestAnimationFrame)
- No pagination or lazy loading for large files

---

*Architecture analysis: 2026-03-02*
