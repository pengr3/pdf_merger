# Feature Research

**Domain:** Client-side browser PDF tools (Split, Compress, PDF↔PPT)
**Researched:** 2026-03-02
**Confidence:** MEDIUM — competitor UX observed directly; client-side implementation feasibility cross-checked against library issues and npm packages; PDF↔PPT client-side approach LOW confidence due to sparse open-source tooling.

---

## Context: What Already Exists

This is a subsequent milestone. The app already ships:
- Merge PDFs (pdf-lib)
- PDF to images / PNG / JPEG (PDF.js canvas render)
- Watermark insertion (corner, center, diagonal)
- Drag-and-drop upload with reordering

Architecture constraint: single `index.html`, CDN-only dependencies, zero server calls.

---

## Feature 1: Split PDF

### Table Stakes

Features users expect from any split tool. Missing = product feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Split every page into separate PDFs | Most common use case — "I want individual pages" | LOW | pdf-lib: create new PDFDocument per page, copyPages() from source |
| Split by custom page range (e.g., 1-3, 5-7) | Power user need — extract a chapter, a section | MEDIUM | Requires range input parsing + validation; pdf-lib handles multi-page copies easily |
| Download as ZIP when multiple files produced | Without ZIP, users get 20 individual downloads for a 20-page PDF — unusable | MEDIUM | JSZip available via CDN; already pattern-matched in PDF-to-images feature if ZIP was added there |
| Page count display before splitting | Users need to know "this is 24 pages" before they choose ranges | LOW | PDF.js or pdf-lib can read page count on load |
| Visual feedback on split result (file count, page ranges) | Users need confirmation of what they will get | LOW | Text summary sufficient: "Will produce 3 files" |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Page thumbnail grid for visual selection | Click-to-select pages instead of typing ranges — matches iLovePDF's "Pages mode" | HIGH | Requires PDF.js canvas render per page; memory-intensive for large PDFs; significant UI work |
| Split every N pages (fixed intervals) | "Give me 10-page chunks" — useful for large reports | LOW | Simple math on page count; minimal UI addition |
| Odd/even page extraction | Duplex scanning artifacts, alternating content | LOW | Filter page indices by modulo; niche but cheap to add |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Split by file size | iLovePDF offers it as Premium; sounds useful | Requires rendering/compression estimation to know output size before splitting — circular dependency, unpredictable client-side | Offer split by page count with guidance: "~10 pages ≈ Xmb" |
| Password-protected PDF splitting | Users ask because they need it | Encrypted PDFs require password decryption; pdf-lib has partial support but edge cases are many; out of scope for v1 | Display clear "password-protected PDFs not supported" error |
| Preview of each output file before download | Logical UX request | Rendering N PDFs in browser before download is O(N) canvas work — blocks UI for large docs | Show page range summary text instead |

---

## Feature 2: Compress PDF

### What Compression Actually Does Client-Side

**Critical finding (HIGH confidence, confirmed via pdf-lib GitHub issue #71):** pdf-lib cannot re-compress existing embedded images. The maintainer explicitly closed the feature request as "won't add." This is the core of PDF compression.

Three realistic client-side approaches:
1. **Structural/lossless only** — remove redundant objects, compress streams with FlateDecode. Savings: 5-20% on bloated PDFs; zero impact on already-optimized files.
2. **Render-to-JPEG** (what tools like `@quicktoolsone/pdf-compress` do) — use PDF.js to render each page to canvas, export as JPEG at quality Q, rebuild PDF with pdf-lib using those images. Savings: 30-70%. Downside: output is image-only (no selectable text, no hyperlinks).
3. **Hybrid** — structural pass first, then render-to-JPEG if size target not met. Most complex.

The app already does render-to-canvas (PDF to images feature), so approach 2 is feasible with existing dependencies.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| At least two quality presets (e.g., "Standard" / "High compression") | iLovePDF offers 2 presets; Smallpdf offers 2. Users expect a choice, even a simple one | LOW | Maps to JPEG quality: Standard = 0.7, High compression = 0.4 |
| Show original vs. compressed file size | Users need to verify the tool actually did something | LOW | Read input ArrayBuffer.byteLength; compressed Blob.size |
| Single-click download of compressed file | Table stakes UX | LOW | — |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Three presets: Lossless / Balanced / Max | Matches professional tool patterns; "Lossless" sets user expectation correctly for structural-only pass | LOW | Lossless = structural FlateDecode only; Balanced = JPEG 0.7; Max = JPEG 0.4 |
| Size reduction percentage display | "Reduced by 45%" — users love this confirmation | LOW | Simple calculation |
| Progress bar per page during compression | Render-to-JPEG is synchronous per page; 30-page PDF takes noticeable time | MEDIUM | PDF.js render loop; update progress bar each iteration |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Custom quality slider (0-100%) | Feels granular and powerful | Users cannot map numbers to visual outcomes; research shows iLovePDF deliberately avoided this because it "wouldn't offer significant changes" and creates false expectations | Use named presets: Lossless, Balanced, Max |
| "Compress without quality loss" on image-heavy PDFs | Users want magic | Lossless-only saves <10% on image-heavy PDFs; users feel deceived | Clearly label what "Lossless" does: "removes metadata/redundant data, preserves image quality" |
| Target file size input ("compress to under 1MB") | Sounds professional | Client-side: cannot predict output size before rendering all pages; would require iterative rendering — O(N*iterations) cost | Show result after compression; user can re-compress if needed |

**Architecture note:** Render-to-JPEG compression destroys text layer. For this app (internal CLMC document handling), users should be warned: "High compression mode converts pages to images — text will no longer be selectable or searchable." This is a MUST-have warning label, not optional.

---

## Feature 3: PDF to PPT (PDF → PPTX)

### What the Output Actually Is

**Critical finding:** There are two fundamentally different output types:

| Approach | Output | Text Editable | Quality | Client-Side Feasible? |
|----------|--------|--------------|---------|----------------------|
| Image-per-slide | Each PDF page rendered as image, embedded in slide | No | Pixel-perfect (what you see = what you get) | YES — PDF.js render + PptxGenJS |
| OCR/layout extraction | Attempt to detect text boxes, re-place as PPT text | Yes (with errors) | Poor-to-moderate; formatting breaks constantly | Requires server-side OCR or commercial WebAssembly SDK (Nutrient/Apryse, paid) |

**For a client-side CDN-only app: image-per-slide is the only viable approach.** Editable-text conversion requires OCR engines not available as free CDN libraries.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| One slide per PDF page | This IS the feature — users expect 1:1 page-to-slide mapping | MEDIUM | PDF.js renders each page to canvas → base64 PNG → PptxGenJS adds as image slide |
| Output as downloadable .pptx file | Users need to open it in PowerPoint/Google Slides | MEDIUM | PptxGenJS outputs .pptx natively; available via CDN (jsDelivr) |
| Preserve original page dimensions/aspect ratio | A 16:9 PDF should produce 16:9 slides, not squashed | LOW | PptxGenJS slide dimensions configurable; read from PDF page mediaBox |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Slide resolution control (Standard 96dpi / High 144dpi) | High-res slides look sharp when projected; low-res is faster to generate | LOW | Maps to PDF.js render scale parameter (1.0 vs 1.5 vs 2.0) |
| Progress indicator per page | Large PDFs take time to render all pages | MEDIUM | Same pattern as compression render loop |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Editable text in output slides | Users assume "convert" means "editable" | Requires paid OCR SDK (Nutrient, Apryse) or server-side processing — violates client-only constraint | Be explicit in UI: "Slides contain images of each page. Text is not editable." Set expectation before upload. |
| Selective page range for PPT export | "Only slides 3-7" | Minor complexity addition, but could confuse users about what they're getting | V1.x addition if requested; not blocking |
| Speaker notes generation | AI-powered feature | Completely out of scope for this app | Out of scope |

**User expectation management is the critical design challenge here.** Tools like iLovePDF and Smallpdf produce image-based slides and call the result "PDF to PowerPoint." Users often discover post-download that text is not editable. This app should label the feature "PDF to Slides (image-based)" or add prominent copy: "Creates one slide per page as an image." This prevents support burden.

---

## Feature 4: PPT to PDF (PPTX → PDF)

### What the Output Actually Is

Converting PPTX to PDF is more feasible client-side than the reverse, because PDF.js + pdf-lib can construct PDFs from images, and PPTX files are ZIP archives (XML + assets) that can be parsed in the browser.

**Realistic client-side approaches:**

| Approach | Description | Fidelity | Client-Side Feasible? |
|----------|-------------|----------|----------------------|
| Commercial WASM SDK | Nutrient Web SDK or Apryse WebViewer renders PPTX via WebAssembly | HIGH | YES but paid/licensed; not CDN-free |
| Parse PPTX XML + render slides to canvas | Read slide XML, reconstruct using HTML5 Canvas or SVG | MEDIUM | Complex; open-source parsers (js-pptx, won21kr) exist but are poorly maintained |
| Screenshot approach (hidden iframe/render) | Load slides in hidden HTML renderer, screenshot canvas | LOW-MEDIUM | Fragile; no reliable CDN library |

**True client-side PPTX-to-PDF without a paid SDK has no clean open-source solution as of 2026.** The pptx2pdf npm package wraps LibreOffice (server-side only). js-pptx (won21kr) last commit was 2019 — abandoned. Nutrient/Apryse require licensing.

### What PPTX Features Matter for Faithful Conversion

When evaluating fidelity, these PPTX elements are most critical:

| PPTX Feature | PDF Preservation | Notes |
|-------------|-----------------|-------|
| Text content | YES (if font available) | Font substitution common if custom fonts used |
| Images and shapes | YES | Shapes become static in PDF |
| Slide layout and positioning | YES | Layout preserved |
| Speaker notes | OPTIONAL (separate page) | User choice: include or exclude |
| Slide transitions | NO | PDF is static; transitions are lost |
| Animations | NO | PDF cannot represent animations |
| Embedded video/audio | NO | PDF static format |
| Hyperlinks | PARTIAL | Link targets preserved; visual styling may vary |
| Charts (editable) | YES (as image) | Charts become static images |

### Table Stakes (IF building this feature)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Accept .pptx upload | Basic file acceptance | LOW | Standard file input with .pptx accept filter |
| Produce readable PDF output | The deliverable | HIGH | This is the hard part — see implementation note below |
| One PDF page per slide | 1:1 mapping expected | MEDIUM | Depends on rendering approach |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| "Editable PDF" output from PPTX | Users conflate editable PPT with editable PDF | PDF text editability from PPT requires a full layout engine; not feasible client-side | Out of scope; produce image-based PDF |
| Animation preservation | Users ask, sound reasonable | PDF format cannot represent PowerPoint animations | Document as known limitation |

### RECOMMENDATION: Defer PPT to PDF for V1

**PPTX → PDF is the most technically complex of the four features and has no good client-side CDN-only solution.** The only viable approach without a paid SDK is:
1. Parse PPTX XML manually (fragile, incomplete)
2. Use a poorly-maintained open-source library

Options for v1.x if required: accept the constraint that output is image-based with lower fidelity, or integrate Nutrient WASM (has free tier for limited use). Flag as needing dedicated phase research before implementation.

---

## Feature Dependencies

```
[Split PDF]
    └──requires──> [JSZip for ZIP download] (when producing multiple files)
    └──enhances──> [PDF.js thumbnail rendering] (visual page selector — differentiator only)

[Compress PDF]
    └──requires──> [PDF.js canvas render] (already exists in app for PDF-to-images)
    └──requires──> [pdf-lib rebuild] (already exists in app)
    └──enhances──> [JSZip] (optional, only if batch compress needed)

[PDF to PPT]
    └──requires──> [PDF.js canvas render per page] (already exists)
    └──requires──> [PptxGenJS CDN] (new dependency)
    └──conflicts──> [user expectation of editable text] (must manage via UX copy)

[PPT to PDF]
    └──requires──> [PPTX parser library] (no good CDN-available option currently)
    └──conflicts──> [client-side only constraint] (hard to satisfy without paid WASM SDK)
    └──depends_on──> [phase research] (needs dedicated feasibility study before implementation)
```

### Dependency Notes

- **Split PDF requires JSZip:** Without ZIP, a 20-page PDF produces 20 browser download dialogs — unusable. JSZip is available on jsDelivr CDN and is the same approach used by professional tools.
- **Compress PDF reuses existing infrastructure:** The PDF.js render-to-canvas pipeline already exists for the PDF-to-images feature. Compression is effectively the same pipeline with a reconstruction step.
- **PDF to PPT requires PptxGenJS:** This is a new CDN dependency. PptxGenJS is actively maintained (3,500+ GitHub stars), available via jsDelivr, and works in all modern browsers.
- **PPT to PDF conflicts with client-only constraint:** Every reliable solution requires either a server-side tool (LibreOffice, Ghostscript) or a paid WASM SDK. This is a genuine architectural blocker.

---

## MVP Definition

### Launch With (v1) — All four features, but scoped

- [x] **Split PDF** — Split every page + split by range + ZIP download. No thumbnail UI. — Why essential: simplest implementation, highest user value, completely feasible with existing dependencies.
- [x] **Compress PDF** — Three presets (Lossless/Balanced/Max) + size display + prominent warning about text layer destruction for Balanced/Max. — Why essential: high-demand feature; implementation reuses existing PDF.js pipeline.
- [x] **PDF to PPT** — Image-based slides, one per page, standard resolution. Clear "images only, text not editable" label. — Why essential: requested feature; feasible with PptxGenJS CDN; user expectations must be set correctly.
- [x] **PPT to PDF** — Attempt with best available client-side approach OR defer with honest explanation. — Recommend defer to v1.x pending feasibility research; if forced into v1, accept image-based lower-fidelity output.

### Add After Validation (v1.x)

- [ ] **Split by N pages (fixed intervals)** — Low complexity addition once core split works; add when users request batch splitting.
- [ ] **Split thumbnail grid UI** — Add when users find range-input UX confusing; highest UX value but highest implementation cost.
- [ ] **PDF to PPT: page range selection** — Add if users report not needing all pages converted.
- [ ] **PPT to PDF (proper)** — Revisit after evaluating Nutrient WASM free tier or similar; requires dedicated feasibility research.

### Future Consideration (v2+)

- [ ] **PDF to PPT with editable text** — Requires OCR pipeline; server component or paid SDK; contradicts current architecture.
- [ ] **Compress with target file size** — Complex iterative rendering; defer until there's validated user demand.
- [ ] **Batch operations across multiple PDFs** — Cross-feature complexity; not needed for internal tool use.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Split PDF (by range + every page + ZIP) | HIGH | LOW | P1 |
| Compress PDF (presets + size display) | HIGH | MEDIUM | P1 |
| PDF to PPT (image-based) | MEDIUM | MEDIUM | P1 |
| PPT to PDF | MEDIUM | HIGH | P2 |
| Split thumbnail UI | HIGH | HIGH | P2 |
| PDF to PPT editable text | HIGH | VERY HIGH | P3 |

---

## Competitor Feature Analysis

| Feature | iLovePDF | Smallpdf | Adobe Acrobat | Our Approach |
|---------|----------|----------|---------------|--------------|
| Split modes | Range + Extract pages + By size (premium) | Page selection (manual) | Split at point | Range + Every page; ZIP download |
| Compression presets | 2 (Recommended / Less) | 2 (Basic / Strong, Strong is Pro) | Multiple quality levels | 3 named presets; clear label on text destruction |
| PDF to PPT output | Image-based slides | Image-based slides | Editable text (paid, server-side) | Image-based; explicit labeling |
| PPT to PDF | Server-side, high fidelity | Server-side, high fidelity | Server-side, Adobe engine | Client-side only — fidelity lower; defer or accept limitation |

---

## Sources

- iLovePDF Split tool (live inspection): https://www.ilovepdf.com/split_pdf
- iLovePDF Compress tool: https://www.ilovepdf.com/compress_pdf
- Smallpdf Compress tool: https://smallpdf.com/compress-pdf
- pdf-lib image compression: won't implement — https://github.com/Hopding/pdf-lib/issues/71
- PDF to PowerPoint converters compared: https://deckary.com/blog/pdf-to-powerpoint
- PDF split methods overview: https://pdfcandy.com/blog/ways-to-split-pdf-files-online.html
- @quicktoolsone/pdf-compress client-side approach: https://www.npmjs.com/package/@quicktoolsone/pdf-compress
- PptxGenJS (browser-compatible PPTX generator): https://gitbrent.github.io/PptxGenJS/
- Nutrient Web SDK PDF-to-Office (commercial): https://www.nutrient.io/guides/web/conversion/pdf-to-office/
- PPTX to PDF features preserved: https://wonderslide.com/blog/from-pptx-to-pdf/
- Client-side PDF-to-JPG (render pipeline): https://dev.to/zepubocode/how-to-build-a-client-side-pdf-to-jpg-converter-no-server-required-45l6
- Best PDF to PowerPoint converters real-world results: https://plusai.com/blog/best-pdf-to-powerpoint-converters

---

*Feature research for: Client-side PDF tools — Split, Compress, PDF to PPT, PPT to PDF*
*Researched: 2026-03-02*
