# Phase 4: UI/UX Overhaul - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current purple gradient color scheme with a monochrome palette derived from the CLMC logo, remove all emojis throughout the app, add the company logo to the navbar, and apply overall visual polish. All tools remain functionally identical — this is purely cosmetic.

</domain>

<decisions>
## Implementation Decisions

### Color Scheme & Branding
- Pure monochrome palette: black (~#1a1a1a/#222), medium gray (~#999/#aaa), light gray (#f0f0f0), white
- Colors derived from the CLMC logo (black diamond icon, gray accent, white background)
- Page background: light gray (#f0f0f0) replacing the purple gradient
- No accent color — everything stays in the black/gray/white range
- All 25+ references to #667eea and #764ba2 must be replaced with monochrome equivalents

### Logo Placement & Navbar
- Replace the emoji + text brand ("CLMC TOOLS") with the full CLMC logo PNG + "TOOLS" text suffix
- Logo loaded from local file reference (CLMC 2026 REGISTERED LOGO.png), not GitHub URL
- Logo height: 48px (medium) in the navbar
- Logo and "TOOLS" text displayed together as the brand element

### Emoji Replacement - Nav Buttons & Headings
- Nav buttons: text only, no icons — clean labels like "Merge PDFs", "PDF to Images", "Watermark Inserter", "Split PDF", "Compress PDF"
- Section headings: plain text, no icons — same treatment as nav buttons
- Remove all emojis from nav buttons and h1 headings

### Emoji Replacement - Status Messages
- Replace emoji status indicators (checkmark, X, warning) with CSS-styled indicators
- Use colored dots, CSS checkmarks, or X marks via styled spans
- Green indicators for success, red for errors, yellow/orange for warnings
- No emoji characters in any status message strings

### Emoji Replacement - File List Icons
- Claude's Discretion: pick what looks best in context for file type indicators in file lists

### Card & Container Style
- Flat and minimal design — reduce or remove heavy shadows
- Sharp corners: 4-8px border-radius (down from current 16px)
- Use subtle borders instead of heavy box-shadows
- Think Notion/Linear aesthetic

### Button Style
- Primary action buttons: solid black background, white text
- Hover state: lightens to dark gray
- Replace all gradient button backgrounds with solid black

### Upload Areas
- Claude's Discretion: pick what looks best for drag-and-drop zones in the monochrome context

### Claude's Discretion
- File list icon treatment (emoji replacement)
- Upload area border style
- Exact gray shades for borders, dividers, and secondary text
- Typography weight adjustments if needed for the flatter design
- Progress bar color (currently purple gradient)
- Footer styling updates to match new look

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CLMC 2026 REGISTERED LOGO.png`: Local logo file in project root, already committed
- Existing CSS class structure (`.nav-link`, `.container`, `.tool-section`, `.upload-area`, `.file-item`) stays the same — only color/shadow values change

### Established Patterns
- All styling is embedded in `<style>` block (lines 7-603 in index.html)
- Color values are hardcoded throughout — 25+ references to #667eea and #764ba2
- Emojis appear in HTML markup (nav buttons, headings) and in JavaScript strings (status messages, file list renders)
- CSS gradients used for: body background, active nav links, primary buttons, progress bars
- Heavy box-shadows on `.navbar` (0 10px 30px) and `.container` (0 20px 60px)
- Border-radius: 16px on cards, 8px on buttons/inputs

### Integration Points
- Navbar brand area (currently `.navbar-brand` with emoji text)
- All `showStatus()` calls in JavaScript with emoji prefixes
- Template literals in `renderMergeFileList()`, `renderImageFileList()`, `renderWatermarkFileList()`, `renderCompressFileList()` that embed emoji
- Nav button labels in HTML
- Section h1 headings in HTML

</code_context>

<specifics>
## Specific Ideas

- Logo is black/gray/white monochrome — the entire app palette should match this aesthetic
- "Think Notion/Linear" for the flat, minimal card style
- Solid black buttons are decisive and match the logo's bold black strokes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-ui-ux-overhaul-replace-gradient-color-scheme-remove-emojis-add-company-logo-overall-polish*
*Context gathered: 2026-03-03*
