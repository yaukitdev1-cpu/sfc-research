# SFC-Fetch Consultations Workflow

> Automated SFC consultation fetching with daily update checking.

**Based on:** Consultations API Research (1989-2026)  
**Date:** 2026-02-16  
**Coverage:** 217 consultations, 185 concluded

---

## 🎯 Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   INITIAL FETCH (One-time)                    │
├─────────────────────────────────────────────────────────────┤
│  1. Fetch ALL years (1989-2026) via search API                │
│  2. For each consultation:                                   │
│     - Download Consultation Paper PDF (ALL years)            │
│     - Get HTML intro text (ALL years - may be minimal)       │
│     - Download Conclusion Paper PDF (if concluded)           │
│     - Download appendices if any                             │
│  3. Build master index                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     DAILY UPDATE CHECK                       │
├─────────────────────────────────────────────────────────────┤
│  1. Query current year (e.g., 2026) with sort by date         │
│  2. Compare with stored index                                 │
│  3. Detect new consultations                                  │
│     (Modified = new conclusion published)                     │
│  4. Fetch new content                                         │
│  5. Update index                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📥 Full Download Workflow

### Phase 1: Discovery (All Years)

```javascript
async function discoverAllConsultations() {
  const allConsultations = [];
  
  // Consultations span 1989-2026 (37 years)
  for (let year = 1989; year <= 2026; year++) {
    console.log(`Fetching year ${year}...`);
    
    let pageNo = 0;
    let hasMore = true;
    
    while (hasMore) {
      const response = await consultationSearchAPI({
        lang: "EN",
        category: "",  // Empty = all categories
        year: year,    // Can also use "all" for everything
        pageNo: pageNo,
        pageSize: 50,
        sort: { 
          field: "cpIssueDate", 
          order: "desc" 
        }
      });
      
      allConsultations.push(...response.items);
      
      // Pagination check
      const totalPages = Math.ceil(response.total / 50);
      hasMore = pageNo < totalPages - 1;
      pageNo++;
      
      // Rate limiting
      await sleep(500);
    }
  }
  
  return allConsultations;
}
```

**Alternative: Fetch All at Once**

```javascript
// Since total is 217, can fetch all in one call with year="all"
const response = await consultationSearchAPI({
  lang: "EN",
  category: "",
  year: "all",
  pageNo: 0,
  pageSize: 250  // More than 217 total
});

// All 217 consultations in single call
return response.items;
```

---

### Phase 2: Content Download

```javascript
async function downloadConsultation(consultation) {
  const { 
    cpRefNo, 
    cpTitle, 
    cpIssueDate, 
    ccRefNo,  // null if not concluded
    ccIssueDate,
    ccFileKeySeq  // null if not concluded
  } = consultation;
  
  const year = new Date(cpIssueDate).getFullYear();
  const isConcluded = ccRefNo !== null;
  
  const downloaded = {
    cpRefNo,
    year,
    isConcluded,
    files: {}
  };
  
  // 1. Download Consultation Paper PDF (ALL consultations)
  console.log(`[${cpRefNo}] Downloading consultation paper...`);
  const consultationPdf = await consultationOpenFileAPI(cpRefNo, "EN");
  const cpPath = `consultations/pdf/consultation/${year}/${cpRefNo}.pdf`;
  await saveFile(cpPath, consultationPdf);
  downloaded.files.consultationPdf = cpPath;
  
  // 2. Get HTML content (ALL consultations - may be minimal for old ones)
  console.log(`[${cpRefNo}] Getting HTML content...`);
  const content = await consultationContentAPI(cpRefNo, "EN");
  
  if (content.html) {
    // Even if minimal (like "<p></p>"), save it
    const htmlPath = `consultations/html/${year}/${cpRefNo}_intro.html`;
    await saveFile(htmlPath, content.html);
    downloaded.files.html = htmlPath;
    
    // Note: Unlike circulars, consultations don't need HTML->Markdown conversion
    // The HTML is just intro text, not structured content
  }
  
  // 3. Download Conclusion Paper (if concluded)
  if (isConcluded) {
    console.log(`[${cpRefNo}] Downloading conclusion paper (${ccRefNo})...`);
    const conclusionPdf = await consultationOpenFileAPI(
      cpRefNo,  // Use CP ref, not CC ref
      "EN", 
      { type: "conclusion" }  // Key parameter!
    );
    const ccPath = `consultations/pdf/conclusion/${year}/${cpRefNo}_conclusion.pdf`;
    await saveFile(ccPath, conclusionPdf);
    downloaded.files.conclusionPdf = ccPath;
    downloaded.conclusionRef = ccRefNo;
    downloaded.conclusionDate = ccIssueDate;
  }
  
  // 4. Download appendices (if any)
  if (content.appendixDocList && content.appendixDocList.length > 0) {
    console.log(`[${cpRefNo}] Downloading ${content.appendixDocList.length} appendix(es)...`);
    downloaded.files.appendices = [];
    
    for (let i = 0; i < content.appendixDocList.length; i++) {
      const appendix = content.appendixDocList[i];
      // Use same pattern as circulars for appendix download
      const appendixBuffer = await consultationOpenAppendixAPI(cpRefNo, i, "EN");
      const appendixPath = `consultations/pdf/appendix/${year}/${cpRefNo}_appendix_${i}.pdf`;
      await saveFile(appendixPath, appendixBuffer);
      downloaded.files.appendices.push({
        index: i,
        caption: appendix.caption,
        file: appendixPath
      });
    }
  }
  
  // Also check for conclusion appendices from search data
  if (isConcluded && consultation.ccAppendixDocList) {
    // Download conclusion appendices if API supports it
    // (Need to verify if separate endpoint exists)
  }
  
  return downloaded;
}
```

---

### Phase 3: Build Master Index

```javascript
async function buildConsultationIndex(allConsultations, allDownloads) {
  const index = {
    generatedAt: new Date().toISOString(),
    totalCount: allConsultations.length,
    activeCount: 0,
    concludedCount: 0,
    byYear: {},
    consultations: {}
  };
  
  for (const consultation of allConsultations) {
    const year = new Date(consultation.cpIssueDate).getFullYear();
    const isConcluded = consultation.ccRefNo !== null;
    const download = allDownloads.find(d => d.cpRefNo === consultation.cpRefNo);
    
    // Count by status
    if (isConcluded) {
      index.concludedCount++;
    } else {
      index.activeCount++;
    }
    
    // Build entry
    index.consultations[consultation.cpRefNo] = {
      cpRefNo: consultation.cpRefNo,
      cpTitle: consultation.cpTitle,
      cpIssueDate: consultation.cpIssueDate,
      year: year,
      lang: consultation.lang,
      
      // Status
      isConcluded: isConcluded,
      commentPeriodClosed: consultation.commentPeriodClosed,
      commentDeadline: consultation.commentDeadline,
      
      // Conclusion info (if applicable)
      ccRefNo: consultation.ccRefNo,
      ccIssueDate: consultation.ccIssueDate,
      ccFileKeySeq: consultation.ccFileKeySeq,
      
      // Files
      files: download?.files || {},
      
      // Metadata
      lastFetched: new Date().toISOString()
    };
    
    // Aggregate by year
    if (!index.byYear[year]) {
      index.byYear[year] = { 
        count: 0, 
        consultations: [],
        concluded: 0,
        active: 0
      };
    }
    index.byYear[year].count++;
    index.byYear[year].consultations.push(consultation.cpRefNo);
    
    if (isConcluded) {
      index.byYear[year].concluded++;
    } else {
      index.byYear[year].active++;
    }
  }
  
  return index;
}
```

---

## 🔄 Daily Update Check Workflow

### Key Differences from Circulars

**Consultations have different update patterns:**

1. **New Consultation Published** - New CP issued
2. **Comment Period Ends** - Status changes to `commentPeriodClosed: true`
3. **Conclusion Published** - Major update! New CC document available

```javascript
async function checkForConsultationUpdates() {
  const currentYear = new Date().getFullYear();
  const index = await loadConsultationIndex();
  const lastCheck = await loadLastCheck();
  
  console.log(`Checking for consultation updates in ${currentYear}...`);
  
  const updates = {
    new: [],
    newlyConcluded: [],  // Special: Got conclusion since last check
    timestamp: new Date().toISOString()
  };
  
  // Fetch recent consultations
  const recentResponse = await consultationSearchAPI({
    lang: "EN",
    category: "",
    year: currentYear,
    pageNo: 0,
    pageSize: 50,
    sort: { field: "cpIssueDate", order: "desc" }
  });
  
  for (const consultation of recentResponse.items) {
    const existing = index.consultations[consultation.cpRefNo];
    
    if (!existing) {
      // NEW consultation issued
      console.log(`  🆕 NEW: ${consultation.cpRefNo} - ${consultation.cpTitle.substring(0, 60)}`);
      updates.new.push(consultation);
      
      // Download full content
      await downloadConsultation(consultation);
      
    } else if (!existing.isConcluded && consultation.ccRefNo) {
      // NEWLY CONCLUDED! (Was active, now has conclusion)
      console.log(`  📋 NEWLY CONCLUDED: ${consultation.cpRefNo}`);
      console.log(`    Conclusion: ${consultation.ccRefNo} (${consultation.ccIssueDate})`);
      
      updates.newlyConcluded.push({
        cpRefNo: consultation.cpRefNo,
        ccRefNo: consultation.ccRefNo,
        ccIssueDate: consultation.ccIssueDate
      });
      
      // Download conclusion paper
      await downloadConsultation(consultation);
      
    } else if (existing.isConcluded && consultation.ccRefNo && 
               existing.ccIssueDate !== consultation.ccIssueDate) {
      // Conclusion modified (rare, but possible)
      console.log(`  ✏️  CONCLUSION UPDATED: ${consultation.cpRefNo}`);
      await downloadConsultation(consultation);
    }
  }
  
  // Update index and save
  if (updates.new.length > 0 || updates.newlyConcluded.length > 0) {
    await updateConsultationIndex(updates);
    await notifyUser(updates);
  }
  
  await saveLastCheck({
    timestamp: updates.timestamp,
    checked: recentResponse.items.length,
    newConsultations: updates.new.length,
    newlyConcluded: updates.newlyConcluded.length
  });
  
  return updates;
}
```

---

## 📁 File Storage Structure

```
sfc-data/
├── consultations/
│   ├── metadata/
│   │   └── consultations-index.json
│   │
│   ├── pdf/
│   │   ├── consultation/           # Consultation papers (ALL years)
│   │   │   ├── 1989/
│   │   │   │   └── 89CP1.pdf
│   │   │   ├── 1994/
│   │   │   │   ├── 94CP1.pdf
│   │   │   │   └── 94CP2.pdf
│   │   │   └── 2026/
│   │   │       ├── 26CP1.pdf
│   │   │       └── ...
│   │   │
│   │   ├── conclusion/             # Conclusion papers (concluded only)
│   │   │   ├── 1994/
│   │   │   │   └── 94CP1_conclusion.pdf   # 94CC1
│   │   │   └── 2025/
│   │   │       ├── 25CP6_conclusion.pdf   # 25CC7
│   │   │       └── ...
│   │   │
│   │   └── appendix/               # Appendices (if any)
│   │       └── 2025/
│   │           └── 25CP11_appendix_0.pdf
│   │
│   ├── html/                       # HTML intro text (ALL years)
│   │   ├── 1989/
│   │   │   └── 89CP1_intro.html    # May be "<p></p>" for old ones
│   │   └── 2026/
│   │       └── 26CP1_intro.html
│   │
│   └── summary/                    # Generated summaries (optional)
│       └── 2025/
│           └── 25CP11_summary.md
│
├── index.json                      # Master index (circulars + consultations)
└── last-consultation-check.json
```

---

## 📊 Data Model

### Consultation Entry

```javascript
{
  // Core identifiers
  cpRefNo: "25CP11",
  cpTitle: "Consultation on the Chinese version...",
  
  // Timeline
  cpIssueDate: "2025-11-07T16:11:40.712",
  year: 2025,
  commentDeadline: "2026-02-06T00:00:00",
  commentPeriodClosed: true,
  
  // Status
  isConcluded: true,
  
  // Conclusion info (if concluded)
  ccRefNo: "25CC7",
  ccIssueDate: "2025-12-24T13:29:57.398",
  
  // Files
  files: {
    consultationPdf: "consultations/pdf/consultation/2025/25CP11.pdf",
    html: "consultations/html/2025/25CP11_intro.html",
    conclusionPdf: "consultations/pdf/conclusion/2025/25CP11_conclusion.pdf",
    appendices: []
  },
  
  // Metadata
  lang: "EN",
  lastFetched: "2026-02-16T10:00:00Z"
}
```

---

## 🔄 API Call Patterns

### Initial Download

```
POST /api/consultation/search  (year="all", pageSize=250)
  → Returns: 217 consultations

For each consultation:
  GET /api/consultation/content?refNo={cpRefNo}&lang=EN
    → Returns: HTML intro, fileKeySeq, appendix list
  
  GET /api/consultation/openFile?refNo={cpRefNo}&lang=EN
    → Returns: Consultation PDF
  
  IF concluded (ccRefNo exists):
    GET /api/consultation/openFile?refNo={cpRefNo}&lang=EN&type=conclusion
      → Returns: Conclusion PDF
```

### Daily Check

```
POST /api/consultation/search (current year, page 0, sorted by date desc)
  → Returns: Recent consultations

Compare with index:
  - NEW cpRefNo → Download full
  - Was active, now has ccRefNo → Download conclusion only
  - ccIssueDate changed → Re-download conclusion
```

---

## 🎓 Best Practices

### 1. Check for Newly Concluded

Unlike circulars, consultations have a lifecycle:
1. Issued (active, accepting comments)
2. Comment period closes
3. Conclusion published (major update!)

**Daily check MUST detect newly concluded consultations** and download their conclusion papers.

### 2. HTML Handling

```javascript
// Consultations always have HTML (unlike circulars pre-2012)
const html = content.html;  // Never null, but may be minimal

// For old consultations (1989-2000), HTML may be:
// "<p></p>" or "<p>We welcome comments...</p>"

// Don't convert to Markdown - HTML is just intro text
// Store as-is for completeness
```

### 3. Conclusion Download Strategy

```javascript
// IMPORTANT: Use cpRefNo (not ccRefNo) for conclusion download
// The API expects the consultation reference with type=conclusion

// WRONG (404):
await consultationOpenFileAPI("25CC7", "EN");

// CORRECT (200):
await consultationOpenFileAPI("25CP6", "EN", { type: "conclusion" });
```

### 4. Batch Size Optimization

```javascript
// Since there are only 217 consultations total,
// can fetch ALL in single API call:

const allConsultations = await consultationSearchAPI({
  lang: "EN",
  year: "all",
  pageNo: 0,
  pageSize: 250  // > 217 total
});

// No pagination needed for consultations!
```

---

## 📈 Performance Estimates

| Operation | Time | Notes |
|-----------|------|-------|
| Search all | ~500ms | 217 items total |
| Download 1 CP PDF | ~2-5s | Average 300KB |
| Download 1 CC PDF | ~2-5s | Average 500KB |
| Get HTML | ~300ms | Small payload |
| Full download | ~30 min | 217 CPs + 185 CCs |
| Daily check | ~3s | Current year only |

**Storage estimate:**
- Consultation PDFs: ~70MB (217 × 300KB avg)
- Conclusion PDFs: ~95MB (185 × 500KB avg)
- HTML: ~1MB (negligible)
- **Total: ~170MB**

---

## 🔍 Differences from Circular Workflow

| Aspect | Circulars | Consultations |
|--------|-----------|---------------|
| **Count** | ~700 | 217 |
| **Fetch Strategy** | Year-by-year pagination | Single "all" call |
| **HTML→Markdown** | Yes (for 2012+) | No (store raw HTML) |
| **Daily Check Focus** | New issues | New + Newly concluded |
| **Secondary Doc** | Appendix (rare) | Conclusion (85% have) |
| **Storage** | ~1.5GB | ~170MB |
| **Update Type** | New only | New + Conclusion added |

---

## 🚨 Error Handling

### Common Issues

1. **Consultation not yet concluded**
   ```javascript
   if (!consultation.ccRefNo) {
     // Skip conclusion download
     return;
   }
   ```

2. **Conclusion download fails**
   ```javascript
   try {
     await consultationOpenFileAPI(cpRefNo, "EN", { type: "conclusion" });
   } catch (error) {
     if (error.status === 404) {
       // Conclusion not yet published (rare race condition)
       log.warning(`Conclusion not yet available for ${cpRefNo}`);
     }
   }
   ```

3. **HTML is empty/minimal for old consultations**
   ```javascript
   if (html.length < 50) {
     log.info(`${cpRefNo}: Minimal HTML (${html.length} chars) - expected for pre-2000`);
   }
   ```

---

## 📝 Daily Check Report Example

```
SFC Consultations Daily Check - 2026-02-16 09:00:00
===================================================

Checked: Year 2026
Consultations examined: 12

Results:
--------
🆕 New consultations: 1
   - 26CP2: "Proposed amendments to the Code on..."

📋 Newly concluded: 1
   - 25CP6: "Virtual Asset Trading Platform..."
     Conclusion: 25CC7 (2025-12-24)
     Downloaded: 25CP6_conclusion.pdf (1.8MB)

📊 Status:
- Active consultations: 32
- Concluded (with PDF): 185
- Total tracked: 217

✅ System healthy. Index updated.
```

---

## 🚀 Implementation Ready

**Next Steps:**
1. Implement `consultationSearchAPI()` client
2. Implement `consultationContentAPI()` client
3. Implement `consultationOpenFileAPI()` client with `type=conclusion` support
4. Build download workflow
5. Build daily check with "newly concluded" detection
6. Test with oldest (89CP1) and newest (26CP1)

---

## 📚 References

- **API Summary:** `findings/CONSULTATION_API_SUMMARY.md`
- **Circulars Workflow:** `findings/SFC_FETCH_WORKFLOW.md`
- **Research Notes:** `notes/20260216_consultations_api_research.md`
- **GitHub:** https://github.com/yaukitdev1-cpu/sfc-research

---

*Workflow version 1.0 - Based on comprehensive API research 1989-2026*
