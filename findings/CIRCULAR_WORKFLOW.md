# SFC Circular Fetch Workflow

**Purpose:** Automated SFC circular fetching with daily update checking  
**Date:** 2026-02-17  
**Based on:** SFC Circular API Research (2000-2025)  
**Coverage:** ~700 circulars, 25 years

---

## 🎯 Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     INITIAL FETCH (One-time)                │
├─────────────────────────────────────────────────────────────┤
│  1. Fetch ALL years (2000-2026) via search API              │
│  2. For each circular:                                      │
│     - Download PDF (ALL years - 2000-2026)                  │
│     - If 2012+: Download HTML, convert to Markdown          │
│     - Download appendices if any                            │
│  3. Build master index                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     DAILY UPDATE CHECK                      │
├─────────────────────────────────────────────────────────────┤
│  1. Query current year (e.g., 2026) page 0                  │
│  2. Compare with stored index                               │
│  3. Detect new/modified circulars                           │
│  4. Fetch new content                                       │
│  5. Update index                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Key Characteristics

| Aspect | Circulars | Details |
|--------|-----------|---------|
| **Total Items** | ~700 | 2000-2026 |
| **Format Gap** | ✅ Yes | 2000-2011: PDF only; 2012+: PDF + HTML |
| **Reference Pattern** | H### (2000-2011), YYEC## (2012+) | See table below |
| **HTML Available** | 2012+ only | Legacy circulars have no HTML |
| **Appendix Support** | ✅ Yes | Available for ALL years |
| **PDF for ALL** | ✅ Yes | `/api/circular/openFile` works universally |
| **Storage Estimate** | ~1.5GB | Mostly PDFs |

### Reference Number Patterns

| Years | Pattern | Example | HTML Available |
|-------|---------|---------|----------------|
| 2000-2011 | H### | H035, H618, H613 | ❌ No |
| 2012+ | YYEC## | 12EC16, 26EC6 | ✅ Yes |

---

## 📥 Full Download Workflow

### Phase 1: Discovery (All Years)

```javascript
async function discoverAllCirculars() {
  const allCirculars = [];
  
  // Circulars span 2000-2026 (27 years)
  for (let year = 2000; year <= 2026; year++) {
    console.log(`Fetching year ${year}...`);
    
    let pageNo = 0;
    let hasMore = true;
    
    while (hasMore) {
      const response = await circularSearchAPI({
        lang: "EN",
        category: "all",
        year: year,
        pageNo: pageNo,
        pageSize: 50,
        sort: { 
          field: "issueDate", 
          order: "desc" 
        }
      });
      
      allCirculars.push(...response.items);
      
      // Pagination check
      const totalPages = Math.ceil(response.total / 50);
      hasMore = pageNo < totalPages - 1;
      pageNo++;
      
      // Rate limiting - be polite
      await sleep(500);
    }
  }
  
  console.log(`Total circulars discovered: ${allCirculars.length}`);
  return allCirculars;
}
```

---

### Phase 2: Content Download

```javascript
async function downloadCircular(circular) {
  const { 
    refNo, 
    title, 
    releasedDate, 
    postDocType, 
    deptCode,
    appendixDocList 
  } = circular;
  
  const year = new Date(releasedDate).getFullYear();
  const isModern = year >= 2012;  // HTML available for 2012+
  
  const downloaded = {
    refNo,
    year,
    isModern,
    files: {},
    metadata: {
      title,
      releasedDate,
      postDocType,
      deptCode,
      hasHtml: isModern,
      hasAppendix: appendixDocList && appendixDocList.length > 0,
      appendixCount: appendixDocList?.length || 0
    }
  };
  
  // 1. Download main PDF (ALL years - this is the key finding!)
  console.log(`  [${refNo}] Downloading main PDF...`);
  const pdfBuffer = await circularOpenFileAPI(refNo, "EN");
  const pdfPath = `circulars/pdf/${year}/${refNo}.pdf`;
  await saveFile(pdfPath, pdfBuffer);
  downloaded.files.mainPdf = pdfPath;
  
  // 2. Download HTML + convert to Markdown (2012+ only)
  if (isModern) {
    console.log(`  [${refNo}] Downloading HTML content...`);
    const content = await circularContentAPI(refNo, "EN");
    
    if (content.html) {
      // Save raw HTML
      const htmlPath = `circulars/html/${year}/${refNo}_raw.html`;
      await saveFile(htmlPath, content.html);
      downloaded.files.rawHtml = htmlPath;
      
      // Convert to Markdown
      const markdown = circularHtmlToMarkdown(content.html, title);
      const mdPath = `circulars/markdown/${year}/${refNo}.md`;
      await saveFile(mdPath, markdown);
      downloaded.files.markdown = mdPath;
      
      // Extract additional metadata from content API
      downloaded.metadata.creationTime = content.creationTime;
      downloaded.metadata.modificationTime = content.modificationTime;
      downloaded.metadata.postDocSubtype = content.postDocSubtype;
    }
  } else {
    console.log(`  [${refNo}] Legacy circular (pre-2012) - PDF only`);
  }
  
  // 3. Download appendices (if any) - Works for ALL years!
  if (appendixDocList && appendixDocList.length > 0) {
    console.log(`  [${refNo}] Downloading ${appendixDocList.length} appendix(es)...`);
    downloaded.files.appendices = [];
    
    for (let i = 0; i < appendixDocList.length; i++) {
      try {
        const appendixBuffer = await circularOpenAppendixAPI(refNo, i, "EN");
        const appendixPath = `circulars/appendix/${year}/${refNo}_appendix_${i}.pdf`;
        await saveFile(appendixPath, appendixBuffer);
        downloaded.files.appendices.push({
          index: i,
          caption: appendixDocList[i].caption,
          file: appendixPath
        });
      } catch (error) {
        console.error(`    Failed to download appendix ${i}: ${error.message}`);
        downloaded.errors = downloaded.errors || [];
        downloaded.errors.push({ type: 'appendix', index: i, error: error.message });
      }
    }
  }
  
  return downloaded;
}
```

---

### Phase 3: Build Master Index

```javascript
async function buildCircularIndex(allCirculars, allDownloads) {
  const index = {
    generatedAt: new Date().toISOString(),
    totalCount: allCirculars.length,
    modernCount: 0,      // 2012+
    legacyCount: 0,      // 2000-2011
    byYear: {},
    byType: {},
    withAppendix: 0,
    circulars: {}
  };
  
  for (const circular of allCirculars) {
    const year = new Date(circular.releasedDate).getFullYear();
    const isModern = year >= 2012;
    const download = allDownloads.find(d => d.refNo === circular.refNo);
    const meta = download?.metadata || {};
    
    // Count by era
    if (isModern) {
      index.modernCount++;
    } else {
      index.legacyCount++;
    }
    
    // Count with appendix
    if (meta.hasAppendix) {
      index.withAppendix++;
    }
    
    // Build entry
    index.circulars[circular.refNo] = {
      refNo: circular.refNo,
      title: circular.title,
      releasedDate: circular.releasedDate,
      year: year,
      lang: circular.lang,
      isModern: isModern,
      postDocType: circular.postDocType,
      deptCode: meta.deptCode || null,
      hasHtml: meta.hasHtml || false,
      hasAppendix: meta.hasAppendix || false,
      appendixCount: meta.appendixCount || 0,
      files: download?.files || {},
      errors: download?.errors || [],
      lastFetched: new Date().toISOString()
    };
    
    // Aggregate by year
    if (!index.byYear[year]) {
      index.byYear[year] = { 
        count: 0, 
        circulars: [],
        modern: 0,
        legacy: 0
      };
    }
    index.byYear[year].count++;
    index.byYear[year].circulars.push(circular.refNo);
    
    if (isModern) {
      index.byYear[year].modern++;
    } else {
      index.byYear[year].legacy++;
    }
    
    // Aggregate by type
    const type = circular.postDocType;
    if (!index.byType[type]) {
      index.byType[type] = { 
        count: 0, 
        name: getDocTypeName(type)  // e.g., "110" = "Intermediaries supervision"
      };
    }
    index.byType[type].count++;
  }
  
  return index;
}

// Document type codes
default function getDocTypeName(code) {
  const types = {
    "110": "Intermediaries supervision",
    "120": "Investment products",
    "130": "Market infrastructure",
    "140": "Listed companies / Takeovers",
    "150": "Enforcement / OBC",
    "160": "Market Misconduct Tribunal"
  };
  return types[code] || `Type ${code}`;
}
```

---

## 🔄 Daily Update Check Workflow

### Strategy: Check Current Year Only

Most new circulars are published in the current year. Checking all 27 years daily is wasteful.

```javascript
async function checkForCircularUpdates() {
  const currentYear = new Date().getFullYear();
  const index = await loadCircularIndex();
  const lastCheck = await loadLastCheck();
  
  console.log(`Checking for circular updates in ${currentYear}...`);
  console.log(`Last check: ${lastCheck?.timestamp || 'Never'}`);
  
  const updates = {
    new: [],
    modified: [],
    timestamp: new Date().toISOString()
  };
  
  // Fetch current year page 0 (most recent)
  const recentResponse = await circularSearchAPI({
    lang: "EN",
    category: "all",
    year: currentYear,
    pageNo: 0,
    pageSize: 50,
    sort: { 
      field: "issueDate", 
      order: "desc" 
    }
  });
  
  // Check each circular
  for (const circular of recentResponse.items) {
    const existing = index.circulars[circular.refNo];
    
    if (!existing) {
      // NEW circular
      console.log(`  🆕 NEW: ${circular.refNo} - ${circular.title.substring(0, 60)}...`);
      updates.new.push(circular);
      
      // Download immediately
      const downloaded = await downloadCircular(circular);
      await updateCircularIndexWithNew(downloaded);
      
    } else if (existing.releasedDate !== circular.releasedDate) {
      // MODIFIED (date changed - rare but possible)
      console.log(`  ✏️  MODIFIED: ${circular.refNo}`);
      updates.modified.push({
        refNo: circular.refNo,
        oldDate: existing.releasedDate,
        newDate: circular.releasedDate
      });
      
      // Re-download
      const downloaded = await downloadCircular(circular);
      await updateCircularIndexWithModified(downloaded);
    }
  }
  
  // Send notification if there are updates
  if (updates.new.length > 0 || updates.modified.length > 0) {
    await notifyUser(updates);
    console.log(`\n📢 Found ${updates.new.length} new, ${updates.modified.length} modified`);
  } else {
    console.log(`\n✅ No updates found`);
  }
  
  // Save last check timestamp
  await saveLastCheck({
    timestamp: updates.timestamp,
    checked: recentResponse.items.length,
    newFound: updates.new.length,
    modifiedFound: updates.modified.length
  });
  
  return updates;
}
```

---

## 🧹 HTML to Markdown Conversion

Circular HTML has a specific structure: ordered list (`<ol>`) with sections.

```javascript
function circularHtmlToMarkdown(html, title) {
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  
  let markdown = '';
  
  // Add title as H1
  if (title) {
    markdown += `# ${title}\n\n`;
  }
  
  // Process ordered list items (main sections of circular)
  $('ol > li').each((i, elem) => {
    const $li = $(elem);
    
    // Get HTML content, preserving some formatting
    let text = $li.html()
      .replace(/<br\s*\/?>/gi, '\n')           // Convert <br> to newlines
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')  // Bold
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')    // Bold (alternative tag)
      .replace(/<sup>(.*?)<\/sup>/gi, '^$1^')  // Superscript (footnotes)
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\r\n/g, '\n');
    
    // Strip remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');
    
    // Add to markdown with section number
    if (text.trim()) {
      markdown += `${i + 1}. ${text.trim()}\n\n`;
    }
  });
  
  // Extract footnotes (usually at end, marked with superscript)
  $('p:has(sup)').each((i, elem) => {
    const text = $(elem).text().trim();
    if (text.match(/^\^?\d+\^/)) {
      markdown += text + '\n';
    }
  });
  
  return markdown.trim();
}
```

### Markdown Output Format

```markdown
# Circular Title

**Reference:** 26EC6  
**Date:** 2026-02-11  
**Year:** 2026  
**Department:** Intermediaries Supervision (IS)  
**Category:** 110 - Intermediaries supervision

---

## Content

1. This circular sets out the Securities and Futures Commission's (**SFC**) regulatory approach...

2. Liquidity on Hong Kong's VATPs remains subdued at the current stage...

3. An affiliated market maker (**AFMM**) of a Platform Operator may help alleviate...

...

## Footnotes

^1^ Paragraph 13.3 of the Guidelines for Virtual Asset Trading Platform Operators (**VATP Guidelines**).

## Source Files

- **PDF:** [26EC6.pdf](../pdf/2026/26EC6.pdf)
- **Raw HTML:** [26EC6_raw.html](../html/2026/26EC6_raw.html)
- **API URL:** https://apps.sfc.hk/edistributionWeb/gateway/EN/circular/doc?refNo=26EC6

---
*Generated by sfc-fetch on 2026-02-17*
```

---

## 📁 Storage Structure

```
sfc-data/
├── circulars/
│   ├── metadata/
│   │   └── circulars-index.json    # Master index
│   │
│   ├── pdf/                        # ALL years (2000-2026)
│   │   ├── 2000/
│   │   │   ├── H035.pdf
│   │   │   └── H046.pdf
│   │   ├── 2010/
│   │   │   ├── H613.pdf
│   │   │   └── H618.pdf
│   │   └── 2026/
│   │       ├── 26EC6.pdf
│   │       ├── 26EC7.pdf
│   │       └── ...
│   │
│   ├── html/                       # 2012+ only
│   │   ├── 2012/
│   │   │   └── 12EC16.html
│   │   └── 2026/
│   │       ├── 26EC6_raw.html
│   │       └── 26EC7_raw.html
│   │
│   ├── markdown/                   # 2012+ only (converted)
│   │   └── 2026/
│   │       ├── 26EC6.md
│   │       └── 26EC7.md
│   │
│   └── appendix/                   # ALL years (when available)
│       ├── 2011/
│       │   └── H618_appendix_0.pdf
│       └── 2026/
│           ├── 26EC6_appendix_0.pdf
│           └── 26EC6_appendix_1.pdf
│
├── index.json                      # Combined index (all document types)
├── last-check.json                 # Last update check timestamp
└── progress.json                   # Download progress tracking
```

---

## 🧩 API Client Functions

```javascript
// Search API - List circulars with pagination
async function circularSearchAPI(params) {
  const response = await fetch(
    'https://apps.sfc.hk/edistributionWeb/api/circular/search',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }
  );
  
  if (!response.ok) {
    throw new Error(`Search API error: ${response.status}`);
  }
  
  return await response.json();
}

// Content API - Get HTML content (2012+ only)
async function circularContentAPI(refNo, lang = 'EN') {
  const response = await fetch(
    `https://apps.sfc.hk/edistributionWeb/api/circular/content?refNo=${refNo}&lang=${lang}`
  );
  
  if (response.status === 404) {
    return { html: null };  // Legacy circular or not found
  }
  
  if (!response.ok) {
    throw new Error(`Content API error: ${response.status}`);
  }
  
  return await response.json();
}

// Open File API - Download PDF (ALL years!)
async function circularOpenFileAPI(refNo, lang = 'EN') {
  const response = await fetch(
    `https://apps.sfc.hk/edistributionWeb/api/circular/openFile?refNo=${refNo}&lang=${lang}`
  );
  
  if (!response.ok) {
    throw new Error(`OpenFile API error: ${response.status}`);
  }
  
  return await response.arrayBuffer();
}

// Open Appendix API - Download appendix PDF (ALL years!)
async function circularOpenAppendixAPI(refNo, index, lang = 'EN') {
  const response = await fetch(
    `https://apps.sfc.hk/edistributionWeb/api/circular/openAppendix?refNo=${refNo}&appendix=${index}&lang=${lang}`
  );
  
  if (!response.ok) {
    throw new Error(`OpenAppendix API error: ${response.status}`);
  }
  
  return await response.arrayBuffer();
}
```

---

## 📊 Progress Tracking

```javascript
// During full download
const progress = {
  totalYears: 27,           // 2000-2026
  currentYear: 2026,
  totalCirculars: 0,
  processedCirculars: 0,
  downloadedPdfs: 0,
  downloadedHtml: 0,
  downloadedMarkdown: 0,
  downloadedAppendices: 0,
  modernCount: 0,           // 2012+
  legacyCount: 0,           // 2000-2011
  errors: [],
  startTime: new Date().toISOString(),
  estimatedEndTime: null
};

// Save progress periodically
const progressInterval = setInterval(async () => {
  progress.estimatedEndTime = calculateETA(progress);
  await saveProgress(progress);
  
  const percent = ((progress.processedCirculars / progress.totalCirculars) * 100).toFixed(1);
  console.log(`Progress: ${progress.processedCirculars}/${progress.totalCirculars} (${percent}%)`);
}, 60000); // Every minute
```

---

## 📝 Daily Check Summary Report

```
═══════════════════════════════════════════════════════════
SFC Circular Daily Check - 2026-02-17 10:30:00 UTC
═══════════════════════════════════════════════════════════

Checked: Year 2026 (page 0)
Circulars examined: 52

Results:
--------
🆕 New circulars: 2
   ├─ 26EC7: Circular to Licensed Corporations...
   └─ 26EC8: Guidelines update for...

✏️  Modified circulars: 0

Statistics:
-----------
Total circulars in database: 702
Modern (2012+): 512
Legacy (2000-2011): 190
With appendices: 45

Next check: 2026-02-18 10:30:00 UTC
═══════════════════════════════════════════════════════════
```

---

## 🎓 Best Practices & Lessons Learned

### 1. The PDF API Works for ALL Years

This is the most important finding:

```javascript
// ✅ H035 (2000) - WORKS!
await circularOpenFileAPI("H035", "EN");  // Returns PDF

// ✅ 26EC6 (2026) - WORKS!
await circularOpenFileAPI("26EC6", "EN");  // Returns PDF
```

### 2. HTML is Only Available for 2012+

```javascript
// ❌ H618 (2011) - Returns { html: null }
const content = await circularContentAPI("H618", "EN");

// ✅ 26EC6 (2026) - Returns { html: "<ol>...</ol>" }
const content = await circularContentAPI("26EC6", "EN");
```

### 3. Handle Legacy vs Modern Differently

```javascript
const year = new Date(releasedDate).getFullYear();
const isModern = year >= 2012;

if (isModern) {
  // Download PDF + HTML + Markdown
  await downloadCircularModern(circular);
} else {
  // Download PDF only
  await downloadCircularLegacy(circular);
}
```

### 4. Appendix API is Universal

```javascript
// Works for H618 (2011) AND 26EC6 (2026)
await circularOpenAppendixAPI(refNo, 0, "EN");  // Always works if appendix exists
```

### 5. Rate Limiting

```javascript
// No formal rate limiting detected, but be polite
const delay = 500;  // 500ms between requests
await sleep(delay);
```

### 6. Document Type Codes

| Code | Category |
|------|----------|
| 110 | Intermediaries supervision |
| 120 | Investment products |
| 130 | Market infrastructure |
| 140 | Listed companies / Takeovers |
| 150 | Enforcement / OBC |
| 160 | Market Misconduct Tribunal |

---

## 🔍 Comparison with Other Document Types

| Aspect | Circulars | Consultations | News |
|--------|-----------|---------------|------|
| **Count** | ~700 | 217 | 5,205 |
| **Year Range** | 2000-2026 | 1989-2026 | 1996-2026 |
| **Format Gap** | ✅ 2000-2011: PDF only | ❌ None | ❌ None |
| **HTML→Markdown** | ✅ Yes (2012+) | ❌ No (store raw HTML) | ✅ Yes (all years) |
| **PDF Main Doc** | ✅ Yes (all years) | ✅ Yes (CP + CC) | ❌ No (HTML only) |
| **Appendix** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Images** | ❌ No | ❌ No | ✅ Yes |
| **Storage** | ~1.5GB | ~170MB | ~100-200MB |
| **Fetch Strategy** | Year-by-year pagination | Single "all" call | Year-by-year or "all" |

---

## 🚨 Error Handling

### Common Issues

1. **Legacy Circular HTML Returns Null**
   ```javascript
   if (!content.html) {
     // Expected for pre-2012 circulars
     log.info(`${refNo}: No HTML (legacy circular)`);
   }
   ```

2. **PDF Download Fails**
   ```javascript
   try {
     await circularOpenFileAPI(refNo, "EN");
   } catch (error) {
     if (error.status === 404) {
       // Circular may have been removed
       log.warning(`Circular ${refNo} not found`);
     }
   }
   ```

3. **Appendix Count Mismatch**
   ```javascript
   // Sometimes appendixDocList exists but download fails
   // Always handle errors gracefully
   ```

---

## ✅ Checklist for Implementation

- [ ] Implement search API with year-by-year pagination
- [ ] Implement content API with HTML extraction
- [ ] Implement openFile API for PDF download (all years)
- [ ] Implement openAppendix API for appendix download
- [ ] Add HTML → Markdown conversion for 2012+ circulars
- [ ] Build index with legacy/modern split
- [ ] Implement daily update check
- [ ] Add progress tracking
- [ ] Add error handling and retry logic
- [ ] Add notification system
- [ ] Test with oldest circular (H035, 2000)
- [ ] Test with newest circular (26EC6, 2026)
- [ ] Test with circular containing appendices
- [ ] Test legacy circular (H### format, pre-2012)

---

## 📚 References

- **API Documentation:** `findings/CIRCULAR_API_SUMMARY.md`
- **Original Workflow:** `findings/SFC_FETCH_WORKFLOW.md`
- **Architecture:** `findings/ARCHITECTURE.md`
- **Mermaid Diagrams:** `findings/MERMAID_DIAGRAMS.md`
- **Research Notes:** `notes/20260216_circular_content_api_complete.md`
- **Research Notes:** `notes/20260216_legacy_final_conclusion.md`

---

*Workflow version 1.0 - Based on comprehensive API research 2000-2026*
*Created: 2026-02-17 to standardize with NEWS_WORKFLOW.md and CONSULTATION_WORKFLOW.md*
