# Codebase Structure

**Analysis Date:** 2026-03-02

## Directory Layout

```
pdf_merger/
├── index.html                                      # Single-file web application (1608 lines)
├── CLMC 2026 REGISTERED LOGO.png                  # Logo asset (used in watermarking)
└── .planning/
    └── codebase/                                   # Documentation directory
```

## Directory Purposes

**pdf_merger/ (Root):**
- Purpose: Web application root - contains deployable artifact
- Contains: Single HTML file with embedded CSS and JavaScript, static assets
- Key files: `index.html` (entire application)

**.planning/codebase/:**
- Purpose: Architecture and planning documentation
- Contains: Markdown analysis documents for reference by development tools
- Generated: Yes (created by mapping tool)
- Committed: Yes

## Key File Locations

**Entry Points:**
- `index.html`: Single entry point - open in browser to run application. Contains:
  - Lines 1-6: HTML document declaration and head metadata
  - Lines 7-603: CSS styling (embedded)
  - Lines 606-744: HTML markup for UI structure
  - Lines 752-754: External library CDN scripts (pdf-lib, PDF.js)
  - Lines 756-1606: JavaScript application logic (embedded)

**Configuration:**
- `index.html` (lines 757-761): PDF.js worker configuration
  - `pdfjsLib.GlobalWorkerOptions.workerSrc` - CDN path to PDF.js worker
- No .env file - all external URLs hardcoded (GitHub logo URL at line 1222)

**Core Logic:**
- `index.html` (lines 756-1606): All application logic in single script block:
  - Lines 762-776: Navigation/tool switching
  - Lines 779-879: PDF tools initialization and file handling
  - Lines 1040-1122: PDF merge and conversion operations
  - Lines 1211-1289: Watermark tool initialization and setup
  - Lines 1335-1405: Watermark preview rendering
  - Lines 1423-1594: Watermark application to PDFs and images

**Testing:**
- Not applicable - no test files present

## Naming Conventions

**Files:**
- Single HTML file: `index.html` (standard web app convention)
- Assets: `CLMC 2026 REGISTERED LOGO.png` (descriptive asset name with spaces)

**Directories:**
- `.planning/codebase/` - GSD tool standard for codebase analysis documents

**HTML IDs (DOM elements):**
- Pattern: `{feature}{Type}` (e.g., `submitBtnPdf`, `statusWatermark`, `fileInputPdf`)
- Tool prefixes: `Pdf` (PDF tools), `Watermark` (watermark tool)
- Element type suffixes: `Btn` (button), `Input` (file input), `Area` (upload area), `List` (file list)

**CSS Classes:**
- Pattern: kebab-case (e.g., `.file-item`, `.drag-over`, `.progress-bar`)
- State classes: `.active` (active tab/section), `.dragging` (drag state), `.selected` (selected radio option), `.dragover` (drag-over upload area)
- Component pattern: `.container` (main content), `.navbar` (header), `.tool-section` (tab content)

**JavaScript Functions:**
- Pattern: camelCase (e.g., `mergePDFs`, `renderPdfFileList`, `updateWatermarkPreview`)
- Prefixes by purpose:
  - `handle*` - Event handlers (e.g., `handlePdfDragStart`)
  - `update*` - State update functions (e.g., `updatePdfButtons`)
  - `render*` - DOM rendering functions (e.g., `renderPdfFileList`)
  - `show*`/`hide*` - UI visibility toggle (e.g., `showStatus`, `hideStatus`)
  - `apply*` - Operation functions (e.g., `applyWatermarkToPdf`)
  - `load*` - Async loading functions (e.g., `loadWatermarkImage`)
- Tool prefixes: `Pdf` (PDF tools), `Watermark` (watermark tool)

**JavaScript Variables:**
- Pattern: camelCase with type/purpose suffix:
  - DOM references: `{feature}Pdf`, `{feature}Watermark` (e.g., `fileListPdf`, `submitBtnWatermark`)
  - Arrays: plural (e.g., `selectedPdfFiles`, `watermarkFiles`)
  - State flags: boolean names (e.g., `hasValidFiles`, `hasFiles`)
  - Indices: `*Index` (e.g., `draggedIndex`)
  - Canvas context: `ctx`
  - Image objects: `img`, `watermarkImg`, `watermarkPreviewImage`

## Where to Add New Code

**New Tool Feature:**
1. Add HTML markup in tool section: around line 616 (PDF tools) or 676 (watermark tools)
2. Add CSS styling: lines 7-603 (before closing `</style>` tag at line 604)
3. Add DOM element references: in script section (e.g., around line 779 for PDF, line 1212 for watermark)
4. Add state variables: immediately after DOM references
5. Add event listeners: in initialization block
6. Add processing functions: after event listener setup

**New Upload Mode (PDF or Watermark):**
1. Add mode selector radio button: lines 628-642 (PDF) or 696-714 (watermark)
2. Add initialization: update corresponding initialization block (PDF: 797-801, watermark: 1266-1270)
3. Add validation logic: in drop handler (lines 839-858 for PDF, 1235-1246 for watermark)
4. Add processing function: after existing mode functions (e.g., after `mergePDFs()`)

**New File Processing Operation:**
1. Create processing function following naming pattern: `process{Feature}File(file, ...args)`
2. Add error handling: try-catch block with `showStatus(error.message, 'error', statusId)`
3. Add progress tracking: call `updateProgress()` in loop (see lines 1100-1108 for pattern)
4. Add download logic: use pattern from line 1073 or 1566-1572

**Utility Functions:**
- General utilities: line 979-983 (e.g., `escapeHtml`)
- Shared rendering: around line 932-977 (status, progress display)
- Should be placed before any code that calls them

## Special Directories

**No special directories** - single HTML file structure

**Generated Files (if running locally):**
- Browser cache for downloaded PDFs/images (temporary)
- Not committed to repository

**CDN Dependencies (loaded at runtime):**
- pdf-lib: `https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js` (line 753)
- PDF.js: `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js` (line 754)
- PDF.js worker: `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js` (line 758)
- Watermark image: `https://raw.githubusercontent.com/pengr3/pdf_merger/main/CLMC%202026%20REGISTERED%20LOGO.png` (line 1222)

## Code Organization

**HTML Structure (lines 606-744):**
- Navbar with tool navigation (lines 607-613)
- PDF Tools section (lines 617-673) - merged PDF upload, processing, results
- Watermark Inserter section (lines 676-744) - file upload, watermark config, preview
- Footer with attribution (lines 746-750)

**CSS Sections (lines 7-603):**
- Global styles (lines 8-20): body, layout baseline
- Navbar styling (lines 21-65)
- Container and layout (lines 67-83)
- Headings and text (lines 84-110)
- Upload area styling (lines 136-196)
- File list styling (lines 209-280)
- Button styling (lines 282-314)
- Progress bar (lines 316-334)
- Status and stats display (lines 336-381)
- Modal/options styling (lines 383-495)
- Image grid for converted PDFs (lines 497-572)
- Responsive media queries (lines 574-603)

**JavaScript Sections (lines 756-1606):**
- Library initialization (lines 757-760)
- DOM element caching (lines 763-790)
- Navigation setup (lines 766-776)
- PDF tools implementation (lines 779-1210):
  - State variables and initialization (lines 792-826)
  - Upload handling (lines 828-869)
  - File list management (lines 887-917)
  - Drag-drop reordering (lines 985-1038)
  - PDF merge operation (lines 1040-1122)
  - PDF to images conversion (lines 1123-1188)
- Watermark tools implementation (lines 1211-1594):
  - State variables and initialization (lines 1221-1289)
  - File upload handling (lines 1224-1258)
  - Watermark preview (lines 1335-1405)
  - Watermark application (lines 1423-1594)
- Navigation event handling (lines 1596-1604)
- Unload protection (lines 1599-1605)

## Deployment

**Running the application:**
- Simply open `index.html` in a modern web browser
- No build step required
- No server required
- Works offline after initial CDN library loads

**Deployment:**
- Static file deployment - can be hosted on any web server
- Can be embedded in iframes
- CDN dependencies must be accessible (internet required for initial load)

---

*Structure analysis: 2026-03-02*
