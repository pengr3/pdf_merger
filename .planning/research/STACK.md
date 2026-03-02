# Stack Research

**Domain:** Client-side PDF tools web app (CDN-only, single HTML file)
**Researched:** 2026-03-02
**Confidence:** MEDIUM — Split/PDF-to-PPT patterns are HIGH confidence. Compression is MEDIUM (pdf-lib limitations verified). PPT-to-PDF is LOW for true browser-only; approach is pragmatic workaround.

---

## Existing Stack (Do Not Change)

| Technology | Version | CDN URL |
|------------|---------|---------|
| pdf-lib | 1.17.1 | `https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js` |
| pdfjs-dist | 3.11.174 | `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js` |
| pdfjs-dist worker | 3.11.174 | `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js` |

These are already working in production. Do not upgrade them as part of this milestone — new features should layer on top.

---

## Recommended Stack for New Features

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| pdf-lib | 1.17.1 (existing) | PDF splitting | `copyPages()` + `addPage()` natively handles extracting page ranges into new PDFs. No additional library needed. Already loaded. |
| pdf-lib | 1.17.1 (existing) | PDF compression (structural) | `pdfDoc.save({ useObjectStreams: true })` enables object stream compression (15–25% size reduction on complex PDFs). Only effective compression available without re-rendering. |
| PDF.js | 3.11.174 (existing) | PDF-to-PPTX rendering | Renders each PDF page to a canvas at configurable scale. Already loaded. Used to extract image data per page. |
| PptxGenJS | 4.0.1 | PDF-to-PPTX output, PPT-to-PDF (read) | The only mature, CDN-available, actively maintained JavaScript library for generating PPTX files in-browser. Accepts base64 image data directly via `slide.addImage({ data: ... })`. v4.0.1 released June 2025. |
| JSZip | 3.10.1 | Zip multiple split PDFs for download | MIT-licensed. Required when user splits a PDF into N files — bundle them into one download. Note: PptxGenJS bundle already includes JSZip; load separately only if needed for split PDF download. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| JSZip | 3.10.1 | Bundle multiple split PDFs | Only needed if split PDF feature offers "download all as ZIP". The PptxGenJS bundle already ships JSZip internally — do NOT load a second copy if PptxGenJS is also loaded. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Browser DevTools | Testing and debugging | All processing is synchronous/async in-browser. Use Network tab to confirm zero file uploads. |
| Static HTTP server | Local testing | `file://` protocol may block Blob URLs in some browsers. Use `python -m http.server` or similar. |

---

## CDN URLs

```html
<!-- PptxGenJS 4.0.1 — bundle includes JSZip (use this for PDF-to-PPTX) -->
<script src="https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js"></script>

<!-- JSZip 3.10.1 — only load this if NOT using PptxGenJS bundle (split PDF ZIP download) -->
<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
```

Note: `pptxgen.bundle.js` (450 KB) is the correct browser file — it bundles JSZip. The `pptxgen.min.js` (265 KB) is a non-bundled minified build that requires JSZip loaded separately.

---

## Feature-by-Feature Library Decisions

### 1. Split PDF — pdf-lib (existing, no new dependency)

**Verdict:** pdf-lib handles this entirely. No additional library needed.

**Confidence:** HIGH — Verified against pdf-lib official site and GitHub.

**How it works:**
```javascript
// pdf-lib already loaded as PDFLib global
const srcPdf = await PDFLib.PDFDocument.load(arrayBuffer);
const pageCount = srcPdf.getPageCount();

for (const range of pageRanges) {
  const newPdf = await PDFLib.PDFDocument.create();
  const pages = await newPdf.copyPages(srcPdf, range); // range = [0, 1, 2, ...]
  pages.forEach(p => newPdf.addPage(p));
  const bytes = await newPdf.save();
  // trigger Blob download
}
```

**Known limitation:** `copyPages()` copies the entire XObject resource dictionary from the source PDF, not just resources used by the copied page. This means split files may be slightly larger than expected when the source PDF has shared image resources. This is a known pdf-lib issue (#1662) and is acceptable for this use case.

---

### 2. Compress PDF — pdf-lib + Canvas API (existing + browser native)

**Verdict:** True lossless structural compression is limited but achievable. Image re-compression requires a two-pass approach using PDF.js (render) + Canvas API + pdf-lib (re-embed). No additional CDN library is needed.

**Confidence:** MEDIUM — pdf-lib `useObjectStreams` is documented. The image re-render approach is established but complex to implement correctly.

**What pdf-lib CAN compress:**
- Object streams via `pdfDoc.save({ useObjectStreams: true })` — 15–25% reduction
- This is the only native compression option. pdf-lib does NOT natively compress embedded images.

**What requires the Canvas approach for image-heavy PDFs:**
1. Use PDF.js to render each page to canvas (same as watermark feature already does)
2. Use `canvas.toDataURL('image/jpeg', 0.7)` to get compressed image bytes
3. Create a new PDF with pdf-lib, embed each page as a JPEG image
4. Trade-off: result loses all text selectability and becomes image-only PDF

**Recommendation:** Implement a "fast compress" mode using `useObjectStreams: true` (lossless, 15–25% reduction) and a "heavy compress" mode that re-renders to images (lossy, 60–80% reduction, loses text layer). Communicate the trade-off clearly in the UI.

**Avoid:** Any server-side compression API (e.g., ConvertAPI, IronPDF, Apryse paid SDK). These violate the privacy-first constraint.

---

### 3. PDF to PowerPoint (PDF → PPTX) — PDF.js + PptxGenJS

**Verdict:** Fully achievable client-side. Not a true "editable" conversion — outputs image-per-slide PPTX. This is the correct approach for in-browser and matches what privacy-first web tools (e.g., QuickToolerHub) do.

**Confidence:** HIGH — Both libraries have documented, working browser APIs for exactly this pipeline.

**How it works:**
```javascript
// Step 1: Load PptxGenJS (new CDN dependency)
// Step 2: Use PDF.js (existing) to render each page to canvas
// Step 3: Extract canvas data as base64 JPEG
// Step 4: Use PptxGenJS to create presentation with one image-slide per page

const pres = new PptxGenJS();
pres.layout = 'LAYOUT_WIDE'; // or set custom dimensions matching PDF page size

for (let i = 1; i <= numPages; i++) {
  const page = await pdfDoc.getPage(i);
  const viewport = page.getViewport({ scale: 2.0 });
  // render to canvas...
  const imageData = canvas.toDataURL('image/jpeg', 0.85);

  const slide = pres.addSlide();
  slide.addImage({
    data: imageData,
    x: 0, y: 0,
    w: '100%', h: '100%'
  });
}

await pres.writeFile({ fileName: 'output.pptx' });
```

**Trade-off to communicate in UI:** Slides are image-based (not editable text). This is inherent to client-side conversion — true PPTX with editable text requires server-side OCR/layout analysis (e.g., LibreOffice, Aspose).

**PptxGenJS v4.0.1 browser CDN:**
`https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js`

---

### 4. PowerPoint to PDF (PPTX → PDF) — NOT achievable client-side without commercial SDK

**Verdict:** True client-side PPTX → PDF conversion is NOT feasible with free, CDN-available libraries in 2026. Recommended approach: use PPTXjs (open source, deprecated but functional) to render PPTX to HTML, then use html2canvas + pdf-lib to produce a PDF. This is low-fidelity but server-free.

**Confidence:** LOW for the workaround approach. HIGH for the "no free library does this cleanly" finding.

**Why no free solution exists:**
- PPTX parsing requires implementing a significant subset of the OOXML spec (fonts, shapes, animations, masters, layouts, charts)
- LibreOffice WASM is 150MB+, takes 10–15s to initialize, uses 200–300MB RAM — impractical in a browser tab (confirmed by multiple 2025 sources)
- Nutrient Web SDK (formerly PSPDFKit) and Apryse WebViewer can do this but are commercial (paid license, not CDN-free)
- ZetaOffice (LibreOffice WASM fork) entered public beta in late 2024 but is not production-ready and not available as a simple CDN include

**Recommended pragmatic approach (image-based, low fidelity):**

Option A — PPTXjs + html2canvas + pdf-lib:
1. PPTXjs (v1.21.1, last updated March 2022) parses PPTX and renders slides as HTML divs
2. html2canvas captures each slide div as a canvas
3. pdf-lib creates a PDF and embeds the canvas images

```html
<!-- PPTXjs: no npm CDN available; host locally or use GitHub raw -->
<!-- html2canvas 1.4.1 -->
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
```

**PPTXjs caveat:** Last release was March 2022 (v1.21.1). No CDN URL on jsDelivr/unpkg — must be loaded from GitHub raw or self-hosted. Complex slides (charts, animations, custom fonts) will render poorly. jQuery dependency.

Option B — Scope descope for this milestone:
Declare PPT → PDF as "requires server" in the UI and show a clear message. This is honest and avoids shipping a low-fidelity feature. Revisit when ZetaOffice or a similar WASM solution matures.

**Recommendation: Descope PPT → PDF from this milestone or implement with heavy fidelity warnings.** The tool's value proposition is privacy (client-side). Shipping a broken/low-fidelity PPTX → PDF conversion damages trust more than not having the feature.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| pdf-lib `copyPages` for split | Any other library | pdf-lib is already loaded; copyPages is documented and sufficient |
| pdf-lib `useObjectStreams` + Canvas re-render for compress | compress-pdf npm package, IronPDF, Apryse | npm packages require a build step; IronPDF/Apryse are server-side commercial |
| PDF.js + PptxGenJS for PDF→PPTX | Nutrient Web SDK, Apryse | Commercial/paid; require licensing; not CDN-free |
| Descope PPTX→PDF OR html2canvas approach | LibreOffice WASM, Nutrient Web SDK | LibreOffice WASM is 150MB+, crashes browsers; Nutrient/Apryse are paid |
| PptxGenJS 4.0.1 bundle | PptxGenJS 3.x | v4.0.1 is current (June 2025); v3.x is outdated |
| JSZip 3.10.1 (if needed) | JSZip via PptxGenJS bundle | Don't double-load JSZip; use PptxGenJS bundle (which includes JSZip) for PPT features |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| LibreOffice WASM / ZetaOffice | 150MB bundle, 10–15s init, 200–300MB RAM, crashes browser tabs | Not applicable — no free alternative for PPTX→PDF |
| Nutrient Web SDK / PSPDFKit | Paid commercial license; not CDN-free; violates zero-cost constraint | Descope or html2canvas workaround |
| Apryse WebViewer / PDFTron | Paid commercial license; not CDN-free | Descope or html2canvas workaround |
| ConvertAPI, IronPDF | Server-side APIs; violate privacy-first constraint (files leave browser) | Any client-side approach |
| compress-pdf npm package | Requires Node.js / build step; not browser CDN compatible | pdf-lib native + Canvas API |
| PPTXjs (meshesha) as primary PPTX→PDF | Last updated March 2022; unmaintained; no CDN; jQuery dependency; poor fidelity on complex slides | Descope PPTX→PDF; revisit when ZetaOffice matures |
| html2pdf.js for PDF→PPT | Wrong direction — converts HTML to PDF, not PDF to PPTX | PDF.js + PptxGenJS |

---

## Stack Patterns by Scenario

**If splitting into individual pages only:**
- Use pdf-lib `copyPages` in a loop, trigger individual Blob downloads or zip with JSZip
- No new CDN dependency needed

**If splitting into multiple page ranges:**
- Same pdf-lib approach; build a UI for range input (e.g., "1-3, 5, 7-9")

**If compressing a text-heavy PDF:**
- Use `pdfDoc.save({ useObjectStreams: true })` — fast, lossless, 15–25% reduction
- No re-render needed

**If compressing an image-heavy PDF:**
- PDF.js renders pages to canvas → `canvas.toDataURL('image/jpeg', quality)` → pdf-lib re-embeds
- Warn user: output loses text selectability

**If converting PDF to PPTX:**
- Load PptxGenJS bundle; PDF.js renders pages; PptxGenJS outputs PPTX
- One new CDN script tag required

**If converting PPTX to PDF:**
- Do NOT build this in this milestone without a clear "low fidelity" disclaimer
- Recommended: show an in-app message explaining limitations, defer feature

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| pdf-lib@1.17.1 | pdfjs-dist@3.11.174 | No direct interaction; both read/write PDFs independently |
| PptxGenJS@4.0.1 | pdfjs-dist@3.11.174 | No interaction; PPTX gets canvas data from PDF.js render output |
| PptxGenJS@4.0.1 | JSZip@3.10.1 (bundled internally) | PptxGenJS bundle ships JSZip 3.x; do not load external JSZip if PptxGenJS bundle is used |
| html2canvas@1.4.1 | pdf-lib@1.17.1 | No direct interaction; html2canvas produces canvas → pdf-lib embeds it |

---

## Sources

- pdf-lib official site (https://pdf-lib.js.org/) — copyPages, save options, CDN URLs — HIGH confidence
- pdf-lib GitHub releases (https://github.com/Hopding/pdf-lib/releases) — confirmed v1.17.1 is latest (Nov 2022) — HIGH confidence
- pdf-lib SaveOptions docs (https://pdf-lib.js.org/docs/api/interfaces/saveoptions) — useObjectStreams confirmed — HIGH confidence
- PptxGenJS GitHub (https://github.com/gitbrent/PptxGenJS) — v4.0.1, June 2025, browser bundle — HIGH confidence
- PptxGenJS installation docs (https://gitbrent.github.io/PptxGenJS/docs/installation/) — bundle CDN URL confirmed — HIGH confidence
- PptxGenJS addImage docs (https://gitbrent.github.io/PptxGenJS/docs/api-images/) — data/base64 support confirmed — HIGH confidence
- jsDelivr pptxgenjs dist listing (https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/) — pptxgen.bundle.js (450KB) confirmed — HIGH confidence
- DEV Community: browser WASM PPTX conversion (https://dev.to/digitalofen/i-tried-running-file-conversion-fully-in-the-browser-wasm-libreoffice-ffmpeg-57mh) — LibreOffice WASM impractical, 150MB+, hybrid required — MEDIUM confidence
- WebSearch: PDF→PPTX client-side (QuickToolerHub pattern PDF.js + PptxGenJS) — MEDIUM confidence
- WebSearch: PPTXjs (meshesha) last release March 2022, no CDN, jQuery dependency — MEDIUM confidence
- StudyRaid/pdf-lib compression article — useObjectStreams 15-25%, Canvas re-render 60-80%, image compression not native — MEDIUM confidence

---

*Stack research for: Client-side PDF tools web app (CLMC Tools)*
*Researched: 2026-03-02*
