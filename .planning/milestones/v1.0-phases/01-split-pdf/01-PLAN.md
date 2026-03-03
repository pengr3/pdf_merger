---
phase: 01-split-pdf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - C:/Users/Admin/Roaming/pdf_merger/index.html
autonomous: true
requirements:
  - SPLT-06
  - SPLT-07

must_haves:
  truths:
    - "A 'Split PDF' nav button appears in the navbar and clicking it shows the split-pdf section"
    - "The JSZip library is available on the page (window.JSZip is defined)"
    - "isEncryptedPdf(arrayBuffer) returns true for a buffer containing '/Encrypt' and false otherwise"
    - "parsePageRange('1-3, 5', 10) returns [0, 1, 2, 4] (sorted 0-based indices)"
    - "extractPagesToPdf(srcDoc, [0]) returns a Uint8Array representing a valid single-page PDF"
    - "downloadAsZip([{name, data}]) triggers a single .zip file download without multiple dialogs"
  artifacts:
    - path: "C:/Users/Admin/Roaming/pdf_merger/index.html"
      provides: "JSZip CDN script tag, split-pdf nav button, split-pdf section skeleton, split tool CSS, utility functions"
      contains: "jszip@3.10.1, split-pdf, isEncryptedPdf, parsePageRange, extractPagesToPdf, downloadAsZip"
  key_links:
    - from: "nav button [data-tool='split-pdf']"
      to: "div#split-pdf.tool-section"
      via: "existing nav handler at line 766 — data-tool attribute match"
      pattern: "data-tool=\"split-pdf\""
    - from: "isEncryptedPdf"
      to: "arrayBuffer.slice(0, 2048)"
      via: "TextDecoder + includes('/Encrypt')"
      pattern: "isEncryptedPdf"
    - from: "downloadAsZip"
      to: "JSZip"
      via: "new JSZip() + zip.generateAsync({type:'blob'}) + URL.createObjectURL"
      pattern: "downloadAsZip"
---

<objective>
Add the Split PDF structural foundation: CDN library, nav button, section skeleton, CSS, and the four utility functions that all later tasks will call.

Purpose: Plan 02 cannot build upload/thumbnail logic without the section HTML existing; Plan 03 cannot build the split orchestrator without extractPagesToPdf and downloadAsZip. This plan creates the self-contained foundation that has no dependencies and can be verified in isolation.

Output: index.html modified with JSZip CDN tag, nav button, `div#split-pdf` HTML structure, split-specific CSS classes, and four utility functions: `isEncryptedPdf`, `parsePageRange`, `extractPagesToPdf`, `downloadAsZip`.
</objective>

<execution_context>
@C:/Users/Admin/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Admin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@C:/Users/Admin/Roaming/pdf_merger/.planning/ROADMAP.md
@C:/Users/Admin/Roaming/pdf_merger/.planning/STATE.md
@C:/Users/Admin/Roaming/pdf_merger/.planning/phases/01-split-pdf/01-RESEARCH.md

<interfaces>
<!-- Key patterns and hook points extracted from index.html. Executor uses these directly — no codebase exploration needed. -->

<!-- LINE 753-754: Existing CDN script tags. Add JSZip AFTER pdfjs-dist, BEFORE the main <script> block. -->
<!-- Line 753: <script src="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script> -->
<!-- Line 754: <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"></script> -->
<!-- Line 756: <script>   ← main application script starts here -->

<!-- LINE 609-612: Navbar buttons. Add Split PDF button AFTER the watermark button. -->
<!--   <button class="nav-link active" data-tool="pdf-tools">📄 PDF Tools</button>   -->
<!--   <button class="nav-link" data-tool="watermark">💧 Watermark Inserter</button>  -->

<!-- LINE 766-776: Nav handler. Picks up ALL .nav-link buttons automatically via data-tool → getElementById match. -->
<!-- No change needed to nav handler — new button works automatically. -->

<!-- LINE 744: </div> closes the last tool-section (watermark). -->
<!-- LINE 746: <div class="footer"> -->
<!-- Add new <div id="split-pdf" class="tool-section"> BETWEEN line 744 and line 746. -->

<!-- LINE 76-80: Existing CSS for tool sections -->
<!--   .tool-section { display: none; }       -->
<!--   .tool-section.active { display: block; } -->

<!-- LINE 603: </style> — append new split-pdf CSS rules BEFORE this closing tag. -->
<!-- Alternatively, append AFTER line 572 (.image-item .download-btn:hover block) and before @media query. -->

<!-- LINE 969-977: Shared utility functions already in codebase -->
<!--   function updateProgress(percent, barId, fillId) { ... }  -->
<!--   function hideProgress(barId, fillId) { ... }             -->
<!--   function showStatus(message, type, statusId) { ... }     -->
<!--   function escapeHtml(text) { ... }                        -->
<!-- Split tool calls these with IDs: 'progressBarSplit', 'progressFillSplit', 'statusSplit' -->

<!-- LINE 760: const { PDFDocument, rgb, degrees } = PDFLib;  ← PDFDocument is already destructured globally -->

<!-- LINE 1599-1605: beforeunload guard — references selectedPdfFiles and watermarkFiles arrays. -->
<!-- Plan 03 will add splitPdfFile to this guard. Leave it alone in this plan. -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add JSZip CDN tag and Split PDF nav button</name>
  <files>C:/Users/Admin/Roaming/pdf_merger/index.html</files>
  <action>
Make two targeted edits to index.html:

**Edit 1 — Add JSZip CDN tag:**
Insert the following line immediately after line 754 (the pdfjs-dist script tag), before the blank line that precedes `<script>`:
```html
    <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
```
Result: JSZip loads before the application script, so `new JSZip()` is available at runtime.

**Edit 2 — Add Split PDF nav button:**
Insert the following button immediately after the watermark nav button (line 611), inside the `.nav-links` div:
```html
            <button class="nav-link" data-tool="split-pdf">✂️ Split PDF</button>
```
The existing nav handler at lines 766-776 reads `link.dataset.tool` and calls `document.getElementById(toolId)`. No change to the nav handler is needed — the button is picked up automatically when `div#split-pdf` exists (added in Task 2).
  </action>
  <verify>
Open index.html in a browser and open DevTools console. Run: `typeof JSZip !== 'undefined'` — must return `true`. Check that a "Split PDF" button appears in the navbar.
  </verify>
  <done>JSZip is globally available on page load. The Split PDF nav button renders in the navbar alongside PDF Tools and Watermark Inserter.</done>
</task>

<task type="auto">
  <name>Task 2: Add Split PDF HTML section skeleton and CSS</name>
  <files>C:/Users/Admin/Roaming/pdf_merger/index.html</files>
  <action>
Make two targeted edits to index.html:

**Edit 1 — Add Split PDF tool section HTML:**
Insert the following block immediately before the footer `<div class="footer">` (which follows the closing `</div>` of the watermark section). Insert between the closing `</div>` of the watermark section and `<div class="footer">`:

```html
        <!-- SPLIT PDF SECTION -->
        <div id="split-pdf" class="tool-section">
            <h1>✂️ Split PDF</h1>
            <p class="subtitle">Extract pages from a PDF and download as a ZIP archive</p>

            <div class="privacy-badge">
                🔒 <strong>100% Private</strong> - All processing happens in your browser. No files are uploaded to any server.
            </div>

            <div class="upload-area" id="uploadAreaSplit">
                <div class="upload-icon">📁</div>
                <div class="upload-text">Click to upload or drag & drop</div>
                <div class="upload-hint">Upload a single PDF file (max 80 MB)</div>
                <input type="file" id="fileInputSplit" accept=".pdf,application/pdf" />
            </div>

            <div id="splitFileInfo" class="split-file-info" style="display:none;"></div>

            <div id="splitPageRangeGroup" class="split-range-group" style="display:none;">
                <label for="splitPageRange">Page range (e.g. 1-3, 5, 7-9) — leave blank to extract all pages individually:</label>
                <div class="split-range-row">
                    <input type="text" id="splitPageRange" class="split-range-input" placeholder="e.g. 1-3, 5, 7-9" />
                    <button class="split-apply-btn" id="splitApplyRangeBtn">Apply</button>
                </div>
                <div id="splitRangeError" class="split-range-error" style="display:none;"></div>
            </div>

            <div id="thumbnailGridSplit" class="split-thumb-grid" style="display:none;"></div>

            <div id="splitSelectionSummary" class="split-selection-summary" style="display:none;"></div>

            <div class="actions" id="splitActions" style="display:none;">
                <button class="clear-btn" id="clearBtnSplit">Clear</button>
                <button class="submit-btn" id="extractSelectedBtnSplit" disabled>Extract Selected Pages</button>
                <button class="submit-btn" id="extractAllBtnSplit">Extract Every Page</button>
            </div>

            <div class="progress-bar" id="progressBarSplit">
                <div class="progress-fill" id="progressFillSplit"></div>
            </div>

            <div class="status" id="statusSplit"></div>
        </div>
```

**Edit 2 — Add Split PDF CSS:**
Insert the following CSS rules immediately before the `@media (max-width: 768px)` block (before line 574). Place after the `.image-item .download-btn:hover` block:

```css
        /* ===== SPLIT PDF ===== */
        .split-file-info {
            background: #f0f4ff;
            border: 1px solid #c7d2fe;
            border-radius: 8px;
            padding: 12px 16px;
            margin-top: 15px;
            font-size: 14px;
            color: #374151;
        }

        .split-range-group {
            margin-top: 20px;
        }

        .split-range-group label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
        }

        .split-range-row {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .split-range-input {
            flex: 1;
            padding: 10px 14px;
            border: 2px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }

        .split-range-input:focus {
            border-color: #667eea;
        }

        .split-apply-btn {
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
            white-space: nowrap;
        }

        .split-apply-btn:hover {
            background: #5568d3;
        }

        .split-range-error {
            color: #dc2626;
            font-size: 13px;
            margin-top: 6px;
        }

        .split-thumb-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 12px;
            margin-top: 20px;
        }

        .split-thumb-card {
            border: 2px solid #d1d5db;
            border-radius: 8px;
            padding: 8px;
            text-align: center;
            background: white;
            cursor: pointer;
            transition: border-color 0.2s, box-shadow 0.2s;
            position: relative;
            user-select: none;
        }

        .split-thumb-card:hover {
            border-color: #667eea;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
        }

        .split-thumb-card.selected {
            border-color: #667eea;
            background: #f0f4ff;
        }

        .split-thumb-card img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            display: block;
            margin: 0 auto 6px;
        }

        .split-thumb-label {
            font-size: 11px;
            color: #6b7280;
            font-weight: 500;
        }

        .split-thumb-check {
            display: none;
            position: absolute;
            top: 4px;
            right: 4px;
            background: #667eea;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 11px;
            line-height: 20px;
            text-align: center;
            font-weight: 700;
        }

        .split-thumb-card.selected .split-thumb-check {
            display: block;
        }

        .split-selection-summary {
            margin-top: 12px;
            font-size: 13px;
            color: #6b7280;
        }
```
  </action>
  <verify>
Open index.html in a browser. Click the "Split PDF" nav button — the Split PDF section should appear with the upload area, and all other sections should hide. The page layout should not be broken.
  </verify>
  <done>The split-pdf section is visible when its nav button is clicked. All HTML elements (uploadAreaSplit, thumbnailGridSplit, progressBarSplit, statusSplit, etc.) exist in the DOM. CSS classes render correctly (split-thumb-grid, split-thumb-card, split-range-input visible on inspection).</done>
</task>

<task type="auto">
  <name>Task 3: Add utility functions — isEncryptedPdf, parsePageRange, extractPagesToPdf, downloadAsZip</name>
  <files>C:/Users/Admin/Roaming/pdf_merger/index.html</files>
  <action>
Insert the following JavaScript block into the main `<script>` section. Place it immediately after the shared utility functions (`hideProgress` ends around line 977, `escapeHtml` ends around line 983). Insert after the `escapeHtml` function closing brace and before the `attachPdfDragListeners` function.

Add a section comment and the four functions:

```javascript
        // ========== SPLIT PDF UTILITIES ==========

        function isEncryptedPdf(arrayBuffer) {
            // Scan first 2 KB for /Encrypt key — faster and clearer error message than catching pdf-lib load error
            // Note: wrap PDFDocument.load() in try/catch as safety net for edge cases (see splitPdf())
            const header = new TextDecoder().decode(arrayBuffer.slice(0, 2048));
            return header.includes('/Encrypt');
        }

        function parsePageRange(rangeStr, pageCount) {
            // Converts "1-3, 5, 7-9" → [0, 1, 2, 4, 6, 7, 8] (sorted 0-based indices)
            // Returns null if any token is invalid or out of bounds
            const indices = new Set();
            const parts = rangeStr.split(/[\s,]+/);

            for (const part of parts) {
                if (!part) continue;
                const match = part.match(/^(\d+)(?:-(\d+))?$/);
                if (!match) return null; // invalid token

                const start = parseInt(match[1], 10);
                const end = match[2] ? parseInt(match[2], 10) : start;

                if (start < 1 || end > pageCount || start > end) return null; // out of bounds or inverted

                for (let i = start; i <= end; i++) {
                    indices.add(i - 1); // convert to 0-based
                }
            }

            if (indices.size === 0) return null;
            return Array.from(indices).sort((a, b) => a - b);
        }

        async function extractPagesToPdf(srcDoc, indices) {
            // Copies the specified 0-based page indices from srcDoc into a new PDFDocument
            // indices: number[] — 0-based page indices from the source document
            const outDoc = await PDFDocument.create();
            const pages = await outDoc.copyPages(srcDoc, indices);
            pages.forEach(page => outDoc.addPage(page));
            return await outDoc.save(); // returns Uint8Array
        }

        async function downloadAsZip(files, zipName) {
            // files: [{name: string, data: Uint8Array}]
            // zipName: string — filename for the downloaded .zip
            // Always uses JSZip even for 1 file — avoids popup-blocker for consistency
            const zip = new JSZip();
            for (const { name, data } of files) {
                zip.file(name, data);
            }
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = zipName;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url); // prevent memory leak — matches pattern at line 1097
            document.body.removeChild(a);
        }
```
  </action>
  <verify>
Open index.html in a browser DevTools console and run each test:
1. `isEncryptedPdf(new TextEncoder().encode('/Encrypt in here').buffer)` → must return `true`
2. `isEncryptedPdf(new TextEncoder().encode('normal pdf header').buffer)` → must return `false`
3. `parsePageRange('1-3, 5', 10)` → must return `[0, 1, 2, 4]`
4. `parsePageRange('0-3', 10)` → must return `null` (0 is out of bounds)
5. `parsePageRange('', 10)` → must return `null`
6. `typeof downloadAsZip` → must return `'function'`
7. `typeof extractPagesToPdf` → must return `'function'`
  </verify>
  <done>All four utility functions are defined in global scope. isEncryptedPdf correctly detects the /Encrypt string. parsePageRange returns sorted 0-based indices for valid input and null for invalid/empty input. extractPagesToPdf and downloadAsZip are callable async functions with correct signatures.</done>
</task>

</tasks>

<verification>
After all tasks complete:
1. Open index.html in a browser — no console errors on load
2. window.JSZip is defined (typeof JSZip !== 'undefined')
3. Clicking "Split PDF" nav button shows the split-pdf section and hides other sections
4. All four utility functions are callable from DevTools console
5. parsePageRange('1-3, 5, 7-9', 15) returns [0, 1, 2, 4, 6, 7, 8]
</verification>

<success_criteria>
- JSZip 3.10.1 loads from CDN before the application script
- Split PDF nav button renders and nav switching works via existing handler
- div#split-pdf contains all required child elements (uploadAreaSplit, fileInputSplit, thumbnailGridSplit, progressBarSplit, progressFillSplit, statusSplit, splitPageRange, clearBtnSplit, extractSelectedBtnSplit, extractAllBtnSplit)
- All CSS classes defined (split-thumb-grid, split-thumb-card, split-thumb-card.selected, split-range-input)
- isEncryptedPdf, parsePageRange, extractPagesToPdf, downloadAsZip are all defined and callable
- No regressions: PDF Tools and Watermark Inserter sections still work
</success_criteria>

<output>
After completion, create `.planning/phases/01-split-pdf/01-split-pdf-01-SUMMARY.md` with:
- What was built (CDN tag, nav button, HTML structure, CSS, 4 utility functions)
- Key insertion points used (line numbers after edits)
- Any deviations from this plan
</output>
