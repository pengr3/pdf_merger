# Phase 2: Compress PDF - Research

**Researched:** 2026-03-03
**Domain:** Client-side PDF compression, browser canvas JPEG re-render, pdf-lib lossless structural optimization
**Confidence:** HIGH for Heavy mode (render pipeline is well-verified). MEDIUM for Fast mode (useObjectStreams effectiveness is poorly documented with specific numbers).

---

## Summary

Phase 2 adds a Compress PDF tool to the existing single-file `index.html` SPA. The requirements call for two distinct compression modes: Fast (lossless structural optimization) and Heavy (lossy JPEG page re-render). Both modes are achievable with the libraries already loaded — pdf-lib 1.17.1 and pdfjs-dist 3.11.174 — with no new CDN dependencies required.

**Fast mode** uses pdf-lib's built-in `save({ useObjectStreams: true })` option, which is already the default. The key insight for "lossless" is that a round-trip through pdf-lib's load-and-save pipeline may modestly reduce size on some PDFs (by removing redundant cross-references, re-writing object streams) but will often produce no meaningful reduction on text-heavy PDFs that were already well-optimized. The requirement description calls this "lossless structural optimization" — this is accurate, and the UI must show before/after sizes with a clear message when output is not smaller. STATE.md already flags this: "Compression is a no-op for text-heavy PDFs — must always show before/after size and display 'could not reduce size further' when output is not smaller."

**Heavy mode** uses PDF.js to render each page to a canvas at the original page's point dimensions, exports the canvas as JPEG using `canvas.toDataURL('image/jpeg', quality)`, then embeds each JPEG page into a new pdf-lib document that matches the original page dimensions. This is a complete page re-render: the text layer is replaced by a rasterized image, making text non-selectable. This is expected behavior and must be warned about. Quality is user-controlled via a range slider (50–100%). The before/after file size display is straightforward: `file.size` before, `outputUint8Array.byteLength` after.

Encrypted PDF detection (COMP-08) reuses the existing `isEncryptedPdf(arrayBuffer)` utility already written in Phase 1.

**Primary recommendation:** Implement Compress PDF as a new `<div id="compress-pdf" class="tool-section">` following the section-per-tool pattern. No new CDN libraries are needed. Fast mode = pdf-lib load + save with useObjectStreams. Heavy mode = PDF.js render each page → canvas.toDataURL JPEG → pdf-lib create new doc → embedJpg each page → save.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMP-01 | User can upload one or more PDF files to the Compress tool via click or drag-and-drop | Reuse the established upload area pattern from Split PDF tool — same drag-and-drop handler, adapt for multiple files (unlike Split which is single-file) |
| COMP-02 | User can choose between Fast mode (lossless structural optimization) and Heavy mode (JPEG re-render) | Radio button pattern already exists (see pdfToolMode radios at line 780 of index.html). Fast = pdf-lib load+save useObjectStreams. Heavy = PDF.js render per page → JPEG → new PDF |
| COMP-03 | User sees before/after file size for each compressed PDF | `file.size` = before, `outputBytes.byteLength` = after. Display in a results list per file after processing. Show "no reduction achieved" if output >= input |
| COMP-04 | In Heavy mode, user can adjust JPEG quality via a slider (50–100%) | `<input type="range" min="50" max="100" value="75">` + `canvas.toDataURL('image/jpeg', sliderValue / 100)`. Verified via MDN — quality parameter is 0–1 range |
| COMP-05 | Heavy mode shows a clear warning that text layer will be destroyed (non-selectable) | Static warning div shown/hidden based on mode selection. Must appear before the user clicks Compress — show when Heavy mode radio is selected, hide in Fast mode |
| COMP-06 | App shows progress indicator during compression | Reuse `updateProgress(percent, barId, fillId)` shared utility already in codebase |
| COMP-07 | User can download each compressed PDF individually | Single-file download per compressed PDF using `URL.createObjectURL` + `a.download` + `URL.revokeObjectURL`. No ZIP needed (COMP-ADV-01 batch ZIP is v2). Individual download buttons in the results list |
| COMP-08 | App detects encrypted PDFs and shows a clear error before attempting to process | Reuse `isEncryptedPdf(arrayBuffer)` function already defined at line 1188 of index.html. Skip that file with error message; continue processing others in multi-file batch |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdf-lib | 1.17.1 (already loaded) | Fast mode: `PDFDocument.load(arrayBuffer)` + `save({ useObjectStreams: true })`. Heavy mode: `PDFDocument.create()`, `embedJpg(jpegBytes)`, `page.drawImage(img, { x, y, width, height })`, `save()` | Already loaded; the only viable pure-JS PDF manipulation library in browser |
| pdfjs-dist | 3.11.174 (already loaded) | Heavy mode: renders each page to canvas at the correct scale for JPEG export | Already loaded; required for rendering PDF pages to canvas — pdf-lib cannot render |
| Browser Canvas API | Built-in | Heavy mode: `canvas.toDataURL('image/jpeg', quality)` to compress page render to JPEG bytes | No library needed — native browser API, universally supported |
| Browser Blob API | Built-in | Individual file downloads: `URL.createObjectURL(blob)` + `a.download` + `URL.revokeObjectURL` | Already used throughout codebase |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Browser TextDecoder | Built-in | Encrypted PDF detection: `isEncryptedPdf(arrayBuffer)` already written | Reuse without modification |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| canvas.toDataURL('image/jpeg', q) | canvas.toBlob('image/jpeg', q) | toBlob() is async and preferred for large images (avoids base64 string memory spike). toDataURL() is simpler and sufficient for typical PDF page sizes. Either works; toDataURL used in existing codebase |
| PDF.js page render for Heavy mode | Render images from PDF XObjects | XObject extraction is complex and doesn't handle vector/text content — PDF.js full-page render is the correct approach for a complete re-render that replaces everything |
| pdf-lib useObjectStreams for Fast | Custom stream rewriter | Object stream compression is what useObjectStreams already does — no custom solution needed |

**No new CDN tags required.** All libraries already loaded.

---

## Architecture Patterns

### Recommended HTML Structure

```
div#compress-pdf.tool-section
├── h1 + subtitle + privacy-badge (standard pattern)
├── .options-group (mode selection)
│   └── .radio-group
│       ├── Fast mode radio (lossless)
│       └── Heavy mode radio (JPEG re-render)
├── div#compressHeavyWarning (shown when Heavy selected, hidden in Fast)
├── div#compressQualityGroup (shown when Heavy selected, hidden in Fast)
│   └── input[type=range]#compressQualitySlider (min=50, max=100, value=75)
│   └── span#compressQualityValue (e.g. "75%")
├── div.upload-area#uploadAreaCompress (click + drag-and-drop, multiple files)
│   └── input[type=file]#fileInputCompress (accept=".pdf", multiple)
├── div#fileListCompress (uploaded file list)
├── div.actions#compressActions
│   ├── button.clear-btn#clearBtnCompress
│   └── button.submit-btn#compressBtnCompress
├── div.progress-bar#progressBarCompress
│   └── div.progress-fill#progressFillCompress
├── div.status#statusCompress
└── div#compressResultsList (per-file before/after + download button)
```

### Pattern 1: Mode Selection Toggle

**What:** Radio buttons switch between Fast and Heavy mode. Heavy mode reveals a warning and quality slider. Fast mode hides both.
**When to use:** COMP-02, COMP-04, COMP-05

```javascript
// Source: Existing pdfToolMode radio handler pattern (index.html line 998)
let compressMode = 'fast'; // 'fast' | 'heavy'

document.querySelectorAll('input[name="compressMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        compressMode = e.target.value;
        const isHeavy = compressMode === 'heavy';
        document.getElementById('compressHeavyWarning').style.display = isHeavy ? 'block' : 'none';
        document.getElementById('compressQualityGroup').style.display = isHeavy ? 'block' : 'none';
    });
});
```

### Pattern 2: Fast Mode — pdf-lib Load + Save

**What:** Load the PDF with pdf-lib, save with useObjectStreams (the default). The round-trip through pdf-lib normalizes the object graph and re-encodes streams, which may reduce size on some PDFs.
**When to use:** COMP-02 Fast mode

```javascript
// Source: pdf-lib official docs — PDFDocument.load() + save() API
// Confidence: HIGH — load/save round-trip is the established pattern

async function compressFast(arrayBuffer) {
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    // useObjectStreams: true is the DEFAULT in pdf-lib 1.17.1
    // Explicitly pass it to be clear about intent
    return await pdfDoc.save({ useObjectStreams: true });
    // Returns Uint8Array — byteLength is the "after" size
}
```

**CRITICAL CAVEAT:** useObjectStreams defaults to true, meaning the output of a plain `save()` already uses this. For text-heavy PDFs that were already well-compressed, the output may be the same size or even slightly larger than input. The UI MUST show before/after sizes and display a "could not reduce further" message when output >= input (from STATE.md decision).

### Pattern 3: Heavy Mode — Full Page Re-render Pipeline

**What:** For each page, render to canvas using PDF.js at page's native point dimensions, export as JPEG using toDataURL with user-selected quality, embed in a new pdf-lib document that replicates the original page size.
**When to use:** COMP-02 Heavy mode

```javascript
// Source: PDF.js getViewport + render pattern (verified in existing index.html line 1378)
//         pdf-lib embedJpg + drawImage pattern (verified at pdf-lib.js.org JSFiddle)
//         MDN toDataURL with quality parameter (HIGH confidence)

async function compressHeavy(arrayBuffer, quality) {
    // quality: 0.50–1.00 (from slider value / 100)

    // Step 1: Load with PDF.js for rendering
    const pdfJs = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdfJs.numPages;

    // Step 2: Load with pdf-lib to get original page dimensions
    // (PDF.js viewport gives dimensions in CSS pixels at scale; pdf-lib gives PDF points)
    const srcDoc = await PDFDocument.load(arrayBuffer);

    // Step 3: Create output PDF document
    const outDoc = await PDFDocument.create();

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        // Render page to canvas at scale=1 (native PDF point dimensions)
        const page = await pdfJs.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 }); // scale=2 for higher render quality

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport
        }).promise;

        // Export canvas as JPEG with user-selected quality
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const jpegBytes = dataUrlToUint8Array(dataUrl);

        // Get original page dimensions in PDF points from pdf-lib
        const srcPage = srcDoc.getPage(pageNum - 1);
        const { width, height } = srcPage.getSize();

        // Embed JPEG and add a page of matching dimensions
        const jpgImage = await outDoc.embedJpg(jpegBytes);
        const outPage = outDoc.addPage([width, height]);
        outPage.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: width,
            height: height
        });
    }

    return await outDoc.save();
}

// Helper: Convert data URL to Uint8Array for pdf-lib's embedJpg
function dataUrlToUint8Array(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
```

### Pattern 4: Before/After Display with Individual Download

**What:** After compression, display a results card per file showing original name, before size, after size, delta, and a Download button. If output >= input, show warning.
**When to use:** COMP-03, COMP-07

```javascript
// Source: Pattern — no library needed
function renderCompressResult(fileName, originalSize, compressedBytes) {
    const afterSize = compressedBytes.byteLength;
    const delta = originalSize - afterSize;
    const pct = ((delta / originalSize) * 100).toFixed(1);
    const noReduction = afterSize >= originalSize;

    const resultEl = document.createElement('div');
    resultEl.className = 'compress-result-item';
    resultEl.innerHTML = `
        <div class="compress-result-name">${escapeHtml(fileName)}</div>
        <div class="compress-result-sizes">
            <span>Before: ${formatBytes(originalSize)}</span>
            <span>After: ${formatBytes(afterSize)}</span>
            ${noReduction
                ? '<span class="compress-no-reduction">Could not reduce further</span>'
                : `<span class="compress-savings">-${pct}% saved</span>`}
        </div>
        <button class="download-btn" onclick="downloadCompressedPdf('${escapeHtml(fileName)}', /* bytes ref */)">
            Download
        </button>
    `;
    return resultEl;
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}
```

**Note on result storage:** The compressed `Uint8Array` bytes need to be accessible when the Download button is clicked. Since results can have multiple files, keep a `compressResults` array in state: `[{ fileName, originalSize, compressedBytes }, ...]`. The Download button handler reads from this array by index.

### Pattern 5: Encrypted PDF Detection (reuse)

**What:** Reuse `isEncryptedPdf(arrayBuffer)` already defined at line 1188 of index.html. In multi-file batch mode, skip the encrypted file and continue processing the rest.
**When to use:** COMP-08

```javascript
// Source: Existing isEncryptedPdf at index.html line 1188 — no changes needed
// For multi-file compress, handle per-file:

for (const file of compressFiles) {
    const arrayBuffer = await file.arrayBuffer();
    if (isEncryptedPdf(arrayBuffer)) {
        // Show error for this file, continue to next
        appendCompressError(file.name, 'Encrypted PDF — cannot process');
        continue;
    }
    // ... process file
}
```

### Pattern 6: Quality Slider

**What:** Range input that maps 50–100 to 0.5–1.0 for `canvas.toDataURL()`.
**When to use:** COMP-04

```javascript
// Source: MDN HTMLCanvasElement.toDataURL — quality parameter is 0 to 1
// Source: Existing opacitySlider pattern at index.html line 870

const qualitySlider = document.getElementById('compressQualitySlider');
const qualityValueDisplay = document.getElementById('compressQualityValue');

qualitySlider.addEventListener('input', (e) => {
    qualityValueDisplay.textContent = e.target.value + '%';
});

// At compression time:
const quality = parseInt(qualitySlider.value, 10) / 100; // 0.5 to 1.0
```

### Anti-Patterns to Avoid

- **Calling `save({ useObjectStreams: true })` and calling it "compression":** The default save already uses useObjectStreams. This is a lossless structural optimization, not true compression. The UI must never promise size reduction for Fast mode — always show before/after.
- **Rendering at scale=1 for Heavy mode:** At scale=1, the canvas pixel dimensions match PDF point dimensions exactly (72 DPI equivalent). For most PDFs this is fine, but it produces low-resolution output at typical viewing sizes. Use scale=2 for 144 DPI output — better visual quality at the cost of slightly larger JPEG. The quality slider then controls how much of that quality is preserved.
- **Building one giant canvas and reusing it:** Create a fresh canvas for each page render, or clear it explicitly. Reusing canvases across pages can produce ghosting artifacts.
- **Forgetting to release canvas references:** Heavy mode with a 100-page PDF creates 100 canvas elements. Clear the variable reference after extracting the data URL to allow GC.
- **Embedding JPEG then drawing at wrong coordinates:** pdf-lib uses bottom-left origin (y=0 is bottom). `drawImage` at `{x:0, y:0, width, height}` fills the entire page correctly because height extends upward.
- **Trusting `file.size` for the after-size display:** `file.size` is the original. `compressedBytes.byteLength` is the after. Never use `file.size` for the result.
- **Processing all files in parallel:** For heavy mode, parallel rendering of multiple files multiplies canvas memory usage. Process files sequentially. Within a single file, pages can also be sequential to avoid holding all canvas data in memory simultaneously.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JPEG encoding of canvas | Custom JPEG encoder | `canvas.toDataURL('image/jpeg', quality)` | JPEG is a complex DCT-based codec — the browser's native implementation is optimized and hardware-accelerated |
| PDF page rendering to image | Direct PDF stream parsing | PDF.js `page.render({canvasContext, viewport})` | PDF page content streams can contain arbitrary instructions, fonts, ICC profiles — PDF.js handles all of this correctly |
| "Compress" via pdf-lib stream rewriting | Custom deflate/zlib wrapper | `PDFDocument.save({ useObjectStreams: true })` | Already implemented; useObjectStreams handles cross-reference and object stream compression |
| Base64 decode for embedJpg | Manual base64 to bytes | `dataUrlToUint8Array(dataUrl)` using `atob()` | Simple utility — but do not reinvent, use `atob()` + typed array conversion |

**Key insight:** The two operations in this phase (lossless structural optimization and JPEG re-render) each have well-established browser-native solutions. The only glue code needed is coordinating between PDF.js (renders) and pdf-lib (builds output).

---

## Common Pitfalls

### Pitfall 1: Fast Mode Produces No Reduction (Most Common)

**What goes wrong:** User uploads a text-heavy, already-optimized PDF. Fast mode runs pdf-lib load+save. Output is the same size or 1–5% larger. User sees "0% saved" or negative savings.

**Why it happens:** pdf-lib's `useObjectStreams: true` is the default — most PDFs processed by modern PDF generators already use object streams. The load+save round-trip normalizes the cross-reference table, which may add slight overhead. There is no font subsetting, no image compression, no metadata removal in pdf-lib's save pipeline.

**How to avoid:** This is expected behavior. The UI MUST handle it gracefully:
1. Always show before AND after sizes
2. When `afterSize >= originalSize`, display "Could not reduce further — file is already optimized"
3. Do not present Fast mode as "will always reduce size"
4. Still offer the download (user may want the normalized PDF anyway)

**Warning signs:** Text-only PDFs, PDFs from Word/Google Docs exports, PDFs from modern authoring tools — all are likely to show zero reduction in Fast mode.

### Pitfall 2: Heavy Mode JPEG Quality + Scale Interaction

**What goes wrong:** Rendering at `scale=1` and quality `0.5` produces a file that looks blurry at normal zoom. Users complain output is visually degraded beyond expectation.

**Why it happens:** PDF pages are defined in points (1/72 inch). At scale=1, a US Letter page is 612×792 pixels — barely adequate for screen viewing. JPEG compression on an already-low-resolution source produces visible artifacts.

**How to avoid:** Render at `scale=2` (double resolution = 144 DPI equivalent). The quality slider then controls JPEG artifacts within that higher-resolution source. This produces better visual output at the same file sizes. The render canvas is 4x the pixels of scale=1, but JPEG compression is efficient enough that the output file size is dominated by quality setting, not render scale.

**Warning signs:** Blurry text at 100% zoom in the output PDF. Visible JPEG blocking artifacts on text.

### Pitfall 3: Page Dimension Mismatch in Heavy Mode

**What goes wrong:** The output PDF has pages that are the wrong size — content is cropped or padded with white space.

**Why it happens:** PDF.js renders at viewport pixel dimensions (canvas pixels). pdf-lib needs the original page size in PDF points (72 DPI units). If you use the canvas pixel dimensions as the PDF page dimensions, the output page is 2x too large (at scale=2) in points.

**How to avoid:** Load the original PDF with pdf-lib, call `srcDoc.getPage(i).getSize()` to get width/height in PDF points. Use THESE dimensions for `outDoc.addPage([width, height])`. The canvas render scale only affects pixel density, not the PDF page size.

```javascript
// CORRECT:
const { width, height } = srcDoc.getPage(pageNum - 1).getSize(); // PDF points
const outPage = outDoc.addPage([width, height]);
outPage.drawImage(jpgImage, { x: 0, y: 0, width, height });

// WRONG (do not do this):
const outPage = outDoc.addPage([canvas.width, canvas.height]); // canvas pixels ≠ PDF points
```

### Pitfall 4: dataUrl-to-Bytes Conversion Must Strip Prefix

**What goes wrong:** Passing the raw data URL string to `pdfDoc.embedJpg()` throws an error or produces a corrupted image.

**Why it happens:** `canvas.toDataURL('image/jpeg', q)` returns a string like `data:image/jpeg;base64,/9j/4AAQ...`. pdf-lib's `embedJpg()` expects raw JPEG bytes, not a base64 data URL string.

**How to avoid:** Strip the prefix before decoding:
```javascript
function dataUrlToUint8Array(dataUrl) {
    const base64 = dataUrl.split(',')[1]; // Remove "data:image/jpeg;base64," prefix
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
}
```

### Pitfall 5: Multi-File Batch — Encrypted File Stops Everything

**What goes wrong:** User uploads 5 files. File 3 is encrypted. Error is shown and all processing stops. Files 4 and 5 are never compressed.

**Why it happens:** A naive `for...of` loop with early return on error.

**How to avoid:** Use per-file try/catch. Encrypted files get an error result in the results list; non-encrypted files proceed normally.

### Pitfall 6: Large Input PDF Memory Pressure

**What goes wrong:** A 50+ MB PDF in Heavy mode crashes the tab during canvas rendering.

**Why it happens:** Each page rendered at scale=2 produces a canvas of ~(1224 × 1584) = 1.9M pixels × 4 bytes = ~7.5 MB per canvas. A 50-page PDF holds potentially 375 MB of canvas data if all pages are rendered before any are processed.

**How to avoid:** Process pages sequentially (render → toDataURL → clear canvas → embedJpg → next page). Release the canvas reference after extracting the data URL. The existing size gate from Phase 1 (warn at 30 MB, block at 80 MB) applies here too.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Fast Mode Full Orchestration

```javascript
// Source: pdf-lib save() official API; encrypted check from existing codebase
async function compressFileFast(file) {
    const originalSize = file.size;
    const arrayBuffer = await file.arrayBuffer();

    if (isEncryptedPdf(arrayBuffer)) {
        return { error: 'Encrypted PDF — cannot process' };
    }

    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const compressedBytes = await pdfDoc.save({ useObjectStreams: true });

    return {
        fileName: file.name,
        originalSize,
        compressedBytes,
        afterSize: compressedBytes.byteLength
    };
}
```

### Heavy Mode Full Orchestration (Single File)

```javascript
// Source: PDF.js getPage/getViewport/render (existing index.html line 1378 pattern)
//         pdf-lib embedJpg/addPage/drawImage (pdf-lib.js.org official docs)
//         MDN toDataURL quality parameter

async function compressFileHeavy(file, quality) {
    // quality: 0.5 to 1.0 (from slider)
    const originalSize = file.size;
    const arrayBuffer = await file.arrayBuffer();

    if (isEncryptedPdf(arrayBuffer)) {
        return { error: 'Encrypted PDF — cannot process' };
    }

    // Load with both libraries
    const pdfJs = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const numPages = pdfJs.numPages;
    const outDoc = await PDFDocument.create();

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        // Render page to canvas at 2x scale for quality
        const page = await pdfJs.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Export to JPEG with user-selected quality
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const jpegBytes = dataUrlToUint8Array(dataUrl);

        // Release canvas to allow GC
        canvas.width = 0;
        canvas.height = 0;

        // Get original page dimensions in PDF points
        const srcPage = srcDoc.getPage(pageNum - 1);
        const { width, height } = srcPage.getSize();

        // Build output page
        const jpgImage = await outDoc.embedJpg(jpegBytes);
        const outPage = outDoc.addPage([width, height]);
        outPage.drawImage(jpgImage, { x: 0, y: 0, width, height });

        // Update progress (0–90% for page render, 90–100% for save)
        updateProgress(
            (pageNum / numPages) * 90,
            'progressBarCompress', 'progressFillCompress'
        );
    }

    updateProgress(95, 'progressBarCompress', 'progressFillCompress');
    const compressedBytes = await outDoc.save();

    return {
        fileName: file.name,
        originalSize,
        compressedBytes,
        afterSize: compressedBytes.byteLength
    };
}
```

### Individual File Download

```javascript
// Source: Existing URL.createObjectURL pattern in index.html (line ~1097 and splitPdf())
// No JSZip needed — individual downloads per file (not batch ZIP)

function downloadCompressedPdf(fileName, compressedBytes) {
    const blob = new Blob([compressedBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Insert "-compressed" before the .pdf extension
    a.download = fileName.replace(/\.pdf$/i, '-compressed.pdf');
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}
```

### dataUrl to Uint8Array Conversion

```javascript
// Source: Standard browser API pattern — atob + Uint8Array
function dataUrlToUint8Array(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
}
```

### formatBytes Helper

```javascript
// Shared utility — format byte counts for display
function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side Ghostscript/pdfopt | Client-side canvas re-render | Became viable ~2019 as PDF.js matured | Enables privacy-first compression — no upload needed |
| canvas.toDataURL() as primary export | MDN now recommends canvas.toBlob() for large images | ~2021 | toBlob() avoids base64 string overhead; toDataURL() still works and is simpler for this use case |
| `save({ useCompression: true })` — unofficial option seen in some issues | `save({ useObjectStreams: true })` — documented official option | pdf-lib 1.x (stable) | `useCompression` is not in the official API. useObjectStreams is the documented option and the default |

**Deprecated/outdated:**
- `save({ useCompression: true })` — NOT an official pdf-lib API. Seen in GitHub issues/SO answers but not in official docs. The documented option is `useObjectStreams`. Do not use `useCompression`.
- canvas.toDataURL for very large canvases — still functional but MDN recommends toBlob() for performance. For typical PDF page sizes at scale=2 (~7.5 MB canvas), either works fine in practice.

---

## Open Questions

1. **Fast mode size reduction expectations for the CLMC use case**
   - What we know: pdf-lib useObjectStreams defaults to true. For text-heavy PDFs from modern authoring tools (Word, Google Docs), the load+save round-trip produces negligible size change. STATE.md explicitly flags this.
   - What's unclear: Whether CLMC's actual PDFs (likely reports, presentations) are image-heavy or text-heavy. Image-heavy PDFs will not be reduced by Fast mode either — Fast mode does not re-compress images.
   - Recommendation: Set expectations clearly in the UI. Fast mode label: "Fast (lossless — preserves all content)". If reduction is 0%, show "File already optimized — try Heavy mode for larger savings." Do not promise size reduction in Fast mode marketing copy.

2. **Whether to use `scale=2` or `scale=1.5` for Heavy mode render**
   - What we know: scale=2 gives 144 DPI output (good screen quality). scale=1 gives 72 DPI (often too low). scale=1.5 is a middle ground.
   - What's unclear: Memory implications for large PDFs in this specific app (no Web Worker).
   - Recommendation: Use `scale=2` as default since Heavy mode already destroys the text layer — there's no point in degraded visual quality. With JPEG quality=75% and scale=2, typical page sizes are 100-300 KB, which is usually well below the original. If memory issues appear in testing, scale can be reduced.

3. **Results list state management — where to store compressed bytes**
   - What we know: The download button needs access to compressed bytes at click time. Uint8Arrays cannot be stored in data attributes.
   - What's unclear: Cleanest pattern for this in the single-file inline-script architecture.
   - Recommendation: Use a module-level `compressResults` array: `let compressResults = [];`. Each entry is `{ fileName, originalSize, compressedBytes }`. Download buttons reference index into this array via `data-result-index` attribute. Clear this array when the tool is cleared.

4. **Progress reporting across multi-file batch**
   - What we know: The progress bar is a single bar. With multiple files, it's not clear whether to show per-file or overall progress.
   - What's unclear: How many files is typical (the requirements say "one or more" without specifying a limit).
   - Recommendation: Show a single combined progress bar (current file / total files × 100%). Show per-file status in the results list as each file completes. This is consistent with how the progress bar is used elsewhere in the app.

---

## Validation Architecture

> Skipping this section — workflow.nyquist_validation is not present in config.json (config uses "research", "plan_check", "verifier" keys, not "nyquist_validation").

---

## Sources

### Primary (HIGH confidence)

- pdf-lib official docs — `PDFDocument.save()` SaveOptions interface: https://pdf-lib.js.org/docs/api/interfaces/saveoptions — confirmed `useObjectStreams` is the only compression-related option (documented)
- pdf-lib official docs — `PDFDocument.embedJpg()`, `PDFPage.drawImage()`, `PDFImage.scale()`, `PDFPage.getSize()`, `PDFDocument.addPage()`: https://pdf-lib.js.org/docs/api/classes/pdfdocument — verified all method signatures
- pdf-lib official docs — `PDFPage.drawImage()` with x/y/width/height options: https://pdf-lib.js.org/docs/api/classes/pdfpage
- pdf-lib JSFiddle official example — embedJpg + scale + drawImage workflow: https://jsfiddle.net/Hopding/bcya43ju/5/
- MDN Web Docs — `HTMLCanvasElement.toDataURL(type, quality)` — quality 0–1 range, recommendation to prefer toBlob() for large images: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL
- pdf-lib GitHub source — `PDFDocument.save()` implementation — useObjectStreams default is true, uses PDFStreamWriter vs PDFWriter: https://github.com/Hopding/pdf-lib/blob/master/src/api/PDFDocument.ts
- Existing `index.html` lines 1378–1410 — PDF.js `getDocument` + `getPage` + `getViewport({scale})` + `page.render()` pattern verified in production Split PDF code
- Existing `index.html` lines 1133–1178 — `showStatus`, `hideStatus`, `updateProgress`, `hideProgress` shared utilities verified

### Secondary (MEDIUM confidence)

- pdf-lib GitHub issue #54 — PDF optimization roadmap, useObjectStreams discussion: https://github.com/Hopding/pdf-lib/issues/54 — confirms structural optimization only, no image compression
- pdf-lib GitHub issue #71 — "Is it possible to compress images in an existing PDF?" — maintainer explicitly states "pdf-lib doesn't provide an API for compressing images": https://github.com/Hopding/pdf-lib/issues/71
- pdf-lib GitHub issue #1657 — feature request for compression — confirms no built-in compression API as of July 2024: https://github.com/Hopding/pdf-lib/issues/1657
- pdf-lib GitHub issue #139 — file size increase on load+save round-trip explained — using `useObjectStreams: true` on same-document operations reduces overhead: https://github.com/Hopding/pdf-lib/issues/139
- DEV Community — "Building a Client-Side PDF Compressor using JavaScript and Web Workers" — confirms the canvas re-render approach as the standard pattern for browser-based PDF compression: https://dev.to/ahmad_shakibnasaj_a8f9bb/building-a-client-side-pdf-compressor-using-javascript-and-web-workers-4dmm

### Tertiary (LOW confidence)

- Various WebSearch results confirming the page-by-page render → JPEG → embed approach is the standard pattern for heavy browser compression (multiple sources agree, no single authoritative reference)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in production in this codebase; no new dependencies; APIs verified against official docs
- Architecture: HIGH — section-per-tool pattern established three times already; mode radio pattern demonstrated in existing pdfToolMode implementation; all shared utilities (showStatus, updateProgress, isEncryptedPdf) are verified existing functions
- Fast mode (useObjectStreams): MEDIUM — documented option, but real-world size reduction for this specific use case (CLMC PDFs) is unknown. May produce zero reduction. UI must handle this gracefully.
- Heavy mode (render pipeline): HIGH — PDF.js render + canvas toDataURL + pdf-lib embedJpg is a well-established pattern with all APIs verified
- Pitfalls: HIGH — all pitfalls identified are grounded in API behavior and existing codebase patterns, not speculation

**Research date:** 2026-03-03
**Valid until:** 2026-09-03 (pdf-lib 1.17.1 and pdfjs-dist 3.11.174 are pinned via CDN — no drift expected. Canvas toDataURL API is stable Web platform API)
