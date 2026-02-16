# SFC Consultations API Research

**Date:** 2026-02-16  
**Category:** Consultations (Intermediaries Supervision)  
**Status:** ✅ **Research Complete**

---

## 📊 API Endpoints Discovered

### 1. Search/List Consultations
```
POST https://apps.sfc.hk/edistributionWeb/api/consultation/search
```

**Request Body:**
```json
{
  "lang": "EN",
  "category": "",           // Empty = all categories, or specific code
  "year": "all",            // "all" or specific year (e.g., 2025)
  "pageNo": 0,
  "pageSize": 20,
  "isLoading": true,
  "errors": null,
  "items": null,
  "total": -1
}
```

**Response Fields:**
```json
{
  "cpRefNo": "25CP11",              // Consultation Paper Ref (YYCP## format)
  "lang": "EN",
  "cpTitle": "Consultation title...",
  "cpIssueDate": "2025-11-07T16:11:40.712",
  "commentDeadline": "2026-02-06T00:00:00",
  "commentActualDeadline": "2026-02-06T00:00:00",
  "archiveDate": "2004-01-01T00:00:00",
  "ccRefNo": "25CC7",               // Conclusion Paper Ref (if concluded)
  "ccTitle": "Conclusion title...",
  "ccIssueDate": "2025-12-24T13:29:57.398",
  "ccFileKeySeq": 12178,            // Conclusion file ID
  "ccAppendixDocList": [],          // Conclusion appendices
  "beforeArchiveDate": false
}
```

**Coverage:**
- **Total consultations:** 217 (all years, all categories)
- **Concluded:** 92 have conclusion papers

---

### 2. Get Consultation Content
```
GET https://apps.sfc.hk/edistributionWeb/api/consultation/content?refNo={cpRefNo}&lang={lang}
```

**Response:**
```json
{
  "cpRefNo": "25CP11",
  "lang": "EN",
  "title": "Full consultation title",
  "cpFileKeySeq": 12059,            // Consultation file ID
  "html": "<p>Welcome comments...</p>",  // HTML content (simpler than circulars)
  "commentDeadline": "2026-02-06T00:00:00",
  "modificationTime": "2025-11-07T16:11:41",
  "appendixDocList": [],            // Consultation appendices
  "commentPeriodClosed": true       // true/false
}
```

**Note:** Content API does NOT include conclusion data (ccRefNo, ccFileKeySeq) - must get from search API.

---

### 3. Download Consultation Paper (PDF)
```
GET https://apps.sfc.hk/edistributionWeb/api/consultation/openFile?lang={lang}&refNo={cpRefNo}
```

**Response:** `application/pdf`

**Works for:** ALL consultations

---

### 4. Download Conclusion Paper (PDF) ⭐
```
GET https://apps.sfc.hk/edistributionWeb/api/consultation/openFile?lang={lang}&refNo={cpRefNo}&type=conclusion
```

**Parameters:**
- Same as consultation download
- Add `&type=conclusion` parameter

**Response:** `application/pdf`

**Only for:** Concluded consultations (where ccRefNo exists in search response)

---

## 📈 Key Differences from Circulars

| Feature | Circulars | Consultations |
|---------|-----------|---------------|
| **Ref Format** | YYEC## (2012+) / H### (pre-2012) | YYCP## (consultation) / YYCC## (conclusion) |
| **Content Type** | Full HTML with sections | Simple HTML (intro text only) |
| **Main Document** | Circular paper | Consultation paper |
| **Secondary Doc** | Appendix | Conclusion paper (if concluded) |
| **Timeline** | Issue date only | Issue date + comment deadline |
| **Status Tracking** | N/A | commentPeriodClosed flag |

---

## 🔢 Document Reference Patterns

| Type | Format | Example |
|------|--------|---------|
| Consultation Paper (CP) | YYCP## | 25CP11, 25CP6 |
| Conclusion Paper (CC) | YYCC## | 25CC7, 25CC6 |

---

## 📊 Historical Coverage

| Status | Count | Percentage |
|--------|-------|------------|
| **Total Consultations** | 217 | 100% |
| **Active/Open** | ~125 | ~58% |
| **Concluded** | 92 | ~42% |

---

## 🔄 Complete Data Flow for Consultations

```
Search API
    ↓
├── cpRefNo (consultation reference)
├── cpTitle, cpIssueDate
├── commentDeadline
├── commentPeriodClosed (status)
└── ccRefNo (conclusion - if concluded)
    ↓
Content API (using cpRefNo)
    ↓
├── html (intro text)
├── cpFileKeySeq (for PDF download)
└── appendixDocList
    ↓
Download Consultation PDF
    ↓
If concluded:
    └── Download Conclusion PDF (using type=conclusion)
```

---

## 📝 Implementation Notes

### For Active Consultations
```javascript
{
  cpRefNo: "25CP11",
  cpTitle: "...",
  cpIssueDate: "...",
  commentDeadline: "...",
  commentPeriodClosed: false,  // Still open for comments
  ccRefNo: null,               // No conclusion yet
  files: {
    consultationPdf: "25CP11.pdf"
  }
}
```

### For Concluded Consultations
```javascript
{
  cpRefNo: "25CP6",
  cpTitle: "...",
  cpIssueDate: "...",
  commentDeadline: "...",
  commentPeriodClosed: true,   // Closed
  ccRefNo: "25CC7",            // Has conclusion
  ccIssueDate: "...",
  files: {
    consultationPdf: "25CP6.pdf",
    conclusionPdf: "25CP6_conclusion.pdf"  // Downloaded with type=conclusion
  }
}
```

---

## 🎯 Research Summary

**API Pattern:** Same as circulars - React SPA with JSON API backend

**Key Discovery:** Conclusion papers use same `openFile` endpoint with `type=conclusion` parameter

**Coverage:** 217 consultations, 92 concluded (42%)

**Storage Recommendation:**
```
consultations/
├── pdf/
│   ├── consultation/
│   │   └── 25CP11.pdf
│   └── conclusion/
│       └── 25CP6_conclusion.pdf
├── html/          # Raw HTML from content API
├── index.json     # Master index
```

---

**Next Steps:** Ready to implement sfc-fetch for consultations alongside circulars.
