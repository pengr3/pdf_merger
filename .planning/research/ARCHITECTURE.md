# Architecture Research

**Domain:** Client-side single-file PDF tools web application
**Researched:** 2026-03-02
**Confidence:** HIGH (existing codebase + verified library capabilities)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        index.html (single file)                  │
├──────────────────┬──────────────────────────────────────────────┤
│   Navigation     │          Tool Sections (tabs)                 │
│   .navbar        │                                               │
│   nav-link×N     │  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│                  │  │ PDF Tools│ │Watermark │ │  Split   │     │
│                  │  │(existing)│ │(existing)│ │  (new)   │     │
│                  │  └──────────┘ └──────────┘ └──────────┘     │
│                  │  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│                  │  │ Compress │ │PDF→PPT   │ │PPT→PDF   │     │
│                  │  │  (new)   │ │  (new)   │ │  (new)   │     │
│                  │  └──────────┘ └──────────┘ └──────────┘     │
├──────────────────┴──────────────────────────────────────────────┤
│                     Shared Utilities (JS)                        │
│   showStatus() · hideStatus() · updateProgress() · escapeHtml() │
├─────────────────────────────────────────────────────────────────┤
│                     CDN Libraries                                │
│   pdf-lib 1.17.1 · pdfjs-dist 3.11.174 · JSZip · PptxGenJS     │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

Each tool section follows the same self-contained module pattern already established in the codebase:

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Nav tab button | Show/hide sections, update active state | `.nav-link` click handler, toggle `.active` class and `display` on `.tool-section` |
| Tool section HTML | Upload area, controls, file list, output area | `<section id="tool-{name}">` with upload area div, config controls, results div |
| State variables | Hold uploaded files and current settings | Module-scoped `let` arrays and primitives, prefixed by tool name |
| Upload handler | Accept files via click or drag-drop, validate type, render list | Reuses existing upload area pattern (click triggers file input, drop validates MIME) |
| Processing function | Core algorithm, calls library APIs, triggers download | `async function process{Feature}(...)`, try-catch, calls `updateProgress()` |
| Status/progress | User feedback during long operations | Reuse existing `showStatus()` and `updateProgress()` with the section's own status div ID |

## Recommended Project Structure

The single-file constraint means structure is expressed as logical sections within `index.html`, not as filesystem directories. The established pattern to follow:

```
index.html
  <style>
    /* Existing CSS ... */
    /* === SPLIT PDF === */
    .split-thumbnail-grid { ... }
    .split-page-thumb { ... }
    /* === COMPRESS PDF === */
    .compress-quality-control { ... }
    /* === PDF->PPT and PPT->PDF === */
    /* (minimal new CSS needed — reuses .file-item, .upload-area, etc.) */
  </style>

  <body>
    <nav>
      <!-- existing nav links -->
      <button class="nav-link" data-tool="split">Split PDF</button>
      <button class="nav-link" data-tool="compress">Compress PDF</button>
      <button class="nav-link" data-tool="pdf2ppt">PDF to PPT</button>
      <button class="nav-link" data-tool="ppt2pdf">PPT to PDF</button>
    </nav>

    <!-- existing tool sections -->

    <section id="tool-split" class="tool-section">...</section>
    <section id="tool-compress" class="tool-section">...</section>
    <section id="tool-pdf2ppt" class="tool-section">...</section>
    <section id="tool-ppt2pdf" class="tool-section">...</section>
  </body>

  <!-- CDN scripts: existing + JSZip + PptxGenJS -->

  <script>
    /* existing code ... */

    /* === SPLIT PDF ===
       State, upload handler, thumbnail renderer, splitPDF() */

    /* === COMPRESS PDF ===
       State, upload handler, compressPDF() */

    /* === PDF TO PPT ===
       State, upload handler, convertPdfToPptx() */

    /* === PPT TO PDF ===
       State, upload handler, convertPptxToPdf() */
  </script>
```

### Structure Rationale

- **Section-per-tool JS blocks:** Mirrors existing split between PDF tools block (lines 779-1210) and Watermark block (lines 1211-1594). Each new tool gets its own named block with state, upload, and processing function. No tool reads another tool's state variables.
- **Shared utilities stay central:** `showStatus()`, `hideStatus()`, `updateProgress()`, `escapeHtml()` remain in their existing location and accept a `statusId` / DOM references from each tool's block.
- **CSS additions go at the end of the style block:** New selectors for thumbnail grid and quality slider are appended after existing rules to avoid touching existing styles.
- **CDN scripts load before the script block:** JSZip and PptxGenJS added via `<script src="...">` tags alongside existing pdf-lib and PDF.js CDN tags.

## Architectural Patterns

### Pattern 1: Nav/Section Tab Switch

**What:** Each `nav-link` button carries a `data-tool` attribute matching a `tool-section` element ID. A single nav click handler loops all sections and shows/hides based on match.

**When to use:** Every new tool added — just add a nav button and a section div, the handler requires no change if written generically.

**Trade-offs:** Simple and zero-overhead. Adding 4 new tabs means the nav bar may overflow on narrow screens — mitigate with CSS flex-wrap or horizontal scroll on `.navbar`.

**Example (extending existing pattern):**
```javascript
// Existing nav handler (lines 766-776) — works without change if
// nav buttons use data-tool attribute and sections use matching IDs
document.querySelectorAll('.nav-link').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tool-section').forEach(s => s.style.display = 'none');
    btn.classList.add('active');
    document.getElementById('tool-' + btn.dataset.tool).style.display = 'block';
  });
});
```

### Pattern 2: File Upload Area (Click + Drag-Drop)

**What:** Upload area div has both a click handler (opens hidden file input) and drag-drop handlers (validate + process dropped files). Validation checks MIME type and/or extension.

**When to use:** Every new tool section that accepts file input.

**Trade-offs:** Copy-paste of ~30 lines per tool section. Acceptable given the no-build constraint — do not extract into a factory function unless the duplication becomes unmaintainable.

**Example (Split PDF variant):**
```javascript
const uploadAreaSplit = document.getElementById('uploadAreaSplit');
const fileInputSplit  = document.getElementById('fileInputSplit');
let splitFile = null;

uploadAreaSplit.addEventListener('click', () => fileInputSplit.click());
fileInputSplit.addEventListener('change', e => handleSplitFileSelect(e.target.files));
uploadAreaSplit.addEventListener('dragover', e => { e.preventDefault(); uploadAreaSplit.classList.add('dragover'); });
uploadAreaSplit.addEventListener('dragleave', () => uploadAreaSplit.classList.remove('dragover'));
uploadAreaSplit.addEventListener('drop', e => {
  e.preventDefault();
  uploadAreaSplit.classList.remove('dragover');
  const files = [...e.dataTransfer.files].filter(f => f.type === 'application/pdf');
  if (files.length) handleSplitFileSelect(files);
});
```

### Pattern 3: Split PDF — Thumbnail Grid + Range Text Input

**What:** After a PDF is uploaded to the Split tool, render every page as a thumbnail using PDF.js (same `renderPage` approach already used by PDF-to-images). Display thumbnails in a CSS grid. User interacts via one of two modes: (a) click thumbnails to toggle page selection for extraction, or (b) type a range string (e.g. `1-3, 5, 7-9`). A submit button runs the split.

**When to use:** Split PDF tool section only.

**Trade-offs:** Rendering all page thumbnails for a large PDF (50+ pages) is computationally expensive on the main thread. Acceptable for the internal tool use case — warn user if >30 pages and render thumbnails lazily (render visible ones first using IntersectionObserver or simply paginate the grid). Thumbnails at low scale (e.g. 0.3) render quickly.

**Thumbnail render approach (HIGH confidence — same PDF.js API already in use):**
```javascript
async function renderSplitThumbnails(pdfDoc) {
  const grid = document.getElementById('splitThumbnailGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 0.25 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const thumb = document.createElement('div');
    thumb.className = 'split-page-thumb';
    thumb.dataset.page = i;
    thumb.appendChild(canvas);
    const label = document.createElement('span');
    label.textContent = i;
    thumb.appendChild(label);
    thumb.addEventListener('click', () => thumb.classList.toggle('selected'));
    grid.appendChild(thumb);
  }
}
```

**Range parsing utility:**
```javascript
function parsePageRanges(rangeStr, totalPages) {
  // "1-3, 5, 7-9" → [[1,2,3],[5],[7,8,9]]  (0-indexed for pdf-lib)
  return rangeStr.split(',').map(part => {
    const [a, b] = part.trim().split('-').map(Number);
    const from = Math.max(1, a);
    const to   = b ? Math.min(totalPages, b) : from;
    const pages = [];
    for (let p = from; p <= to; p++) pages.push(p - 1); // 0-indexed
    return pages;
  }).filter(r => r.length > 0);
}
```

**Split execution with pdf-lib (HIGH confidence — `copyPages` API verified):**
```javascript
async function splitPDF(sourcePdfBytes, pageGroups) {
  // pageGroups: array of arrays of 0-indexed page numbers
  const { PDFDocument } = PDFLib;
  const sourceDoc = await PDFDocument.load(sourcePdfBytes);
  const results = [];
  for (const group of pageGroups) {
    const newDoc  = await PDFDocument.create();
    const copied  = await newDoc.copyPages(sourceDoc, group);
    copied.forEach(p => newDoc.addPage(p));
    results.push(await newDoc.save());
  }
  return results; // array of Uint8Array, one per output PDF
}
```

**Download strategy:** Single output → direct download. Multiple outputs → bundle with JSZip (CDN: `https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js`). This is the established pattern for browser-based multi-file PDF tools (MEDIUM confidence — verified by multiple sources).

### Pattern 4: Compress PDF — Canvas Re-encode Images

**What:** pdf-lib has NO native image compression API (confirmed in GitHub issue #71 — maintainer explicitly stated this will not be added). The only viable client-side approach is: (1) extract embedded images from the PDF using pdf-lib, (2) redraw at reduced quality/resolution via HTML Canvas, (3) re-embed the compressed JPEG/PNG back into a new PDFDocument.

**When to use:** Compress PDF tool only.

**Trade-offs:** This approach only reduces file size when the PDF contains embedded raster images. For PDFs that are large due to fonts, vector graphics, or many pages without images, client-side "compression" will be minimal or zero. This must be communicated honestly to the user ("results depend on image content"). The workaround will not match server-side tools like Ghostscript or Adobe Acrobat's compression quality.

**Quality control UI:** Three or four named presets is the clearest UX (confirmed by real-world tools). Avoid raw percentage sliders — they provide false precision.

Recommended:
```
[High Quality] [Balanced] [Small File]
  JPEG 90%      JPEG 70%    JPEG 50%
```
Implemented as radio buttons or button group, mapping to a `quality` value (0.0–1.0) passed to `canvas.toDataURL('image/jpeg', quality)`.

**Scale reduction:** Optionally downscale image dimensions (e.g. 0.75x for "Small File") before JPEG encoding. This compounds size reduction with quality reduction.

**Implementation sketch (LOW confidence on pdf-lib image extraction API — requires verification during implementation phase):**
```javascript
// pdf-lib v1.17.1: PDFDocument.embedJpg / embedPng accept raw bytes.
// Extracting existing images requires iterating page resources (XObject dict).
// This is undocumented territory — treat as "needs phase research".
// Safer fallback: re-render each page via PDF.js to canvas at reduced scale,
// then create a new PDF from those canvas images.
```

**Safer compression alternative (MEDIUM confidence):** Re-render all pages via PDF.js at lower resolution (e.g. `scale: 1.0` → `scale: 0.8`), export as JPEG, and create a new PDF from those images using pdf-lib `embedJpg`. This trades text sharpness for guaranteed compression. Good for scanned PDFs; bad for text-heavy PDFs.

### Pattern 5: PDF to PowerPoint — Image-Slide Approach

**What:** True structural PDF→PPTX conversion (preserving text, fonts, layout as editable elements) is not feasible client-side. No browser-compatible library accomplishes this (verified: all solutions found require server-side processing or paid SDKs like Aspose).

**The viable approach:** Render each PDF page to a canvas (PDF.js), export as base64 PNG/JPEG, and insert each as a full-bleed image into a PptxGenJS slide. Output is a valid `.pptx` file with one image per slide — non-editable text but visually correct.

**This approach is used by real tools** (e.g., online tools citing "PDF.js + PptxGenJS") and satisfies the internal use case of "create a PPT from a PDF for a presentation" even though text is not selectable.

**PptxGenJS CDN (HIGH confidence — verified):**
```
https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js
```
Version 4.0.1 (released June 2025). Includes JSZip internally — no separate JSZip needed for PDF→PPT (but Split PDF still needs JSZip separately).

**Implementation pattern (MEDIUM confidence — API verified for base64 image slides):**
```javascript
async function convertPdfToPptx(pdfBytes) {
  const pdf  = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 16:9

  for (let i = 1; i <= pdf.numPages; i++) {
    const page     = await pdf.getPage(i);
    const vp       = page.getViewport({ scale: 2.0 }); // 2x for quality
    const canvas   = document.createElement('canvas');
    canvas.width   = vp.width;
    canvas.height  = vp.height;
    const ctx      = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    const imgData = canvas.toDataURL('image/jpeg', 0.85); // strip "data:image/jpeg;base64,"
    const base64  = imgData.split(',')[1];

    const slide = pres.addSlide();
    slide.addImage({ data: 'image/jpeg;base64,' + base64, x: 0, y: 0, w: '100%', h: '100%' });
  }

  await pres.writeFile({ fileName: 'output.pptx' });
}
```

**Output caveat to surface in UI:** "Slides contain page images. Text is not editable." This sets correct expectations and avoids user confusion.

### Pattern 6: PPT to PDF — Render-via-HTML Approach

**What:** Converting PPTX to PDF fully client-side is the most complex of the four new features. The fundamental problem: PPTX is a ZIP of XML + assets, and browser JS has no native renderer for it.

**Options assessed:**

| Option | Feasibility | CDN available | Notes |
|--------|-------------|---------------|-------|
| PPTXjs (meshesha/PPTXjs) | Partial | Yes | jQuery dependency; limited shape support; renders to HTML divs |
| PPTX2HTML (g21589) | Partial | Yes (jsDelivr) | Appears dormant (last commit unknown); Beta 0.2.7 |
| Aspose.Slides for JS | Full | No (npm only, WASM) | Commercial; requires build step |
| Server API (ConvertAPI, Cloudmersive) | Full | N/A | Violates privacy constraint |
| html2pdf.js + PPTXjs render | Possible | Yes | Two-step: render PPTX to HTML, capture HTML to PDF via html2canvas+jsPDF |

**Recommended approach (MEDIUM confidence):** Use PPTXjs or PPTX2HTML to render each slide as an HTML div, then use html2canvas to capture each rendered div to a canvas image, then use pdf-lib to assemble those images into a PDF. This is a chain of three libraries, all CDN-loadable, all browser-compatible.

**Practical limitations:** Animation, complex shapes, custom fonts, and master slide themes will not render correctly. For an internal tool handling basic CLMC presentation files, this is acceptable. Users should be warned: "Complex shapes and animations may not render accurately."

**Build order implication:** PPT→PDF is the riskiest feature to implement and should be built last. The PPTX rendering quality depends heavily on the actual PPTX files CLMC uses — validate with representative samples before committing to this approach.

**Alternative if PPT→PDF renders poorly:** Scope down to a "PPTX Preview" mode that renders slides as images in-browser (no PDF output), which is still useful and avoids the conversion complexity. Or accept a browser print-to-PDF workaround (render slides to full-screen HTML divs, instruct user to print → save as PDF).

## Data Flow

### Split PDF Flow

```
User uploads PDF
    ↓
PDF.js renders page thumbnails → display in grid
    ↓
User selects pages (click thumbnails) OR types range string
    ↓
"Split PDF" button → parsePageRanges() or collect selected page numbers
    ↓
pdf-lib: PDFDocument.load() → copyPages() per group → newDoc.save() per group
    ↓
Single output: direct blob download
Multiple outputs: JSZip bundle → single .zip download
```

### Compress PDF Flow

```
User uploads PDF(s)
    ↓
User selects quality preset (High / Balanced / Small)
    ↓
"Compress PDF" button → compressPDF() per file
    ↓
PDF.js: render each page to canvas at target scale
    ↓
canvas.toDataURL('image/jpeg', quality) per page
    ↓
pdf-lib: new PDFDocument, embedJpg per page, addPage → save
    ↓
Download compressed PDF (show original vs compressed size)
```

### PDF to PPT Flow

```
User uploads PDF
    ↓
"Convert to PPT" button → convertPdfToPptx()
    ↓
PDF.js: render each page to canvas at 2x scale
    ↓
canvas.toDataURL('image/jpeg', 0.85) per page
    ↓
PptxGenJS: new pptxgen(), LAYOUT_WIDE, addSlide() + addImage() per page
    ↓
pres.writeFile() → downloads .pptx
```

### PPT to PDF Flow

```
User uploads .pptx
    ↓
"Convert to PDF" button → convertPptxToPdf()
    ↓
PPTXjs/PPTX2HTML: render slides to hidden HTML divs
    ↓
html2canvas: capture each div to canvas
    ↓
pdf-lib: new PDFDocument, embedPng per canvas → addPage → save
    ↓
Download .pdf
```

## Build Order

**Recommended implementation sequence:**

1. **Split PDF** — Implement first.
   - Depends only on pdf-lib (already loaded) + JSZip (one new CDN).
   - pdf-lib `copyPages` API is well-documented and reliable.
   - The thumbnail UI extends the existing PDF.js page-render pattern exactly.
   - Delivers immediate value; lowest technical risk.

2. **Compress PDF** — Implement second.
   - Depends only on PDF.js + pdf-lib (both already loaded).
   - No new CDN libraries required.
   - The page-render-to-canvas approach is a known pattern.
   - Limitation: compression only meaningful for image-heavy PDFs. Manage expectations in UI.

3. **PDF to PPT** — Implement third.
   - Adds PptxGenJS CDN (one new library, well-maintained, v4.0.1).
   - PDF.js rendering pattern already established from Split + Compress work.
   - Image-slide approach is straightforward and well-documented.
   - Output is honest and useful (visual slides, not editable text).

4. **PPT to PDF** — Implement last.
   - Highest complexity; depends on two new CDN libraries (PPTXjs/PPTX2HTML + html2canvas/jsPDF).
   - Rendering fidelity is uncertain until tested with real CLMC PPTX files.
   - Needs phase-specific research: test PPTXjs and PPTX2HTML with actual files before deciding which to use.
   - If rendering quality is unacceptable, fall back to browser-print workaround or scope as "render preview only."

## PPT Conversion Output Decision

**PDF→PPT output: PPTX with image slides** (not a "PDF-based approach").

Rationale: PptxGenJS produces standards-compliant OOXML `.pptx` files that open in PowerPoint, Keynote, and LibreOffice. The output is a real PPTX — it just contains images instead of editable text. This is the correct choice because:
- Users receive a file they can open in their presentation software
- They can add annotations, speaker notes, and transitions
- The file is transferable and shareable as a normal PPTX

A "PDF-based approach" (e.g., just renaming or embedding) would not open in PowerPoint and would confuse users.

**PPT→PDF output: PDF assembled from rendered page images** (pdf-lib output).

The PDF contains one page per slide, each page being a rasterized JPEG of the rendered slide. It is a valid, openable PDF — not a searchable/copyable text PDF, but appropriate for the internal use case of sharing presentations as fixed documents.

## Anti-Patterns

### Anti-Pattern 1: Shared Mutable State Between Tool Sections

**What people do:** Reuse a single `selectedFiles` array for all tools, or put file state in a global object shared across sections.

**Why it's wrong:** Tool sections are independent. If a user switches tabs mid-operation, shared state causes incorrect file processing for the wrong tool. The existing codebase correctly uses `selectedPdfFiles` for PDF tools and `watermarkFiles` for watermark — follow this pattern.

**Do this instead:** Each tool section declares its own state variables (`splitFile`, `compressFiles`, `pdfToPptFile`, `pptToPdfFile`). Never read another tool's state variables.

### Anti-Pattern 2: Blocking Main Thread with Large PDF Processing

**What people do:** Run all page rendering and image compression synchronously in a for-loop with `await` on the main thread for large PDFs.

**Why it's wrong:** Canvas operations and PDF.js rendering are CPU-intensive. The browser UI freezes. For the existing tools this is tolerated (existing codebase has this issue, noted in ARCHITECTURE.md line 174). For new tools adding image re-encoding (Compress) and multi-page canvas render (PDF→PPT), the freeze risk increases.

**Do this instead:** Yield to the event loop between pages by wrapping page loop iterations with a short async yield (`await new Promise(r => setTimeout(r, 0))` between every N pages). Update progress bar after each page to show the UI is alive. A full Web Worker solution is ideal but incompatible with the no-build constraint.

### Anti-Pattern 3: Treating pdf-lib Compress as True Compression

**What people do:** Call the feature "Compress PDF" and not communicate its limitations, leading to user confusion when a text-heavy PDF is not reduced in size.

**Why it's wrong:** pdf-lib has no native compression API. The canvas re-encode approach only reduces image bytes. Non-image content is unaffected. Users will complain the tool "doesn't work."

**Do this instead:** Show the original file size and compressed file size after processing. If the new file is larger or the same size, display a message: "This PDF contains minimal image data — compression had little effect." This is honest and prevents support confusion.

### Anti-Pattern 4: Monolithic Processing Function Without Progress

**What people do:** Write `async function processAll()` that processes all files silently, then shows a result.

**Why it's wrong:** For PDFs with many pages (e.g., 20-page compress, 30-page PDF→PPT), operations take 5-15 seconds. No feedback → user thinks the app is broken.

**Do this instead:** Call `updateProgress(i / total * 100, statusId)` inside each page loop iteration, exactly as the existing `mergePDFs()` and `convertPdfToImages()` functions do.

## Integration Points

### New CDN Libraries Required

| Library | Version | CDN URL | Purpose | Needed by |
|---------|---------|---------|---------|-----------|
| JSZip | 3.10.1 | `https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js` | Multi-file ZIP download | Split PDF |
| PptxGenJS | 4.0.1 | `https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js` | Generate .pptx files | PDF→PPT |
| PPTXjs or PPTX2HTML | varies | jsDelivr | Render PPTX slides to HTML | PPT→PDF |
| html2canvas | latest | jsDelivr | Capture rendered HTML to canvas | PPT→PDF |

Note: PptxGenJS bundle includes JSZip internally — if Split PDF and PDF→PPT are both implemented, only one JSZip `<script>` is needed.

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Nav handler ↔ all tool sections | DOM class toggle + `display` style | Generic handler — no code change needed per new tab if using `data-tool` attribute pattern |
| Split PDF ↔ pdf-lib | Direct function call, `PDFDocument.load()` + `copyPages()` | Synchronous API within async function |
| Compress PDF ↔ PDF.js + pdf-lib | PDF.js renders pages; pdf-lib assembles output | Same two-library chain used by existing PDF-to-images tool |
| PDF→PPT ↔ PDF.js + PptxGenJS | PDF.js renders pages; PptxGenJS assembles .pptx | One-directional data flow: canvas → base64 → slide |
| PPT→PDF ↔ PPTXjs + html2canvas + pdf-lib | Three-step chain | Most fragile boundary — validate with real files |

## Scaling Considerations

This is a static single-user browser application with no server. "Scaling" means file size and page count limits:

| File Scenario | Behavior | Mitigation |
|---------------|----------|------------|
| PDF with <20 pages | All tools work smoothly | None needed |
| PDF with 20-50 pages | Split and Compress may take 5-15s; UI freeze risk | Progress bar + async yield between pages |
| PDF with 50+ pages | PDF→PPT thumbnail render may take 30s+; memory pressure | Warn user; render thumbnails at scale 0.2 or lower; consider lazy render |
| PPTX with complex shapes | PPT→PDF rendering may be visually incorrect | Warning in UI; validate with real CLMC files |
| Very large embedded images in PDF | Compress works well; processing time proportional to image count | Progress bar essential |

## Sources

- pdf-lib official docs: https://pdf-lib.js.org/ (HIGH confidence — `copyPages` API verified)
- pdf-lib GitHub issue #71 (no native image compression): https://github.com/Hopding/pdf-lib/issues/71 (HIGH confidence)
- PptxGenJS GitHub repo: https://github.com/gitbrent/PptxGenJS (HIGH confidence — v4.0.1, base64 image support confirmed)
- PptxGenJS images API: https://gitbrent.github.io/PptxGenJS/docs/api-images/ (HIGH confidence)
- JSZip: https://stuk.github.io/jszip/ (HIGH confidence — established library)
- ilovepdf split UI patterns: https://www.ilovepdf.com/split_pdf + https://www.ilovepdf.com/blog/how-to-separate-pdf-pages (MEDIUM confidence)
- Client-side PDF compression via canvas: https://dev.to/ahmad_shakibnasaj_a8f9bb/building-a-client-side-pdf-compressor-using-javascript-and-web-workers-4dmm (MEDIUM confidence)
- PDF to PPT image-based approach: multiple sources confirming PDF.js + PptxGenJS pattern (MEDIUM confidence)
- PPTX2HTML library: https://github.com/g21589/PPTX2HTML (LOW confidence — appears dormant)
- PPTXjs: https://github.com/meshesha/PPTXjs (LOW confidence — limited shape support)
- PPTX to PDF feasibility: no pure client-side production-ready solution found (HIGH confidence in the absence)

---
*Architecture research for: CLMC Tools — client-side PDF tools web app*
*Researched: 2026-03-02*
