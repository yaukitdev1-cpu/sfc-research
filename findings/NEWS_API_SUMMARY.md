# SFC News API Summary

**Date:** 2026-02-17  
**Researcher:** AI Assistant  
**Status:** ✅ **COMPLETE**

---

## 📋 Executive Summary

The SFC News API provides **full access to 5,205 news articles** spanning **30 years (1996-2026)** through a clean JSON REST API. Unlike circulars (which only have HTML from 2012+), **news articles have full HTML content for ALL years**.

### Key Advantages
- ✅ Complete historical coverage (1996-2026)
- ✅ **Full HTML content for ALL news articles (1996-2026)** - No gap!
- ✅ **Same API pattern across all 30 years** - no format changes
- ✅ Bilingual content (EN + TC) via notification endpoint
- ✅ Image and appendix support
- ✅ No authentication required
- ✅ Same architecture as circulars/consultations

### 🎉 Major Difference from Circulars

| Aspect | News | Circulars |
|--------|------|-----------|
| **HTML Coverage** | ✅ **ALL years (1996-2026)** | 2012+ only |
| **API Consistency** | ✅ **Same pattern for 30 years** | Format changed 2000→2012 |
| **Content Gap** | ❌ **None** | 2000-2011: PDF only, no HTML |

**News articles are MORE uniform than circulars!**

---

## 🔧 API Endpoints

### 1. Search API - List All News

```
POST https://apps.sfc.hk/edistributionWeb/api/news/search
```

**Request Body:**
```json
{
  "lang": "EN",
  "category": "all",
  "year": 2026,
  "month": 1,
  "pageNo": 0,
  "pageSize": 20,
  "sort": {
    "field": "issueDate",
    "order": "desc"
  }
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lang` | string | Yes | Language: "EN", "TC", or "SC" |
| `category` | string | No | Category: "all", "corporate", "other", "enforcement" |
| `year` | int/string | No | Year (1996-2026) or "all" |
| `month` | int/string | No | Month (1-12) or "all" |
| `pageNo` | int | No | Page number (0-based) |
| `pageSize` | int | No | Items per page (default: 20) |
| `sort.field` | string | No | Sort field: "issueDate" |
| `sort.order` | string | No | Sort order: "asc" or "desc" |

**Response:**
```json
{
  "items": [
    {
      "newsRefNo": "26PR27",
      "lang": "EN",
      "title": "Settlement with Sino Wealth International Limited...",
      "newsExtLink": null,
      "newsType": "GN",
      "issueDate": "2026-02-16T16:53:29.346",
      "targetCeList": [
        {
          "ceName": "Entity Name",
          "lang": "EN",
          "masked": false
        }
      ],
      "creationTime": null,
      "modificationTime": "2026-02-16T16:53:29"
    }
  ],
  "total": 5205
}
```

**News Type Codes:**
- `GN` - General News
- `EF` - Enforcement News

---

### 2. Content API - Get Full Article

```
GET https://apps.sfc.hk/edistributionWeb/api/news/content?refNo={refNo}&lang={lang}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `refNo` | string | Yes | News reference number (e.g., "26PR27") |
| `lang` | string | Yes | Language code: "EN", "TC", or "SC" |

**Response:**
```json
{
  "newsRefNo": "26PR27",
  "lang": "EN",
  "title": "Full article title...",
  "html": "<p>Full HTML content...</p>",
  "issueDate": "2026-02-16T16:53:29.346",
  "modificationTime": "2026-02-16T16:53:29",
  "imageList": [
    {
      "imageRefNo": 0,
      "caption": "Image description",
      "lang": "EN"
    }
  ],
  "appendixDocList": [
    {
      "fileKeySeq": 12345,
      "lang": "EN",
      "refNo": 0,
      "caption": "Appendix description"
    }
  ],
  "maskedFooterType": null
}
```

---

### 3. Notification API - Bilingual Content

```
GET https://apps.sfc.hk/edistributionWeb/api/news/notification?refNo={refNo}
```

**Returns both English and Traditional Chinese content in a single request:**

```json
{
  "newsRefNo": "26PR27",
  "issueDate": "2026-02-16T16:53:29.346",
  "enTitle": "English title...",
  "tcTitle": "繁體中文標題...",
  "enHtml": "<p>English HTML...</p>",
  "tcHtml": "<p>繁體中文HTML...</p>",
  "imageList": [],
  "appendixDocList": []
}
```

---

### 4. Appendix Download API

```
GET https://apps.sfc.hk/edistributionWeb/api/news/openAppendix?lang={lang}&refNo={refNo}&appendix={index}
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `lang` | string | Language code |
| `refNo` | string | News reference number |
| `appendix` | int | Zero-based index from `appendixDocList` |

**Returns:** `application/pdf` binary data

---

### 5. Image Download API

```
GET https://apps.sfc.hk/edistributionWeb/api/news/openImage?refNo={refNo}&lang={lang}&image={index}
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `refNo` | string | News reference number |
| `lang` | string | Language code |
| `image` | int | Zero-based index from `imageList` |

**Returns:** Image file (content-type varies by image format)

---

## 📊 Historical Coverage

| Year | Total Items | Status |
|------|-------------|--------|
| 2026 | 48 | ✅ |
| 2025 | 211 | ✅ |
| 2020 | 131 | ✅ |
| 2015 | 121 | ✅ |
| 2010 | 157 | ✅ |
| 2005 | 309 | ✅ |
| 2000 | 205 | ✅ |
| 1996 | 26 | ✅ |
| **Total** | **5,205** | **✅ 30 years** |

**Oldest News:** 1996  
**Newest News:** 2026 (current)

---

## 🗂️ News Categories

| Category | Code | Description |
|----------|------|-------------|
| All | `all` | All news types |
| Corporate | `corporate` | Corporate announcements |
| Other | `other` | Other news |
| Enforcement | `enforcement` | Enforcement actions |

---

## 🔄 Comparison with Circulars/Consultations

| Feature | News | Circulars | Consultations |
|---------|------|-----------|---------------|
| **HTML Coverage** | ✅ **ALL years** | 2012+ only | ✅ ALL years |
| **API Consistency** | ✅ **Same for 30 years** | Format changed | Same format |
| **PDF Download** | ❌ No PDF API | ✅ Yes | ✅ Yes |
| **Images** | ✅ Yes | ❌ No | ❌ No |
| **Appendices** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Bilingual API** | ✅ Notification endpoint | ❌ Separate calls | ❌ Separate calls |
| **Total Items** | 5,205 | ~700 | 217 |
| **Year Range** | 1996-2026 | 2000-2025 | 1989-2026 |

### 🎉 Key Advantage: No Format Changes!

**News articles are MORE uniform than circulars:**
- ✅ **1996 news** uses same API as **2026 news**
- ✅ **ALL years** return HTML content (no gap!)
- ✅ No format change from `H###` → `YYEC##` like circulars
- ✅ Same response structure across 30 years

---

## 📝 Research Notes

**Research Files:**
- Phase 1: `notes/20260217_news_phase1_reconnaissance.md`
- Phase 2: `notes/20260217_news_phase2_endpoint_analysis.md`
- This Summary: `findings/NEWS_API_SUMMARY.md`

**Methodology:**
Following the 7-phase research methodology from `RESEARCH_METHODOLOGY.md`

**Testing Commands:**
```bash
# Search all news
curl -X POST "https://apps.sfc.hk/edistributionWeb/api/news/search" \
  -H "Content-Type: application/json" \
  -d '{"lang":"EN","pageNo":0,"pageSize":20}'

# Get content
curl "https://apps.sfc.hk/edistributionWeb/api/news/content?refNo=26PR27&lang=EN"

# Get bilingual content
curl "https://apps.sfc.hk/edistributionWeb/api/news/notification?refNo=26PR27"

# Download appendix
curl "https://apps.sfc.hk/edistributionWeb/api/news/openAppendix?lang=EN&refNo=23PR100&appendix=0" \
  -o appendix.pdf
```

---

## ⚠️ Error Handling & Edge Cases

### HTTP Status Codes

| Status | Meaning | When It Occurs |
|--------|---------|----------------|
| 200 | OK | Successful request |
| 404 | Not Found | Invalid refNo, unsupported language |
| 500 | Internal Server Error | Missing required `lang` field |

### 🔴 Critical Requirements

**`lang` field is REQUIRED** - Omitting it causes HTTP 500:
```json
// ❌ BAD - Will fail with HTTP 500
{}

// ❌ BAD - Will fail with HTTP 500
{"pageNo": 0}

// ✅ GOOD - Required field present
{"lang": "EN"}
```

### Rate Limiting

**No formal rate limiting detected**, but recommended best practices:
- Add 500ms delay between requests
- Use `pageSize=100` for bulk operations
- Implement retry logic for 500/502/503 errors

### Pagination Limits

- **Maximum `pageSize`:** 1000 items
- **Page numbers:** 0-based indexing
- **Beyond total pages:** Returns empty array (graceful)

### Invalid Parameter Handling

| Parameter | Invalid Value | Behavior |
|-----------|---------------|----------|
| `category` | Invalid string | Defaults to "all" |
| `sort.field` | Invalid field | Defaults to "issueDate" |
| `year` | Out of range | Returns 0 items |
| `month` | Out of range | Returns 0 items |
| `lang` | Missing | ❌ HTTP 500 Error |

---

## 🚀 Implementation Notes for sfc-fetch

### Recommended Workflow

1. **Initial Download**
   - Loop through years 1996-2026
   - Fetch all news items via search API
   - Download HTML content for each
   - Convert HTML → Markdown
   - Download images and appendices
   - Build master index

2. **Daily Update Check**
   - Query current year (e.g., 2026)
   - Compare with stored index
   - Download new content

### Data Storage Structure

```
news/
├── html/
│   └── {year}/
│       └── {refNo}.html
├── markdown/
│   └── {year}/
│       └── {refNo}.md
├── images/
│   └── {year}/
│       └── {refNo}_{index}.jpg
├── appendix/
│   └── {year}/
│       └── {refNo}_appendix_{index}.pdf
└── index.json
```

### Key Differences from Circulars
- News has **images** - need image download logic
- No PDF main document (HTML only)
- Has external link field (`newsExtLink`)
- Has enforcement target list (`targetCeList`)

---

*Research completed: 2026-02-17*  
*Total research time: ~45 minutes*  
*All 5 core endpoints tested and documented*
