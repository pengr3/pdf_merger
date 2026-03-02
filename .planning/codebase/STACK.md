# Technology Stack

**Analysis Date:** 2026-03-02

## Languages

**Primary:**
- HTML5 - Web application markup and structure in `index.html`
- CSS3 - Styling with flexbox, gradients, and responsive design in embedded styles
- JavaScript (ES6+) - Client-side application logic in embedded script block

## Runtime

**Environment:**
- Web Browser (client-side only)

**Package Manager:**
- Not applicable - single-file deployment with CDN-based dependencies

## Frameworks

**Core:**
- pdf-lib 1.17.1 - PDF document creation and manipulation (CDN: https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js)
- PDF.js (pdfjs-dist) 3.11.174 - PDF rendering and page-to-image conversion (CDN: https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js)

**Testing:**
- Not detected - no test framework configured

**Build/Dev:**
- Not detected - single-file development (no build process)

## Key Dependencies

**Critical:**
- pdf-lib - Enables PDF merging, document manipulation, and watermark application; provides `PDFDocument`, `rgb`, `degrees` utilities
- PDF.js (pdfjs-dist) - Enables PDF rendering in browser, page-to-image conversion, and PDF parsing capabilities

## Configuration

**Environment:**
- Client-side only - no environment variables or configuration files required
- No secrets or credentials needed - all processing occurs locally in browser

**Build:**
- Not applicable - single HTML file deployment

**Runtime Configuration:**
- PDF.js Worker Configuration: Located at line 758 in `index.html`
  - Worker source: `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`
  - Required for PDF.js rendering to function properly

## Platform Requirements

**Development:**
- Any text editor for editing `index.html`
- Git for version control (present: `.git` directory exists)
- Web server for local testing (simple HTTP server or browser file:// protocol)

**Production:**
- Static file hosting (CDN, web server, or GitHub Pages)
- HTTPS recommended for browser APIs (Blob, fetch, file upload)
- Modern browser with ES6+ support and File API

**Browsers Supported:**
- Chrome/Chromium 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Any browser supporting: Fetch API, Blob API, FileReader, Canvas API

## External CDN Dependencies

**Required at Runtime:**
1. pdf-lib 1.17.1 from jsDelivr
   - URL: `https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js`
   - Fallback: None configured

2. PDF.js 3.11.174 from jsDelivr
   - URL: `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js`
   - Worker: `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`
   - Fallback: None configured

## Browser APIs Used

**Core:**
- File API - File input and drag-drop handling
- Fetch API - Watermark image loading (line 1427)
- Canvas API - Watermark preview rendering and image conversion
- Blob API - PDF and image generation
- URL.createObjectURL / URL.revokeObjectURL - Download link generation

---

*Stack analysis: 2026-03-02*
