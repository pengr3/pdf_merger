# Phase 3: Split Merge PDFs and PDF to Images into Separate Nav Tabs - Research

**Researched:** 2026-03-03
**Domain:** HTML refactoring — nav tab architecture in single-file SPA; splitting one combined tool section into two independent nav tabs
**Confidence:** HIGH — all patterns are directly verifiable in the existing codebase; no external libraries required

---

## Summary

Phase 3 is a pure HTML/CSS/JS refactoring phase. The existing "PDF Tools" nav tab (id `pdf-tools`) currently houses two completely different tools — Merge PDFs and PDF to Images — toggled by a pair of radio buttons. The goal is to split these into two separate, independent nav tabs, each with their own HTML section, state, DOM references, and upload handlers.

No new libraries are needed. The navigation system already uses a data-driven pattern (`data-tool` attribute + `querySelectorAll('.nav-link')`) that automatically handles any new nav button added. The section-per-tool pattern is already demonstrated four times in the codebase (pdf-tools, watermark, split-pdf, compress-pdf). This phase applies the same established pattern to decompose one existing combined section into two separate ones.

The primary complexity is untangling the shared state. The current `pdf-tools` section uses a single set of DOM references (`uploadAreaPdf`, `fileInputPdf`, `fileListPdf`, `submitBtnPdf`, etc.) and a `pdfToolMode` variable to control which tool runs. All shared state, DOM wiring, and the `handlePdfToolSubmit()` dispatcher must be replaced with two fully independent sections. The `updatePdfToolMode()` function, the radio-based mode toggle, and the `pdfToolMode` branch logic in the upload handlers and submit handler all disappear entirely.

**Primary recommendation:** Create two new nav tab sections — `id="merge-pdf"` and `id="pdf-to-images"` — each with namespaced state and DOM IDs. Remove the existing `pdf-tools` section and its radio mode toggle. Wire each new section following the exact same pattern used for split-pdf and compress-pdf. The `mergePDFs()` and `convertPdfToImages()` functions need only minor renaming/re-wiring, not rewriting.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdf-lib | 1.17.1 (already loaded) | `PDFDocument.load()`, `copyPages()`, `save()` — used by `mergePDFs()` | Already in production; no change needed |
| pdfjs-dist | 3.11.174 (already loaded) | `pdfjsLib.getDocument()`, `page.getViewport()`, canvas render — used by `convertPdfToImages()` | Already in production; no change needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Browser Blob API | Built-in | `URL.createObjectURL` for merge output download | Already in use in `mergePDFs()` |
| Browser Canvas API | Built-in | `canvas.toDataURL('image/png')` for image output | Already in use in `convertPdfToImages()` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Two separate nav tabs | Keep as radio-toggle inside one tab | Radio toggle is confusing UX — two distinct tools should be distinct nav items. Phase 3 goal explicitly says "separate nav tabs." |
| Separate nav tabs | Sub-nav or dropdown menu | Overkill for 2 items; existing nav already handles flat tab list |

**Installation:** None — no new dependencies required.

---

## Architecture Patterns

### Existing Nav System (data-tool pattern)

The nav handler (lines 1182-1196 of `index.html`) works by:
1. Iterating all `.nav-link` buttons
2. On click, reading `link.dataset.tool` to get the section ID
3. Removing `.active` from all nav buttons and all `.tool-section` divs
4. Adding `.active` to the clicked button and `document.getElementById(toolId)`

Adding a new nav tab requires only two things:
- A `<button class="nav-link" data-tool="merge-pdf">` in the nav
- A `<div id="merge-pdf" class="tool-section">` in the container

No changes to the nav handler JavaScript are required. This is confirmed HIGH confidence — the pattern is already used by split-pdf and compress-pdf.

### Recommended Final Nav Structure

```html
<!-- BEFORE (current) -->
<button class="nav-link active" data-tool="pdf-tools">📄 PDF Tools</button>
<button class="nav-link" data-tool="watermark">💧 Watermark Inserter</button>
<button class="nav-link" data-tool="split-pdf">✂️ Split PDF</button>
<button class="nav-link" data-tool="compress-pdf">📦 Compress PDF</button>

<!-- AFTER (phase 3 result) -->
<button class="nav-link active" data-tool="merge-pdf">📚 Merge PDFs</button>
<button class="nav-link" data-tool="pdf-to-images">🖼️ PDF to Images</button>
<button class="nav-link" data-tool="watermark">💧 Watermark Inserter</button>
<button class="nav-link" data-tool="split-pdf">✂️ Split PDF</button>
<button class="nav-link" data-tool="compress-pdf">📦 Compress PDF</button>
```

Note: Phase 4 will handle emoji removal and visual polish. Keep emojis intact in Phase 3.

### Recommended HTML Section Structure

Each new section follows the exact pattern of `split-pdf` and `compress-pdf`:

```html
<!-- MERGE PDFs SECTION -->
<div id="merge-pdf" class="tool-section active">
    <h1>📚 Merge PDFs</h1>
    <p class="subtitle">Combine multiple PDF files into one document</p>

    <div class="privacy-badge">
        🔒 <strong>100% Private</strong> - All processing happens in your browser. No files are uploaded to any server.
    </div>

    <div class="upload-area" id="uploadAreaMerge">
        <div class="upload-icon">📁</div>
        <div class="upload-text">Click to upload or drag & drop</div>
        <div class="upload-hint">Upload 2 or more PDF files (no size limit)</div>
        <input type="file" id="fileInputMerge" accept=".pdf,application/pdf" multiple />
    </div>

    <div class="file-list" id="fileListMerge"></div>

    <div class="reorder-hint" id="reorderHintMerge" style="display: none;">
        ↕️ <strong>Tip:</strong> Drag and drop files to reorder them. PDFs will be merged in this order.
    </div>

    <div class="actions">
        <button class="clear-btn" id="clearBtnMerge" disabled>Clear All</button>
        <button class="submit-btn" id="submitBtnMerge" disabled>Merge PDFs</button>
    </div>

    <div class="progress-bar" id="progressBarMerge">
        <div class="progress-fill" id="progressFillMerge"></div>
    </div>

    <div class="status" id="statusMerge"></div>
    <div class="stats" id="statsMerge"></div>
</div>

<!-- PDF TO IMAGES SECTION -->
<div id="pdf-to-images" class="tool-section">
    <h1>🖼️ PDF to Images</h1>
    <p class="subtitle">Convert each PDF page to a downloadable image</p>

    <div class="privacy-badge">
        🔒 <strong>100% Private</strong> - All processing happens in your browser. No files are uploaded to any server.
    </div>

    <div class="upload-area" id="uploadAreaImages">
        <div class="upload-icon">📁</div>
        <div class="upload-text">Click to upload or drag & drop</div>
        <div class="upload-hint">Upload a single PDF to convert each page to an image</div>
        <input type="file" id="fileInputImages" accept=".pdf,application/pdf" />
    </div>

    <div class="file-list" id="fileListImages"></div>

    <div class="actions">
        <button class="clear-btn" id="clearBtnImages" disabled>Clear</button>
        <button class="submit-btn" id="submitBtnImages" disabled>Convert to Images</button>
    </div>

    <div class="progress-bar" id="progressBarImages">
        <div class="progress-fill" id="progressFillImages"></div>
    </div>

    <div class="status" id="statusImages"></div>

    <div class="image-grid" id="imageGridImages"></div>
</div>
```

### JavaScript Refactoring Pattern

The `pdf-tools` JS block (lines 1198-2431 in `index.html`) must be replaced with two independent blocks.

**Merge PDF block — state and DOM refs to rename:**

| Current (shared) | New (merge-specific) |
|------------------|----------------------|
| `selectedPdfFiles` | `mergeFiles` |
| `draggedIndex` | `mergeDraggedIndex` |
| `uploadAreaPdf` | `uploadAreaMerge` |
| `fileInputPdf` | `fileInputMerge` |
| `fileListPdf` | `fileListMerge` |
| `submitBtnPdf` | `submitBtnMerge` |
| `clearBtnPdf` | `clearBtnMerge` |
| `statusPdf` → statusId | `'statusMerge'` |
| `progressBarPdf` → barId | `'progressBarMerge'` |
| `progressFillPdf` → fillId | `'progressFillMerge'` |
| `reorderHintPdf` | `reorderHintMerge` |
| `statsPdf` | `statsMerge` |
| `mergePDFs()` | rename to `executeMerge()` or keep `mergePDFs()` — either is fine |
| `renderPdfFileList()` | `renderMergeFileList()` |
| `updatePdfButtons()` | `updateMergeButtons()` |
| `showPdfStats()` | `showMergeStats()` |
| `hidePdfStats()` | `hideMergeStats()` |

**PDF to Images block — state and DOM refs to rename:**

| Current (shared) | New (images-specific) |
|------------------|----------------------|
| `selectedPdfFiles` | `imagePdfFile` (single file, not array) |
| `uploadAreaPdf` | `uploadAreaImages` |
| `fileInputPdf` | `fileInputImages` |
| `fileListPdf` | `fileListImages` |
| `submitBtnPdf` | `submitBtnImages` |
| `clearBtnPdf` | `clearBtnImages` |
| `imageGridPdf` | `imageGridImages` |
| `statusPdf` → statusId | `'statusImages'` |
| `progressBarPdf` → barId | `'progressBarImages'` |
| `progressFillPdf` → fillId | `'progressFillImages'` |
| `convertPdfToImages()` | keep or rename to `executeConvertToImages()` |

**Eliminated code (no longer needed):**
- `pdfToolMode` variable and all `if (pdfToolMode === 'merge')` branches
- `updatePdfToolMode()` function
- Radio button event listeners for `input[name="pdfToolMode"]`
- `handlePdfToolSubmit()` dispatcher
- The mode selection `<div class="options-group">` HTML (radio buttons inside `pdf-tools` section)
- The `uploadHintPdf` dynamic text logic

### Pattern: Merge File List with Drag-to-Reorder

The existing `renderPdfFileList()` uses `draggable="true"` and `attachPdfDragListeners()` for reorder. This must be ported as `renderMergeFileList()` + `attachMergeDragListeners()`. The drag logic references `selectedPdfFiles` (via closure) — rename to `mergeFiles` throughout.

### Pattern: `beforeunload` Guard

The existing `beforeunload` guard at line 2822 checks `selectedPdfFiles.length > 0`. Update to check `mergeFiles.length > 0` (and ensure `imagePdfFile !== null` is also checked):

```javascript
window.addEventListener('beforeunload', (e) => {
    if (mergeFiles.length > 0 || imagePdfFile !== null || watermarkFiles.length > 0 || splitPdfFile !== null || compressFiles.length > 0) {
        e.preventDefault();
        e.returnValue = '';
    }
});
```

### Pattern: `window.removePdfFile` global exposure

Current code exposes `window.removePdfFile = removePdfFile` because `renderPdfFileList` uses `onclick="removePdfFile(${index})"` inline attribute. This pattern must be maintained:
- `window.removeMergeFile = removeMergeFile` for the merge section
- `window.removeImageFile = removeImageFile` for the images section (if file list is rendered the same way)
- `window.downloadImage` stays the same — function name and logic unchanged

### Anti-Patterns to Avoid

- **Keeping `pdfToolMode` anywhere:** The mode toggle is the entire anti-pattern being fixed. Once two separate sections exist, the mode variable is dead code and must be removed entirely.
- **Sharing a single `selectedPdfFiles` array between both sections:** Each section must own its state. If a user adds files in Merge, switches to PDF to Images, and comes back, Merge state must be preserved independently.
- **Forgetting to update the default active tab:** The first tab in the nav must have `class="nav-link active"` and its section must have `class="tool-section active"`. Currently `pdf-tools` is the default. After refactoring, `merge-pdf` should be the default active tab (or `pdf-to-images` — choose one, be consistent).
- **Duplicating shared utility functions:** `showStatus()`, `hideStatus()`, `updateProgress()`, `hideProgress()`, `escapeHtml()` are already shared utilities (they take IDs as arguments). Do not copy-paste them — they already work for any section.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Nav tab routing | Custom router or URL hash logic | Existing `data-tool` pattern | Already works; adding a new button + section is all that's required |
| File reorder UX | Custom sortable library | Existing `draggable="true"` + dragover/drop handlers | Already implemented and working in the merge section; port the existing code |
| Stats display | New stats component | Existing `showPdfStats()` pattern | Copy to `showMergeStats()` — same DOM structure, different element ID |

**Key insight:** This phase is nearly all rename-and-copy, not new feature work. The risk is introducing bugs during refactoring, not implementing new capabilities.

---

## Common Pitfalls

### Pitfall 1: Stale `window.removePdfFile` Reference

**What goes wrong:** After renaming the file-removal function to `removeMergeFile`, the inline `onclick="removePdfFile(${index})"` in `renderMergeFileList()` still uses the old name. Clicking Remove does nothing (function not found).

**Why it happens:** The function name in the template literal must match the globally exposed name. Both must change together.

**How to avoid:** Update both `window.removeMergeFile = removeMergeFile` AND the template literal `onclick="removeMergeFile(${index})"` in the same edit. Search for all occurrences of `removePdfFile` before marking complete.

**Warning signs:** Remove buttons silently do nothing. Console shows `removePdfFile is not defined`.

### Pitfall 2: Default Active Tab State Mismatch

**What goes wrong:** After removing `pdf-tools`, the old `<button class="nav-link active" data-tool="pdf-tools">` still exists in the HTML, pointing to a deleted section. Page loads with no visible content.

**Why it happens:** The nav button and section must be updated atomically. If you delete the section but forget to update the nav button's `data-tool`, the nav points to a non-existent ID.

**How to avoid:** Update the nav button's `data-tool` from `pdf-tools` to `merge-pdf` and ensure `<div id="merge-pdf" class="tool-section active">` has the `active` class on page load.

**Warning signs:** Page loads blank. No tool section is visible. `document.getElementById('pdf-tools')` returns null, causing a JS error.

### Pitfall 3: Drag-and-Drop State Pollution Between Sections

**What goes wrong:** `mergeDraggedIndex` (renamed from `draggedIndex`) is shared in the outer closure. If the drag listeners are attached to both sections, a drag event in one section could corrupt state in the other.

**Why it happens:** The drag handler uses a closure variable for `draggedIndex`. If both sections attach to the same variable, they'll interfere.

**How to avoid:** Each section's drag handler must reference its own state variable (`mergeDraggedIndex` for merge, nothing needed for images since it's single-file). The existing code only has drag-and-drop in the merge section — just rename it.

**Warning signs:** Reordering files in Merge causes unexpected behavior if the images section ever gains drag support.

### Pitfall 4: `beforeunload` Guard Missing New Variable Names

**What goes wrong:** After renaming `selectedPdfFiles` to `mergeFiles`, the `beforeunload` guard still checks the old variable name. Either a ReferenceError occurs, or the guard silently stops working (user navigates away without warning when they have unsaved merge files).

**Why it happens:** The `beforeunload` handler is at the end of the script (line 2822) and is easy to miss when refactoring state variable names earlier in the file.

**How to avoid:** Update `beforeunload` as the final step of the refactoring. Verify the variable names match the final renamed state.

**Warning signs:** No navigation warning when files are uploaded. Or: `ReferenceError: selectedPdfFiles is not defined` in console.

### Pitfall 5: `statsPdf` / `showPdfStats` Reference Left Dangling

**What goes wrong:** `mergePDFs()` calls `showPdfStats()` which references `statsPdf` by closure — a DOM element from the old `pdf-tools` section. After removing that section, `statsPdf` is `null` and `showPdfStats()` throws.

**Why it happens:** The stats element and its helper function are coupled via closure to the old section's DOM ID.

**How to avoid:** Rename `statsPdf` → `statsMerge`, update `showPdfStats()` → `showMergeStats()`, and update the DOM element ID to `id="statsMerge"`.

**Warning signs:** Merge succeeds but no stats are shown. Console shows `Cannot set properties of null (setting 'innerHTML')`.

---

## Code Examples

Verified patterns from existing codebase:

### New Merge PDF JS Block Skeleton

```javascript
// Source: Existing index.html lines 1198-2431, split into two independent blocks

// ========== MERGE PDFs SECTION ==========

// --- State ---
let mergeFiles = [];
let mergeDraggedIndex = null;

// --- DOM references ---
const uploadAreaMerge = document.getElementById('uploadAreaMerge');
const fileInputMerge = document.getElementById('fileInputMerge');
const fileListMerge = document.getElementById('fileListMerge');
const submitBtnMerge = document.getElementById('submitBtnMerge');
const clearBtnMerge = document.getElementById('clearBtnMerge');
const reorderHintMerge = document.getElementById('reorderHintMerge');
const statsMerge = document.getElementById('statsMerge');

// --- Upload handlers (identical to current, just renamed refs) ---
uploadAreaMerge.addEventListener('click', () => fileInputMerge.click());

uploadAreaMerge.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadAreaMerge.classList.add('dragover');
});

uploadAreaMerge.addEventListener('dragleave', () => {
    uploadAreaMerge.classList.remove('dragover');
});

uploadAreaMerge.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadAreaMerge.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f =>
        f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (files.length === 0) {
        showStatus('Please drop only PDF files', 'error', 'statusMerge');
        return;
    }
    mergeFiles = [...mergeFiles, ...files];
    renderMergeFileList();
    updateMergeButtons();
    hideStatus('statusMerge');
});

fileInputMerge.addEventListener('change', (e) => {
    mergeFiles = [...mergeFiles, ...Array.from(e.target.files)];
    renderMergeFileList();
    updateMergeButtons();
    hideStatus('statusMerge');
});

clearBtnMerge.addEventListener('click', () => {
    mergeFiles = [];
    fileInputMerge.value = '';
    renderMergeFileList();
    updateMergeButtons();
    hideStatus('statusMerge');
    hideMergeStats();
});

function removeMergeFile(index) {
    mergeFiles.splice(index, 1);
    renderMergeFileList();
    updateMergeButtons();
}

function updateMergeButtons() {
    const hasValidFiles = mergeFiles.length >= 2;
    submitBtnMerge.disabled = !hasValidFiles;
    clearBtnMerge.disabled = mergeFiles.length === 0;
}

submitBtnMerge.addEventListener('click', mergePDFs);
window.removeMergeFile = removeMergeFile;
```

### New PDF to Images JS Block Skeleton

```javascript
// ========== PDF TO IMAGES SECTION ==========

// --- State ---
let imagePdfFile = null;

// --- DOM references ---
const uploadAreaImages = document.getElementById('uploadAreaImages');
const fileInputImages = document.getElementById('fileInputImages');
const fileListImages = document.getElementById('fileListImages');
const submitBtnImages = document.getElementById('submitBtnImages');
const clearBtnImages = document.getElementById('clearBtnImages');
const imageGridImages = document.getElementById('imageGridImages');

// --- Upload handlers ---
uploadAreaImages.addEventListener('click', () => fileInputImages.click());

uploadAreaImages.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadAreaImages.classList.add('dragover');
});

uploadAreaImages.addEventListener('dragleave', () => {
    uploadAreaImages.classList.remove('dragover');
});

uploadAreaImages.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadAreaImages.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f =>
        f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (files.length === 0) {
        showStatus('Please drop a PDF file', 'error', 'statusImages');
        return;
    }
    imagePdfFile = files[0];
    renderImageFileList();
    updateImageButtons();
    hideStatus('statusImages');
});

fileInputImages.addEventListener('change', (e) => {
    imagePdfFile = e.target.files.length > 0 ? e.target.files[0] : null;
    renderImageFileList();
    updateImageButtons();
    hideStatus('statusImages');
});

clearBtnImages.addEventListener('click', () => {
    imagePdfFile = null;
    fileInputImages.value = '';
    imageGridImages.innerHTML = '';
    renderImageFileList();
    updateImageButtons();
    hideStatus('statusImages');
});

function updateImageButtons() {
    submitBtnImages.disabled = imagePdfFile === null;
    clearBtnImages.disabled = imagePdfFile === null;
}

submitBtnImages.addEventListener('click', convertPdfToImages);
// window.downloadImage stays unchanged — no renaming needed
```

### `mergePDFs()` Signature Change

The function body is identical to the existing one. Only the DOM reference names change. No rewrite:

```javascript
// Source: existing index.html lines 2262-2343
// Change: all Pdf suffix → Merge suffix in DOM IDs and local refs
async function mergePDFs() {
    if (mergeFiles.length < 2) {
        showStatus('Please upload at least 2 PDF files', 'error', 'statusMerge');
        return;
    }
    // ... rest of function unchanged, except:
    // submitBtnPdf → submitBtnMerge
    // clearBtnPdf → clearBtnMerge
    // updateProgress(n, 'progressBarPdf', 'progressFillPdf') → updateProgress(n, 'progressBarMerge', 'progressFillMerge')
    // showPdfStats() → showMergeStats()
    // hideProgress('progressBarPdf', 'progressFillPdf') → hideProgress('progressBarMerge', 'progressFillMerge')
    // selectedPdfFiles → mergeFiles
}
```

### `convertPdfToImages()` Signature Change

```javascript
// Source: existing index.html lines 2345-2410
// Change: all Pdf suffix → Images suffix in DOM IDs and local refs
async function convertPdfToImages() {
    if (!imagePdfFile) {
        showStatus('Please upload a PDF file', 'error', 'statusImages');
        return;
    }
    // ... rest of function unchanged, except:
    // submitBtnPdf → submitBtnImages
    // clearBtnPdf → clearBtnImages
    // imageGridPdf → imageGridImages
    // selectedPdfFiles[0] → imagePdfFile
    // updateProgress(n, 'progressBarPdf', 'progressFillPdf') → updateProgress(n, 'progressBarImages', 'progressFillImages')
    // hideProgress('progressBarPdf', 'progressFillPdf') → hideProgress('progressBarImages', 'progressFillImages')
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Radio-toggle two tools in one tab | Separate nav tab per tool | This phase | Cleaner UX; each tool discoverable independently without knowing about the toggle |

**Deprecated/outdated (in this codebase after Phase 3):**
- `pdfToolMode` variable: Removed entirely.
- `updatePdfToolMode()` function: Removed entirely.
- Radio buttons `input[name="pdfToolMode"]`: Removed from HTML.
- `handlePdfToolSubmit()` dispatcher function: Removed; each section has its own direct submit handler.
- `id="pdf-tools"` section: Removed and replaced by `id="merge-pdf"` and `id="pdf-to-images"`.

---

## Open Questions

1. **Which tab should be the default active tab after Phase 3?**
   - What we know: Currently `pdf-tools` is default (`class="nav-link active"` + `class="tool-section active"`). One of the two new tabs must become the default.
   - What's unclear: Whether the user wants Merge PDFs or PDF to Images as the landing tab.
   - Recommendation: Make `merge-pdf` the default. Merge is the primary tool (it was the "first" in the radio toggle and it supports multiple files, which is the more common use case). PDF to Images is secondary.

2. **Should the PDF to Images section show a file list, or just the upload area?**
   - What we know: The current convert section uses `selectedPdfFiles` (shared array) but only ever uses `selectedPdfFiles[0]`. The file list render shows one file. The Merge section needs a reorderable file list. The Images section needs only to confirm "one file selected."
   - What's unclear: Whether a file list (with Remove button) makes sense for a single-file tool.
   - Recommendation: Keep a minimal file list for the images section (shows file name + size + Remove button) for consistency with other tools. Set `multiple` attribute to absent/false on `fileInputImages`.

3. **Should `showPdfStats()` be renamed to `showMergeStats()` or become a shared generic function?**
   - What we know: `showPdfStats()` renders a stats block with `statsPdf.innerHTML`. It's specifically tied to the merge operation stats (filesProcessed, totalPages, outputSize, processingTime). The images section doesn't use stats.
   - What's unclear: Whether there's value in making it generic now.
   - Recommendation: Rename to `showMergeStats()` (scoped to merge only). Don't generalize prematurely — only one section uses it. If the images section needs stats later, generalize then.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — skip this section.

---

## Sources

### Primary (HIGH confidence)

- Existing `index.html` lines 892-899 — nav HTML pattern (`data-tool`, `.nav-link`, `.nav-links`) verified directly
- Existing `index.html` lines 1182-1196 — nav JavaScript handler verified directly; confirmed auto-handles any `data-tool` button
- Existing `index.html` lines 902-960 — `pdf-tools` section HTML verified directly; is the section being refactored
- Existing `index.html` lines 1033-1081 — `split-pdf` section verified as reference pattern for independent section structure
- Existing `index.html` lines 1082-1163 — `compress-pdf` section verified as second reference for independent section structure
- Existing `index.html` lines 1198-2431 — `PDF TOOLS (UNIFIED)` JS block verified; all variables and functions identified for rename
- Existing `index.html` lines 2262-2343 — `mergePDFs()` function body verified; confirmed no rewrite required, only variable renames
- Existing `index.html` lines 2345-2410 — `convertPdfToImages()` function body verified; confirmed no rewrite required, only variable renames
- Existing `index.html` line 2822 — `beforeunload` guard verified; must update `selectedPdfFiles` reference

### Secondary (MEDIUM confidence)

- None required — all relevant information is in the local codebase.

### Tertiary (LOW confidence)

- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all libraries already in production
- Architecture: HIGH — nav pattern verified directly in codebase; section-per-tool pattern verified 4 times
- Pitfalls: HIGH — all pitfalls are grounded in verified code patterns (stale references, closure variable renaming, active-class mismatch)
- Code examples: HIGH — all examples are direct adaptations of verified working code from `index.html`

**Research date:** 2026-03-03
**Valid until:** 2026-09-03 (pure HTML/JS refactoring; no external APIs or versioned dependencies involved)
