# SFC News API Research - Phase 2: Endpoint Analysis

**Date:** 2026-02-17
**Target:** https://apps.sfc.hk/edistributionWeb/gateway/EN/news-and-announcements/news/
**Status:** 🔄 Phase 2 - Endpoint Analysis (Browser unavailable, using curl)

---

## Testing Discovered Endpoints

### 1. Search API (Already Confirmed)
```bash
POST /api/news/search
```
✅ Working - 5,205 total items

### 2. Content API Test

```bash
GET /api/news/content?refNo=26PR27&lang=EN
```

**Result:** ✅ **200 OK - FULL HTML CONTENT AVAILABLE!**

**Response Structure:**
```json
{
  "newsRefNo": "26PR27",
  "lang": "EN",
  "title": "Settlement with Sino Wealth International Limited...",
  "html": "<p>The Securities and Futures Commission (SFC) has reached a settlement agreement...</p>",
  "issueDate": "2026-02-16T16:53:29.346",
  "modificationTime": "2026-02-16T16:53:29",
  "imageList": [],
  "appendixDocList": [],
  "maskedFooterType": null
}
```

**Key Fields:**
- `html` - Full HTML content (long text)
- `imageList` - Array of images with captions
- `appendixDocList` - Array of appendix documents
- `maskedFooterType` - Footer type indicator

---

### 3. Notification API Test

```bash
GET /api/news/notification?refNo=26PR27
```

**Result:** ✅ **200 OK - Bilingual Content Available!**

**Response Structure:**
```json
{
  "newsRefNo": "26PR27",
  "issueDate": "2026-02-16T16:53:29.346",
  "enTitle": "English title...",
  "tcTitle": "Traditional Chinese title...",
  "enHtml": "<p>English HTML content...</p>",
  "tcHtml": "<p>Traditional Chinese HTML...</p>",
  "imageList": [],
  "appendixDocList": []
}
```

**Key Finding:** Notification API returns **both EN and TC content** in single request - useful for bilingual systems!

---

### 4. Search API - Parameter Testing

**Category Filter Test:**
```bash
POST /api/news/search
Body: {"lang":"EN","category":"enforcement","year":2025,"pageNo":0,"pageSize":5}
```

**Result:** ✅ **Category filtering works!**

**New Discovery - `targetCeList` field:**
Enforcement news includes `targetCeList` - list of affected corporate entities:
```json
"targetCeList": [
  {
    "ceName": "Changjiang Securities Brokerage (HK) Limited",
    "lang": "EN",
    "masked": false
  }
]
```

---

### 5. Historical Coverage Test

Testing year coverage (Phase 4 methodology):

| Year | Total Items | Status |
|------|-------------|--------|
| 2025 | 211 | ✅ |
| 2020 | 131 | ✅ |
| 2015 | 121 | ✅ |
| 2010 | 157 | ✅ |
| 2005 | 309 | ✅ |
| 2000 | 205 | ✅ |
| 1996 | 26 | ✅ |

**Result:** ✅ **ALL years 1996-2025 accessible!** (30 years of coverage)

---

### 6. Month Filter & Sorting Test

**Month Filter:**
```bash
{"year":2026,"month":1} → Total: 15 items in Jan 2026
```
✅ Month filtering works (1-12)

**Sorting:**
```bash
{"sort":{"field":"issueDate","order":"desc"}}
```
✅ Sorting works (issueDate field confirmed)

---

### 7. Content with Images/Appendix Test

Found news item **23PR100** with 1 appendix!

**Appendix Structure:**
```json
"appendixDocList": [
  {
    "fileKeySeq": null,
    "lang": null,
    "refNo": 0,
    "caption": "A copy of the Statement of Disciplinary Action is available on the SFC website"
  }
]
```

**Appendix Download Test:**
```bash
GET /api/news/openAppendix?lang=EN&refNo=23PR100&appendix=0
```

**Result:** ✅ **200 OK - PDF Download Works!**
- `Content-Type: application/pdf`
- `Content-Length: 118526` bytes (~116 KB)

---

### 8. Edge Case Testing

**Test 1: Invalid refNo**
```bash
GET /api/news/content?refNo=INVALIDINVALID&lang=EN
```
Result: ✅ **HTTP 404 Not Found** (graceful error handling)
- No JSON body returned (empty response)
- Proper HTTP status code

**Test 2: Year out of range (1990)**
```bash
POST /api/news/search with year=1990
```
Result: ✅ Returns 0 items (no crash)

---

## Phase 2 Summary

### ✅ Confirmed Endpoints (5 total)

| Endpoint | Method | Status | Purpose |
|----------|--------|--------|---------|
| `/api/news/search` | POST | ✅ Working | List all news |
| `/api/news/content` | GET | ✅ Working | Get HTML content |
| `/api/news/notification` | GET | ✅ Working | Get bilingual content |
| `/api/news/openAppendix` | GET | ✅ Working | Download appendix PDF |
| `/api/news/openImage` | GET | ⚠️ Not tested | Download images |

### 📊 Key Findings

1. **Total Items:** 5,205 news articles
2. **Year Coverage:** 1996 - 2026 (30 years)
3. **Categories:** all, corporate, other, enforcement
4. **News Types:** GN (General), EF (Enforcement)
5. **Special Fields:**
   - `targetCeList` - Affected entities (enforcement news)
   - `newsExtLink` - External URL (if any)
   - `imageList` - Embedded images
   - `appendixDocList` - Attachments

### 🔧 Request Parameters (Search API)

```json
{
  "lang": "EN",           // EN, TC, SC
  "category": "all",      // all, corporate, other, enforcement
  "year": 2026,           // 1996-2026 or "all"
  "month": 1,             // 1-12 or "all"
  "pageNo": 0,            // 0-based pagination
  "pageSize": 20,         // Items per page
  "sort": {
    "field": "issueDate", // issueDate only?
    "order": "desc"       // asc, desc
  }
}
```

### 📦 Response Structure

```json
{
  "items": [
    {
      "newsRefNo": "26PR27",
      "lang": "EN",
      "title": "...",
      "newsExtLink": null,     // External URL
      "newsType": "GN",        // GN or EF
      "issueDate": "2026-02-16T16:53:29.346",
      "targetCeList": [],      // Enforcement: affected entities
      "creationTime": null,
      "modificationTime": "2026-02-16T16:53:29"
    }
  ],
  "total": 5205
}
```

---

**Ready for Phase 3:** Content & File Access Documentation

*Phase 2 Complete: 2026-02-17*