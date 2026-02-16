# sfc-fetch Workflow & Implementation Guide

**Purpose:** Automated SFC circular fetching with daily update checking  
**Date:** 2026-02-16  
**Based on:** SFC Circular API Research

---

## 🎯 Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     INITIAL FETCH (One-time)                  │
├─────────────────────────────────────────────────────────────┤
│  1. Fetch all years (2000-2025) via search API                │
│  2. For each circular:                                       │
│     - Download PDF (all years)                              │
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

## 📥 Full Download Workflow

### Phase 1: Discovery

```javascript
async function discoverAllCirculars() {
  const allCirculars = [];
  
  for (let year = 2000; year <= 2026; year++) {
    console.log(`Fetching year ${year}...`);
    
    let pageNo = 0;
    let hasMore = true;
    
    while (hasMore) {
      const response = await searchAPI({
        lang: "EN",
        category: "all",
        year: year,
        pageNo: pageNo,
        pageSize: 50,
        sort: { field: "issueDate", order: "desc" }
      });
      
      allCirculars.push(...response.items);
      
      // Check if we've fetched all pages
      const totalPages = Math.ceil(response.total / 50);
      hasMore = pageNo < totalPages - 1;
      pageNo++;
      
      // Rate limiting - be polite
      await sleep(500);
    }
  }
  
  return allCirculars;
}
```

### Phase 2: Content Download

```javascript
async function downloadCircular(circular) {
  const { refNo, releasedDate, appendixDocList } = circular;
  const year = new Date(releasedDate).getFullYear();
  const isModern = year >= 2012;
  
  const downloaded = {
    refNo,
    year,
    files: {}
  };
  
  // 1. Download main PDF (ALL years)
  console.log(`  [${refNo}] Downloading main PDF...`);
  const pdfBuffer = await openFileAPI(refNo, "EN");
  const pdfPath = `circulars/pdf/${year}/${refNo}.pdf`;
  await saveFile(pdfPath, pdfBuffer);
  downloaded.files.mainPdf = pdfPath;
  
  // 2. Download HTML + convert to Markdown (2012+ only)
  if (isModern) {
    console.log(`  [${refNo}] Downloading HTML content...`);
    const content = await contentAPI(refNo, "EN");
    
    if (content.html) {
      // Save raw HTML
      const htmlPath = `circulars/html/${year}/${refNo}_raw.html`;
      await saveFile(htmlPath, content.html);
      downloaded.files.rawHtml = htmlPath;
      
      // Convert to Markdown
      const markdown = htmlToMarkdown(content.html);
      const mdPath = `circulars/markdown/${year}/${refNo}.md`;
      await saveFile(mdPath, markdown);
      downloaded.files.markdown = mdPath;
      
      // Extract metadata
      downloaded.metadata = {
        postDocType: content.postDocType,
        postDocSubtype: content.postDocSubtype,
        deptCode: content.deptCode,
        creationTime: content.creationTime,
        modificationTime: content.modificationTime
      };
    }
  }
  
  // 3. Download appendices (if any)
  if (appendixDocList && appendixDocList.length > 0) {
    console.log(`  [${refNo}] Downloading ${appendixDocList.length} appendix(es)...`);
    downloaded.files.appendices = [];
    
    for (let i = 0; i < appendixDocList.length; i++) {
      const appendixBuffer = await openAppendixAPI(refNo, i, "EN");
      const appendixPath = `circulars/appendix/${year}/${refNo}_appendix_${i}.pdf`;
      await saveFile(appendixPath, appendixBuffer);
      downloaded.files.appendices.push({
        index: i,
        caption: appendixDocList[i].caption,
        file: appendixPath
      });
    }
  }
  
  return downloaded;
}
```

### Phase 3: Build Index

```javascript
async function buildMasterIndex(allCirculars, allDownloads) {
  const index = {
    generatedAt: new Date().toISOString(),
    totalCount: allCirculars.length,
    byYear: {},
    byType: {},
    circulars: {}
  };
  
  for (const circular of allCirculars) {
    const year = new Date(circular.releasedDate).getFullYear();
    const download = allDownloads.find(d => d.refNo === circular.refNo);
    
    // Build entry
    index.circulars[circular.refNo] = {
      refNo: circular.refNo,
      title: circular.title,
      releasedDate: circular.releasedDate,
      year: year,
      lang: circular.lang,
      postDocType: circular.postDocType,
      deptCode: download?.metadata?.deptCode || null,
      hasHtml: download?.files?.rawHtml ? true : false,
      hasAppendix: circular.appendixDocList?.length > 0,
      appendixCount: circular.appendixDocList?.length || 0,
      files: download?.files || {},
      lastFetched: new Date().toISOString()
    };
    
    // Aggregate by year
    if (!index.byYear[year]) {
      index.byYear[year] = { count: 0, circulars: [] };
    }
    index.byYear[year].count++;
    index.byYear[year].circulars.push(circular.refNo);
    
    // Aggregate by type
    const type = circular.postDocType;
    if (!index.byType[type]) {
      index.byType[type] = { count: 0, name: getDocTypeName(type) };
    }
    index.byType[type].count++;
  }
  
  return index;
}
```

---

## 🔄 Daily Update Check Workflow

### Strategy: Check Current Year Only

Most new circulars are published in the current year. Checking all 25 years daily is wasteful.

```javascript
async function checkForUpdates() {
  const currentYear = new Date().getFullYear();
  const index = await loadIndex();
  const lastCheck = await loadLastCheck();
  
  console.log(`Checking for updates in ${currentYear}...`);
  console.log(`Last check: ${lastCheck?.timestamp || 'Never'}`);
  
  const updates = {
    new: [],
    modified: [],
    timestamp: new Date().toISOString()
  };
  
  // Fetch current year page 0 (most recent)
  const recentResponse = await searchAPI({
    lang: "EN",
    category: "all",
    year: currentYear,
    pageNo: 0,
    pageSize: 50,
    sort: { field: "issueDate", order: "desc" }
  });
  
  // Check each circular
  for (const circular of recentResponse.items) {
    const existing = index.circulars[circular.refNo];
    
    if (!existing) {
      // NEW circular
      console.log(`  🆕 NEW: ${circular.refNo} - ${circular.title.substring(0, 60)}`);
      updates.new.push(circular);
      
      // Download immediately
      await downloadCircular(circular);
      
    } else if (existing.releasedDate !== circular.releasedDate) {
      // MODIFIED (date changed - rare but possible)
      console.log(`  ✏️  MODIFIED: ${circular.refNo}`);
      updates.modified.push({
        refNo: circular.refNo,
        oldDate: existing.releasedDate,
        newDate: circular.releasedDate
      });
      
      // Re-download
      await downloadCircular(circular);
    }
  }
  
  // Update index if there are changes
  if (updates.new.length > 0 || updates.modified.length > 0) {
    await updateIndex(updates);
    await notifyUser(updates); // Optional: Telegram/email notification
  }
  
  // Save last check timestamp
  await saveLastCheck({
    timestamp: updates.timestamp,
    checked: recentResponse.items.length,
    found: updates.new.length + updates.modified.length
  });
  
  return updates;
}
```

---

## 🧹 HTML to Markdown Conversion

### Conversion Strategy

```javascript
function htmlToMarkdown(html) {
  // Use a library like turndown or implement custom converter
  // Here's a simple custom approach for SFC circulars:
  
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  
  let markdown = '';
  
  // Process ordered list items (main sections)
  $('ol > li').each((i, elem) => {
    const $li = $(elem);
    
    // Get text content, preserving some formatting
    let text = $li.html()
      .replace(/<br\s*\/?>/gi, '\n')           // Convert <br> to newlines
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')  // Bold
      .replace(/<sup>(.*?)<\/sup>/gi, '^$1^')  // Superscript (footnotes)
      .replace(/&nbsp;/g, ' ')
      .replace(/\r\n/g, '\n');
    
    // Strip remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');
    
    // Add to markdown with section number
    markdown += `${i + 1}. ${text.trim()}\n\n`;
  });
  
  // Extract footnotes (usually at end)
  $('p:has(sup)').each((i, elem) => {
    const text = $(elem).text();
    if (text.match(/^\^\d+\^/)) {
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
**Department:** Intermediaries Supervision (IS)  
**Category:** 110

---

## Content

1. This circular sets out the Securities and Futures Commission's (**SFC**) regulatory approach...

2. Liquidity on Hong Kong's VATPs remains subdued at the current stage...

3. An affiliated market maker (**AFMM**) of a Platform Operator may help alleviate...

...

## Footnotes

^1^ Paragraph 13.3 of the Guidelines for Virtual Asset Trading Platform Operators (**VATP Guidelines**).

## Source

- **PDF:** [26EC6.pdf](../pdf/2026/26EC6.pdf)
- **HTML:** [26EC6_raw.html](../html/2026/26EC6_raw.html)
- **Original URL:** https://apps.sfc.hk/edistributionWeb/gateway/EN/circular/doc?refNo=26EC6

---
*Generated by sfc-fetch on 2026-02-16*
```

---

## 🔧 Implementation Modules

### Module Structure

```
sfc-fetch/
├── src/
│   ├── api/
│   │   ├── search.js          # Search API client
│   │   ├── content.js         # Content API client
│   │   ├── openFile.js        # PDF download client
│   │   └── openAppendix.js     # Appendix download client
│   ├── processors/
│   │   ├── htmlToMarkdown.js  # HTML converter
│   │   └── pdfExtractor.js    # PDF text extractor (optional)
│   ├── storage/
│   │   ├── fileManager.js     # File I/O operations
│   │   ├── indexManager.js    # Index management
│   │   └── metadataStore.js   # Metadata persistence
│   ├── workflows/
│   │   ├── fullDownload.js    # Initial download workflow
│   │   └── dailyCheck.js      # Daily update check
│   └── utils/
│       ├── rateLimiter.js     # Request throttling
│       ├── logger.js          # Logging utility
│       └── dateHelpers.js     # Date parsing/formatting
├── config/
│   └── default.js             # Configuration
├── data/                      # Downloaded data directory
├── index.json                 # Master index
└── last-check.json            # Last update check
```

---

## ⚙️ Configuration

```javascript
// config/default.js
module.exports = {
  api: {
    baseUrl: 'https://apps.sfc.hk/edistributionWeb',
    lang: 'EN',
    requestTimeout: 30000,
    rateLimit: {
      requestsPerSecond: 2,  // Be polite
      delayBetweenRequests: 500
    }
  },
  
  storage: {
    basePath: './data',
    keepRawHtml: true,
    generateMarkdown: true,
    savePdf: true
  },
  
  workflow: {
    fullDownload: {
      startYear: 2000,
      endYear: new Date().getFullYear(),
      pageSize: 50
    },
    dailyCheck: {
      checkCurrentYearOnly: true,
      notifyOnNew: true
    }
  },
  
  notifications: {
    enabled: true,
    channels: ['telegram'],  // or 'email', 'slack'
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID
    }
  }
};
```

---

## 🚨 Error Handling & Resilience

```javascript
async function resilientAPICall(apiFunction, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await apiFunction();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`  Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

// Usage
const content = await resilientAPICall(
  () => contentAPI(refNo, 'EN')
);
```

---

## 📊 Progress Tracking

```javascript
// During full download
const progress = {
  totalYears: 27,
  currentYear: 2026,
  totalCirculars: 0,
  processedCirculars: 0,
  downloadedPdfs: 0,
  downloadedHtml: 0,
  downloadedAppendices: 0,
  errors: []
};

// Save progress periodically
setInterval(async () => {
  await saveProgress(progress);
  console.log(`Progress: ${progress.processedCirculars}/${progress.totalCirculars}`);
}, 60000);
```

---

## 📝 Daily Check Summary Report

```
SFC Daily Check - 2026-02-16 10:30:00
=====================================

Checked: Year 2026 (page 0)
Circulars examined: 48

Results:
--------
🆕 New circulars: 2
   - 26EC7: Circular to Licensed Corporations...
   - 26EC8: Another circular title...

✅ System healthy. Index updated.
Total circulars in database: 712
```

---

## 🎓 Best Practices

1. **Rate Limiting:** Max 2 requests/second to be polite
2. **Incremental Updates:** Check current year only daily
3. **Full Re-sync:** Monthly re-check of all years (optional)
4. **Backup:** Keep multiple copies of index
5. **Logging:** Log all API calls and errors
6. **Idempotency:** Re-running should not duplicate files
7. **Validation:** Verify PDF/HTML integrity after download

---

## 📚 References

- API Summary: `findings/CIRCULAR_API_SUMMARY.md`
- Research notes: `notes/` directory
- GitHub: https://github.com/yaukitdev1-cpu/sfc-research

---

*Ready for implementation. Estimated initial download: ~700 circulars, ~1.5GB data.*
