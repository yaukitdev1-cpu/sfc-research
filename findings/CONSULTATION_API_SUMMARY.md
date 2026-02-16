# SFC Consultations API - Complete Summary

> Comprehensive API documentation for SFC Consultations e-Distribution system.

**Research Date:** 2026-02-16  
**Coverage:** 1989-2026 (37 years, 217 consultations)  
**Status:** ✅ Production Ready

---

## 📊 Overview

SFC Consultations are public consultation exercises where the Securities and Futures Commission seeks feedback from market participants on proposed regulations and standards.

### Key Characteristics

| Feature | Details |
|---------|---------|
| **Total Consultations** | 217 (1989-2026) |
| **Active/Open** | ~32 (~15%) |
| **Concluded** | 185 (~85%) |
| **With Conclusion Papers** | 185 (100% of concluded) |
| **Format** | PDF (all years), HTML intro (all years) |
| **Reference Pattern** | YYCP## (consultation), YYCC## (conclusion) |

---

## 🔌 API Endpoints

### 1. Search/List Consultations

```http
POST https://apps.sfc.hk/edistributionWeb/api/consultation/search
```

**Request Body:**
```json
{
  "lang": "EN",
  "category": "",
  "year": "all",
  "pageNo": 0,
  "pageSize": 50,
  "isLoading": true,
  "errors": null,
  "items": null,
  "total": -1,
  "sort": {
    "field": "cpIssueDate",
    "order": "desc"
  }
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lang` | string | Yes | Language: "EN", "TC", "SC" |
| `category` | string | No | Category code (empty = all) |
| `year` | string/int | Yes | "all" or specific year (e.g., 2025) |
| `pageNo` | number | Yes | Zero-based page number |
| `pageSize` | number | Yes | Items per page (max ~100) |
| `sort.field` | string | No | "cpIssueDate", etc. |
| `sort.order` | string | No | "asc", "desc" |

**Response Fields:**

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
      "beforeArchiveDate": false,
      "ccRefNo": "25CC7",
      "ccTitle": "Conclusion title...",
      "ccIssueDate": "2025-12-24T13:29:57.398",
      "ccFileKeySeq": 12178,
      "ccAppendixDocList": [],
      "unpublishedAnonymousCommentCount": null,
      "firstCommentIssueDate": null,
      "creationTime": null,
      "modificationTime": "2025-11-07T16:11:41"
    }
  ],
  "total": 217
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `cpRefNo` | string | Consultation Paper Reference (YYCP##) |
| `cpTitle` | string | Consultation title |
| `cpIssueDate` | string | ISO 8601 issue date |
| `commentDeadline` | string | Comment submission deadline |
| `commentActualDeadline` | string | Actual deadline (may differ) |
| `ccRefNo` | string \| null | Conclusion Paper Reference (if concluded) |
| `ccIssueDate` | string \| null | Conclusion issue date |
| `ccFileKeySeq` | number \| null | Conclusion file ID for download |
| `archiveDate` | string | Archive date (usually 2004-01-01) |
| `beforeArchiveDate` | boolean | Whether before archive date |

---

### 2. Get Consultation Content

```http
GET https://apps.sfc.hk/edistributionWeb/api/consultation/content?refNo={cpRefNo}&lang={lang}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `refNo` | string | Yes | Consultation reference (e.g., "25CP11") |
| `lang` | string | Yes | Language code |

**Response:**

```json
{
  "cpRefNo": "25CP11",
  "lang": "EN",
  "title": "Full consultation title",
  "cpFileKeySeq": 12059,
  "html": "<p>We welcome comments...</p>",
  "commentDeadline": "2026-02-06T00:00:00",
  "modificationTime": "2025-11-07T16:11:41",
  "appendixDocList": [],
  "commentPeriodClosed": true
}
```

**Key Differences from Circulars:**

| Aspect | Circulars (2000-2011) | Consultations (1989-2026) |
|--------|------------------------|---------------------------|
| **Pre-2012 HTML** | `null` (not available) | `"<p></p>"` (placeholder) |
| **Content Type** | Full structured HTML | Simple intro text |
| **Availability** | 2012+ only | All years (1989-2026) |

**Notes:**
- HTML is always present but may be minimal for old consultations
- Content API does NOT include conclusion data (get from search API)

---

### 3. Download Consultation Paper (PDF)

```http
GET https://apps.sfc.hk/edistributionWeb/api/consultation/openFile?lang={lang}&refNo={cpRefNo}
```

**Response:** `Content-Type: application/pdf`

**Works for:** ALL years (1989-2026)

---

### 4. Download Conclusion Paper (PDF)

```http
GET https://apps.sfc.hk/edistributionWeb/api/consultation/openFile?lang={lang}&refNo={cpRefNo}&type=conclusion
```

**Parameters:**
- Same as consultation download
- **Required:** `type=conclusion` query parameter

**Response:** `Content-Type: application/pdf`

**Only for:** Concluded consultations (where `ccRefNo` exists in search response)

---

## 📅 Historical Coverage

### By Year Distribution

| Period | Count | With Conclusion | Notes |
|--------|-------|-----------------|-------|
| 1989-1999 | 15 | ~10 (67%) | Early years, rare |
| 2000-2009 | 49 | ~40 (82%) | Growth period |
| 2010-2019 | 55 | ~48 (87%) | Active period |
| 2020-2026 | 98 | ~87 (89%) | Recent period |
| **Total** | **217** | **185 (85%)** | All years |

### Year Range

- **Oldest:** 89CP1 (1989-09-01) - "The Fit and Proper Criteria"
- **Newest:** 26CP1 (2026-01-29) - Joint consultation paper
- **Coverage:** 37 years (1989-2026)

---

## 🔢 Reference Number Patterns

| Type | Format | Example | Year Range |
|------|--------|---------|------------|
| **Consultation Paper** | YYCP## | 25CP11, 89CP1 | 1989-2026 |
| **Conclusion Paper** | YYCC## | 25CC7, 94CC1 | 1994-2026 |

**Examples:**
- `89CP1` (1989) - Oldest consultation
- `94CP1` → `94CC1` (1994) - Oldest with conclusion
- `25CP11` → `25CC7` (2025) - Recent example

---

## 📁 File ID Patterns (fileKeySeq)

| Period | cpFileKeySeq | ccFileKeySeq | Indication |
|--------|--------------|--------------|------------|
| **1989-2011** | Negative (e.g., -1260) | Negative (e.g., -3250) | Legacy file |
| **2012+** | Positive (e.g., 12059) | Positive (e.g., 12178) | Modern file |

**Note:** Negative values don't prevent download - all fileKeySeq values work via API.

---

## 🔗 API Request Examples

### Search All Consultations

```bash
curl -X POST "https://apps.sfc.hk/edistributionWeb/api/consultation/search" \
  -H "Content-Type: application/json" \
  -d '{
    "lang": "EN",
    "category": "",
    "year": "all",
    "pageNo": 0,
    "pageSize": 50
  }'
```

### Get Consultation Content

```bash
curl "https://apps.sfc.hk/edistributionWeb/api/consultation/content?refNo=25CP11&lang=EN"
```

### Download Consultation PDF

```bash
curl "https://apps.sfc.hk/edistributionWeb/api/consultation/openFile?lang=EN&refNo=25CP11" \
  -o 25CP11.pdf
```

### Download Conclusion PDF

```bash
curl "https://apps.sfc.hk/edistributionWeb/api/consultation/openFile?lang=EN&refNo=25CP6&type=conclusion" \
  -o 25CP6_conclusion.pdf
```

---

## ⚠️ Important Notes

### Difference from Circulars

| Feature | Circulars | Consultations |
|---------|-----------|---------------|
| **Year Range** | 2000-2025 (25 years) | 1989-2026 (37 years) |
| **Pre-2012 Content** | HTML null (not available) | HTML placeholder (available) |
| **Secondary Document** | Appendix | Conclusion Paper |
| **Timeline Data** | Issue date only | Issue + comment deadline |
| **Status Tracking** | N/A | `commentPeriodClosed` flag |

### Data Availability

- **Consultation HTML:** Available for ALL years (may be minimal for pre-2000)
- **Consultation PDF:** Available for ALL years
- **Conclusion PDF:** Available only for concluded consultations (where `ccRefNo` exists)

### Archive Date

All consultations have `archiveDate: "2004-01-01T00:00:00"` - this appears to be a system default, not the actual archive date.

---

## 📊 Comparison: Circulars vs Consultations

| Aspect | Circulars | Consultations |
|--------|-----------|---------------|
| **Total Count** | ~700 | 217 |
| **Year Range** | 2000-2025 | 1989-2026 |
| **API Pattern** | Same SPA structure | Same SPA structure |
| **Main Document** | Circular paper | Consultation paper |
| **Secondary Doc** | Appendix (optional) | Conclusion (if concluded) |
| **HTML Content** | Full sections (2012+) | Simple intro (all years) |
| **Download API** | `/api/circular/openFile` | `/api/consultation/openFile` |
| **Extra Param** | None | `type=conclusion` for conclusions |

---

## 🛠️ Implementation Status

| API | Endpoint | Tested | Verified |
|-----|----------|--------|----------|
| Search | `/api/consultation/search` | ✅ 1989-2026 | ✅ All years |
| Content | `/api/consultation/content` | ✅ 1989-2026 | ✅ All years |
| Download CP | `/api/consultation/openFile` | ✅ 1989-2026 | ✅ All years |
| Download CC | `/api/consultation/openFile?type=conclusion` | ✅ 1994-2026 | ✅ Concluded only |

---

## 📚 References

- **Research Note:** `notes/20260216_consultations_api_research.md`
- **Workflow Guide:** `findings/CONSULTATION_WORKFLOW.md`
- **Circulars Summary:** `findings/CIRCULAR_API_SUMMARY.md`
- **Research Methodology:** `findings/RESEARCH_METHODOLOGY.md`
- **GitHub:** https://github.com/yaukitdev1-cpu/sfc-research

---

*Last Updated: 2026-02-16*  
*Status: Production Ready - All APIs verified across 1989-2026*
