# Key Decisions & Rationale

*Important decisions made during the research process.*

## 2026-02-16

### Decision: Pure API Implementation for sfc-fetch
**Rationale:** Three API endpoints discovered:
1. `POST /api/circular/search` - List all circulars with pagination
2. `GET /api/circular/content` - **Full HTML content** of any circular
3. `GET /api/circular/openAppendix` - Download appendix documents

**This means NO headless browser (Puppeteer/Playwright) is needed at all.**

**Implications:**
- ✅ Direct HTTP API calls only
- ✅ No JavaScript execution required
- ✅ Full content available as HTML string in JSON response
- ✅ Appendix downloads via dedicated API
- ⚠️ Need HTML-to-Markdown conversion for storage
- ⚠️ Still need to test rate limits

### HTML Chunking Strategy
**Observation:** Circular HTML uses `<ol>` (ordered lists) for main sections, making natural chunking points at each `<li>` element.

**Proposed approach:**
- Parse HTML with cheerio or similar
- Extract each `<li>` as a content chunk
- Maintain section numbering (1, 2, 3...)
- Store footnotes separately

## 2025-02-15

### Decision: Simple, Flexible Folder Structure
**Rationale:** Research direction is unknown at start. Rigid nested directories create friction. Flat structure with simple categories (`notes/`, `findings/`, `experiments/`, `references/`, `progress/`) allows organic organization as patterns emerge.

---

*Decisions will be added here as the research progresses.*
