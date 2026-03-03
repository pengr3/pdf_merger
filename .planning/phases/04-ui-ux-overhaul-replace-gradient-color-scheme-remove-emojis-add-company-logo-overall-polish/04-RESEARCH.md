# Phase 4: UI/UX Overhaul - Research

**Researched:** 2026-03-03
**Domain:** Pure CSS/HTML cosmetic overhaul of a single-file vanilla JS/HTML application
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Color Scheme & Branding**
- Pure monochrome palette: black (~#1a1a1a/#222), medium gray (~#999/#aaa), light gray (#f0f0f0), white
- Colors derived from the CLMC logo (black diamond icon, gray accent, white background)
- Page background: light gray (#f0f0f0) replacing the purple gradient
- No accent color — everything stays in the black/gray/white range
- All 25+ references to #667eea and #764ba2 must be replaced with monochrome equivalents

**Logo Placement & Navbar**
- Replace the emoji + text brand ("CLMC TOOLS") with the full CLMC logo PNG + "TOOLS" text suffix
- Logo loaded from local file reference (CLMC 2026 REGISTERED LOGO.png), not GitHub URL
- Logo height: 48px (medium) in the navbar
- Logo and "TOOLS" text displayed together as the brand element

**Emoji Replacement - Nav Buttons & Headings**
- Nav buttons: text only, no icons — clean labels like "Merge PDFs", "PDF to Images", "Watermark Inserter", "Split PDF", "Compress PDF"
- Section headings: plain text, no icons — same treatment as nav buttons
- Remove all emojis from nav buttons and h1 headings

**Emoji Replacement - Status Messages**
- Replace emoji status indicators (checkmark, X, warning) with CSS-styled indicators
- Use colored dots, CSS checkmarks, or X marks via styled spans
- Green indicators for success, red for errors, yellow/orange for warnings
- No emoji characters in any status message strings

**Card & Container Style**
- Flat and minimal design — reduce or remove heavy shadows
- Sharp corners: 4-8px border-radius (down from current 16px)
- Use subtle borders instead of heavy box-shadows
- Think Notion/Linear aesthetic

**Button Style**
- Primary action buttons: solid black background, white text
- Hover state: lightens to dark gray
- Replace all gradient button backgrounds with solid black

### Claude's Discretion
- File list icon treatment (emoji replacement in file lists — what looks best)
- Upload area border style (drag-and-drop zones in monochrome context)
- Exact gray shades for borders, dividers, and secondary text
- Typography weight adjustments if needed for the flatter design
- Progress bar color (currently purple gradient)
- Footer styling updates to match new look
- Emoji replacement in file list `file-details` spans (📄, 📅, 🖼️)
- Reorder hint row emoji (↕️)
- Privacy badge lock icon (🔒)
- Split thumb-card checkmark (✓ is already a text character, not emoji — see below)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 4 is a purely cosmetic overhaul of a single monolithic `index.html` file (2,874 lines). There are no new libraries to install, no build system to configure, and no JavaScript logic to change. All work is: (1) CSS color token replacement, (2) HTML emoji removal, (3) JavaScript string emoji removal, (4) logo image integration in the navbar. No external research is needed for library selection — this is vanilla HTML/CSS editing.

The file has 25 hardcoded occurrences of `#667eea` and at least 4 of `#764ba2` spread across the `<style>` block (lines 7–603 in CSS, plus inline styles). Emojis appear in three distinct locations: HTML markup (navbar brand, nav buttons, h1 headings, privacy badges, upload areas, reorder hint), JavaScript template literals (file detail spans in `renderMergeFileList` and `renderWatermarkFileList`), and JavaScript string arguments to `showStatus()` calls (✅, ❌, ⚠️). The CLMC logo PNG already exists in the project root and is 40KB — it is ready to reference directly.

The Notion/Linear aesthetic the user wants is well-characterized: flat white cards on a light gray page background, 1px #e5e7eb borders replacing box-shadows, 4-6px border-radius on cards and 4px on buttons, solid black primary buttons (#1a1a1a), neutral secondary buttons (#f5f5f5), and a monospaced/sans-serif type stack with heavier weight on headings. This aesthetic requires no animation libraries, no icon fonts, and no new dependencies.

**Primary recommendation:** Treat this as a pure find-and-replace + targeted HTML/JS edit task. Group changes into: (A) CSS palette swap, (B) card/button style polish, (C) navbar logo, (D) HTML emoji removal, (E) JS string emoji removal with CSS indicator spans. No new library installs required.

---

## Standard Stack

### Core
| Asset | Version | Purpose | Why Standard |
|-------|---------|---------|--------------|
| Existing `<style>` block | n/a | All CSS lives here (lines 7–603) | Established pattern — no external stylesheet |
| `CLMC 2026 REGISTERED LOGO.png` | n/a | Navbar brand image | Already committed to project root |
| Vanilla CSS | n/a | Color tokens, layout, typography | No build step, no frameworks |

### Supporting
| Technique | Purpose | When to Use |
|-----------|---------|-------------|
| CSS custom properties (variables) | Define palette once, reference everywhere | Optional — useful but not required since this is a one-time replacement |
| CSS `content` pseudo-elements | Render styled indicators (checkmarks, X marks) without HTML changes | For status indicator replacement |
| `<span>` with inline class | Wrap colored indicator dots/marks in status messages | Inserting into `showStatus()` template strings |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS custom properties for palette | Direct hardcoded hex values | Variables add maintainability but require a refactor step; direct replace is faster for a one-time change — either is valid |
| CSS `::before` pseudo-element for indicators | Unicode characters (non-emoji) | Unicode characters like "✓" and "✗" are simpler but less styleable — CSS spans with colored dots are cleaner |
| Local PNG logo | Base64 inline image | Local reference keeps HTML readable; base64 is self-contained but ~53KB of inline text |

**Installation:** No new packages. Zero new dependencies.

---

## Architecture Patterns

### No Structural Changes Required

This phase touches `index.html` only. The file has one `<style>` block (CSS), one HTML `<body>`, and one `<script>` block. The class structure (`.nav-link`, `.container`, `.tool-section`, `.upload-area`, `.file-item`) is unchanged — only property values are updated.

### Color Mapping (Current → New)

| Current Value | Usage | New Value |
|--------------|-------|-----------|
| `#667eea` | Primary color (borders, buttons, accents) | `#1a1a1a` (borders), `#1a1a1a` (button bg) |
| `#764ba2` | Secondary gradient stop | `#444` or `#555` (hover states) |
| `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` | Body bg | `#f0f0f0` (flat) |
| `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` | Submit btn bg | `#1a1a1a` (solid) |
| `linear-gradient(90deg, #667eea 0%, #764ba2 100%)` | Progress fill | Per Claude's discretion (e.g., `#1a1a1a` or `#555`) |
| `rgba(102, 126, 234, 0.4)` | Button box-shadow | Remove entirely (flat design) |
| `#f0f2ff`, `#f8f9ff` | Light purple tints | `#f5f5f5` or `#f8f8f8` |
| `#e8ebff` | Drag-over state bg | `#ebebeb` |
| `#f0f4ff` | Split thumb selected bg | `#f0f0f0` or `#e8e8e8` |
| `#c7d2fe` | Split file info border | `#ddd` |

### Complete Emoji Inventory

**Location 1: HTML navbar brand (line 893)**
- `🛠️ CLMC TOOLS` → replace entire `.navbar-brand` content with `<img src="CLMC 2026 REGISTERED LOGO.png" ...> TOOLS`

**Location 2: HTML nav buttons (lines 895–899)**
- `📚 Merge PDFs` → `Merge PDFs`
- `🖼️ PDF to Images` → `PDF to Images`
- `💧 Watermark Inserter` → `Watermark Inserter`
- `✂️ Split PDF` → `Split PDF`
- `📦 Compress PDF` → `Compress PDF`

**Location 3: HTML h1 headings (lines 906, 941, 973, 1044, 1093)**
- `📚 Merge PDFs` → `Merge PDFs`
- `🖼️ PDF to Images` → `PDF to Images`
- `💧 Watermark Inserter` → `Watermark Inserter`
- `✂️ Split PDF` → `Split PDF`
- `📦 Compress PDF` → `Compress PDF`

**Location 4: HTML privacy badges (lines 910, 945, 977, 1048, 1097)**
- `🔒 <strong>100% Private</strong>` → remove lock emoji, keep text (or replace with CSS lock indicator — Claude's discretion)

**Location 5: HTML upload areas - upload-icon divs (lines 914, 949, 982, 1052, 1152)**
- `<div class="upload-icon">📁</div>` → remove or replace with CSS-styled icon (Claude's discretion)

**Location 6: HTML reorder hint (line 923)**
- `↕️ <strong>Tip:</strong>` → `<strong>Tip:</strong>` (↕️ is a standard Unicode arrow, treated as emoji in some contexts; remove to be safe per locked decision)

**Location 7: JS template literal - renderMergeFileList (lines 1319–1320)**
- `📄 ${size} MB` → remove 📄 or replace with CSS indicator
- `📅 ${date}` → remove 📅 or replace with text label

**Location 8: JS template literal - renderWatermarkFileList (lines 2586–2587)**
- `file.type.includes('pdf') ? '📄' : '🖼️'` → remove emoji entirely or use CSS class label
- `📅 ${date}` → remove 📅 or replace with text label

**Location 9: JS showStatus() strings — success messages (lines 1741, 1792, 2086, 2282, 2447, 2846)**
- `✅` prefix → CSS-styled `<span class="status-icon status-success"></span>`

**Location 10: JS showStatus() strings — error messages (lines 1521, 1535, 1550, 1594, 1746, 1799, 2088, 2095, 2136, 2297, 2455, 2854)**
- `❌` prefix → CSS-styled `<span class="status-icon status-error"></span>`

**Location 11: JS showStatus() string — warning message (line 1541)**
- `⚠️` prefix → CSS-styled `<span class="status-icon status-warning"></span>`

**Note:** Line 1609 contains `✓` inside `.split-thumb-check` — this is a standard ASCII/Unicode checkmark character (U+2713), not an emoji. It does not need removal per the locked decisions (which target emoji characters).

### CSS Status Indicator Pattern

```css
/* Status indicator spans — replaces emoji prefixes in showStatus() */
.status-icon {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
    flex-shrink: 0;
}
.status-icon.status-success { background: #22c55e; }
.status-icon.status-error   { background: #ef4444; }
.status-icon.status-warning { background: #f59e0b; }
```

Usage in showStatus() calls:
```javascript
// Before:
showStatus('✅ PDF merged successfully! Download started.', 'success', 'statusMerge');

// After:
showStatus('<span class="status-icon status-success"></span> PDF merged successfully! Download started.', 'success', 'statusMerge');
```

### Navbar Logo Pattern

```html
<!-- Replace this: -->
<div class="navbar-brand">🛠️ CLMC TOOLS</div>

<!-- With this: -->
<div class="navbar-brand">
    <img src="CLMC 2026 REGISTERED LOGO.png" alt="CLMC" class="navbar-logo" />
    <span class="navbar-tools-text">TOOLS</span>
</div>
```

```css
.navbar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 20px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 15px;
}

.navbar-logo {
    height: 48px;
    width: auto;
    display: block;
}

.navbar-tools-text {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #1a1a1a;
}
```

### Card/Container Polish (Notion/Linear aesthetic)

```css
/* Before: */
.navbar {
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}
.container {
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

/* After: */
.navbar {
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    box-shadow: none;
}
.container {
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    box-shadow: none;
}
```

### Submit Button Pattern

```css
/* Before: */
.submit-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}
.submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

/* After: */
.submit-btn {
    background: #1a1a1a;
    box-shadow: none;
}
.submit-btn:hover:not(:disabled) {
    background: #444;
    transform: none;
    box-shadow: none;
}
```

### Anti-Patterns to Avoid
- **Partial color replacement:** Missing instances of `#667eea` in JS template strings (compress-download-btn, split-apply-btn, etc.) — do a full grep-based audit before marking done.
- **Touching JavaScript logic:** This phase is purely cosmetic. Do not restructure JS functions, change event handlers, or alter data flow.
- **Introducing CSS variables mid-replacement:** Tempting but increases plan complexity; direct value replacement is simpler and the codebase has no existing variable system.
- **Changing CSS class names:** The planner confirmed class structure is unchanged — only property values change.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status indicator icons | Custom SVG icon system | CSS `border-radius: 50%` colored spans | Sufficient for small dot indicators; zero complexity |
| Logo display | Canvas-rendered logo | Native `<img>` tag | PNG already exists, `<img>` with fixed height is all that's needed |
| Color theme switching | CSS-in-JS theming, CSS variable cascade | Direct hardcoded monochrome values | No theme switching is needed; single design |
| Progress bar color | Animated gradient fill | Solid `#1a1a1a` fill | Matches monochrome palette, no complexity |

**Key insight:** Every "problem" in this phase has a trivially simple solution because there is no interactivity, no state, and no new behavior being introduced — only visual values change.

---

## Common Pitfalls

### Pitfall 1: Missing Color References Outside the Style Block
**What goes wrong:** Developer replaces all colors in the CSS `<style>` block but misses hardcoded colors in inline styles scattered through HTML or JS template literals.
**Why it happens:** `#667eea` appears in CSS, but also in inline style attributes and JS template strings.
**How to avoid:** Run a full-file grep for `#667eea` and `#764ba2` after replacements to confirm count is 0.
**Warning signs:** Nav active state still shows purple, or `.slider-value` background is still purple after CSS update.

**Specific known occurrences from audit:**
- Line 48: `.nav-link` border
- Line 51: `.nav-link` color
- Line 63: `.nav-link.active` gradient background
- Line 96: `h2` border-bottom
- Line 123: `.upload-area` dashed border
- Line 134/139: `.upload-area:hover` and `.dragover` border-color
- Line 150: `.upload-text` color
- Line 210: `.file-item.drag-over` border-top
- Line 234: `.file-order` background
- Line 309: `.submit-btn` gradient background
- Line 363: `.spinner` border-top color
- Line 390: `.progress-fill` gradient background
- Line 403: `.footer a` color
- Line 468/483: `.radio-option:hover` and `.selected` border-color
- Line 513: `.slider-value` background
- Line 558: `.image-item .download-btn` background
- Line 614: `.split-range-input:focus` border-color
- Line 619: `.split-apply-btn` background
- Line 660/665: `.split-thumb-card:hover` and `.selected` border-color
- Line 688: `.split-thumb-check` background
- Line 798/808: `.compress-download-btn` background and hover
- Total: 25 CSS occurrences confirmed, all in `<style>` block

### Pitfall 2: Emoji in JS Strings vs HTML
**What goes wrong:** Developer removes emojis from HTML template but misses the emoji prefix strings in `showStatus()` calls scattered through 5 different function bodies.
**Why it happens:** `showStatus()` calls are spread across all tool blocks (Split PDF, Compress PDF, Merge PDFs, PDF to Images, Watermark) with no centralized location.
**How to avoid:** Search for `✅`, `❌`, `⚠️` explicitly in JS section before marking complete. There are 11 error occurrences, 5 success occurrences, and 1 warning occurrence.
**Warning signs:** Status messages still render with raw emoji characters after HTML cleanup pass.

### Pitfall 3: Logo Path Relative Reference
**What goes wrong:** Logo `src="CLMC 2026 REGISTERED LOGO.png"` breaks if the app is served from a subdirectory.
**Why it happens:** Relative path assumes index.html and PNG are in the same directory, which is true for this project.
**How to avoid:** Confirm the project serves from root (it does — `index.html` and `CLMC 2026 REGISTERED LOGO.png` are both in project root). Path is correct as-is.
**Warning signs:** Broken image icon in navbar after deployment.

### Pitfall 4: Removing Shadow Creates Formless Cards
**What goes wrong:** Removing box-shadow without adding a border makes `.navbar` and `.container` invisible against `#f0f0f0` background (since they're both white on white-adjacent).
**Why it happens:** Box-shadow was providing visual separation. Flat design requires a subtle border to compensate.
**How to avoid:** Always pair shadow removal with `border: 1px solid #e5e7eb` or similar. The user's Notion/Linear reference uses exactly this pattern.
**Warning signs:** White card appears to have no edges when page background is `#f0f0f0`.

### Pitfall 5: `border-radius` Inconsistency Across Components
**What goes wrong:** Some components updated to 4-8px radius while others (`.upload-area`, `.options-group`, `.stats`) remain at 12-16px.
**Why it happens:** Many components have individual `border-radius` values — it's easy to miss some.
**How to avoid:** After radius changes, do a grep for `border-radius: 1[0-9]px` and `border-radius: 2[0-9]px` to catch any remaining large values that should be reduced.

### Pitfall 6: `transform: translateY(-2px)` on Hover Must Be Removed
**What goes wrong:** Submit button still "lifts" on hover even after gradient is removed, which breaks the flat design aesthetic.
**Why it happens:** The transform is in `.submit-btn:hover:not(:disabled)` and is easy to overlook when focusing on color changes.
**How to avoid:** Lock decision says "hover state: lightens to dark gray" — the only hover change should be background-color.

---

## Code Examples

### Full Palette Swap Reference

Primary replacements (CSS property values only):

```css
/* body background */
background: #f0f0f0;  /* was: linear-gradient(135deg, #667eea 0%, #764ba2 100%) */

/* nav-link border and color */
border: 2px solid #1a1a1a;
color: #1a1a1a;

/* nav-link active */
background: #1a1a1a;
color: white;
/* remove the gradient */

/* nav-link hover */
background: #f5f5f5;

/* h2 border-bottom */
border-bottom: 2px solid #1a1a1a;

/* upload-area dashed border */
border: 2px dashed #aaa;

/* upload-area hover/dragover border */
border-color: #555;

/* upload-text color */
color: #555;

/* file-item.drag-over top border */
border-top: 3px solid #1a1a1a;

/* file-order badge background */
background: #1a1a1a;

/* submit-btn background */
background: #1a1a1a;
/* remove box-shadow entirely */

/* submit-btn hover */
background: #444;
/* transform: none */

/* spinner border-top */
border-top: 3px solid #1a1a1a;

/* progress-fill background */
background: #1a1a1a;  /* or #555 for softer look */

/* footer link color */
color: #555;

/* radio-option hover/selected border */
border-color: #1a1a1a;

/* radio-option hover/selected background */
background: #f5f5f5;

/* slider-value background */
background: #1a1a1a;

/* image download-btn background */
background: #1a1a1a;

/* split-range-input focus border */
border-color: #1a1a1a;

/* split-apply-btn background */
background: #1a1a1a;

/* split-thumb-card hover/selected border */
border-color: #1a1a1a;

/* split-thumb-card selected background */
background: #f5f5f5;

/* split-thumb-check background */
background: #1a1a1a;

/* compress-download-btn background */
background: #1a1a1a;
```

### Navbar Brand HTML

```html
<div class="navbar-brand">
    <img src="CLMC 2026 REGISTERED LOGO.png" alt="CLMC" class="navbar-logo" />
    <span class="navbar-tools-text">TOOLS</span>
</div>
```

### Nav Buttons HTML (emoji removed)

```html
<button class="nav-link active" data-tool="merge-pdf">Merge PDFs</button>
<button class="nav-link" data-tool="pdf-to-images">PDF to Images</button>
<button class="nav-link" data-tool="watermark">Watermark Inserter</button>
<button class="nav-link" data-tool="split-pdf">Split PDF</button>
<button class="nav-link" data-tool="compress-pdf">Compress PDF</button>
```

### H1 Headings (emoji removed)

```html
<h1>Merge PDFs</h1>
<h1>PDF to Images</h1>
<h1>Watermark Inserter</h1>
<h1>Split PDF</h1>
<h1>Compress PDF</h1>
```

### Status Message Pattern (JS)

```javascript
// Success
showStatus('<span class="status-icon status-success"></span> PDF merged successfully! Download started.', 'success', 'statusMerge');

// Error
showStatus('<span class="status-icon status-error"></span> File too large (max 80 MB). Please use a smaller PDF.', 'error', 'statusSplit');

// Warning (in a loading status)
showStatus('<span class="status-icon status-warning"></span> Large file — processing may take a moment.', 'loading', 'statusSplit');
```

### File Detail Spans (JS template literal, Claude's Discretion)

```javascript
// Before:
`<span>📄 ${size} MB</span>`
`<span>📅 ${date}</span>`

// Recommended after (text labels, no emoji):
`<span>${size} MB</span>`
`<span>${date}</span>`
// Or with styled labels:
`<span class="file-detail-size">${size} MB</span>`
`<span class="file-detail-date">${date}</span>`
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Gradient + shadow "neumorphism" web UIs (2020–2022) | Flat/minimal Notion/Linear aesthetic (2023–present) | Sharper, less dated appearance |
| Emoji as inline icons in web apps | SVG icon libraries (Heroicons, Lucide) or text-only | Emoji render inconsistently across OS/browser |
| No CSS variables — hardcoded values | CSS custom properties for design tokens | Better maintainability (not required for this one-time change) |

**Deprecated/outdated in this codebase:**
- Heavy box-shadows (`0 20px 60px rgba(0,0,0,0.3)`): Replaced by subtle borders in flat design
- Button lift on hover (`transform: translateY(-2px)`): Replaced by color-only hover state
- CSS gradient fills as primary color system: Replaced by solid monochrome values

---

## Open Questions

1. **Upload area treatment (Claude's Discretion)**
   - What we know: Currently `border: 2px dashed #667eea` with `#f8f9ff` tint background
   - What's unclear: Whether to keep dashed border style (conventional for drop zones), change stroke color only, or replace with a solid border
   - Recommendation: Keep dashed border pattern (universally understood drag-drop signal), replace color with `border: 2px dashed #aaa` and background with `#fafafa`

2. **File list icon treatment (Claude's Discretion)**
   - What we know: `renderMergeFileList` uses 📄 and 📅 in `file-details` spans; `renderWatermarkFileList` uses conditional `📄` or `🖼️` plus 📅
   - What's unclear: Whether to use text labels, CSS icons, or just remove
   - Recommendation: Remove entirely — file names already convey type; size and date are readable as plain text without icon prefix

3. **Privacy badge lock icon (Claude's Discretion)**
   - What we know: `🔒 <strong>100% Private</strong>` appears in 5 tool sections
   - What's unclear: Replace lock with nothing, a CSS shield, or keep as text only
   - Recommendation: Remove the emoji, keep the text — the green badge background communicates "safe" without an icon

4. **Progress bar color (Claude's Discretion)**
   - What we know: Currently `linear-gradient(90deg, #667eea 0%, #764ba2 100%)`
   - Recommendation: Solid `#1a1a1a` — consistent with button style; a dark bar on gray background is clean

5. **`#f8f9ff` / `#f0f2ff` light purple tint backgrounds**
   - These are used in `.options-group`, `.stats`, `.radio-option.selected` hover states — they have no exact monochrome equivalent in the locked palette
   - Recommendation: Replace all with `#f5f5f5` (neutral light gray) for consistency

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` (key absent) — skipping Validation Architecture section.

This phase has no automated test requirements. All changes are visual/cosmetic and require human visual verification:
- Open `index.html` in browser, confirm no purple color visible
- Confirm logo displays at correct size in navbar
- Confirm all emoji removed from visible text
- Confirm status messages show colored dot indicators
- Confirm flat card aesthetic (no heavy shadows, sharp corners)

---

## Sources

### Primary (HIGH confidence)
- Direct audit of `C:/Users/franc/dev/pdf_merger/index.html` (2,874 lines) — all emoji locations, all color occurrences, all class names verified by grep and line-by-line read
- `C:/Users/franc/dev/pdf_merger/CLMC 2026 REGISTERED LOGO.png` — confirmed present, 40KB, accessible at project root
- `.planning/phases/04-.../04-CONTEXT.md` — locked decisions and discretion areas

### Secondary (MEDIUM confidence)
- Notion/Linear flat design aesthetic — well-established industry pattern (no single source needed; broadly verified)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; everything is in the existing file
- Architecture: HIGH — full audit of index.html confirms exact line numbers and occurrence counts
- Pitfalls: HIGH — identified through direct code inspection, not inference

**Research date:** 2026-03-03
**Valid until:** This research describes a static file — valid indefinitely until index.html changes significantly
