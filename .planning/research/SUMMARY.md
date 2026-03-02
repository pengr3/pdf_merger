# Project Research Summary

**Project:** CLMC PDF Tools — Client-side PDF Tools Web App
**Domain:** Browser-native PDF processing (single HTML file, CDN-only, zero server)
**Researched:** 2026-03-02
**Confidence:** MEDIUM — core features (Split, PDF-to-PPT) are HIGH; Compress is MEDIUM; PPT-to-PDF is LOW

## Executive Summary

This is a client-side PDF tools application that runs entirely in the browser with no server, no build step, and no file uploads. The existing app already ships merge, PDF-to-images, and watermark features using pdf-lib and pdfjs-dist. The next milestone adds four features: Split PDF, Compress PDF, PDF to PPTX, and PPTX to PDF. Three of the four features are well-understood and achievable with the existing library stack plus one new CDN dependency (PptxGenJS). The recommended approach is to build them in dependency order — Split first (no new libraries), Compress second (reuses existing render pipeline), PDF-to-PPTX third (adds PptxGenJS), and PPTX-to-PDF last (highest complexity, feasibility depends on real-world PPTX file testing).

The critical strategic finding is that two features require careful expectation management: Compress PDF works only on image-heavy PDFs (text-heavy PDFs see minimal size reduction), and PDF-to-PPTX produces image-based slides with non-editable text. Both are honest, achievable implementations — but both will generate user confusion if labeled generically. The research consistently points to "label the output accurately before the user uploads" as the primary UX mitigation. The output of PDF-to-PPTX is a valid PPTX file with one rasterized image per slide; the output of Compress is a re-rendered PDF with JPEG pages. Neither is inferior — they are the correct client-side implementations.

PPTX-to-PDF is the one genuinely risky feature. No free, CDN-available library cleanly converts PPTX to PDF in a browser as of 2026. The viable approach chains three libraries (a PPTX-to-HTML renderer, html2canvas-pro, and pdf-lib), produces image-based output, and will fail silently on complex PPTX features like SmartArt, animations, and custom fonts. This feature must be validated against real CLMC PPTX files before committing to a delivery timeline. If representative files render poorly, the fallback is either deferral or a browser-print-to-PDF workaround.

## Key Findings

### Recommended Stack

The existing pdf-lib (1.17.1) and pdfjs-dist (3.11.174) handle Split, Compress, and the PDF-to-PPTX render pipeline without any changes. The only new CDN dependency required for three of the four features is PptxGenJS 4.0.1, which bundles JSZip internally. JSZip should be loaded separately only for the Split PDF ZIP-download path if PptxGenJS is not yet loaded. Do not double-load JSZip.

PPTX-to-PDF requires two additional CDN libraries: a PPTX-to-HTML renderer (use `@jvmr/pptx-to-html` — do NOT use the unmaintained meshesha/PPTXjs) and html2canvas-pro. These should be added only when PPTX-to-PDF is implemented and only after feasibility validation. The full LibreOffice WASM approach is ruled out — it requires 150 MB payload, 10-15s initialization, and 200-300 MB RAM, which crashes browser tabs.

**Core technologies:**
- pdf-lib 1.17.1 (existing): Split via `copyPages()`, structural compression via `useObjectStreams: true`, new PDF assembly for compress output — no upgrade needed
- pdfjs-dist 3.11.174 (existing): Renders PDF pages to canvas for compression and PDF-to-PPTX; thumbnail generation for Split UI — no upgrade needed
- PptxGenJS 4.0.1 (new, one CDN tag): Generates valid `.pptx` files from base64 image data; June 2025 release; bundles JSZip internally; use `pptxgen.bundle.js` (450 KB)
- JSZip 3.10.1 (CDN, load only if PptxGenJS not present): ZIP multiple split-PDF outputs into a single browser download
- html2canvas-pro (new, PPTX-to-PDF phase only): Actively maintained fork of html2canvas v1.4.1; same API; required for PPTX slide capture

### Expected Features

**Must have (table stakes):**
- Split every page into individual PDFs with ZIP download — without ZIP, a 20-page PDF triggers 20 download dialogs, making the feature unusable
- Split by custom page range (e.g., "1-3, 5, 7-9") — core power-user need
- Page count display before splitting — users need to know what they are working with
- At least two compression presets — iLovePDF and Smallpdf both offer presets; single-mode compress feels unfinished
- Before/after file size display after compression — users need proof the tool worked; without this, identical-size outputs look broken
- One PPTX slide per PDF page, preserving aspect ratio — this is the feature, not an enhancement
- Downloadable `.pptx` output — must open in PowerPoint and LibreOffice without errors
- Prominent "image-based slides, text not editable" label on PDF-to-PPTX — must appear before user uploads, not after

**Should have (competitive differentiators):**
- Three compression presets (Lossless / Balanced / Max) — "Lossless" sets correct expectations for structural-only mode; competitors offer two presets, three is a differentiator
- Size reduction percentage display ("Reduced by 45%")
- Per-page progress bar during compression and PDF-to-PPTX conversion — 30-page operations take 5-15 seconds without feedback
- Split by N pages (fixed intervals) — low complexity, high value for batch splitting
- Slide resolution control on PDF-to-PPTX (Standard 96 dpi / High 144 dpi) — maps to PDF.js scale parameter

**Defer to v1.x or v2+:**
- Thumbnail grid UI for visual page selection in Split (high UX value but high implementation cost; defer until range-input UX is validated as confusing)
- PPT-to-PDF (highest complexity; no clean CDN solution; defer pending feasibility spike on real CLMC files)
- PDF-to-PPTX with editable text (requires paid OCR SDK; contradicts architecture constraint)
- Custom quality slider for compression (false precision; competitors deliberately avoided it)
- Target file size compression ("compress to under 1 MB") — requires iterative O(N) rendering; not feasible

### Architecture Approach

The app is a single `index.html` with all logic, styles, and CDN script tags. New features follow the established section-per-tool pattern: each tool gets its own HTML `<section id="tool-{name}">`, its own namespaced state variables (never shared with other tools), its own upload handler (copy-paste of ~30 lines), and its own processing function. Shared utilities (`showStatus()`, `updateProgress()`, `escapeHtml()`) accept a `statusId` parameter and are used by all tools. New CSS goes at the end of the style block. New CDN scripts are added alongside existing tags. The nav handler requires no modification if new buttons use the existing `data-tool` attribute pattern.

**Major components and their responsibilities:**
1. Nav/Section tab handler — show/hide tool sections via `data-tool` attribute matching; generic, no change needed per new tool
2. Split PDF section — JSZip for multi-file downloads; pdf-lib `copyPages()` for page extraction; PDF.js for thumbnail rendering (optional v1.x)
3. Compress PDF section — PDF.js renders each page to canvas; `canvas.toDataURL('image/jpeg', quality)` at preset quality level; pdf-lib assembles new PDF from JPEG images
4. PDF-to-PPTX section — PDF.js renders pages at 2x scale; PptxGenJS assembles `.pptx` with one image slide per page
5. PPTX-to-PDF section — PPTX-to-HTML renderer parses slide XML; html2canvas-pro captures each slide div; pdf-lib assembles PDF from canvas images

### Critical Pitfalls

1. **Encrypted PDF produces blank split output silently** — `ignoreEncryption: true` suppresses the load error but outputs blank white pages with no JavaScript exception. Detection fix: check first 2 KB of file for `/Encrypt` before calling `PDFDocument.load()`. Reject with a clear user message. Never use `ignoreEncryption: true`.

2. **Compression is a no-op for text-heavy PDFs** — pdf-lib has no native image compression API (GitHub issue #71, won't fix). The canvas re-encode approach only reduces image bytes. Text-only PDFs see zero reduction. Must show before/after size and display "could not reduce size further" message when output is not smaller. Label the feature "best for PDFs with photos or scans."

3. **Browser tab OOM crash on large PDFs** — pdf-lib loads the entire document into memory. During split, the app holds the source ArrayBuffer plus each output PDFDocument plus serialized Uint8Arrays simultaneously. Add a hard file size gate (warn at 30 MB, block at 80 MB). Process split ranges sequentially and trigger download before allocating the next output.

4. **PDF-to-PPTX slides are not editable** — this is an architectural fact, not a bug, but unlabeled it becomes a support burden. The mitigation is entirely UX: label the output "image slides, text not editable" before the user uploads. Do not attempt text extraction for PPTX — it produces garbled output.

5. **PPTX-to-PDF complexity is vastly underestimated** — custom fonts render as Arial fallback, SmartArt renders blank, animations are silently ignored, complex layouts degrade. PPTXjs (meshesha) is unmaintained since March 2022 and must not be used. Validate with real CLMC PPTX files before committing to any implementation timeline.

6. **Multiple `saveAs()` calls blocked by popup blockers on split** — browsers block rapid sequential download dialogs. Bundle all split outputs into a single JSZip download. One `saveAs()` = one ZIP.

## Implications for Roadmap

Based on the combined research, four implementation phases are suggested, matching the dependency order and risk profile of each feature.

### Phase 1: Split PDF

**Rationale:** Lowest technical risk. Depends only on pdf-lib (`copyPages()`) which is already loaded. JSZip is one new CDN tag. No new API patterns to learn. Delivers immediate high user value. Establishes the section-per-tool pattern for all subsequent phases.

**Delivers:** Split every page + split by custom page range + ZIP download of multiple outputs + page count display before splitting.

**Addresses (from FEATURES.md):** All Split PDF table stakes. Includes "split every N pages" as low-complexity differentiator if time allows.

**Avoids (from PITFALLS.md):**
- Encrypted PDF blank-output pitfall: detect `/Encrypt` before loading
- Browser OOM crash: 80 MB size gate, sequential processing
- Popup blocker on multi-file download: JSZip bundling required
- Resource bloat UX confusion: show output file size expectations in UI

**Research flag:** No deeper research needed. `copyPages()` API is documented and verified HIGH confidence.

### Phase 2: Compress PDF

**Rationale:** Reuses the PDF.js page-render-to-canvas pipeline already established in Phase 1 and in the existing PDF-to-images feature. No new CDN dependencies. Second lowest risk. The main challenge is UX honesty, not implementation complexity.

**Delivers:** Three compression presets (Lossless / Balanced / Max) + before/after file size display + accurate labeling that compression is image-focused.

**Addresses (from FEATURES.md):** All Compress PDF table stakes plus the three-preset differentiator and size-reduction percentage display.

**Avoids (from PITFALLS.md):**
- Compression no-op for text PDFs: show before/after size always; display "could not reduce further" when output is not smaller
- Main thread freeze: yield between page render iterations, update progress bar each page
- Memory accumulation: revoke blob URLs after each download

**Research flag:** Implementation of image extraction from existing PDF streams (to avoid full re-render) is undocumented in pdf-lib and LOW confidence. Safer fallback is the full-page re-render approach (PDF.js renders all pages to canvas at reduced scale, rebuilds PDF). Use the full re-render approach for v1 and note the text-layer trade-off in the UI.

### Phase 3: PDF to PPTX

**Rationale:** Builds on the PDF.js render pattern established in Phases 1 and 2. Adds one new CDN dependency (PptxGenJS 4.0.1). API is documented and HIGH confidence. Image-slide output is the honest, achievable approach for this constraint set.

**Delivers:** One image slide per PDF page + downloadable `.pptx` + aspect ratio preservation + per-page progress indicator. Optional: resolution control preset.

**Addresses (from FEATURES.md):** All PDF-to-PPT table stakes. Slide resolution control differentiator is low complexity (maps to PDF.js scale parameter).

**Avoids (from PITFALLS.md):**
- Non-editable slide expectation: "image slides, text not editable" label must appear before user uploads, not after
- Memory crash from holding all canvases: render one page, encode to base64, add to PPTX, nullify canvas before next page
- JSZip double-load: use PptxGenJS bundle (which includes JSZip); do not add a second JSZip script tag

**Research flag:** No deeper research needed. PptxGenJS 4.0.1 browser API is verified HIGH confidence.

### Phase 4: PPTX to PDF

**Rationale:** Highest complexity and highest risk. Must be last. Depends on two new CDN libraries whose rendering quality is unknown until tested with real CLMC files. If rendering quality is unacceptable, scope can fall back to "render preview only" or browser-print workaround without affecting any other phase.

**Delivers:** Image-based PDF from PPTX upload. One PDF page per slide. Clear fidelity warning before conversion.

**Addresses (from FEATURES.md):** PPT-to-PDF table stakes at best-effort fidelity. Known gaps: animations, SmartArt, custom fonts, complex master themes.

**Avoids (from PITFALLS.md):**
- Complexity underestimation: mandatory feasibility spike before implementation commit (render 3-5 representative CLMC PPTX files with chosen library)
- Using unmaintained PPTXjs: use `@jvmr/pptx-to-html` (TypeScript, active) as PPTX parser layer
- html2canvas v1.4.1 (unmaintained): use html2canvas-pro (same API, maintained fork)
- Large PPTX OOM: 20 MB file size cap for PPTX uploads
- XSS from PPTX XML text injection: use `textContent`, never `innerHTML` with raw PPTX data

**Research flag:** NEEDS dedicated phase research before implementation. This phase has the most uncertainty. The rendering quality spike (test with real CLMC files) is a go/no-go gate. If output is poor, defer to v2 with an honest "requires desktop software" message in the UI.

### Phase Ordering Rationale

- Each phase builds on the library patterns and render pipelines of the previous phase (pdf-lib only → add canvas re-render → add PptxGenJS → add PPTX parsing)
- Split PDF installs the section-per-tool code pattern that all later phases replicate
- Compress PDF validates the full page-render loop at low cost before PDF-to-PPTX needs it at higher quality
- PPTX-to-PDF is isolated last so its complexity and potential deferral do not block any other feature
- The ordering minimizes CDN library introductions per phase: Phase 1 adds JSZip, Phase 3 adds PptxGenJS, Phase 4 adds PPTX-to-HTML and html2canvas-pro

### Research Flags

Phases needing dedicated research during planning:
- **Phase 4 (PPTX to PDF):** High uncertainty on rendering quality. Mandatory feasibility spike: load 3-5 real CLMC PPTX files with `@jvmr/pptx-to-html`, capture via html2canvas-pro, inspect output before writing a single line of production code. If output quality is below "acceptable for internal use," recommend deferral.

Phases with standard patterns (research not required):
- **Phase 1 (Split PDF):** pdf-lib `copyPages()` is documented and HIGH confidence. JSZip v3 API is established. No unknowns.
- **Phase 2 (Compress PDF):** Full-page re-render approach uses existing PDF.js canvas API. Known limitation (text layer destruction) is documented behavior. No unknowns.
- **Phase 3 (PDF to PPTX):** PptxGenJS 4.0.1 `addImage({ data: ... })` is verified HIGH confidence. PDF.js render pattern is established. No unknowns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Split/PDF-to-PPT are HIGH. Compress canvas approach is MEDIUM (no public API; relies on well-understood browser Canvas behavior). PPT-to-PDF is LOW for feasibility of rendering quality. |
| Features | MEDIUM | Table stakes confirmed via live competitor inspection. Client-side feasibility of each feature cross-checked against library GitHub issues. PPT-to-PDF feature scope is LOW confidence until tested with real files. |
| Architecture | HIGH | Based on existing codebase patterns verified against PDF.js and pdf-lib docs. Section-per-tool pattern is established and working. |
| Pitfalls | HIGH for known issues | Encrypted PDF, OOM, compression no-op, and non-editable slides are confirmed via pdf-lib GitHub issues. PPTX rendering fidelity pitfalls are MEDIUM (inferred from library documentation and community reports). |

**Overall confidence:** MEDIUM

### Gaps to Address

- **PPTX-to-PDF rendering quality:** Unknown until tested with actual CLMC presentation files. Must be validated as a feasibility spike before Phase 4 begins. This is the single largest uncertainty in the entire research.
- **pdf-lib image extraction API:** Extracting existing images from a PDF for per-image compression (rather than full-page re-render) is undocumented in pdf-lib's public API. The full-page re-render fallback is reliable but destroys the text layer. For v1, use full-page re-render and communicate the trade-off clearly.
- **PptxGenJS slide dimensions:** PDF pages are not always 16:9. Research confirms reading the page `mediaBox` and passing custom dimensions to PptxGenJS is possible, but the exact parameter names need verification during Phase 3 implementation.
- **Browser memory behavior at scale:** The 80 MB file size gate is based on community reports and existing CONCERNS.md. The actual threshold varies by browser, available RAM, and operating system. Treat the 80 MB limit as a conservative upper bound, not a precision value.

## Sources

### Primary (HIGH confidence)
- pdf-lib official site and GitHub (Hopding/pdf-lib) — `copyPages()` API, `useObjectStreams`, no native image compression (issue #71), encrypted PDF behavior (issues #1390, #1296), resource bloat (issue #1662)
- PptxGenJS GitHub and official docs (gitbrent/PptxGenJS) — v4.0.1 browser bundle, `addImage()` base64 support, jsDelivr CDN URL confirmed
- pdfjs-dist 3.11.174 — page render to canvas, `getViewport()`, worker configuration
- JSZip 3.10.1 — `generateAsync({type:'blob'})` API

### Secondary (MEDIUM confidence)
- iLovePDF and Smallpdf live tool inspection — compression presets, split modes, UX patterns
- DEV Community: client-side PDF compressor with Web Workers — canvas re-encode approach confirmed as established pattern
- QuickToolerHub PDF.js + PptxGenJS pattern — image-slide approach validated as real-world production approach
- StudyRaid/pdf-lib compression article — `useObjectStreams` 15-25% reduction, canvas re-render 60-80% reduction

### Tertiary (LOW confidence)
- `@jvmr/pptx-to-html` — TypeScript PPTX-to-HTML library; active as of 2026 but unverified against production PPTX files
- html2canvas-pro — maintained fork of html2canvas v1.4.1; same API; not yet verified in this project context
- PPTX rendering fidelity estimates — inferred from library documentation and community reports; requires validation against real CLMC files

---
*Research completed: 2026-03-02*
*Ready for roadmap: yes*
