# Testing Patterns

**Analysis Date:** 2026-03-02

## Test Framework

**Runner:**
- Not detected - no test framework currently in use

**Assertion Library:**
- Not detected - no test framework in use

**Run Commands:**
- No npm scripts or test runner configured

## Current Testing Status

**Testing Infrastructure:**
- No automated testing framework detected
- No test files (*.test.js, *.spec.js) present in repository
- No jest.config.js, vitest.config.js, or similar configuration files
- No test-related dependencies in project

**Coverage:**
- No coverage reporting tool configured
- Coverage requirements: Not enforced

## Testing Gaps

All feature areas lack automated test coverage:

**PDF Tools Module:**
- PDF merge functionality not tested (`mergePDFs()`)
- PDF to image conversion not tested (`convertPdfToImages()`)
- File validation and error handling not tested
- Drag-and-drop reordering not tested

**Watermark Module:**
- Watermark application logic not tested (`applyWatermarkToPdf()`, `applyWatermarkToImage()`)
- Watermark preview rendering not tested (`updateWatermarkPreview()`)
- Style application (corner, center, diagonal) not tested
- Canvas-based image processing not tested

**UI Components:**
- File list rendering not tested (`renderPdfFileList()`, `renderWatermarkFileList()`)
- Mode switching logic not tested (`updatePdfToolMode()`)
- Button state management not tested (`updatePdfButtons()`, `updateWatermarkButtons()`)
- Progress bar updates not tested

**Utilities:**
- HTML escaping not tested (`escapeHtml()`)
- Progress update logic not tested (`updateProgress()`, `hideProgress()`)
- Status message display not tested (`showStatus()`, `hideStatus()`)

## Critical Testing Recommendations

**High Priority:**

1. **File Validation Tests:**
   - Files: `index.html` - lines 842-848 (PDF drop handler), 1238-1244 (watermark drop handler)
   - Test valid PDF type checking
   - Test image file type filtering
   - Test file size handling

2. **PDF Processing Tests:**
   - Files: `index.html` - lines 1054-1080 (merge), 1138-1162 (convert)
   - Mock PDFDocument and PDFLib
   - Verify page copying and merging
   - Test error handling for corrupted PDFs
   - Test progress updates during processing

3. **Watermark Application Tests:**
   - Files: `index.html` - lines 1423-1477 (PDF), 1479-1531 (image)
   - Test watermark positioning (corner, center, diagonal)
   - Test opacity settings
   - Test image/PDF watermark distinction
   - Test rotation calculations

4. **Canvas Drawing Tests:**
   - Files: `index.html` - lines 1335-1405 (preview drawing)
   - Test canvas context operations
   - Test watermark dimension calculations
   - Test transformation calculations

**Medium Priority:**

5. **UI State Tests:**
   - File list rendering with proper escaping
   - Button enable/disable logic
   - Mode switching state reset
   - Drag-and-drop event handling

## Suggested Testing Approach

**Recommended Test Framework:**
- Vitest (modern, fast, compatible with browser APIs)
- Alternative: Jest with jsdom for DOM testing

**Setup Structure:**
```
index.html                    # Application file
tests/
├── pdf-tools.test.js         # PDF merge, convert tests
├── watermark.test.js         # Watermark application tests
├── ui-state.test.js          # UI rendering, state tests
├── utils.test.js             # Utility function tests
└── fixtures/
    ├── sample.pdf            # Test PDF file
    ├── sample.png            # Test image file
    └── corrupt.pdf           # Corrupted PDF for error testing
vitest.config.js              # Test runner config
```

## Testing Patterns for Single-File App

**Challenges:**
- Single HTML file requires refactoring to expose functions for testing
- CDN libraries (pdf-lib, PDF.js) must be mocked in test environment
- Canvas operations require DOM-aware test runner

**Solutions:**
1. Extract core logic into testable modules while keeping HTML structure
2. Use import statements instead of global CDN scripts in test environment
3. Mock external library APIs at module boundaries
4. Use jsdom or happy-dom for DOM testing

## Example Test Pattern

**Recommended structure for new tests:**
```javascript
// tests/pdf-tools.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PDF Tools', () => {
  describe('mergePDFs', () => {
    it('should merge multiple PDF files', async () => {
      // Setup
      // Call mergePDFs()
      // Assert result contains merged pages
    });

    it('should throw error when less than 2 files provided', async () => {
      // Setup
      // Call mergePDFs() with 1 file
      // Assert error message shown to user
    });

    it('should handle corrupted PDF gracefully', async () => {
      // Setup with corrupt PDF
      // Assert error caught and user notified
    });
  });

  describe('convertPdfToImages', () => {
    it('should convert PDF pages to PNG images', async () => {
      // Setup
      // Call convertPdfToImages()
      // Assert image array created for each page
    });

    it('should update progress during conversion', async () => {
      // Mock updateProgress
      // Call convertPdfToImages()
      // Assert progress updates match page count
    });
  });
});

// tests/watermark.test.js
describe('Watermark Module', () => {
  describe('applyWatermarkToPdf', () => {
    it('should apply corner watermark to PDF', async () => {
      // Mock PDFDocument
      // Call applyWatermarkToPdf with style='corner'
      // Assert watermark positioned correctly
    });

    it('should respect opacity setting', async () => {
      // Call with opacity=50
      // Assert opacity value applied to PDF
    });
  });

  describe('updateWatermarkPreview', () => {
    it('should render preview on canvas', () => {
      // Setup canvas element
      // Call updateWatermarkPreview()
      // Assert canvas drawing operations called
    });

    it('should update preview when opacity changes', () => {
      // Call with different opacity values
      // Assert canvas redrawn with new opacity
    });
  });
});
```

## Mocking Strategy

**Libraries to Mock:**
- `PDFLib` - Mock PDFDocument, page operations
- `pdfjsLib` - Mock PDF.getDocument, page rendering
- `Image` - Mock onload/onerror handlers
- `Canvas` - Mock getContext, drawing operations

**What to Test (Real):**
- File validation logic
- Array manipulation (file ordering, removal)
- DOM state management
- Progress calculations
- Error handling and user feedback

**What to Mock (External):**
- PDF processing library calls
- Image/canvas rendering
- Network calls (watermark image fetch)
- File I/O operations

---

*Testing analysis: 2026-03-02*
