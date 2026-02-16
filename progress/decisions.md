# Key Decisions & Rationale

*Important decisions made during the research process.*

## 2026-02-16

### Decision: Pure API Implementation for sfc-fetch (with Year-Based Logic)
**Rationale:** Three API endpoints discovered. However, a critical limitation requires two-tier architecture:

**For 2012+ circulars:**
- `POST /api/circular/search` - List all circulars
- `GET /api/circular/content` - **Full HTML content** ✅
- `GET /api/circular/openAppendix` - Download appendices

**For 2000-2011 circulars:**
- Search API returns metadata ✅
- Content API returns `html: null` ❌
- No structured content available

**This means:**
- ✅ Direct HTTP API calls only (no browser needed)
- ✅ Full HTML content for 2012+ (13 years of data)
- ⚠️ Limited metadata only for 2000-2011 (12 years)
- ⚠️ Need HTML-to-Markdown conversion for 2012+ content
- ⚠️ Consider if 2012+ coverage is sufficient for compliance use case

### HTML Chunking Strategy
**Observation:** Circular HTML uses `<ol>` (ordered lists) for main sections, making natural chunking points at each `<li>` element.

**Proposed approach (for 2012+):**
- Parse HTML with cheerio or similar
- Extract each `<li>` as a content chunk
- Maintain section numbering (1, 2, 3...)
- Store footnotes separately

**For pre-2012:**
- Store metadata only (title, date, refNo, publicUrl)
- Consider alternative: `openFile?refNo=H###` pattern may serve PDFs
- Decision needed: Is 2012+ coverage sufficient?

## 2025-02-15

### Decision: Simple, Flexible Folder Structure
**Rationale:** Research direction is unknown at start. Rigid nested directories create friction. Flat structure with simple categories (`notes/`, `findings/`, `experiments/`, `references/`, `progress/`) allows organic organization as patterns emerge.

---

*Decisions will be added here as the research progresses.*
