# Pitfalls Research

**Domain:** Client-side browser PDF tools (Split, Compress, PDF-to-PPT, PPT-to-PDF) — single HTML file, no build step
**Researched:** 2026-03-02
**Confidence:** HIGH for pdf-lib encryption and memory limits (verified via GitHub issues); MEDIUM for compression realities and PPTX conversion scope; LOW for precise PPTX rendering fidelity numbers

---

## Critical Pitfalls

### Pitfall 1: pdf-lib Silently Corrupts Split Output for Encrypted PDFs

**What goes wrong:**
When a user uploads a password-protected or permissions-restricted PDF and split is attempted, `PDFDocument.load()` throws "Input document to PDFDocument.load is encrypted." If the developer adds `{ ignoreEncryption: true }` to suppress the error, the `copyPages()` calls succeed but produce blank white pages in the output PDF. The file has the correct page count and file size, but all content is missing. No exception is raised during the copy or save step.

**Why it happens:**
`ignoreEncryption: true` bypasses the load-time guard without decrypting content streams. The pages are structurally present but their content streams remain encrypted and unreadable. The option exists only for backwards compatibility and the maintainers explicitly warn against using it. The issue is open with no fix committed as of early 2025 (GitHub issue #1390, #1296, #1326 in Hopding/pdf-lib).

**How to avoid:**
Before calling `PDFDocument.load()`, detect whether the file is encrypted by checking the first 1024 bytes for the `/Encrypt` dictionary marker using a `TextDecoder`. If encryption is detected, reject the file immediately with a clear user message: "This PDF is password-protected and cannot be split in-browser." Do not attempt `ignoreEncryption: true` as a workaround — the output is invalid.

```javascript
async function isEncryptedPDF(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer.slice(0, 2048));
  const text = new TextDecoder('latin1').decode(bytes);
  return text.includes('/Encrypt');
}
```

**Warning signs:**
- Output PDF downloads with correct file size but appears blank when opened
- No JavaScript error thrown during `copyPages()` or `save()`
- User reports "white pages" after split

**Phase to address:** Split PDF implementation phase, before any user testing.

---

### Pitfall 2: pdf-lib copyPages Bloats Split Output with Unused Image Resources

**What goes wrong:**
When splitting a 20-page PDF with 15 embedded images into individual pages, each single-page output file is nearly the same size as the original. A 10 MB PDF split into 10 files produces 10 files each approximately 9–10 MB rather than approximately 1 MB each. Users who split PDFs specifically to get smaller files are confused and frustrated.

**Why it happens:**
`copyPages()` copies the entire `Resources/XObject` dictionary from the source document, including all images, even those not referenced on the pages being copied. This is a known limitation of pdf-lib's architecture: it does not analyze page content streams to determine which resources are actually used (GitHub issue #1662 in Hopding/pdf-lib).

**How to avoid:**
Set user expectations explicitly in the UI: "Note: Split files may be similar in size to the original if the PDF contains shared embedded images." For the implementation itself, a workaround exists: parse each output page's content stream to identify which XObject references (e.g., `/I0`, `/I1`) actually appear, then delete unreferenced entries using `pdfDoc.context.delete()`. This is complex and fragile — only implement it if users explicitly report the bloat issue as a blocker. The simpler path is to document the limitation upfront.

**Warning signs:**
- Each split output file is similar in size to the full source PDF
- User reports that splitting "didn't make files smaller"

**Phase to address:** Split PDF implementation phase. Document limitation in UI copy before launch.

---

### Pitfall 3: Browser Tab OOM Crash with Large PDFs During Split + Re-save

**What goes wrong:**
When a user loads a 50–100 MB PDF and splits it into many files, the browser tab crashes silently (showing a crashed tab page) with no user-readable error. This can also happen during the save step of compression when the processed PDF is serialized to `Uint8Array`.

**Why it happens:**
pdf-lib loads the entire document into a JavaScript `ArrayBuffer` with no streaming support. During a split operation, the app holds: (1) the original file ArrayBuffer, (2) each output PDFDocument as an in-memory object with its own heap allocations, and (3) the serialized `Uint8Array` from `save()`. For large files, this easily exceeds Chrome's per-tab sandbox limit (~512 MB for XMLHttpRequest `arraybuffer`, with total tab memory often reaching 1.6–3x the file size in practice). Chrome kills tabs exceeding the sandbox memory limit with `SBOX_FATAL_MEMORY_EXCEEDED`.

The existing codebase already has a known gap here: `CONCERNS.md` documents that the practical limit is ~100 MB and that large conversions will crash the tab.

**How to avoid:**
Add a file size gate before initiating split or compression. Warn at 30 MB; hard-block at 80 MB with a message explaining the browser limitation. Process split ranges sequentially (one output file at a time), releasing each result via `URL.createObjectURL()` and triggering a download before allocating the next. Do not hold all split outputs in memory simultaneously.

```javascript
const MAX_SPLIT_SIZE_MB = 80;
if (file.size > MAX_SPLIT_SIZE_MB * 1024 * 1024) {
  showError(`Files over ${MAX_SPLIT_SIZE_MB} MB cannot be split in-browser.`);
  return;
}
```

**Warning signs:**
- Chrome tab shows "Aw, Snap!" or "Out of Memory" crash page
- Browser DevTools shows memory climbing continuously during processing
- Issue only reproduces with files above ~40–50 MB

**Phase to address:** Split PDF and Compress PDF implementation phases, as a first-class constraint documented in the feature spec.

---

### Pitfall 4: "PDF Compression" Produces No Measurable Size Reduction for Text-Heavy PDFs

**What goes wrong:**
The feature is labeled "Compress PDF" and ships. Users upload a text-heavy legal document or scanned-text PDF and download a file that is the same size or larger. The feature feels broken. Support questions follow.

**Why it happens:**
Client-side browser PDF compression works by extracting embedded image streams, re-encoding them to JPEG at reduced quality using an HTML `<canvas>`, and re-embedding the result. This is the only compression mechanism available without a server. It is effective only for PDFs where file size is dominated by unoptimized raster images (marketing PDFs, photo-heavy decks, scanned documents stored as high-DPI images). For PDFs whose content is primarily text, vector graphics, or already-compressed images, the technique produces negligible or zero reduction. pdf-lib provides no native compression API (GitHub issue #1657, still open as of January 2025).

Additionally, re-encoding PDF image streams via canvas requires:
1. Parsing the PDF binary to locate image XObjects
2. Extracting raw image bytes
3. Drawing onto canvas and calling `toBlob('image/jpeg', quality)`
4. Replacing the stream in the PDF context

This is not a one-line feature — it requires custom low-level PDF stream manipulation not provided by pdf-lib's public API.

**How to avoid:**
Label the feature accurately in the UI: "Compress Image-Heavy PDFs" or "Reduce PDF size (best for PDFs with photos/scans)." After processing, show the before/after file size so users can see whether compression helped. If the output is not smaller than the input, show a message: "This PDF's size could not be reduced further in-browser (it contains minimal image data)." Implement a size-comparison guard that offers to download the original if the compressed version is larger.

**Warning signs:**
- Users report "nothing changed" after compression
- Compressed file is the same size or larger than input
- Input file contains mostly text or vector content

**Phase to address:** Compress PDF implementation phase. Set user expectations in design spec before building.

---

### Pitfall 5: PDF to PPT Produces Non-Editable Slides (Image-Only Output)

**What goes wrong:**
The feature is described as "PDF to PowerPoint." Users expect editable text in slides — the ability to update content in PowerPoint after conversion. The actual output from any pure client-side browser implementation contains each PDF page as a rasterized image embedded full-slide in a PPTX. Text is not extractable, not selectable, not editable. Users open the PPTX in PowerPoint, try to click on text, and find they cannot.

**Why it happens:**
True PDF-to-editable-PPTX conversion requires:
- PDF text extraction with layout-aware bounding box analysis
- Font matching across PDF embedded fonts to system fonts
- Reconstruction of text flow, tables, and graphical elements as PPTX XML shapes
- OCR fallback for image-based or scanned PDFs

None of this is feasible with pdf-lib or pdfjs-dist in a browser without a server. The only achievable client-side approach is: render each PDF page to canvas using PDF.js, encode as base64 PNG/JPEG, create one PPTX slide per image using PptxGenJS's `addImage()`. This produces valid PPTX that opens in PowerPoint, but slides contain only images.

Commercial libraries that do achieve editable output (e.g., Nutrient Web SDK, Aspose.PDF via WASM) are paid and require significant CDN payload or server API calls — both incompatible with this project's zero-server, CDN-only constraint.

**How to avoid:**
In the UI, label the output explicitly: "Each PDF page becomes a slide image. Text will not be editable." Manage expectations in the tool description before the user uploads. Use PDF.js to render pages to canvas (already available in the existing CDN setup) and PptxGenJS to package them. For the PptxGenJS CDN addition, use the ESM or UMD build from jsDelivr.

The image-per-slide approach is the only honest, achievable implementation for this constraint set. Do not attempt text extraction for PPTX output — it will produce garbled results with layout and encoding artifacts.

**Warning signs:**
- If planning doc or task spec says "editable text output" for PDF-to-PPT in a no-server context, that is an unmet expectation that needs scope correction before implementation
- PptxGenJS GitHub issue #31 shows this exact pattern is well-understood and supported

**Phase to address:** PDF to PPT implementation phase. Scope correction must happen in planning, not during implementation.

---

### Pitfall 6: PPT-to-PDF Requires Full PPTX Parsing — Vastly More Complex Than It Appears

**What goes wrong:**
The developer estimates PPT-to-PDF as similar complexity to PDF-to-PPT (just reverse direction). It is not. Converting a PPTX file to a PDF requires rendering arbitrary PowerPoint slide content — including master slides, theme inheritance, absolute positioning of shapes, gradient fills, custom fonts, embedded images, and tables — into a pixel-accurate PDF page. Libraries that appear to do this in the browser either (a) require a server API call, (b) are WASM-wrapped versions of LibreOffice or similar (very large payload), or (c) produce low-fidelity HTML/canvas output that is then printed to PDF.

**Why it happens:**
PPTX is a ZIP archive of OOXML XML files. The format is complex: slides reference slide layouts, which reference slide masters, which reference themes. Fonts reference system-installed typefaces or embedded font files. Animations, SmartArt, and 3D objects have no HTML/CSS analog. Browser-based PPTX renderers (PPTXjs, @jvmr/pptx-to-html) acknowledge that animations, transitions, SmartArt, master slides, speaker notes, and custom fonts are unsupported. PPTXjs (meshesha/PPTXjs) had its last release in March 2022 and is in maintenance-only mode as of 2026.

A practical client-side approach: use a PPTX-to-HTML library to render slides as absolutely-positioned HTML elements, capture each slide with `html2canvas` (or its fork `html2canvas-pro`), then write the canvas images into a PDF using pdf-lib. This produces an image-based PDF (non-searchable, non-selectable text) and will fail to render: custom fonts (substituted with Arial/Noto equivalents), animations (ignored), SmartArt (rendered incorrectly or as blank), and embedded video/audio (ignored).

**How to avoid:**
Label the feature "PPT to PDF (image-based, visual conversion)." Test with representative real PPTX files from actual CLMC users before committing to the feature — complex decks with SmartArt, gradients, or custom fonts will produce noticeably degraded output. Use `html2canvas-pro` (actively maintained fork) instead of the unmaintained `html2canvas` v1.4.1. Cap accepted file size at 20 MB to avoid memory issues from large embedded media.

Do not promise layout fidelity. Do not use PPTXjs (meshesha) — it is unmaintained. Evaluate `@jvmr/pptx-to-html` (TypeScript, active) as the parser layer.

**Warning signs:**
- Test PPTX with SmartArt renders blank or garbled
- Slides using custom or embedded fonts render in Arial fallback
- Presentations with many slides (50+) cause memory warnings or slow renders

**Phase to address:** PPT to PDF implementation phase. Validate against real CLMC PPTX files before committing to the feature scope.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Add all new tool sections directly into index.html | No refactor needed, keeps single-file constraint | File grows from ~1,600 lines to 3,500+ lines; sections share globals; bugs in one tool can bleed into another; scroll-to-find debugging | Acceptable only if each tool section is strictly namespaced via object/closure and has clear comment block boundaries |
| Use `ignoreEncryption: true` for encrypted PDF handling | Suppresses throw at load time | Produces blank pages silently; user trusts corrupted output | Never acceptable |
| Label compress feature generically | Avoids UI copy effort | Users report feature as broken for text-heavy PDFs; support burden | Never acceptable — always show before/after file size and explain scope |
| Render PPTX slides via PPTXjs (meshesha) | Existing library available via CDN | Library is unmaintained (last release March 2022); bugs won't be fixed; breaking in modern browsers possible | Never for new implementations — evaluate `@jvmr/pptx-to-html` instead |
| Hold all split-output PDFs in memory before downloading | Simpler code, zip all at once | Tab crash on files over ~40 MB; memory usage = N × output size | Acceptable only for files confirmed under 10 MB; add size gate |
| Skip JSZip and trigger individual downloads for split | Avoids JSZip CDN dependency | Browser blocks multiple simultaneous `saveAs` calls; popup blockers interfere | Acceptable for ≤3 output files; for range splits producing many files, use JSZip |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PptxGenJS CDN | Loading the CJS build in a browser `<script>` tag | Use the UMD/IIFE build from jsDelivr: `pptxgenjs/dist/pptxgen.bundle.js` |
| JSZip CDN | Using outdated v2 API (`new JSZip().generate()`) | Use v3 API: `zip.generateAsync({type:'blob'})` then `saveAs()` |
| PDF.js worker + new tool sections | Worker URL hardcoded for pdfjs-dist 3.11.174; new features also need the same worker | Assign `pdfjsLib.GlobalWorkerOptions.workerSrc` once at init; all PDF.js calls share it — do not reassign per-tool |
| html2canvas for PPTX slide capture | Using `html2canvas` v1.4.1 (unmaintained) | Use `html2canvas-pro` from jsDelivr; same API, actively maintained |
| FileSaver.js `saveAs` for split downloads | Multiple rapid `saveAs()` calls blocked by popup blocker | Bundle split outputs into a single JSZip download; one download = one `saveAs()` call |
| pdf-lib `save()` return value | Treating `Uint8Array` as a `Blob` directly | Wrap: `new Blob([uint8Array], { type: 'application/pdf' })` before `URL.createObjectURL()` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Compression canvas rendering on main thread | UI freezes for 5–30 seconds; browser shows "page unresponsive" | Move canvas image re-encoding to a Web Worker; OffscreenCanvas available in Chrome/Firefox; use fallback message for Safari < 16.4 | Any PDF with 5+ embedded images above 1 MB each |
| Holding all PDF.js rendered page canvases in memory simultaneously for PDF-to-PPT | Tab RAM spikes to 2–4 GB for 100-page PDF; tab crashes | Render one page to canvas, encode to base64, add to PPTX, then nullify the canvas reference before rendering next page | PDFs over 20 pages at 2x scale (existing concern from CONCERNS.md) |
| Re-serializing the source PDF on every split range | Processing time multiplies with number of ranges | Load source PDF once with `PDFDocument.load()`; create all output docs from the same loaded source in sequence; only call `save()` on each output once | Large PDFs split into many ranges (10+) |
| Accumulating `URL.createObjectURL()` blobs without revoking | Memory grows across multiple split/compress operations within a session | `URL.revokeObjectURL(url)` after download is triggered or after a 60-second timeout | Multiple operations in one session; already flagged in CONCERNS.md for canvas |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Injecting PPTX-extracted text content into DOM via `innerHTML` | XSS if PPTX XML contains `<script>` payloads or crafted text nodes | Always use `textContent` for PPTX-extracted text; sanitize with DOMPurify before any `innerHTML` use |
| Loading PptxGenJS or JSZip from arbitrary CDN URLs | Supply chain attack if CDN URL is hijacked | Pin to specific versions on jsDelivr with Subresource Integrity (SRI) hashes; existing CDN pattern in codebase has no SRI — extend this fix to all new dependencies |
| No file type validation for PPTX uploads | User can rename any ZIP as `.pptx`; JSZip will parse it, PPTX parser may throw uncaught errors | Validate magic bytes: PPTX/ZIP files start with `PK\x03\x04` (0x50 0x4B 0x03 0x04); reject if not present; wrap all parsing in try/catch |
| Storing compressed/split output in `localStorage` as base64 | localStorage limit is 5–10 MB; silently fails or throws; sensitive document data persists across sessions | Never store file content in localStorage; keep file data in-memory variables only; revoke blob URLs after download |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Split tool shows no progress for large PDFs during processing | User clicks "Split" and sees nothing for 10+ seconds; clicks again, creating duplicate processing | Show per-range progress (e.g., "Processing range 2 of 5...") and disable the split button during operation |
| Compress tool shows no before/after size comparison | User cannot tell if compression helped; downloads anyway; confused by identical or larger output | Always display: "Original: 4.2 MB → Compressed: 2.1 MB (50% reduction)" or "Could not reduce size further" |
| PDF-to-PPT triggers immediate download of large PPTX | User does not know file size before download; on mobile, large PPTX downloads are disruptive | Show estimated PPTX size before download button appears |
| PPT-to-PDF shows no rendering preview | User has no idea if their fonts/layouts translated correctly | Show a thumbnail preview of the first converted slide before offering full download |
| Split range input accepts "1-3, 5, 7-9" but shows cryptic error on invalid input | User types "1-3,5" (no space) or "0" and sees a JavaScript error in console, no UI message | Validate split range input with a clear inline parser that shows parse errors in-UI before allowing submit |
| New tool sections use same "Process" / "Download" button ID as existing tools | Button clicks fire handlers for all tools sharing the same ID | Scope all new tool buttons with unique IDs or data attributes; use event delegation with section-level guards |

---

## "Looks Done But Isn't" Checklist

- [ ] **Split PDF:** Test with an encrypted PDF — verify the app shows a clear error, does not produce blank-page output
- [ ] **Split PDF:** Test with a 50 MB PDF — verify the size gate fires and the tab does not crash
- [ ] **Split PDF:** Verify output file names are unique and sequential (e.g., `filename_pages_1-3.pdf`) to avoid JSZip collision
- [ ] **Compress PDF:** Download the compressed file and compare size to input in bytes — not just by filename
- [ ] **Compress PDF:** Test with a text-only PDF — verify the UI shows "could not reduce size further" rather than offering a same-size download
- [ ] **Compress PDF:** Confirm canvas image re-encoding runs in a Web Worker (or shows a warning on Safari where OffscreenCanvas is limited)
- [ ] **PDF to PPT:** Open output PPTX in actual PowerPoint or LibreOffice — verify it opens without error and pages are visible
- [ ] **PDF to PPT:** Confirm UI copy says "slides contain images, text is not editable" before user clicks convert
- [ ] **PPT to PDF:** Test with a PPTX containing SmartArt — document what the output looks like (blank vs. degraded vs. reasonable)
- [ ] **PPT to PDF:** Test with a PPTX using a non-system font — confirm fallback font renders rather than crashing
- [ ] **All new tools:** Confirm mode-switching during processing does not corrupt state (known race condition in existing codebase per CONCERNS.md)
- [ ] **All new tools:** Confirm blob URLs are revoked after download completes

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Encrypted PDF produces blank split output (shipped without guard) | HIGH | Add encryption detection guard; add regression test with encrypted sample; notify users who used the feature to re-split |
| Compress feature ships without size-reduction feedback | LOW | Add before/after size display to UI; no logic change required |
| PDF-to-PPT described as "editable" in UI copy | LOW | Update UI copy only; output is already image-based, no logic change |
| PPT-to-PDF uses unmaintained PPTXjs library and breaks in new Chrome version | HIGH | Swap rendering layer to `@jvmr/pptx-to-html`; all downstream canvas-capture and pdf-lib code remains the same |
| Tab crash for large PDFs (no size gate) | MEDIUM | Add size gate with try/catch around `PDFDocument.load()` and `save()`; show memory error message if caught |
| Multiple `saveAs()` calls blocked by popup blocker on split | MEDIUM | Switch to JSZip bundling for all multi-file downloads |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Encrypted PDF produces blank split output | Split PDF implementation | Test: load encrypted PDF → expect error message, not blank output |
| copyPages resource bloat | Split PDF implementation | Test: split 10-page image-heavy PDF, check per-output file size |
| Browser tab OOM crash on large PDFs | Split PDF and Compress PDF implementation | Test: attempt 80+ MB PDF → expect size gate error before processing |
| Compression no-op for text PDFs | Compress PDF implementation | Test: compress a text-only PDF → expect "could not reduce" message |
| PDF-to-PPT non-editable slide expectation | PDF-to-PPT planning/scoping | Verify: UI copy says "image slides" before feature ships |
| PPT-to-PDF complexity underestimation | PPT-to-PDF planning/scoping | Spike: render 3 real CLMC PPTX files before committing to implementation timeline |
| Single-file maintainability degradation | All new tool additions | Gate: each new tool section must have comment block boundaries and namespaced state variables; no new global variable names that could collide with existing tools |
| Multiple `saveAs()` popup blocked | Split PDF download implementation | Test: split into 5 ranges → all 5 files download as single ZIP without popup blocker interference |
| Blob URL memory leak across operations | All tools | Test: run 5 compress operations in sequence → DevTools memory profile stays stable |

---

## Sources

- GitHub issue #1390 Hopding/pdf-lib — Copying encrypted PDF results in blank pages: https://github.com/Hopding/pdf-lib/issues/1390
- GitHub issue #1296 Hopding/pdf-lib — Cannot Load Encrypted/Restricted PDF Document: https://github.com/Hopding/pdf-lib/issues/1296
- GitHub issue #1662 Hopding/pdf-lib — copyPages brings over unused XObject resources: https://github.com/Hopding/pdf-lib/issues/1662
- GitHub issue #1657 Hopding/pdf-lib — PDF compression feature request (open as of Jan 2025): https://github.com/Hopding/pdf-lib/issues/1657
- GitHub issue #197 Hopding/pdf-lib — Large PDF heap memory behavior: https://github.com/Hopding/pdf-lib/issues/197
- DEV Community — Building a Client-Side PDF Compressor using JavaScript and Web Workers: https://dev.to/ahmad_shakibnasaj_a8f9bb/building-a-client-side-pdf-compressor-using-javascript-and-web-workers-4dmm
- Joyfill Medium — Handling password-protected PDFs in JavaScript: https://medium.com/joyfill/handling-password-protected-pdfs-in-javascript-f966aa3080dc
- Nutrient blog — How to Build an HTML5 PowerPoint Viewer: https://www.nutrient.io/blog/how-to-build-an-html5-powerpoint-viewer/
- GitHub meshesha/PPTXjs — Last release March 2022, maintenance mode: https://github.com/meshesha/PPTXjs
- GitHub Hopding/pdf-lib issue #1189 — Splitting a PDF (foreign document error): https://github.com/Hopding/pdf-lib/issues/1189
- Chromium issue — 500MB+ PDF crashes PDF.js in Chrome: https://github.com/mozilla/pdf.js/issues/6802
- DZone — Handling Password-Protected PDFs in JavaScript: https://dzone.com/articles/handling-password-protected-PDF-javascript
- Project codebase — CONCERNS.md (existing known issues, 2026-03-02)

---
*Pitfalls research for: client-side browser PDF tools (Split, Compress, PDF-to-PPT, PPT-to-PDF)*
*Researched: 2026-03-02*
