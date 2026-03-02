# Coding Conventions

**Analysis Date:** 2026-03-02

## Naming Patterns

**Files:**
- Single HTML file containing all CSS and JavaScript: `index.html`
- HTML IDs and class names use kebab-case: `uploadAreaPdf`, `file-item`, `progress-fill`

**Functions:**
- camelCase for all function names: `mergePDFs()`, `convertPdfToImages()`, `handlePdfDragStart()`, `showStatus()`, `updateProgress()`
- Function names are descriptive and include action verbs: `render*()`, `update*()`, `handle*()`, `show*()`, `hide*()`
- Prefix patterns by function type:
  - Event handlers: `handle*` (e.g., `handlePdfDragStart`, `handlePdfDrop`)
  - Render functions: `render*` (e.g., `renderPdfFileList`, `renderWatermarkFileList`)
  - Update functions: `update*` (e.g., `updateProgress`, `updatePdfToolMode`, `updateWatermarkButtons`)
  - Show/hide utilities: `show*`, `hide*` (e.g., `showStatus`, `hideStatus`)

**Variables:**
- camelCase for all variable declarations: `selectedPdfFiles`, `draggedIndex`, `pdfToolMode`, `watermarkFiles`
- HTML element references suffixed with their type: `uploadAreaPdf`, `fileInputPdf`, `submitBtnPdf`, `progressBarPdf`
- State variables are at module/section scope: `let selectedPdfFiles = []`, `let pdfToolMode = 'merge'`

**Types/Classes:**
- Library objects destructured from CDN imports: `const { PDFDocument, rgb, degrees } = PDFLib;`
- Image constructor used directly: `new Image()`, `new Blob()`, `new FileReader()`

## Code Style

**Formatting:**
- No explicit formatter detected; style appears manual
- 4-space indentation throughout
- Line length: mostly under 100 characters, some longer for clarity
- Semicolons: used consistently throughout

**Linting:**
- No linting configuration found (no .eslintrc files)
- Code follows conventional JavaScript style informally

## Import Organization

**Order:**
1. CDN script tags for external libraries (pdf-lib, PDF.js)
2. Script tag containing all application code
3. No local imports (single-file application)

**Path Aliases:**
- Not applicable; single-file application
- External libraries accessed globally: `PDFLib`, `pdfjsLib`
- Library destructuring happens at top of script: `const { PDFDocument, rgb, degrees } = PDFLib;`

**Initialization:**
- Global worker setup for PDF.js: `pdfjsLib.GlobalWorkerOptions.workerSrc = '...'`

## Error Handling

**Patterns:**
- Try-catch-finally blocks used in async operations: `mergePDFs()`, `convertPdfToImages()`, `applyWatermarks()`
- Error messages displayed to user via `showStatus()` with CSS class `'error'`
- Console logging of errors for debugging: `console.error('PDF merge error:', error)`
- File processing errors wrapped with context: `throw new Error(\`Failed to process "${file.name}": ${error.message}\`)`
- Async operations always use try-catch-finally to restore UI state (re-enable buttons)

**Error Display:**
```javascript
// User-facing error display pattern
showStatus(`❌ Error: ${error.message}`, 'error', 'statusPdf');
console.error('Error context:', error);
```

## Logging

**Framework:** console (native browser console)

**Patterns:**
- `console.error()` used only for exceptions in catch blocks
- Error messages prefixed with emoji for visual distinction: ✅ (success), ❌ (error)
- User messages shown via `showStatus()` function with HTML/spinner support
- Loading states include spinner HTML: `'<div class="spinner"></div> Processing...'`

## Comments

**When to Comment:**
- Section headers for major feature blocks: `// ========== PDF TOOLS (UNIFIED) ==========`
- Functional comments before complex operations
- Inline comments on configuration values and magic numbers

**JSDoc/TSDoc:**
- Not used in this codebase

**Examples:**
```javascript
// Load and draw watermark
if (!watermarkPreviewImage) {
    watermarkPreviewImage = new Image();
    // ... image setup
}

// Draw sample document background
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
```

## Function Design

**Size:**
- Small utility functions (10-30 lines): `hideStatus()`, `escapeHtml()`, `updateProgress()`, `showStatus()`
- Medium functions (30-80 lines): `renderPdfFileList()`, `updateWatermarkPreview()`, `downloadImage()`
- Larger async functions (80-150 lines): `mergePDFs()`, `convertPdfToImages()`, `applyWatermarks()`

**Parameters:**
- Functions typically take 1-3 parameters
- Multiple IDs passed as separate string parameters: `updateProgress(percent, barId, fillId)`
- Options objects used for complex configurations: `{ scale: 2.0 }`, `{ crossOrigin: 'anonymous' }`

**Return Values:**
- Event handlers return void (side effects via DOM manipulation)
- Utility functions return processed values: `escapeHtml()` returns string
- Async functions return Promises for PDF bytes or Blobs: `applyWatermarkToPdf()` returns Promise
- Some async functions resolve in callbacks rather than returning: `loadWatermarkImage()` uses Promise constructor

## Module Design

**Exports:**
- Single HTML file with embedded script; no modular exports
- Global function exposure via `window` object for onclick handlers: `window.removePdfFile = removePdfFile`
- Section-scoped functionality with closure over private variables

**Barrel Files:**
- Not applicable; single-file application

**Encapsulation:**
- Feature sections enclosed in script tag scope
- Private state stored in closure variables: `selectedPdfFiles`, `draggedIndex`, `watermarkFiles`
- Only necessary functions exposed to global scope for HTML event bindings

## Patterns Observed

**Template Literals:**
- Extensively used for HTML generation and interpolation
- `fileListPdf.innerHTML = selectedPdfFiles.map((file, index) => \`...\`).join('')`
- Helps with readability and escaping via `escapeHtml()` utility

**Array Operations:**
- `.map()` for transformations (render file lists)
- `.forEach()` for side effects (attach listeners, draw elements)
- `.filter()` for file type validation
- `.splice()` for in-place manipulation (file removal, drag reordering)

**DOM Manipulation:**
- Direct `innerHTML` assignment for rendering lists
- `querySelector()` and `getElementById()` for element selection
- Element creation with `document.createElement()` for programmatic elements

**Async Patterns:**
- `async/await` for sequential file processing
- Promise constructors for file reading: `new FileReader()`, `new Image().onload`
- Progress updates during long operations via `updateProgress()`

---

*Convention analysis: 2026-03-02*
