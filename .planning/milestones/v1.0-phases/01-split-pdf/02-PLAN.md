---
phase: 01-split-pdf
plan: 02
type: execute
wave: 2
depends_on:
  - "01-PLAN"
files_modified:
  - C:/Users/Admin/Roaming/pdf_merger/index.html
autonomous: true
requirements:
  - SPLT-01
  - SPLT-02
  - SPLT-03
  - SPLT-08

must_haves:
  truths:
    - "User can click the Split PDF upload area or drag-and-drop a PDF to load it"
    - "After upload, a file info bar shows the filename and page count"
    - "After upload, a thumbnail grid renders one card per page with the page rendered as an image"
    - "Clicking a thumbnail card toggles its selected state (adds/removes 'selected' CSS class)"
    - "A progress bar is visible and advances while thumbnails are rendering"
    - "Files larger than 80 MB are rejected with an error message before any processing begins"
    - "Files between 30 MB and 80 MB show a warning but still proceed"
    - "Encrypted PDFs (containing /Encrypt in first 2 KB) are rejected with a clear error before PDFDocument.load() is called"
  artifacts:
    - path: "C:/Users/Admin/Roaming/pdf_merger/index.html"
      provides: "Upload handler, encrypted/size gate, thumbnail rendering, selection state, selection sync with page range input"
      contains: "loadSplitPdfThumbnails, renderSplitThumbnailGrid, toggleSplitPage, splitSelectedPages, splitPdfDoc"
  key_links:
    - from: "uploadAreaSplit (click + drop)"
      to: "loadSplitPdfThumbnails()"
      via: "fileInputSplit.change + drag/drop handlers"
      pattern: "loadSplitPdfThumbnails"
    - from: "loadSplitPdfThumbnails"
      to: "isEncryptedPdf(arrayBuffer)"
      via: "called before pdfjsLib.getDocument()"
      pattern: "isEncryptedPdf"
    - from: "loadSplitPdfThumbnails"
      to: "updateProgress('progressBarSplit', 'progressFillSplit')"
      via: "called per page in thumbnail loop"
      pattern: "updateProgress.*progressBarSplit"
    - from: "thumbnail card onclick"
      to: "toggleSplitPage(pageIndex)"
      via: "inline onclick attribute on card div"
      pattern: "toggleSplitPage"
    - from: "splitSelectedPages (Set)"
      to: "splitPageRange input"
      via: "updateRangeInputFromSelection() — called after each toggle"
      pattern: "updateRangeInputFromSelection"
---

<objective>
Build the upload handler, file-size/encryption gates, PDF.js thumbnail rendering pipeline, and per-page click selection with two-way sync to the range text input.

Purpose: This is the "see and select" half of the split tool. Without it the user has no way to identify which pages they want. Plan 03 depends on `splitPdfDoc`, `splitSelectedPages`, and `splitNumPages` state variables being populated here.

Output: Upload handlers (click + drag/drop), `loadSplitPdfThumbnails()` function, `renderSplitThumbnailGrid()` function, `toggleSplitPage()` function, `updateRangeInputFromSelection()` function, `clearSplitTool()` function, and wiring of the Clear button.
</objective>

<execution_context>
@C:/Users/Admin/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Admin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@C:/Users/Admin/Roaming/pdf_merger/.planning/ROADMAP.md
@C:/Users/Admin/Roaming/pdf_merger/.planning/STATE.md
@C:/Users/Admin/Roaming/pdf_merger/.planning/phases/01-split-pdf/01-RESEARCH.md
@C:/Users/Admin/Roaming/pdf_merger/.planning/phases/01-split-pdf/01-split-pdf-01-SUMMARY.md

<interfaces>
<!-- Utility functions added by Plan 01 — already in global scope. Use these directly. -->

<!-- isEncryptedPdf(arrayBuffer: ArrayBuffer): boolean -->
<!--   Returns true if arrayBuffer's first 2048 bytes contain the string '/Encrypt' -->

<!-- parsePageRange(rangeStr: string, pageCount: number): number[] | null -->
<!--   Returns sorted 0-based indices array, or null for invalid/empty input -->

<!-- extractPagesToPdf(srcDoc: PDFDocument, indices: number[]): Promise<Uint8Array> -->
<!--   Creates a new PDFDocument with the specified pages from srcDoc -->

<!-- downloadAsZip(files: [{name: string, data: Uint8Array}], zipName: string): Promise<void> -->
<!--   Bundles files into a ZIP and triggers a single browser download -->

<!-- Shared utilities (already in global scope from original codebase): -->
<!-- updateProgress(percent: number, barId: string, fillId: string): void -->
<!-- hideProgress(barId: string, fillId: string): void -->
<!-- showStatus(message: string, type: string, statusId: string): void -->
<!-- hideStatus(statusId: string): void -->
<!-- escapeHtml(text: string): string -->

<!-- Split section HTML IDs added by Plan 01 (all exist in DOM): -->
<!-- uploadAreaSplit, fileInputSplit, splitFileInfo, splitPageRangeGroup -->
<!-- splitPageRange (text input), splitApplyRangeBtn, splitRangeError -->
<!-- thumbnailGridSplit, splitSelectionSummary -->
<!-- splitActions, clearBtnSplit, extractSelectedBtnSplit, extractAllBtnSplit -->
<!-- progressBarSplit, progressFillSplit, statusSplit -->

<!-- PDF.js usage pattern from existing codebase (lines 1123-1188): -->
<!-- const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise; -->
<!-- const page = await pdf.getPage(pageNum);  // 1-based -->
<!-- const baseViewport = page.getViewport({ scale: 1 }); -->
<!-- const scale = THUMB_WIDTH / baseViewport.width; -->
<!-- const viewport = page.getViewport({ scale }); -->
<!-- const canvas = document.createElement('canvas'); -->
<!-- canvas.width = viewport.width; canvas.height = viewport.height; -->
<!-- await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise; -->
<!-- Use canvas.toDataURL('image/jpeg', 0.85) to get img src — do NOT insert canvas via innerHTML -->

<!-- IMPORTANT: window.toggleSplitPage must be exposed globally — used in onclick= attribute on cards -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Split PDF state variables, upload handlers, and encryption/size gates</name>
  <files>C:/Users/Admin/Roaming/pdf_merger/index.html</files>
  <action>
Insert the following JavaScript block into the main `<script>` section. Place it immediately after the Split PDF utilities section comment block added by Plan 01 (after the `downloadAsZip` function closing brace). Add a new section comment followed by the state declarations and upload handler wiring:

```javascript
        // ========== SPLIT PDF SECTION ==========

        // --- State ---
        let splitPdfFile = null;       // The File object from the upload input
        let splitPdfDoc = null;        // PDFDocument (pdf-lib) loaded from splitPdfFile — used by splitPdf()
        let splitNumPages = 0;         // Total page count of the loaded PDF
        let splitSelectedPages = new Set(); // Set of 0-based page indices selected for extraction
        let splitThumbnails = [];      // [{pageNum, dataUrl, width, height}] — rendered thumbnails

        // --- DOM references ---
        const uploadAreaSplit = document.getElementById('uploadAreaSplit');
        const fileInputSplit = document.getElementById('fileInputSplit');
        const splitFileInfoEl = document.getElementById('splitFileInfo');
        const splitPageRangeGroup = document.getElementById('splitPageRangeGroup');
        const splitPageRangeInput = document.getElementById('splitPageRange');
        const splitApplyRangeBtn = document.getElementById('splitApplyRangeBtn');
        const splitRangeError = document.getElementById('splitRangeError');
        const thumbnailGridSplit = document.getElementById('thumbnailGridSplit');
        const splitSelectionSummary = document.getElementById('splitSelectionSummary');
        const splitActions = document.getElementById('splitActions');
        const clearBtnSplit = document.getElementById('clearBtnSplit');
        const extractSelectedBtnSplit = document.getElementById('extractSelectedBtnSplit');
        const extractAllBtnSplit = document.getElementById('extractAllBtnSplit');

        // --- Upload area handlers ---
        uploadAreaSplit.addEventListener('click', () => fileInputSplit.click());

        uploadAreaSplit.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadAreaSplit.classList.add('dragover');
        });

        uploadAreaSplit.addEventListener('dragleave', () => {
            uploadAreaSplit.classList.remove('dragover');
        });

        uploadAreaSplit.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadAreaSplit.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files).filter(f =>
                f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
            );
            if (files.length === 0) {
                showStatus('Please drop a PDF file.', 'error', 'statusSplit');
                return;
            }
            splitPdfFile = files[0];
            loadSplitPdfThumbnails();
        });

        fileInputSplit.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                splitPdfFile = e.target.files[0];
                loadSplitPdfThumbnails();
            }
        });

        // --- Clear button ---
        clearBtnSplit.addEventListener('click', clearSplitTool);

        function clearSplitTool() {
            splitPdfFile = null;
            splitPdfDoc = null;
            splitNumPages = 0;
            splitSelectedPages = new Set();
            splitThumbnails = [];
            fileInputSplit.value = '';
            splitFileInfoEl.style.display = 'none';
            splitPageRangeGroup.style.display = 'none';
            splitPageRangeInput.value = '';
            splitRangeError.style.display = 'none';
            thumbnailGridSplit.style.display = 'none';
            thumbnailGridSplit.innerHTML = '';
            splitSelectionSummary.style.display = 'none';
            splitActions.style.display = 'none';
            extractSelectedBtnSplit.disabled = true;
            hideProgress('progressBarSplit', 'progressFillSplit');
            hideStatus('statusSplit');
        }
```
  </action>
  <verify>
Open index.html in browser. Navigate to Split PDF section. Verify in DevTools console:
1. `typeof splitPdfFile` → `'object'` (null is object type — correct)
2. `splitSelectedPages instanceof Set` → `true`
3. `document.getElementById('uploadAreaSplit') !== null` → `true`
4. Clicking the upload area opens a file dialog. Dragging a non-PDF file onto the upload area shows an error in statusSplit.
  </verify>
  <done>State variables are initialized. Upload area responds to click (opens file dialog) and drag/drop (rejects non-PDFs with error). Clear button is wired to clearSplitTool(). DOM references all resolve without null.</done>
</task>

<task type="auto">
  <name>Task 2: Add thumbnail rendering pipeline and per-page click selection</name>
  <files>C:/Users/Admin/Roaming/pdf_merger/index.html</files>
  <action>
Insert the following JavaScript functions immediately after the `clearSplitTool` function added in Task 1:

```javascript
        async function loadSplitPdfThumbnails() {
            const THUMB_WIDTH = 120; // px — target thumbnail width; keep small for performance

            // Reset prior state
            clearSplitTool();
            splitPdfFile = fileInputSplit.files[0] || splitPdfFile; // reattach after clear resets

            if (!splitPdfFile) return;

            // File size gate — must check before reading (SPLT concern from STATE.md)
            const fileSizeMB = splitPdfFile.size / (1024 * 1024);
            if (fileSizeMB > 80) {
                showStatus('❌ File too large (max 80 MB). Please use a smaller PDF.', 'error', 'statusSplit');
                splitPdfFile = null;
                return;
            }

            showStatus('<div class="spinner"></div> Loading PDF...', 'loading', 'statusSplit');
            updateProgress(0, 'progressBarSplit', 'progressFillSplit');

            try {
                const arrayBuffer = await splitPdfFile.arrayBuffer();

                // SPLT-07: Encrypted PDF detection — before PDFDocument.load()
                if (isEncryptedPdf(arrayBuffer)) {
                    hideProgress('progressBarSplit', 'progressFillSplit');
                    showStatus('❌ This PDF is encrypted and cannot be split. Please use an unencrypted PDF.', 'error', 'statusSplit');
                    splitPdfFile = null;
                    return;
                }

                if (fileSizeMB > 30) {
                    showStatus('⚠️ Large file — processing may take a moment.', 'loading', 'statusSplit');
                }

                // Load with pdf-lib for later use in splitPdf()
                // Safety net: catch load error in case isEncryptedPdf missed an edge case
                try {
                    splitPdfDoc = await PDFDocument.load(arrayBuffer);
                } catch (loadErr) {
                    hideProgress('progressBarSplit', 'progressFillSplit');
                    showStatus('❌ Could not load this PDF. It may be encrypted or corrupted.', 'error', 'statusSplit');
                    splitPdfFile = null;
                    return;
                }

                // Load with PDF.js for thumbnail rendering
                const pdfJs = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                splitNumPages = pdfJs.numPages;

                // Show file info bar
                splitFileInfoEl.textContent = `${escapeHtml(splitPdfFile.name)} — ${splitNumPages} page${splitNumPages !== 1 ? 's' : ''} (${fileSizeMB.toFixed(1)} MB)`;
                splitFileInfoEl.style.display = 'block';

                showStatus('<div class="spinner"></div> Rendering thumbnails...', 'loading', 'statusSplit');
                splitThumbnails = [];

                for (let pageNum = 1; pageNum <= splitNumPages; pageNum++) {
                    const page = await pdfJs.getPage(pageNum);
                    const baseViewport = page.getViewport({ scale: 1 });
                    const scale = THUMB_WIDTH / baseViewport.width;
                    const viewport = page.getViewport({ scale });

                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

                    // Use toDataURL for img src — cannot pass canvas through innerHTML
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    splitThumbnails.push({ pageNum, dataUrl, width: viewport.width, height: viewport.height });

                    // SPLT-08: Progress — first 50% is thumbnail rendering
                    updateProgress((pageNum / splitNumPages) * 50, 'progressBarSplit', 'progressFillSplit');
                }

                renderSplitThumbnailGrid();
                splitPageRangeGroup.style.display = 'block';
                splitActions.style.display = 'flex';
                hideProgress('progressBarSplit', 'progressFillSplit');
                hideStatus('statusSplit');

            } catch (error) {
                hideProgress('progressBarSplit', 'progressFillSplit');
                showStatus(`❌ Error loading PDF: ${error.message}`, 'error', 'statusSplit');
                console.error('Split PDF load error:', error);
                splitPdfFile = null;
            }
        }

        function renderSplitThumbnailGrid() {
            // Rebuilds the thumbnail grid HTML reflecting current splitSelectedPages state
            thumbnailGridSplit.innerHTML = splitThumbnails.map(thumb => {
                const isSelected = splitSelectedPages.has(thumb.pageNum - 1);
                return `<div class="split-thumb-card ${isSelected ? 'selected' : ''}"
                             data-page-index="${thumb.pageNum - 1}"
                             onclick="toggleSplitPage(${thumb.pageNum - 1})">
                    <img src="${thumb.dataUrl}" width="${thumb.width}" height="${thumb.height}" alt="Page ${thumb.pageNum}" />
                    <div class="split-thumb-label">Page ${thumb.pageNum}</div>
                    <div class="split-thumb-check">✓</div>
                </div>`;
            }).join('');
            thumbnailGridSplit.style.display = 'grid';
            updateSplitSelectionSummary();
        }

        function toggleSplitPage(pageIndex) {
            // pageIndex: 0-based
            if (splitSelectedPages.has(pageIndex)) {
                splitSelectedPages.delete(pageIndex);
            } else {
                splitSelectedPages.add(pageIndex);
            }
            // Sync: re-render grid to show new selection state
            renderSplitThumbnailGrid();
            // Sync: update range text input to reflect current selection
            updateRangeInputFromSelection();
            // Enable/disable extract selected button
            extractSelectedBtnSplit.disabled = splitSelectedPages.size === 0;
        }

        function updateRangeInputFromSelection() {
            // Converts the splitSelectedPages Set into a human-readable range string for the text input
            // e.g. {0, 1, 2, 4} → "1-3, 5"
            if (splitSelectedPages.size === 0) {
                splitPageRangeInput.value = '';
                return;
            }
            const sorted = Array.from(splitSelectedPages).sort((a, b) => a - b);
            const parts = [];
            let rangeStart = sorted[0];
            let rangeEnd = sorted[0];

            for (let i = 1; i < sorted.length; i++) {
                if (sorted[i] === rangeEnd + 1) {
                    rangeEnd = sorted[i];
                } else {
                    parts.push(rangeStart === rangeEnd ? `${rangeStart + 1}` : `${rangeStart + 1}-${rangeEnd + 1}`);
                    rangeStart = sorted[i];
                    rangeEnd = sorted[i];
                }
            }
            parts.push(rangeStart === rangeEnd ? `${rangeStart + 1}` : `${rangeStart + 1}-${rangeEnd + 1}`);
            splitPageRangeInput.value = parts.join(', ');
        }

        function updateSplitSelectionSummary() {
            if (splitSelectedPages.size === 0) {
                splitSelectionSummary.textContent = 'No pages selected — "Extract Every Page" will split all pages individually.';
            } else {
                splitSelectionSummary.textContent = `${splitSelectedPages.size} page${splitSelectedPages.size !== 1 ? 's' : ''} selected.`;
            }
            splitSelectionSummary.style.display = 'block';
        }

        // Expose toggleSplitPage globally — called from onclick= attribute in thumbnail card HTML
        window.toggleSplitPage = toggleSplitPage;
```
  </action>
  <verify>
Open index.html in browser. Navigate to Split PDF. Upload a small unencrypted PDF (2-3 pages):
1. Progress bar should appear while thumbnails render
2. Thumbnail grid should appear with one card per page
3. Click a thumbnail — it should gain a blue border and show a checkmark (selected class)
4. Click the same thumbnail again — checkmark should disappear (deselected)
5. The page range input should update to reflect the selection (e.g. "1" when page 1 is selected)
6. DevTools console: `splitNumPages` should equal the actual page count of the uploaded PDF
7. Try dragging a PDF over the upload area — thumbnail grid should render
8. Try uploading an already-encrypted PDF (if available) — should show error message, no crash
  </verify>
  <done>After uploading a valid PDF: file info bar shows filename and page count, thumbnail grid renders with correct number of cards, thumbnails are visual (page content visible), clicking cards toggles selected state with visual feedback, page range input updates to reflect selection, progress bar advances during loading and hides when done.</done>
</task>

</tasks>

<verification>
After all tasks complete, test the full upload-to-selection flow:
1. Open index.html → navigate to Split PDF
2. Upload a 3-page unencrypted PDF → file info bar appears, 3 thumbnails render, progress bar hides
3. Click thumbnail 1 → card gets selected style, range input shows "1"
4. Click thumbnail 3 → range input shows "1, 3", selection summary shows "2 pages selected"
5. Click thumbnail 1 again → card deselects, range input shows "3"
6. Click Clear → all state resets, thumbnails disappear, upload area is visible again
7. Upload a >80 MB file (or mock: check fileSizeMB > 80 branch in DevTools) → error shown, no thumbnails
8. Existing PDF Tools and Watermark sections still work correctly (no regressions)
</verification>

<success_criteria>
- Upload via click and drag-and-drop both work for PDF files
- Non-PDF drops are rejected with an error message
- Files >80 MB rejected before processing; 30-80 MB shows warning but proceeds
- Encrypted PDFs (pre-check + PDFDocument.load safety net) rejected with clear error
- PDF.js renders one thumbnail per page using img[src=dataUrl] pattern (not canvas in innerHTML)
- Progress bar (progressBarSplit/progressFillSplit) advances per page during thumbnail render
- Clicking thumbnail cards toggles splitSelectedPages Set and re-renders grid with correct visual state
- Range text input reflects current selection in human-readable range format
- splitPdfDoc (pdf-lib PDFDocument) is populated and ready for Plan 03's splitPdf() function
- Clear button resets all state and hides all UI except the upload area
- window.toggleSplitPage is exposed globally for onclick handlers
</success_criteria>

<output>
After completion, create `.planning/phases/01-split-pdf/01-split-pdf-02-SUMMARY.md` with:
- What was built
- State variables and their types
- Functions added and their signatures
- Any deviations from this plan
- Approximate line numbers of inserted code blocks
</output>
