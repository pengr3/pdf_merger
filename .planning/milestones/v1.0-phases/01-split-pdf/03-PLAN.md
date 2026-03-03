---
phase: 01-split-pdf
plan: 03
type: execute
wave: 3
depends_on:
  - "01-PLAN"
  - "02-PLAN"
files_modified:
  - C:/Users/Admin/Roaming/pdf_merger/index.html
autonomous: false
requirements:
  - SPLT-04
  - SPLT-05
  - SPLT-06
  - SPLT-08

must_haves:
  truths:
    - "User can type a page range string like '1-3, 5' into the range input and click Apply to update the thumbnail grid selection"
    - "Invalid range input (e.g. '0', 'abc', '5-3') shows a red error message and does not change selection"
    - "User can click 'Extract Every Page' to split all pages into individual PDFs and download a single ZIP"
    - "User can click 'Extract Selected Pages' to extract only the selected pages into a single grouped PDF and download a ZIP"
    - "A progress bar advances during PDF extraction and ZIP generation"
    - "The downloaded ZIP filename is based on the source PDF filename"
    - "The success message shows how many pages were extracted and the elapsed time"
    - "Uploading a new file after a split resets cleanly — no stale state"
  artifacts:
    - path: "C:/Users/Admin/Roaming/pdf_merger/index.html"
      provides: "Range input Apply handler, splitPdf() orchestrator, Extract Every Page handler, Extract Selected handler, beforeunload guard update"
      contains: "applyRangeSelection, splitPdf, extractAllBtnSplit, extractSelectedBtnSplit, beforeunload splitPdfFile"
  key_links:
    - from: "splitApplyRangeBtn (click)"
      to: "applyRangeSelection()"
      via: "event listener"
      pattern: "applyRangeSelection"
    - from: "applyRangeSelection"
      to: "parsePageRange(splitPageRangeInput.value, splitNumPages)"
      via: "direct call — returns null for invalid input"
      pattern: "parsePageRange"
    - from: "applyRangeSelection"
      to: "renderSplitThumbnailGrid()"
      via: "called after updating splitSelectedPages to re-render grid"
      pattern: "renderSplitThumbnailGrid"
    - from: "extractAllBtnSplit (click)"
      to: "splitPdf('all')"
      via: "event listener"
      pattern: "splitPdf.*all"
    - from: "extractSelectedBtnSplit (click)"
      to: "splitPdf('selected')"
      via: "event listener"
      pattern: "splitPdf.*selected"
    - from: "splitPdf"
      to: "extractPagesToPdf(splitPdfDoc, [pageIndex])"
      via: "per-page loop in 'all' mode; single call in 'selected' mode"
      pattern: "extractPagesToPdf"
    - from: "splitPdf"
      to: "downloadAsZip(files, zipName)"
      via: "called after all pages extracted"
      pattern: "downloadAsZip"
    - from: "splitPdf"
      to: "updateProgress(percent, 'progressBarSplit', 'progressFillSplit')"
      via: "called per page during extraction (50-95%) and for ZIP generation (96-100%)"
      pattern: "updateProgress.*progressBarSplit"
---

<objective>
Wire the page range text input Apply button, build the splitPdf() orchestration function (handles both "extract every page individually" and "extract selected as one grouped PDF" modes), and connect both extract buttons. Add a final human verification checkpoint.

Purpose: This is the "do the work" half of the split tool. Plans 01 and 02 built the visual selection layer; this plan makes it produce output. After this plan the feature is fully end-to-end.

Output: `applyRangeSelection()` function, `splitPdf(mode)` orchestrator, event listeners for both extract buttons, updated beforeunload guard, and a human verification checkpoint confirming the full flow works.
</objective>

<execution_context>
@C:/Users/Admin/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Admin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@C:/Users/Admin/Roaming/pdf_merger/.planning/ROADMAP.md
@C:/Users/Admin/Roaming/pdf_merger/.planning/STATE.md
@C:/Users/Admin/Roaming/pdf_merger/.planning/phases/01-split-pdf/01-RESEARCH.md
@C:/Users/Admin/Roaming/pdf_merger/.planning/phases/01-split-pdf/01-split-pdf-02-SUMMARY.md

<interfaces>
<!-- State variables populated by Plan 02 — available in global scope: -->
<!-- splitPdfFile: File | null — the uploaded File object -->
<!-- splitPdfDoc: PDFDocument | null — pdf-lib document loaded from splitPdfFile -->
<!-- splitNumPages: number — total page count -->
<!-- splitSelectedPages: Set<number> — 0-based page indices the user has selected -->
<!-- splitThumbnails: [{pageNum, dataUrl, width, height}] -->

<!-- Functions added by Plan 02 — callable: -->
<!-- renderSplitThumbnailGrid(): void — rebuilds grid HTML reflecting current splitSelectedPages -->
<!-- updateRangeInputFromSelection(): void — syncs range input text from splitSelectedPages Set -->
<!-- updateSplitSelectionSummary(): void — updates summary text below grid -->
<!-- clearSplitTool(): void — resets all state and hides UI -->

<!-- Utility functions added by Plan 01 — callable: -->
<!-- parsePageRange(rangeStr, pageCount): number[] | null -->
<!-- extractPagesToPdf(srcDoc, indices): Promise<Uint8Array> -->
<!-- downloadAsZip(files, zipName): Promise<void> -->

<!-- Shared utilities: -->
<!-- updateProgress(percent, barId, fillId): void -->
<!-- hideProgress(barId, fillId): void -->
<!-- showStatus(message, type, statusId): void -->

<!-- DOM references added by Plan 02 — already assigned: -->
<!-- splitApplyRangeBtn, splitPageRangeInput, splitRangeError -->
<!-- extractAllBtnSplit, extractSelectedBtnSplit, clearBtnSplit -->

<!-- OPEN QUESTION RESOLUTION (from RESEARCH.md §Open Questions #2): -->
<!-- "Extract Every Page" (SPLT-05) → mode='all' → one PDF per page → ZIP of N files -->
<!-- "Extract Selected Pages" → mode='selected' → one grouped PDF with all selected pages → ZIP of 1 file -->
<!-- This matches iLovePDF/Smallpdf convention. The research doc recommends this interpretation. -->

<!-- beforeunload guard (line ~1599-1605 in original index.html): -->
<!-- Currently checks selectedPdfFiles.length > 0 || watermarkFiles.length > 0 -->
<!-- Must also check splitPdfFile !== null to prevent accidental navigation during split work -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add range input Apply handler and splitPdf() orchestrator</name>
  <files>C:/Users/Admin/Roaming/pdf_merger/index.html</files>
  <action>
Insert the following JavaScript block immediately after the `window.toggleSplitPage = toggleSplitPage;` line added by Plan 02:

```javascript
        // --- Page range Apply button ---
        splitApplyRangeBtn.addEventListener('click', applyRangeSelection);
        splitPageRangeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') applyRangeSelection();
        });

        function applyRangeSelection() {
            const raw = splitPageRangeInput.value.trim();

            if (!raw) {
                // Empty input = clear selection (user wants to use thumbnail clicks or Extract All)
                splitSelectedPages = new Set();
                splitRangeError.style.display = 'none';
                extractSelectedBtnSplit.disabled = true;
                renderSplitThumbnailGrid();
                return;
            }

            const parsed = parsePageRange(raw, splitNumPages);

            if (parsed === null) {
                splitRangeError.textContent = `Invalid range. Use numbers 1–${splitNumPages} with commas or hyphens (e.g. "1-3, 5").`;
                splitRangeError.style.display = 'block';
                return;
            }

            splitRangeError.style.display = 'none';
            splitSelectedPages = new Set(parsed); // parsed is already 0-based
            extractSelectedBtnSplit.disabled = splitSelectedPages.size === 0;
            // Re-render grid to show new selection state
            renderSplitThumbnailGrid();
            // Normalize the input to consistent format (e.g. "1-3,5" → "1-3, 5")
            updateRangeInputFromSelection();
        }

        // --- splitPdf() orchestrator ---
        // mode: 'all' → extract every page as individual PDF (SPLT-05)
        // mode: 'selected' → extract selected pages as one grouped PDF (custom selection)
        async function splitPdf(mode) {
            if (!splitPdfDoc || !splitPdfFile) return;

            const startTime = Date.now();
            extractAllBtnSplit.disabled = true;
            extractSelectedBtnSplit.disabled = true;
            clearBtnSplit.disabled = true;
            showStatus('<div class="spinner"></div> Splitting PDF...', 'loading', 'statusSplit');
            updateProgress(0, 'progressBarSplit', 'progressFillSplit');

            try {
                const baseName = splitPdfFile.name.replace(/\.pdf$/i, '');

                if (mode === 'all') {
                    // Extract every page as a separate PDF — SPLT-05
                    const totalPages = splitPdfDoc.getPageCount();
                    const files = [];

                    for (let i = 0; i < totalPages; i++) {
                        // Process sequentially — release reference after adding to files array
                        // Avoids holding all Uint8Arrays in memory simultaneously (large PDF OOM concern)
                        const outBytes = await extractPagesToPdf(splitPdfDoc, [i]);
                        files.push({ name: `${baseName}-page-${i + 1}.pdf`, data: outBytes });

                        // Progress: 0–95% for extraction phase
                        updateProgress(((i + 1) / totalPages) * 95, 'progressBarSplit', 'progressFillSplit');
                    }

                    showStatus('<div class="spinner"></div> Creating ZIP...', 'loading', 'statusSplit');
                    updateProgress(96, 'progressBarSplit', 'progressFillSplit');

                    await downloadAsZip(files, `${baseName}-all-pages.zip`);
                    updateProgress(100, 'progressBarSplit', 'progressFillSplit');

                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                    showStatus(`✅ Extracted all ${totalPages} pages as individual PDFs — ZIP download started (${elapsed}s).`, 'success', 'statusSplit');

                } else {
                    // mode === 'selected' — extract selected pages as one grouped PDF
                    if (splitSelectedPages.size === 0) {
                        showStatus('❌ No pages selected. Click page thumbnails or use the range input to select pages.', 'error', 'statusSplit');
                        return;
                    }

                    const indices = Array.from(splitSelectedPages).sort((a, b) => a - b);
                    showStatus('<div class="spinner"></div> Extracting selected pages...', 'loading', 'statusSplit');
                    updateProgress(50, 'progressBarSplit', 'progressFillSplit');

                    const outBytes = await extractPagesToPdf(splitPdfDoc, indices);
                    updateProgress(90, 'progressBarSplit', 'progressFillSplit');

                    showStatus('<div class="spinner"></div> Creating ZIP...', 'loading', 'statusSplit');
                    updateProgress(96, 'progressBarSplit', 'progressFillSplit');

                    const pageLabel = indices.length === 1
                        ? `page-${indices[0] + 1}`
                        : `pages-${indices[0] + 1}-to-${indices[indices.length - 1] + 1}`;
                    await downloadAsZip(
                        [{ name: `${baseName}-${pageLabel}.pdf`, data: outBytes }],
                        `${baseName}-selected.zip`
                    );
                    updateProgress(100, 'progressBarSplit', 'progressFillSplit');

                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                    showStatus(`✅ Extracted ${indices.length} page${indices.length !== 1 ? 's' : ''} — ZIP download started (${elapsed}s).`, 'success', 'statusSplit');
                }

                setTimeout(() => hideProgress('progressBarSplit', 'progressFillSplit'), 1500);

            } catch (error) {
                hideProgress('progressBarSplit', 'progressFillSplit');
                showStatus(`❌ Error: ${error.message}`, 'error', 'statusSplit');
                console.error('Split PDF error:', error);
            } finally {
                extractAllBtnSplit.disabled = false;
                extractSelectedBtnSplit.disabled = splitSelectedPages.size === 0;
                clearBtnSplit.disabled = false;
            }
        }

        // --- Extract button event listeners ---
        extractAllBtnSplit.addEventListener('click', () => splitPdf('all'));
        extractSelectedBtnSplit.addEventListener('click', () => splitPdf('selected'));
```

Then find the existing `beforeunload` guard (near the end of the script, references `selectedPdfFiles.length > 0 || watermarkFiles.length > 0`) and add `|| splitPdfFile !== null` to the condition so it reads:
```javascript
            if (selectedPdfFiles.length > 0 || watermarkFiles.length > 0 || splitPdfFile !== null) {
```
  </action>
  <verify>
Open index.html in browser. Navigate to Split PDF. Upload a 3-page PDF.
1. Type "1-3" in the range input and click Apply → all 3 thumbnails become selected, range input normalizes to "1-3"
2. Type "0" in range input and click Apply → red error message appears, selection unchanged
3. Type "abc" in range input and click Apply → red error message appears
4. Click "Extract Every Page" → progress bar advances, a ZIP file downloads containing 3 individual PDFs
5. Upload a PDF, select page 2 via thumbnail click, click "Extract Selected Pages" → ZIP downloads with one grouped PDF
6. DevTools: `typeof splitPdf` → `'function'`
  </verify>
  <done>applyRangeSelection validates input using parsePageRange, shows error for invalid input, and syncs selection with the thumbnail grid. splitPdf('all') extracts every page individually and downloads a ZIP. splitPdf('selected') extracts selected pages as one grouped PDF and downloads a ZIP. Progress bar updates during both operations. Buttons are disabled during processing and re-enabled in finally block.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Complete Split PDF feature — upload, thumbnail grid, page selection (click + range input), Extract Every Page, Extract Selected Pages, progress, error handling, encryption detection, file size gate.</what-built>
  <how-to-verify>
Test the following flows in order (open index.html in a browser):

**Flow 1 — Extract Every Page:**
1. Click "Split PDF" in the nav → Split PDF section appears, others hide
2. Upload any unencrypted PDF with 3+ pages (click or drag-and-drop)
3. File info bar appears with filename and page count
4. Progress bar advances while thumbnails render, then hides
5. Thumbnail grid shows one card per page with visual page content
6. Click "Extract Every Page" → progress bar advances → a single .zip file downloads
7. Unzip the downloaded file → it contains one PDF per page, named {filename}-page-1.pdf, -page-2.pdf, etc.
8. Open one of the extracted PDFs → it contains exactly 1 page with the correct content

**Flow 2 — Extract Selected Pages via thumbnail click:**
1. Upload the same PDF again (or click Clear first)
2. Click thumbnail for page 1 and page 3 → both show blue border + checkmark
3. Page range input shows "1, 3" automatically
4. Click "Extract Selected Pages" → ZIP downloads
5. Unzip → contains one PDF with exactly 2 pages (page 1 and page 3 from original)

**Flow 3 — Extract Selected Pages via range input:**
1. Clear and upload PDF again
2. Type "2" in the range input → click Apply → page 2 thumbnail becomes selected
3. Click "Extract Selected Pages" → ZIP downloads with one 1-page PDF

**Flow 4 — Encryption and error handling:**
4. Clear → upload a known encrypted PDF → error message appears, no thumbnails, no crash
5. Type "0-5" in range input → click Apply → red error message appears (0 is invalid, pages start at 1)
6. Type "abc" → Apply → red error message appears

**Flow 5 — Existing tools still work:**
7. Click "PDF Tools" → PDF Tools section appears, split section hides
8. Upload 2 PDFs → Merge PDFs works correctly
9. Click "Watermark Inserter" → Watermark section appears

**Expected result for approval:** All flows above produce correct output with no JavaScript errors in DevTools console.
  </how-to-verify>
  <resume-signal>Type "approved" if all flows pass, or describe any issues found.</resume-signal>
</task>

</tasks>

<verification>
The checkpoint:human-verify task IS the final verification for this phase. All 8 SPLT requirements must be demonstrably satisfied by the flows in the checkpoint:

- SPLT-01: Upload via click and drag-and-drop (Flow 1 step 2)
- SPLT-02: Thumbnail grid visible after upload (Flow 1 step 4-5)
- SPLT-03: Thumbnail click toggles selection (Flow 2 step 2)
- SPLT-04: Page range text input selects pages (Flow 3 step 2)
- SPLT-05: Extract Every Page produces individual PDFs (Flow 1 step 6-8)
- SPLT-06: All output downloaded as single ZIP (Flow 1 step 6, Flow 2 step 4)
- SPLT-07: Encrypted PDF rejected with error (Flow 4 step 4)
- SPLT-08: Progress bar visible during operations (Flow 1 step 4, step 6)
</verification>

<success_criteria>
- Range input Apply button: valid ranges update thumbnail grid selection; invalid ranges show error; Enter key also triggers Apply
- "Extract Every Page" button: splits PDF into N individual single-page PDFs, downloads as one ZIP, ZIP contains N files named {source}-page-{n}.pdf
- "Extract Selected Pages" button: extracts all selected pages into one grouped PDF, downloads as one ZIP, disabled when no pages are selected
- Progress bar advances during extraction (0-95%) and ZIP generation (96-100%), hides 1.5s after completion
- Success message includes page count and elapsed time in seconds
- Buttons disabled during processing, re-enabled in finally block (prevents double-submit)
- beforeunload guard includes splitPdfFile !== null check
- No JavaScript errors in DevTools console during any of the test flows
- No regressions in PDF Tools or Watermark sections
</success_criteria>

<output>
After completion, create `.planning/phases/01-split-pdf/01-split-pdf-03-SUMMARY.md` with:
- What was built
- Confirmation of which SPLT requirements are satisfied
- Any deviations from this plan (especially around the 'selected' mode behavior)
- Result of human verification checkpoint
</output>
