# SFC API Historical Data Limitations

**Date:** 2026-02-16  
**Researcher:** AI Assistant  
**Status:** ⚠️ **IMPORTANT LIMITATION DISCOVERED**

---

## API Works for All Years (2000+)

The search API (`POST /api/circular/search`) successfully returns data for years going back to **2000**:

| Year | Total Circulars | API Status |
|------|-----------------|------------|
| 2025 | 48 | ✅ Working |
| 2020 | 52 | ✅ Working |
| 2015 | 36 | ✅ Working |
| 2012 | ~40 | ✅ Working |
| 2010 | 31 | ✅ Working |
| 2005 | 20 | ✅ Working |
| 2000 | 4 | ✅ Working |
| 1995 | 0 | ❌ No data |

**Conclusion:** The API supports year-based queries from **2000 to present**.

---

## ⚠️ Critical Finding: HTML Content Cutoff at 2012

While the search API works for all years, the **content API** (`GET /api/circular/content`) has a major limitation:

### HTML Availability by Year

| Year | Has HTML | Ref Number Format | Content API Status |
|------|----------|-------------------|-------------------|
| 2012+ | ✅ **YES** | `YYEC##` (e.g., `12EC16`, `26EC6`) | ✅ Full content |
| 2010 | ❌ No | `H###` (e.g., `H613`) | ⚠️ Metadata only |
| 2008 | ❌ No | `H###` (e.g., `H532`) | ⚠️ Metadata only |
| 2006 | ❌ No | `H###` (e.g., `H450`) | ⚠️ Metadata only |
| 2005 | ❌ No | `H###` (e.g., `H480`) | ⚠️ Metadata only |
| 2000 | ❌ No | `H###` (e.g., `H035`) | ⚠️ Metadata only |

### The HTML Gap

**For pre-2012 circulars:**
- ✅ Search API returns: `refNo`, `title`, `releasedDate`, `postDocType`
- ❌ Content API returns: `html: null` (no structured content)
- ❌ `faxFileKeySeq` may or may not be present
- ❌ `appendixDocList` usually empty

### Reference Number Format Change

| Period | Format | Example |
|--------|--------|---------|
| **2012-present** | Year-based | `12EC16`, `26EC6` |
| **2000-2011** | Sequential H-series | `H035`, `H613` |

---

## What This Means for sfc-fetch

### Two-Tier Architecture Required

```javascript
if (year >= 2012) {
  // Modern circulars
  const list = await searchAPI({ year, lang: "EN" });
  for (const item of list.items) {
    const content = await contentAPI(item.refNo); // Returns full HTML
    // Store: HTML + metadata
  }
} else {
  // Legacy circulars (2000-2011)
  const list = await searchAPI({ year, lang: "EN" });
  for (const item of list.items) {
    // Option 1: Store metadata only (title, date, refNo)
    // Option 2: Try to fetch PDF via alternative methods
    // Option 3: Scrape individual page (if available)
  }
}
```

### Coverage Strategy

| Years | Approach | Content Quality |
|-------|----------|-----------------|
| **2012-present** | Pure API | ✅ Full HTML content |
| **2000-2011** | Metadata only or PDF | ⚠️ Limited (no HTML) |
| **Pre-2000** | Not available | ❌ Not in API |

---

## Example: Pre-2012 Circular

### 2000 Circular (H035)

**Search API returns:**
```json
{
  "refNo": "H035",
  "lang": "EN",
  "title": "Update on eIPO - Letter to Securities Dealers and Exempt Dealers",
  "releasedDate": "2000-09-01T00:00:00",
  "postDocType": 110,
  "appendixDocList": [],
  "publicUrl": "openFile?refNo=H035"
}
```

**Content API returns:**
```json
{
  "refNo": "H035",
  "lang": "EN",
  "postDocType": 110,
  "deptCode": "IS",
  "releasedDate": "2000-09-01T00:00:00",
  "title": "Update on eIPO - Letter to Securities Dealers and Exempt Dealers",
  "html": null,  // <-- EMPTY!
  "emailBody": "...",
  "faxFileKeySeq": null,
  "appendixDocList": [],
  ...
}
```

### 2012 Circular (12EC16)

**Content API returns:**
```json
{
  "refNo": "12EC16",
  "lang": "EN",
  ...
  "html": "<ol><li>This circular...</li></ol>",  // <-- FULL HTML!
  ...
}
```

---

## Legacy Circular URL Pattern

Pre-2012 circulars use a different `publicUrl` format:

| Period | publicUrl Format | Example |
|--------|------------------|---------|
| 2012+ | `doc?refNo=YYEC##` | `doc?refNo=26EC6` |
| 2000-2011 | `openFile?refNo=H###` | `openFile?refNo=H035` |

**Hypothesis:** `openFile?refNo=H035` likely serves a PDF directly instead of an HTML page.

---

## Recommendations for sfc-fetch

### 1. Implement Year-Based Logic

```javascript
async function fetchCircularsByYear(year) {
  const list = await searchAPI({ year });
  
  for (const item of list.items) {
    if (year >= 2012) {
      // Full content available
      const content = await contentAPI(item.refNo);
      await storeCircular({
        ...item,
        html: content.html,
        markdown: htmlToMarkdown(content.html),
        fullContent: true
      });
    } else {
      // Legacy - metadata only
      await storeCircular({
        ...item,
        html: null,
        markdown: null,
        fullContent: false,
        note: "Full content not available via API for pre-2012 circulars"
      });
    }
  }
}
```

### 2. Document the Gap

- Pre-2012 circulars exist in the API but without HTML content
- May need alternative methods (PDF scraping, web archive) for legacy data
- Consider if 2012+ coverage is sufficient for the compliance use case

### 3. Alternative for Legacy Data

If full historical data (2000-2011) is required:

1. **Test the `openFile` URL pattern:**
   ```
   https://apps.sfc.hk/edistributionWeb/openFile?refNo=H035
   ```
   May return PDF directly.

2. **Web scraping approach:**
   Individual circular pages might still have viewable content even if not in the API.

3. **SFC archives:**
   Check if SFC provides bulk historical data downloads separately.

---

## Testing Commands

```bash
# Check if 2000 circular has alternative content
 curl -s "https://apps.sfc.hk/edistributionWeb/openFile?refNo=H035" -I

# Test content API for 2012+ (should have HTML)
curl -s "https://apps.sfc.hk/edistributionWeb/api/circular/content?refNo=12EC16&lang=EN" | \
  python3 -c "import sys, json; d=json.load(sys.stdin); print('Has HTML:', bool(d.get('html')))"

# Test content API for 2010 (should be null)
curl -s "https://apps.sfc.hk/edistributionWeb/api/circular/content?refNo=H613&lang=EN" | \
  python3 -c "import sys, json; d=json.load(sys.stdin); print('Has HTML:', bool(d.get('html')))"
```

---

## Related Research

- `20260216_api_endpoint_discovered.md` - Initial API discovery
- `20260216_circular_content_api_complete.md` - Content API details (2012+)

---

*This is a significant architectural consideration for sfc-fetch. The API provides full structured data only from 2012 onward.*
