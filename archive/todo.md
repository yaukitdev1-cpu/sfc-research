# Research TODO

## ✅ CIRCULAR RESEARCH - COMPLETE

All research objectives for SFC circulars have been achieved.

---

### 📋 Completed Tasks

- [x] ✅ **API Discovery** - 4 endpoints found
  - `POST /api/circular/search` - List all circulars
  - `GET /api/circular/content` - Get HTML content (2012+)
  - `GET /api/circular/openFile` - Download PDF (ALL years!)
  - `GET /api/circular/openAppendix` - Download appendix PDFs

- [x] ✅ **Full Historical Coverage** - ALL years accessible (2000-2025)
  - 2012+ (YYEC##): HTML + PDF + Markdown
  - 2000-2011 (H###): PDF only
  - ~700+ circulars total

- [x] ✅ **Appendix Support** - Available for ALL years
  - Tested H618 (2011): 2 appendices, PDFs downloadable
  - API pattern confirmed

- [x] ✅ **Workflow Design** - Complete implementation guide
  - Initial download: Year-by-year pagination
  - Daily check: Current year only
  - HTML→Markdown conversion for 2012+
  - PDF storage for all years
  - Storage structure defined
  - Data model documented
  - Error handling strategy

---

### 📚 Deliverables Created

1. **API Summary** (`findings/CIRCULAR_API_SUMMARY.md`)
   - Complete endpoint documentation
   - Request/response examples
   - Document type codes
   - Historical coverage matrix

2. **Workflow Guide** (`findings/CIRCULAR_WORKFLOW.md`)
   - Full download logic
   - Daily update check logic
   - HTML→Markdown conversion
   - File storage structure
   - Configuration examples
   - Standardized format matching NEWS and CONSULTATIONS workflows

---

### 🎯 Key Research Outcomes

| Finding | Impact |
|---------|--------|
| **PDF API works for ALL years** | sfc-fetch can get complete 2000-2025 coverage |
| **HTML only 2012+** | Markdown conversion only for modern circulars |
| **Appendix API works universally** | All appendix documents accessible |
| **No authentication required** | Simple HTTP client implementation |
| **No rate limits documented** | Need polite request throttling (suggest 2 req/sec) |

---

### 🔄 Current Status

**✅ CIRCULARS - COMPLETE** (Research + Workflow docs)
**✅ CONSULTATIONS - COMPLETE** (Research + Workflow docs)
**✅ NEWS - COMPLETE** (Research + Workflow docs - 2026-02-17)

**Research Coverage:**
- 🔧 5 API endpoints documented
- 📊 5,205 news items mapped
- 📅 30 years of history (1996-2026)
- ⚠️ Error handling tested
- 🔄 Workflow guide created

### 🔄 Current Research

**✅ GUIDELINES RESEARCH - COMPLETE** (2026-02-17)
- [x] Phase 1: Initial reconnaissance - **COMPLETE**
  - ✅ **Main SFC website** (www.sfc.hk) - NOT e-Distribution
  - ✅ **50 Guidelines** discovered
  - ✅ **32 with version history**
  - ✅ Direct PDF links with hash-based versioning
- [x] Phase 2: Deep structure analysis - **COMPLETE**
  - ✅ HTML table structure with data attributes
  - ✅ Topics categorization (Licensing, Intermediaries_supervision, etc.)
  - ✅ Chinese versions verified (TC)
- [x] Phase 3: Version history investigation - **COMPLETE**
  - ✅ Popup-based historical versions
  - ✅ `/files-previous/` path pattern
  - ✅ Example: Fit and Proper (4 versions, back to Dec 2000)
- [x] Phase 4: Documentation - **COMPLETE**
  - ✅ `findings/GUIDELINES_SUMMARY.md` created

---

### Next Phase Options

**Option A: Continue Research**
- Guidelines research (in progress)
- SFC Codes (if available in API)

**Option B: Start Building sfc-fetch**
- Estimated: 2-3 hours initial download
  - Circulars: ~700 items, ~1.5GB PDFs
  - Consultations: 217 items
  - News: 5,205 items (HTML only, no PDFs)
- Daily check: ~5 seconds per category

**Recommendation:** Complete Guidelines research first for comprehensive coverage.

---

*Research completed: 2026-02-16*  
*Total research notes: 8 documents*  
*Deliverables: 3 comprehensive guides*
