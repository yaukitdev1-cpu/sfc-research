# SFC e-Distribution API - Auto-Discovery Summary

**Date:** 2026-04-07
**Status:** Complete
**Coverage:** Circulars, Consultations, News, Guidelines

---

## Overview

The SFC e-Distribution system exposes a consistent REST API pattern for three of four document categories. Guidelines operates on a different system (main SFC website, not e-Distribution).

| Category | List/Search API | Content API | Content Format |
|----------|----------------|-------------|----------------|
| Circulars | `POST /api/circular/search` | `GET /api/circular/content` | HTML (2012+) + PDF |
| Consultations | `POST /api/consultation/search` | `GET /api/consultation/content` | HTML + PDF |
| News | `POST /api/news/search` | `GET /api/news/content` | HTML + PDF |
| Guidelines | Scraper (main website) | N/A | PDF only |

**Base URL:** `https://apps.sfc.hk/edistributionWeb`

---

## 1. Circulars

### List/Search Endpoint
```
POST https://apps.sfc.hk/edistributionWeb/api/circular/search
```

**Request Body:**
```json
{
  "lang": "EN",
  "category": "all",
  "year": 2025,
  "pageNo": 0,
  "pageSize": 20,
  "sort": {
    "field": "issueDate",
    "order": "desc"
  }
}
```

**Response:**
```json
{
  "items": [
    {
      "refNo": "26EC6",
      "lang": "EN",
      "title": "Circular title...",
      "releasedDate": "2026-02-11T16:10:23.117",
      "postDocType": 110,
      "appendixDocList": [...],
      "publicUrl": "intermediaries/supervision/doc?refNo=26EC6"
    }
  ],
  "total": 48
}
```

**Key fields for auto-discovery:**
- `refNo` - Reference number (e.g., "26EC6", "H035")
- `releasedDate` - Issue date
- `postDocType` - Category code (110=Intermediaries, etc.)

**Pagination:** `pageNo` (0-based) + `pageSize`, total in response top-level field
**Year range:** 2000-2025

---

### Content Endpoint
```
GET https://apps.sfc.hk/edistributionWeb/api/circular/content?refNo={refNo}&lang={lang}
```

### PDF Download
```
GET https://apps.sfc.hk/edistributionWeb/api/circular/openFile?lang={lang}&refNo={refNo}
```

### Appendix PDF
```
GET https://apps.sfc.hk/edistributionWeb/api/circular/openAppendix?lang={lang}&refNo={refNo}&appendix={index}
```

---

## 2. Consultations

### List/Search Endpoint
```
POST https://apps.sfc.hk/edistributionWeb/api/consultation/search
```

**Request Body:**
```json
{
  "lang": "EN",
  "category": "",
  "year": "all",
  "pageNo": 0,
  "pageSize": 20,
  "isLoading": true,
  "errors": null,
  "items": null,
  "total": -1,
  "sort": { "field": "cpIssueDate", "order": "desc" }
}
```

**Response:**
```json
{
  "items": [
    {
      "cpRefNo": "25CP11",
      "lang": "EN",
      "cpTitle": "Consultation title...",
      "cpIssueDate": "2025-11-07T16:11:40.712",
      "commentDeadline": "2026-02-06T00:00:00",
      "commentActualDeadline": "2026-02-06T00:00:00",
      "archiveDate": "2004-01-01T00:00:00",
      "ccRefNo": "25CC7",
      "ccTitle": "Conclusion title...",
      "ccIssueDate": "2025-12-24T13:29:57.398",
      "ccFileKeySeq": 12178,
      "ccAppendixDocList": [],
      "beforeArchiveDate": false
    }
  ],
  "total": 217
}
```

**Key fields for auto-discovery:**
- `cpRefNo` - Consultation paper reference (e.g., "25CP11")
- `cpTitle` - Title
- `cpIssueDate` - Issue date
- `commentDeadline` - Comment deadline
- `commentPeriodClosed` - Status flag
- `ccRefNo` - Conclusion paper ref (if concluded)

**Pagination:** `pageNo` (0-based) + `pageSize`, total in response
**Year range:** 1989-2026

---

### Content Endpoint
```
GET https://apps.sfc.hk/edistributionWeb/api/consultation/content?refNo={cpRefNo}&lang={lang}
```

### Consultation PDF
```
GET https://apps.sfc.hk/edistributionWeb/api/consultation/openFile?lang={lang}&refNo={cpRefNo}
```

### Conclusion PDF
```
GET https://apps.sfc.hk/edistributionWeb/api/consultation/openFile?lang={lang}&refNo={cpRefNo}&type=conclusion
```

---

## 3. News

### List/Search Endpoint
```
POST https://apps.sfc.hk/edistributionWeb/api/news/search
```

**Request Body:**
```json
{
  "lang": "EN",
  "category": "all",
  "year": 2026,
  "month": "all",
  "pageNo": 0,
  "pageSize": 20,
  "sort": {
    "field": "issueDate",
    "order": "desc"
  }
}
```

**Response:**
```json
{
  "items": [
    {
      "newsRefNo": "26PR27",
      "lang": "EN",
      "title": "News title...",
      "newsExtLink": null,
      "newsType": "GN",
      "issueDate": "2026-02-16T16:53:29.346",
      "targetCeList": [],
      "creationTime": null,
      "modificationTime": "2026-02-16T16:53:29"
    }
  ],
  "total": 5205
}
```

**Key fields for auto-discovery:**
- `newsRefNo` - Reference number (e.g., "26PR27")
- `title` - Title
- `issueDate` - Issue date
- `newsType` - "GN" (General) or "EF" (Enforcement)
- `category` - "all", "corporate", "other", or "enforcement"

**Pagination:** `pageNo` (0-based) + `pageSize`, total in response
**Year range:** 1996-2026
**Month filter:** 1-12 (optional)

---

### Content Endpoint
```
GET https://apps.sfc.hk/edistributionWeb/api/news/content?refNo={newsRefNo}&lang={lang}
```

### Bilingual Notification Endpoint
```
GET https://apps.sfc.hk/edistributionWeb/api/news/notification?refNo={newsRefNo}
```
Returns both EN and TC content in a single response.

### Appendix PDF
```
GET https://apps.sfc.hk/edistributionWeb/api/news/openAppendix?lang={lang}&refNo={newsRefNo}&appendix={index}
```

---

## 4. Guidelines

**No e-Distribution API exists.** Guidelines are served from the main SFC website, not the e-Distribution system.

### Main Website Scraper
```
GET https://www.sfc.hk/en/Rules-and-standards/Codes-and-guidelines/Guidelines
```

**Scraping approach:** HTML parsing of table with `data-code-guideline-id` attributes.

**Guideline identifier:** UUID-like string (e.g., `A1B2C3D4-...`), NOT the same refNo pattern as other categories.

**Response fields from scraping:**
```json
{
  "refNo": "{UUID}",
  "guidelineId": "{UUID}",
  "topics": ["Category1", "Category2"],
  "title": "Guideline title...",
  "effectiveDate": "DD MMM YYYY",
  "pdfUrl": "https://www.sfc.hk/.../file.pdf",
  "hasVersionHistory": true,
  "popupId": "{popup-id}"
}
```

**PDF only** - No HTML content available. Guidelines are PDF documents.

---

## Common Pagination Pattern

All three API-based categories share the same pagination pattern:

| Parameter | Type | Notes |
|-----------|------|-------|
| `pageNo` | integer | 0-based page index |
| `pageSize` | integer | Items per page (max ~100) |
| `total` | integer | Total items (top-level response field) |

**Page calculation:**
- Total pages = `Math.ceil(total / pageSize)`
- Fetch all: iterate `pageNo` from 0 until `items.length === 0`

---

## Throttling

All clients implement 500ms minimum interval between requests:
```javascript
private minInterval = 500; // 2 requests per second
```

---

## Language Support

All endpoints support `lang` parameter:
- `EN` - English
- `TC` - Traditional Chinese
- `SC` - Simplified Chinese

---

## References

- `/sfc-fetch/src/sfc-clients/circular.client.ts`
- `/sfc-fetch/src/sfc-clients/consultation.client.ts`
- `/sfc-fetch/src/sfc-clients/news.client.ts`
- `/sfc-fetch/src/sfc-clients/guideline.scraper.ts`
- `/sfc-research/findings/CIRCULAR_API_SUMMARY.md`
- `/sfc-research/notes/20260216_consultations_api_research.md`
- `/sfc-research/notes/20260217_news_phase2_endpoint_analysis.md`
- `/sfc-research/notes/20260217_guidelines_phase1_reconnaissance.md`
