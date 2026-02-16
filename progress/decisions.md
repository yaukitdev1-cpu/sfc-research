# Key Decisions & Rationale

*Important decisions made during the research process.*

## 2026-02-16

### Decision: Pure API Implementation for sfc-fetch - 2012+ Coverage Only
**Rationale:** After exhaustive testing including browser network analysis:

**For 2012+ circulars:**
- `POST /api/circular/search` - List all circulars ✅
- `GET /api/circular/content` - **Full HTML content** ✅
- `GET /api/circular/openAppendix` - Download appendices ✅

**For 2000-2011 circulars:**
- Tested `openFile?refNo=H###` - Returns SPA shell, no file ❌
- Tested `faxFileKeySeq` with negative values - Not downloadable ❌
- Tested browser inspection - **NO API calls made** ❌
- **Definitive conclusion: Legacy files not in the system**

**Browser Network Analysis Proof:**
- Loaded `openFile?refNo=H035` in headless browser
- Captured ALL 11 network requests
- Result: Only shell files (HTML, JS, CSS, locales)
- **Zero API calls for content** - React app has no handler for H-series

**Final Decision:**
- ✅ **Implement sfc-fetch for 2012+ only** (~13 years, ~500+ circulars)
- ✅ Pure API implementation, no browser needed
- ✅ Full structured HTML content available
- ⚠️ Acknowledge gap: 2000-2011 exists in search but without content

**Why 2012+ is sufficient:**
- Covers all modern regulatory frameworks
- 13 years of complete data is substantial
- Most compliance requirements focus on recent regulations
- Legacy files simply don't exist in current system (not hidden, not restricted - absent)

### HTML Chunking Strategy (2012+)
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
