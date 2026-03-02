# Phase 1: Split PDF - Research

**Researched:** 2026-03-02
**Domain:** Client-side PDF splitting, page selection UI, multi-file ZIP download (browser-native)
**Confidence:** HIGH — all core APIs are verified against official documentation

---

## Summary

Phase 1 adds a Split PDF tool to the existing single-file `index.html` SPA. The technical domain is straightforward: pdf-lib's `copyPages()` extracts pages into new documents, PDF.js renders per-page canvas thumbnails for the selection UI, and JSZip bundles all output files into a single ZIP download that bypasses browser popup blockers. All three libraries are either already loaded (pdf-lib 1.17.1, pdfjs-dist 3.11.174) or require a single new CDN script tag (JSZip 3.10.1).

The largest implementation decision is the page-selection UI. The requirements call for both a thumbnail grid (SPLT-02, SPLT-03) and a page range text input (SPLT-04), meaning both must be built. The thumbnail grid uses PDF.js to render each page to a small canvas at a calculated scale, then wraps each canvas in a selectable card. The range input parses a string like "1-3, 5, 7-9" into a sorted, deduplicated array of 0-based page indices. Both selection methods must stay in sync.

The two critical pitfalls for this phase are: (1) encrypted PDFs silently producing blank pages when loaded with `ignoreEncryption: true` — the fix is a pre-load check scanning the first 2 KB of the file for the string "Encrypt"; and (2) multiple sequential `saveAs()` calls being blocked by browser popup blockers — the fix is mandatory JSZip bundling even when only one output file is produced, keeping the download path consistent. A file-size gate (warn at 30 MB, hard block at 80 MB) prevents tab OOM crashes for large inputs.

**Primary recommendation:** Implement the Split PDF tool as a new standalone `<section id="split-pdf">` with its own nav button and namespaced state, following the established section-per-tool pattern. Load JSZip via CDN alongside existing script tags. Use `copyPages()` for extraction, PDF.js for thumbnails, and `zip.generateAsync({type:'blob'})` + `URL.createObjectURL` for download.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SPLT-01 | User can upload one or more PDF files to the Split tool via click or drag-and-drop | Standard upload area pattern already established in codebase — copy upload handler from PDF Tools section, adapt for single-file constraint |
| SPLT-02 | User can see a thumbnail grid of all pages in the uploaded PDF | PDF.js `getPage()` + `getViewport({scale})` + canvas render at thumbnail scale; verified working pattern in existing `convertPdfToImages()` |
| SPLT-03 | User can click individual page thumbnails to select/deselect them for extraction | CSS toggle on thumbnail cards + selectedPages Set state; no library needed — pure DOM event handling |
| SPLT-04 | User can type a page range string (e.g. "1-3, 5, 7-9") to select pages | Custom `parsePageRange(str, pageCount)` function; splits on comma/space, expands ranges, validates bounds, returns sorted unique 0-based index array |
| SPLT-05 | User can click "Extract Every Page" to split all pages into individual files in one action | Calls `splitAndDownload()` with full `getPageIndices()` array; mode=individual; ZIP download |
| SPLT-06 | User can download all split files as a single ZIP archive | JSZip 3.10.1 `zip.file(name, Uint8Array)` per output PDF, then `zip.generateAsync({type:'blob'})` + `URL.createObjectURL` + `a.click()` |
| SPLT-07 | App detects encrypted PDFs and shows a clear error before attempting to process | Pre-load scan: `new TextDecoder().decode(arrayBuffer.slice(0, 2048)).includes('/Encrypt')` — reject before calling `PDFDocument.load()` |
| SPLT-08 | App shows progress indicator during split and ZIP generation | `updateProgress(percent, 'progressBarSplit', 'progressFillSplit')` already exists as a shared utility; call per page during extraction and once for ZIP generation |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdf-lib | 1.17.1 (already loaded) | `copyPages(srcDoc, indices[])` extracts pages into a new PDFDocument; `save()` serializes to Uint8Array | Already loaded; native page copy API; no alternative needed |
| pdfjs-dist | 3.11.174 (already loaded) | Renders each PDF page to canvas for thumbnail grid display | Already loaded; existing `convertPdfToImages()` demonstrates the exact pattern |
| JSZip | 3.10.1 (new CDN tag) | Bundles multiple PDF Uint8Arrays into one ZIP blob for single-click download | Prevents popup blocker from blocking multiple sequential downloads |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Browser Blob API | Built-in | Convert Uint8Array to downloadable object URL | Used for the final ZIP download via `URL.createObjectURL` |
| Browser TextDecoder | Built-in | Decode first 2 KB of file bytes to detect `/Encrypt` string | Used in encrypted PDF pre-check before `PDFDocument.load()` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSZip 3.10.1 | FileSaver.js + multiple individual downloads | FileSaver still triggers one download dialog per file — blocks for 20-page splits. JSZip is the correct solution. |
| JSZip 3.10.1 | Native `<a download>` per file | Same popup-blocker problem as FileSaver for multi-file. Only works for a single output. |
| PDF.js thumbnail render | pdf-lib page introspection | pdf-lib does not render to canvas; it manipulates PDF structure only. PDF.js is required for visual thumbnails. |

**CDN tag to add (one line):**
```html
<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
```

---

## Architecture Patterns

### Fit Into Existing Codebase

The app is a single `index.html` with inline CSS and JS. The established section-per-tool pattern requires:

1. A new nav button: `<button class="nav-link" data-tool="split-pdf">Split PDF</button>` — the existing nav handler picks it up automatically via `data-tool` attribute matching (lines 766-776 of index.html)
2. A new `<div id="split-pdf" class="tool-section">` — hidden by default via `.tool-section { display: none }` CSS
3. Namespaced JS state variables (e.g., `splitPdfFile`, `splitSelectedPages`, `splitThumbnails`)
4. Namespaced DOM IDs (`uploadAreaSplit`, `fileInputSplit`, `fileListSplit`, `statusSplit`, `progressBarSplit`, `progressFillSplit`, `thumbnailGridSplit`)
5. New processing function `splitPdf()` called from a submit button click handler
6. New CSS appended at the end of the existing `<style>` block

No modifications to existing tool sections, nav handler, or shared utilities are needed.

### Pattern 1: Upload Handler (copy from existing)

**What:** Click-to-open + drag-and-drop file input, validates PDF type, enforces single-file constraint for split tool
**When to use:** Every new tool section needs its own upload handler

```javascript
// Source: Existing index.html lines 828-869 — adapted for split tool
const uploadAreaSplit = document.getElementById('uploadAreaSplit');
const fileInputSplit = document.getElementById('fileInputSplit');
let splitPdfFile = null;

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
        showStatus('Please drop a PDF file', 'error', 'statusSplit');
        return;
    }
    splitPdfFile = files[0]; // split tool takes single file
    loadSplitPdfThumbnails();
});

fileInputSplit.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        splitPdfFile = e.target.files[0];
        loadSplitPdfThumbnails();
    }
});
```

### Pattern 2: PDF.js Thumbnail Rendering

**What:** Load the PDF with PDF.js, render each page to a small canvas at a calculated scale, display in a grid
**When to use:** SPLT-02 — thumbnail grid display after file upload

```javascript
// Source: Official PDF.js docs + existing convertPdfToImages() at index.html line 1123
// Verified: PDF.js getViewport scale pattern confirmed HIGH confidence

async function loadSplitPdfThumbnails() {
    const THUMB_WIDTH = 120; // px — target thumbnail width
    const arrayBuffer = await splitPdfFile.arrayBuffer();

    // Encrypted PDF check — before calling PDFDocument.load()
    const header = new TextDecoder().decode(arrayBuffer.slice(0, 2048));
    if (header.includes('/Encrypt')) {
        showStatus('This PDF is encrypted and cannot be split. Please use an unencrypted PDF.', 'error', 'statusSplit');
        return;
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const thumbnails = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = THUMB_WIDTH / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

        thumbnails.push({ pageNum, canvas, width: viewport.width, height: viewport.height });
        updateProgress((pageNum / numPages) * 50, 'progressBarSplit', 'progressFillSplit');
    }

    renderThumbnailGrid(thumbnails);
}
```

### Pattern 3: Page Range String Parser

**What:** Converts user input like "1-3, 5, 7-9" into sorted 0-based page indices
**When to use:** SPLT-04 — page range text input

```javascript
// Source: Standard algorithm — no library needed
// Handles: single numbers, ranges (N-M), comma/space separation, bounds validation, deduplication

function parsePageRange(rangeStr, pageCount) {
    const indices = new Set();
    const parts = rangeStr.split(/[\s,]+/);

    for (const part of parts) {
        if (!part) continue;
        const match = part.match(/^(\d+)(?:-(\d+))?$/);
        if (!match) return null; // invalid token — return null to signal parse error

        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : start;

        if (start < 1 || end > pageCount || start > end) return null; // out of bounds

        for (let i = start; i <= end; i++) {
            indices.add(i - 1); // convert to 0-based
        }
    }

    return Array.from(indices).sort((a, b) => a - b);
}
```

### Pattern 4: pdf-lib Page Extraction

**What:** For each split output (individual page or range group), create a new PDFDocument, copy the target pages, save to Uint8Array
**When to use:** SPLT-05/SPLT-06 — the actual split operation

```javascript
// Source: pdf-lib official docs https://pdf-lib.js.org/docs/api/classes/pdfdocument
// copyPages signature: copyPages(srcDoc: PDFDocument, indices: number[]): Promise<PDFPage[]>
// getPageIndices signature: getPageIndices(): number[]

async function extractPagesToPdf(srcDoc, indices) {
    const outDoc = await PDFDocument.create();
    const pages = await outDoc.copyPages(srcDoc, indices);
    pages.forEach(page => outDoc.addPage(page));
    return await outDoc.save(); // returns Uint8Array
}
```

### Pattern 5: JSZip Multi-File Download

**What:** Collect all output Uint8Arrays into a JSZip instance, generate as blob, trigger single download
**When to use:** SPLT-06 — always, even for single-output splits (keeps download path consistent, avoids popup-blocker issues)

```javascript
// Source: JSZip official docs https://stuk.github.io/jszip/documentation/howto/write_zip.html
// Verified: generateAsync({type:'blob'}) + URL.createObjectURL pattern confirmed HIGH confidence

async function downloadAsZip(files) {
    // files = [{ name: 'page-1.pdf', data: Uint8Array }, ...]
    const zip = new JSZip();

    for (const { name, data } of files) {
        zip.file(name, data);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'split-pages.zip';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}
```

### Pattern 6: Encrypted PDF Detection

**What:** Scan the first 2 KB of the raw ArrayBuffer for the `/Encrypt` string before calling `PDFDocument.load()`
**When to use:** SPLT-07 — run immediately after the user uploads a file, before any processing

```javascript
// Source: GitHub issue #61 Hopding/pdf-lib — community-verified approach
// Confidence: MEDIUM (confirmed working in community, no official API for this)

function isEncryptedPdf(arrayBuffer) {
    const header = new TextDecoder().decode(arrayBuffer.slice(0, 2048));
    return header.includes('/Encrypt');
}
```

**Note:** This string-scan approach has a false-positive risk if a PDF has a comment or stream that contains the literal text "/Encrypt" without being an actual encryption dictionary. This is extremely unlikely in practice. The alternative is catching the exception thrown by `PDFDocument.load()` when it encounters an encrypted PDF — but the error message from pdf-lib is not user-friendly. The recommended approach is: string scan first for fast/clear user message, then wrap `PDFDocument.load()` in try/catch as a safety net for missed encrypted PDFs.

### Anti-Patterns to Avoid

- **Using `ignoreEncryption: true`:** Suppresses the load error but produces blank white pages in the output with no JavaScript exception. The user sees a silent failure. Never use this option.
- **Multiple sequential `a.click()` downloads:** Browsers block rapid sequential download dialogs as popup spam. Always use JSZip, even when the user splits to a single output file.
- **Holding all output Uint8Arrays in memory simultaneously:** For a 50-page PDF split to 50 individual files, this multiplies memory usage 50x. Add each output to the JSZip instance immediately and release the reference. Process pages sequentially, not in parallel.
- **Using `pdf.getPageIndices()` on a new empty document:** Call `getPageIndices()` on the source document (`srcPdfDoc.getPageIndices()`), not on a newly created empty one.
- **Not revoking the object URL:** Always call `URL.revokeObjectURL(url)` after the download is triggered to prevent memory leaks (existing pattern in codebase at line 1097).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ZIP archive creation | Custom ZIP byte writer | JSZip 3.10.1 | ZIP format has DEFLATE compression, CRC32 checksums, central directory — dozens of edge cases |
| PDF page copying with resources | Manual PDF stream copying | pdf-lib `copyPages()` | Pages reference shared resources (fonts, images, ICC profiles) that must also be copied — `copyPages()` handles this automatically |
| PDF.js canvas scaling | Manual pixel math | `page.getViewport({scale: targetWidth / baseViewport.width})` | PDF pages have non-uniform dimensions; PDF.js viewport API handles aspect ratio and rotation correctly |
| Encrypted PDF detection | Parse PDF trailer dictionary | String scan of first 2 KB for `/Encrypt` | Full trailer parse requires implementing the PDF cross-reference table reader — unnecessary complexity for a binary check |

**Key insight:** The three operations that appear simple (zip, copy, scale) each hide non-trivial PDF or archive format complexity. All three have well-tested library solutions already in use or one CDN tag away.

---

## Common Pitfalls

### Pitfall 1: Encrypted PDF Silent Blank Output

**What goes wrong:** Calling `PDFDocument.load(arrayBuffer)` on an encrypted PDF without `ignoreEncryption: true` throws an error. If the developer adds `ignoreEncryption: true` to silence the error, the load succeeds but all copied pages are blank white — no user-visible error, no JavaScript exception thrown.

**Why it happens:** pdf-lib can parse the PDF structure of encrypted documents (finding page objects) but cannot decrypt the content streams. Pages render as empty because their content is ciphertext.

**How to avoid:** Scan `arrayBuffer.slice(0, 2048)` for the `/Encrypt` string before calling `PDFDocument.load()`. Show a clear error to the user. Never add `ignoreEncryption: true`.

**Warning signs:** Output PDF opens but shows only white pages. File size is unexpectedly small (no content streams).

### Pitfall 2: Popup Blocker Kills Multi-File Downloads

**What goes wrong:** Splitting a 20-page PDF and calling `saveAs()` or `a.click()` 20 times in a loop triggers the browser popup blocker after the first 1-2 downloads. The user gets a blocked-downloads notification and must manually approve each remaining file.

**Why it happens:** Modern browsers treat rapid sequential programmatic download triggers as popup spam.

**How to avoid:** Always use JSZip to bundle all output files into a single ZIP blob. One `a.click()` = one ZIP. This is non-negotiable for any split operation that can produce more than one output file.

**Warning signs:** First download succeeds, remaining downloads are silently blocked. Browser shows a "blocked popup" notification.

### Pitfall 3: Tab OOM Crash on Large PDFs

**What goes wrong:** A large PDF (e.g., 80+ MB) loaded into pdf-lib holds the source ArrayBuffer in memory. During split, the app simultaneously holds: source ArrayBuffer, source PDFDocument parsed structure, each output PDFDocument, each serialized Uint8Array, and the JSZip buffer. Memory multiplies rapidly and the browser tab crashes.

**Why it happens:** pdf-lib loads the entire document into memory. Sequential operations don't automatically free prior allocations.

**How to avoid:**
1. Add a pre-upload size check: warn at 30 MB, hard block at 80 MB with a clear error message
2. Process split outputs sequentially (one at a time), adding each to JSZip and releasing the Uint8Array reference before processing the next
3. Load the source ArrayBuffer once and reuse it for all extraction operations

**Warning signs:** Tab crashes or becomes unresponsive on PDFs over 50 MB.

### Pitfall 4: Thumbnail Grid Performance on Large PDFs

**What goes wrong:** Rendering 100+ thumbnails sequentially blocks the main thread for 10-30 seconds, freezing the UI with no feedback.

**Why it happens:** PDF.js rendering is async but still CPU-intensive. Rendering 100 pages back-to-back starves the UI thread.

**How to avoid:**
- Update progress bar after each page thumbnail (`updateProgress`)
- Use `await` in the thumbnail loop (already async) so the browser can repaint between pages
- Consider rendering thumbnails in batches with `await new Promise(resolve => setTimeout(resolve, 0))` between batches to yield to the event loop
- Limit THUMB_WIDTH to 120px (smaller canvases = faster render, less memory)

**Warning signs:** UI freezes after upload. Progress bar doesn't update until all thumbnails complete.

### Pitfall 5: Page Range Sync Between Thumbnail Grid and Text Input

**What goes wrong:** User selects pages via thumbnail clicks, then types in the range input — the two inputs become out of sync. Or vice versa.

**Why it happens:** Both inputs write to the same `splitSelectedPages` Set but neither automatically reads from the other.

**How to avoid:** Treat the thumbnail grid selection as the source of truth for the `splitSelectedPages` Set. When the user types in the range input and hits Enter/Apply, parse the range, update `splitSelectedPages`, and re-render the thumbnail grid to reflect the new selection state (add/remove `selected` CSS class on each thumbnail card). The flow is: text input → parse → update Set → re-render grid. Grid click → toggle Set entry → update text input display (show as comma-separated range summary, not individual numbers).

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Full Split Orchestration Function

```javascript
// Pattern combining all verified sub-patterns
async function splitPdf() {
    if (!splitPdfFile) return;

    const startTime = Date.now();
    submitBtnSplit.disabled = true;
    clearBtnSplit.disabled = true;
    showStatus('<div class="spinner"></div> Splitting PDF...', 'loading', 'statusSplit');

    try {
        const arrayBuffer = await splitPdfFile.arrayBuffer();

        // SPLT-07: Encrypted PDF detection
        if (isEncryptedPdf(arrayBuffer)) {
            showStatus('❌ This PDF is encrypted. Please use an unencrypted PDF.', 'error', 'statusSplit');
            return;
        }

        // File size gate (from STATE.md concerns)
        const fileSizeMB = splitPdfFile.size / 1024 / 1024;
        if (fileSizeMB > 80) {
            showStatus('❌ File too large (max 80 MB). Use a smaller PDF.', 'error', 'statusSplit');
            return;
        }
        if (fileSizeMB > 30) {
            showStatus('⚠️ Large file detected. Processing may be slow.', 'warning', 'statusSplit');
        }

        // Source: pdf-lib docs — load once, reuse for all extractions
        const srcDoc = await PDFDocument.load(arrayBuffer);
        const totalPages = srcDoc.getPageCount();
        const pagesToExtract = splitSelectedPages.size > 0
            ? Array.from(splitSelectedPages).sort((a, b) => a - b)
            : srcDoc.getPageIndices(); // "Extract Every Page" mode

        const zip = new JSZip();
        const baseName = splitPdfFile.name.replace(/\.pdf$/i, '');

        for (let i = 0; i < pagesToExtract.length; i++) {
            const pageIndex = pagesToExtract[i];
            const outBytes = await extractPagesToPdf(srcDoc, [pageIndex]);
            zip.file(`${baseName}-page-${pageIndex + 1}.pdf`, outBytes);

            const progress = 50 + (i + 1) / pagesToExtract.length * 45;
            updateProgress(progress, 'progressBarSplit', 'progressFillSplit');
        }

        showStatus('<div class="spinner"></div> Creating ZIP...', 'loading', 'statusSplit');
        updateProgress(96, 'progressBarSplit', 'progressFillSplit');

        const blob = await zip.generateAsync({ type: 'blob' });
        updateProgress(100, 'progressBarSplit', 'progressFillSplit');

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}-split.zip`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        showStatus(`✅ Split ${pagesToExtract.length} page(s) and downloaded as ZIP in ${elapsed}s`, 'success', 'statusSplit');
        setTimeout(() => hideProgress('progressBarSplit', 'progressFillSplit'), 1000);

    } catch (error) {
        hideProgress('progressBarSplit', 'progressFillSplit');
        showStatus(`❌ Error: ${error.message}`, 'error', 'statusSplit');
        console.error('Split error:', error);
    } finally {
        submitBtnSplit.disabled = false;
        clearBtnSplit.disabled = false;
    }
}
```

### Thumbnail Card HTML Template

```javascript
// Generates selectable thumbnail card for the grid
// Source: Existing codebase pattern (image-item CSS class) + new selected state
function renderThumbnailCard(thumb, isSelected) {
    return `
        <div class="split-thumb-card ${isSelected ? 'selected' : ''}"
             data-page-index="${thumb.pageNum - 1}"
             onclick="toggleSplitPage(${thumb.pageNum - 1})">
            <canvas width="${thumb.canvas.width}" height="${thumb.canvas.height}"></canvas>
            <div class="split-thumb-label">Page ${thumb.pageNum}</div>
            <div class="split-thumb-check">✓</div>
        </div>
    `;
    // Note: canvas content must be drawn after innerHTML insertion via a second pass
    // (innerHTML cannot preserve canvas pixel data — draw to canvas after appending to DOM)
}
```

**Important canvas-in-innerHTML note:** Canvas elements created via `canvas.toDataURL()` and embedded as `<img src="dataUrl">` is the correct approach for rendering thumbnails inside innerHTML strings. Do not try to pass a canvas element through innerHTML — use `canvas.toDataURL('image/jpeg', 0.85)` to get a data URL and use `<img src="...">` in the template. This matches the existing `convertPdfToImages()` pattern (line 1164 of index.html).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FileSaver.js for all downloads | `URL.createObjectURL` + `a.download` attribute | Browser support matured ~2020 | FileSaver.js no longer needed for single-file downloads; JSZip still needed for multi-file |
| PDF.js v2.x `getViewport(scale)` positional arg | PDF.js v3.x `getViewport({ scale })` object arg | PDF.js v3.0 (2022) | Must use object syntax — positional arg form is deprecated and may warn in console |
| `PDFDocument.load(bytes, { ignoreEncryption: true })` | Pre-load encryption detection + reject | pdf-lib has never supported decryption | `ignoreEncryption` produces blank output — never appropriate for split use case |

**Deprecated/outdated:**
- `pdf.getViewport(scale)` (positional): Deprecated in PDF.js v3+. Use `page.getViewport({ scale: N })` (object form). The existing `convertPdfToImages()` at line 1145 already uses the correct object form.
- FileSaver.js for ZIP download: Unnecessary — `URL.createObjectURL` handles blob downloads natively in all target browsers. JSZip's `generateAsync({type:'blob'})` produces a blob directly.

---

## Open Questions

1. **Canvas vs img for thumbnails**
   - What we know: Thumbnails rendered by PDF.js exist as canvas elements. The `innerHTML` assignment in the existing codebase uses `<img src="dataUrl">` for image display (line 1164). Canvas elements inserted via innerHTML lose their pixel content.
   - What's unclear: Whether the thumbnail grid should use canvas elements (requiring a two-pass render: insert DOM first, then draw to canvas) or img elements (requiring `canvas.toDataURL()` conversion, which adds memory and conversion time).
   - Recommendation: Use `<img src="dataUrl">` with `canvas.toDataURL('image/jpeg', 0.85)` — matches existing pattern, simpler implementation, slightly more memory but avoids two-pass DOM insertion complexity. For 100+ page thumbnails, consider lazy rendering (render visible thumbnails first, load rest on scroll).

2. **"Extract as groups" vs "extract individual pages"**
   - What we know: SPLT-03 and SPLT-04 describe page selection for extraction. SPLT-05 says "Extract Every Page" splits to individual files. The requirements don't explicitly define whether a custom selection produces one PDF with all selected pages or one PDF per selected page.
   - What's unclear: If the user selects pages 1, 3, 5 — do they get one PDF with 3 pages, or three single-page PDFs?
   - Recommendation: The most useful default is: "Extract Every Page" (SPLT-05) always produces one PDF per page. Custom selection (SPLT-03/04) produces one PDF containing all selected pages as a group (contiguous extraction). Add a mode toggle if needed. This interpretation aligns with how iLovePDF and Smallpdf implement "extract pages" (selection → one grouped PDF) vs "split all" (every page → individual files).

3. **File size of split outputs vs source**
   - What we know: The SUMMARY.md notes that "copyPages() carries all image resources — output files won't shrink." A split page can be larger than its proportional share because embedded resources (fonts, images) are duplicated into each output PDF.
   - What's unclear: Whether to show a warning about output file size to manage user expectations.
   - Recommendation: Show the output ZIP file size in the success message. Do not promise "smaller files" anywhere in the UI. A note "Split pages may be larger than expected due to shared PDF resources" in a tooltip or info icon is appropriate.

---

## Sources

### Primary (HIGH confidence)
- pdf-lib official docs (https://pdf-lib.js.org/docs/api/classes/pdfdocument) — `copyPages()` and `getPageIndices()` method signatures verified
- JSZip official docs (https://stuk.github.io/jszip/documentation/howto/write_zip.html) — `zip.file()`, `generateAsync({type:'blob'})` API verified
- JSZip download example (https://stuk.github.io/jszip/documentation/examples/download-zip-file.html) — `URL.createObjectURL` + `a.download` pattern verified
- Existing `index.html` lines 1123-1188 — PDF.js `getViewport({scale})`, `page.render()`, canvas pattern verified in production code
- Existing `index.html` lines 1040-1121 — pdf-lib `copyPages()` usage verified in production `mergePDFs()` function (line 1066)
- Existing `index.html` lines 766-776 — nav handler `data-tool` attribute pattern verified

### Secondary (MEDIUM confidence)
- GitHub issue #61 Hopding/pdf-lib (https://github.com/Hopding/pdf-lib/issues/61) — `/Encrypt` string-scan approach for encrypted PDF detection. Community-verified, not officially documented.
- WebSearch verified: `URL.createObjectURL` + `a.click()` + `URL.revokeObjectURL` pattern for blob downloads without FileSaver.js — multiple sources confirm this is the standard modern approach.

### Tertiary (LOW confidence)
- None — all claims in this document are backed by PRIMARY or SECONDARY sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pdf-lib and PDF.js are already in production in this codebase. JSZip 3.10.1 API is verified against official docs.
- Architecture: HIGH — section-per-tool pattern is demonstrated three times in existing code (pdf-tools, watermark, and the radio-mode within pdf-tools). No guesswork.
- Pitfalls: HIGH for encrypted PDF and popup blocker (confirmed via pdf-lib GitHub issues and existing STATE.md). MEDIUM for thumbnail grid performance (inferred from DOM behavior, not benchmarked in this codebase).
- Code examples: HIGH — all examples are adapted from verified working code in index.html or official API documentation.

**Research date:** 2026-03-02
**Valid until:** 2026-09-01 (pdf-lib 1.17.1 and JSZip 3.10.1 are stable; PDF.js 3.11.174 is pinned via CDN — no drift expected)
