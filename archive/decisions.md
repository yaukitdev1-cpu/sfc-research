# Key Decisions & Rationale

*Important decisions made during the research process.*

## 2026-02-16

### Decision: Pure API Implementation for sfc-fetch - Full Coverage (2000-2025)
**Rationale:** After complete investigation including PDF discovery:

**ALL circulars accessible via API:**

| Period | Format | APIs Available |
|--------|--------|----------------|
| 2012+ (YYEC##) | HTML + PDF | search, content, openFile, openAppendix |
| 2000-2011 (H###) | PDF only | search, openFile, openAppendix |

**Discovery Timeline:**
1. Initially thought legacy had no content (html: null in content API) ❌
2. Browser analysis found download link on page ✅
3. `openFile` API tested: Returns PDF for H035 (2000) 🎉
4. Appendix API tested: Works for H618 (2011) 🎉

**Final Decision:**
- ✅ **Implement sfc-fetch for ALL years (2000-2025)**
- ✅ ~700+ circulars total
- ✅ Pure API implementation, no browser needed
- ✅ 2012+: HTML→Markdown conversion
- ✅ 2000-2011: PDF only (no conversion)

### HTML Chunking Strategy (2012+)
**Observation:** Circular HTML uses `<ol>` (ordered lists) for main sections.

**Approach:**
- Parse HTML with cheerio
- Extract each `<li>` as content chunk
- Convert to Markdown sections
- Store footnotes separately

### PDF Handling (2000-2011)
- Store raw PDF files
- Optional: Extract text via PDF parser (future enhancement)
- Metadata available via search API

## 2025-02-15

### Decision: Simple, Flexible Folder Structure
**Rationale:** Research direction is unknown at start. Rigid nested directories create friction. Flat structure with simple categories (`notes/`, `findings/`, `experiments/`, `references/`, `progress/`) allows organic organization as patterns emerge.

---

*Decisions will be added here as the research progresses.*
