# External Integrations

**Analysis Date:** 2026-03-02

## APIs & External Services

**None:** Application is 100% client-side with no backend or third-party API integrations. No authentication, payment processing, or external service calls.

## Data Storage

**Databases:**
- None - no backend database

**File Storage:**
- Local filesystem only - Files are processed entirely in browser memory using Web File API

**Caching:**
- Browser caching via CDN for external library scripts
- No application-level caching (sessionStorage or localStorage)

## Authentication & Identity

**Auth Provider:**
- Not applicable - no authentication system present

**Implementation:**
- N/A - all processing is anonymous and local

## Monitoring & Observability

**Error Tracking:**
- Not detected - no error tracking service integrated

**Logs:**
- Console logging only - errors logged to browser console via `console.error()`
- No centralized logging service

## CI/CD & Deployment

**Hosting:**
- Static file hosting (current: GitHub repository at `/c/Users/Admin/Roaming/pdf_merger/`)
- Compatible with: GitHub Pages, Netlify, Vercel, AWS S3, or any static file host

**CI Pipeline:**
- Not detected - no CI/CD configuration present

**Deployment Method:**
- Manual: Upload `index.html` and `CLMC 2026 REGISTERED LOGO.png` to static hosting

## Environment Configuration

**Required env vars:**
- None - application requires no environment configuration

**Secrets location:**
- Not applicable - no secrets, API keys, or credentials in application

## CDN Dependencies

**Required External Resources:**

**pdf-lib Library (JavaScript):**
- Purpose: PDF document creation, manipulation, and watermark application
- URL: `https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js`
- Fallback: None configured
- Offline availability: No

**PDF.js Library (JavaScript):**
- Purpose: PDF rendering and page-to-image conversion
- URL: `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js`
- Worker URL: `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`
- Fallback: None configured
- Offline availability: No

**Images:**
- Logo: `CLMC 2026 REGISTERED LOGO.png` (local/embedded)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None - no external webhooks or API callbacks

## Data Flow

**User Data Processing:**
- All file uploads handled via HTML5 File Input API (line 655: `#fileInputPdf`, line 677: `#fileInputWatermark`)
- Files remain in browser memory during processing
- No data transmission to external servers
- Files downloaded directly via Blob URL (lines 1091-1097, 1566-1572)

**Watermark Loading:**
- Single fetch request to load watermark image (line 1427: `fetch(watermarkImageUrl)`)
- Image URL must be valid browser-accessible URL
- Image converted to array buffer for PDF.js integration

## Browser Permissions Required

**For Functionality:**
- File system read access (via file input)
- Canvas rendering
- Blob creation and download
- Fetch API (for watermark loading)

**Not Required:**
- Microphone/Camera access
- Location/Geolocation
- Notifications
- Service Worker

## Third-Party Links

**Documentation Links (in footer):**
- pdf-lib documentation: `https://pdf-lib.js.org/` (link only, not integrated)
- PDF.js documentation: `https://mozilla.github.io/pdf.js/` (link only, not integrated)

## Privacy & Data Handling

**Policy:**
- 100% Private - Application explicitly states no data collection (privacy badge at line 625 and 688)
- No files uploaded to any server
- All processing happens entirely in client browser
- No tracking, analytics, or telemetry

---

*Integration audit: 2026-03-02*
