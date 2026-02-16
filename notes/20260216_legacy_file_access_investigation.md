# Legacy Circular File Access - Investigation Results

**Date:** 2026-02-16  
**Researcher:** AI Assistant  
**Status:** ⚠️ **NO DIRECT FILE ACCESS FOUND FOR PRE-2012 CIRCULARS**

---

## Investigation Summary

Tested multiple approaches to access full content for legacy circulars (2000-2011, H-series ref numbers). **No direct download method discovered.**

---

## Tested Approaches

### 1. openFile URL Pattern

**URL:** `https://apps.sfc.hk/edistributionWeb/openFile?refNo={refNo}`

**Results:**
| refNo | Response |
|-------|----------|
| H035 (2000) | Returns React SPA shell (HTML, 2943 bytes) |
| H480 (2005) | Returns React SPA shell (HTML, 2943 bytes) |
| H613 (2010) | Returns React SPA shell (HTML, 2943 bytes) |
| 12EC16 (2012) | Returns React SPA shell (HTML, 2943 bytes) |

**Conclusion:** All `openFile` URLs return the same React SPA shell. The actual document is loaded dynamically by JavaScript, but not accessible via simple HTTP requests.

---

### 2. faxFileKeySeq Download Attempts

**Observation:** Legacy circulars have **negative** `faxFileKeySeq` values.

| refNo | faxFileKeySeq | Content API Status |
|-------|---------------|-------------------|
| H035 | -8805 | html: null |
| H480 | -8429 | html: null |
| 12EC16 | 232 (positive) | html: present |

**Tested URLs:**
- `https://apps.sfc.hk/edistributionWeb/download/{fileKeySeq}`
- `https://apps.sfc.hk/edistributionWeb/download/-8805`
- `https://apps.sfc.hk/edistributionWeb/api/file/{fileKeySeq}`

**Result:** All return HTTP 200 with HTML shell (same as openFile) or 404.

**Hypothesis:** Negative `faxFileKeySeq` indicates "file not available in digital format" or points to a legacy archive system not exposed via API.

---

### 3. Browser Inspection

Used Playwright to load `openFile?refNo=H035` and capture:
- API calls: **None captured**
- PDF/iframe/embed elements: **None found**
- Download links: **None found**

**Result:** The React app loads but makes no document API calls. The file may not be available in the new e-Distribution system.

---

## Key Findings

### Data Availability Matrix

| Period | Ref Format | Search API | Content API HTML | File Download | Coverage |
|--------|-----------|------------|------------------|---------------|----------|
| 2012+ | YYEC## | ✅ | ✅ Full HTML | ✅ via API | **Complete** |
| 2000-2011 | H### | ✅ | ❌ `null` | ❌ Not available | **Metadata only** |

### What We Know

1. **2012+ circulars:** Full digital content available via API
2. **2000-2011 circulars:** Only metadata exists in API (title, date, refNo)
3. **Legacy files:** May exist in SFC archives but not exposed via current API
4. **Negative faxFileKeySeq:** Appears to indicate "file not digitally available"

---

## Implications for sfc-fetch

### Realistic Options

#### Option A: 2012+ Coverage Only (Recommended)
```javascript
// Fetch only 2012-2025 circulars
// ~13 years of complete data
// ~500+ circulars with full HTML
// Perfect for modern compliance needs
```

**Pros:**
- Pure API implementation
- No scraping needed
- Full structured data
- Fast and reliable

**Cons:**
- Missing 2000-2011 (12 years)
- ~150-200 additional circulars not captured

#### Option B: Hybrid Approach (2012+ API + 2000-2011 Metadata)
```javascript
// 2012+: Full HTML content via API
// 2000-2011: Metadata only (title, date, refNo, publicUrl)
```

**Pros:**
- Complete coverage 2000-2025
- 2012+ has full content

**Cons:**
- Pre-2012 circulars lack searchable content
- Users can only see title/date, not full text

#### Option C: Full Historical (Not Currently Viable)
```javascript
// Would require:
// - Web scraping of legacy circular pages
// - PDF parsing if files are available
// - Or partnership with SFC for archive access
```

**Current Status:** Not viable without:
- Discovering hidden API endpoints
- Using web scraping on legacy pages
- SFC providing archive access

---

## Recommendation

**For sfc-fetch MVP:**

1. **Implement Option A** (2012+ only)
   - Focus on years where full API is available
   - ~13 years of complete data is substantial
   - Covers all recent regulatory changes

2. **Document the gap**
   - Note that 2000-2011 circulars exist but without content
   - Consider future enhancement for legacy data

3. **Future considerations**
   - Contact SFC to ask about legacy circular access
   - Consider web scraping old circulars if critical
   - Evaluate if 2012+ is sufficient for compliance use case

---

## Open Questions

1. **Does SFC have a separate archive system?**
   - Not exposed via current API
   - May require separate inquiry

2. **Would web scraping work?**
   - Would need to test loading `openFile` pages with full browser
   - PDF might be available but hidden behind JavaScript

3. **Is 2012+ sufficient for compliance?**
   - Depends on how far back compliance checks need to go
   - Most recent regulations likely more relevant

---

## References

- Content API: `20260216_circular_content_api_complete.md`
- Historical limitations: `20260216_historical_data_limitations.md`
- Tested URLs:
  - `https://apps.sfc.hk/edistributionWeb/openFile?refNo=H035`
  - `https://apps.sfc.hk/edistributionWeb/download/-8805`

---

*Legacy circulars (2000-2011) remain inaccessible via current API. Recommendation: focus implementation on 2012+ where full structured data is available.*
