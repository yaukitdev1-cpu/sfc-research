# Guidelines Workflow & Implementation Guide

**Purpose:** Automated SFC Guidelines fetching from main website with update detection  
**Date:** 2026-02-17  
**Based on:** SFC Guidelines Research (main website, NOT e-Distribution)  
**Location:** https://www.sfc.hk/en/Rules-and-standards/Codes-and-guidelines/Guidelines

---

## 🎯 Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INITIAL FETCH (One-time)                          │
├─────────────────────────────────────────────────────────────────────┤
│  1. Scrape HTML page for all guidelines                             │
│  2. Parse table structure with data attributes                       │
│  3. For each guideline:                                             │
│     - Download current version PDF                                  │
│     - If version history exists, download all historical versions   │
│     - Extract metadata (ID, topics, effective date)                 │
│  3. Build master index                                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    UPDATE DETECTION (Periodic)                       │
├─────────────────────────────────────────────────────────────────────┤
│  1. Re-scrape HTML page                                             │
│  2. Compare with stored index                                       │
│     - Detect new guidelines                                         │
│     - Detect changed PDF hashes (current versions)                  │
│     - Detect new historical versions                              │
│  3. Download new/changed content                                    │
│  4. Update index                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Difference from e-Distribution:** No JSON API - must scrape HTML and compare content/hashes.

---

## 📥 Full Download Workflow

### Phase 1: HTML Scraping

```javascript
const cheerio = require('cheerio');

async function scrapeGuidelinesPage(lang = 'EN') {
  // Map language codes to URL paths
  const langMap = { EN: 'en', TC: 'tc', SC: 'sc' };
  const langCode = langMap[lang] || 'en';
  
  const url = `https://www.sfc.hk/${langCode}/Rules-and-standards/Codes-and-guidelines/Guidelines`;
  
  console.log(`Scraping ${lang} guidelines from ${url}...`);
  
  const response = await fetch(url);
  const html = await response.text();
  
  const $ = cheerio.load(html);
  const guidelines = [];
  
  // Parse table rows with data attributes
  $('tr[data-code-guideline-id]').each((i, elem) => {
    const $row = $(elem);
    
    // Extract data attributes
    const id = $row.attr('data-code-guideline-id');
    const topics = $row.attr('data-code-guideline-topics') || '';
    
    // Extract title (first TD)
    const title = $row.find('td:first').text().trim();
    
    // Extract current version info (second TD)
    const $currentLink = $row.find('td:eq(1) a');
    const currentPdfUrl = $currentLink.attr('href');
    const effectiveDate = $currentLink.attr('title');
    
    // Check for version history (third TD)
    const $versionBtn = $row.find('td:eq(2) .popup-btn');
    const hasVersionHistory = $versionBtn.length > 0;
    const versionCount = hasVersionHistory 
      ? parseInt($versionBtn.text().match(/\d+/)?.[0] || '0')
      : 1;
    
    // Extract popup ID for version history
    const popupId = hasVersionHistory 
      ? $versionBtn.attr('data-popup-id')?.replace('#', '')
      : null;
    
    guidelines.push({
      id,
      topics: topics.split(' ').filter(Boolean),
      title,
      effectiveDate,
      currentPdfUrl,
      hasVersionHistory,
      versionCount,
      popupId,
      language: lang
    });
  });
  
  console.log(`Found ${guidelines.length} guidelines`);
  return { guidelines, html }; // Return HTML for Phase 2
}
```

### Phase 2: Version History Extraction

```javascript
async function extractVersionHistory(guideline, html) {
  if (!guideline.hasVersionHistory || !guideline.popupId) {
    return [];
  }
  
  const $ = cheerio.load(html);
  const versions = [];
  
  // Find the popup div for this guideline
  const $popup = $(`#${guideline.popupId}`);
  
  if ($popup.length === 0) {
    console.warn(`  Popup not found for ${guideline.id}`);
    return [];
  }
  
  // Extract all version entries from the popup table
  $popup.find('table tbody tr').each((i, row) => {
    const $link = $(row).find('a');
    const pdfUrl = $link.attr('href');
    const dateRange = $link.attr('title');
    const dateText = $link.text().trim();
    
    // Parse date range (e.g., "1 Oct 2013 - 31 Dec 2021")
    const [startDate, endDate] = dateRange.split(' - ').map(d => d.trim());
    
    versions.push({
      index: i,
      startDate,
      endDate,
      pdfUrl,
      isHistorical: true
    });
  });
  
  return versions;
}
```

### Phase 3: PDF Download

```javascript
async function downloadGuideline(guideline, versions, options = {}) {
  const { downloadHistory = true, saveMetadata = true } = options;
  
  const downloads = {
    id: guideline.id,
    title: guideline.title,
    files: [],
    metadata: {}
  };
  
  // Create safe filename from title
  const safeTitle = guideline.title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  
  // 1. Download current version
  console.log(`  [${guideline.id}] Downloading current version...`);
  
  const currentResponse = await fetch(guideline.currentPdfUrl);
  const currentBuffer = await currentResponse.arrayBuffer();
  const currentHash = await computeHash(currentBuffer);
  
  const currentPath = `guidelines/current/${safeTitle}.pdf`;
  await saveFile(currentPath, Buffer.from(currentBuffer));
  
  downloads.files.push({
    type: 'current',
    version: 'current',
    date: guideline.effectiveDate,
    path: currentPath,
    url: guideline.currentPdfUrl,
    hash: currentHash,
    size: currentBuffer.byteLength
  });
  
  // 2. Download historical versions (if enabled)
  if (downloadHistory && versions.length > 0) {
    console.log(`  [${guideline.id}] Downloading ${versions.length} historical version(s)...`);
    
    for (const version of versions) {
      try {
        const versionResponse = await fetch(version.pdfUrl);
        const versionBuffer = await versionResponse.arrayBuffer();
        const versionHash = await computeHash(versionBuffer);
        
        // Create safe filename with date
        const safeDate = version.startDate.replace(/[^a-zA-Z0-9]/g, '-');
        const versionPath = `guidelines/historical/${safeTitle}/${safeDate}.pdf`;
        
        await saveFile(versionPath, Buffer.from(versionBuffer));
        
        downloads.files.push({
          type: 'historical',
          version: version.index,
          dateRange: `${version.startDate} - ${version.endDate}`,
          startDate: version.startDate,
          endDate: version.endDate,
          path: versionPath,
          url: version.pdfUrl,
          hash: versionHash,
          size: versionBuffer.byteLength
        });
        
        // Rate limiting
        await sleep(500);
      } catch (error) {
        console.error(`    Failed to download version ${version.index}:`, error.message);
        downloads.errors = downloads.errors || [];
        downloads.errors.push({
          version: version.index,
          error: error.message
        });
      }
    }
  }
  
  // 3. Save metadata
  if (saveMetadata) {
    downloads.metadata = {
      id: guideline.id,
      title: guideline.title,
      topics: guideline.topics,
      effectiveDate: guideline.effectiveDate,
      language: guideline.language,
      hasVersionHistory: guideline.hasVersionHistory,
      versionCount: guideline.versionCount,
      lastFetched: new Date().toISOString()
    };
    
    const metaPath = `guidelines/metadata/${guideline.id}.json`;
    await saveFile(metaPath, JSON.stringify(downloads.metadata, null, 2));
  }
  
  return downloads;
}

// Helper: Compute SHA256 hash for change detection
async function computeHash(buffer) {
  const crypto = require('crypto');
  return crypto.createHash('sha256')
    .update(Buffer.from(buffer))
    .digest('hex');
}
```

### Phase 4: Build Index

```javascript
async function buildGuidelinesIndex(allGuidelines, allDownloads) {
  const index = {
    generatedAt: new Date().toISOString(),
    source: 'https://www.sfc.hk/en/Rules-and-standards/Codes-and-guidelines/Guidelines',
    totalCount: allGuidelines.length,
    withVersionHistory: allGuidelines.filter(g => g.hasVersionHistory).length,
    byTopic: {},
    byLanguage: {},
    guidelines: {}
  };
  
  for (const guideline of allGuidelines) {
    const download = allDownloads.find(d => d.id === guideline.id);
    
    // Build entry
    index.guidelines[guideline.id] = {
      id: guideline.id,
      title: guideline.title,
      topics: guideline.topics,
      effectiveDate: guideline.effectiveDate,
      language: guideline.language,
      hasVersionHistory: guideline.hasVersionHistory,
      versionCount: guideline.versionCount,
      currentFile: download?.files.find(f => f.type === 'current'),
      historicalFiles: download?.files.filter(f => f.type === 'historical') || [],
      lastFetched: new Date().toISOString()
    };
    
    // Aggregate by topic
    for (const topic of guideline.topics) {
      if (!index.byTopic[topic]) {
        index.byTopic[topic] = { count: 0, guidelines: [] };
      }
      index.byTopic[topic].count++;
      index.byTopic[topic].guidelines.push(guideline.id);
    }
    
    // Aggregate by language
    if (!index.byLanguage[guideline.language]) {
      index.byLanguage[guideline.language] = { count: 0 };
    }
    index.byLanguage[guideline.language].count++;
  }
  
  // Save index
  await saveFile('guidelines/index.json', JSON.stringify(index, null, 2));
  
  return index;
}
```

---

## 🔄 Update Detection Workflow

### Strategy: Re-scrape + Compare

Since there's no API, we detect updates by:
1. Re-scraping the HTML page
2. Comparing parsed structure with stored index
3. Checking PDF hashes for content changes

```javascript
async function checkForGuidelineUpdates() {
  console.log('Checking for guideline updates...');
  
  const index = await loadGuidelinesIndex();
  const lastCheck = await loadGuidelinesLastCheck();
  
  const updates = {
    newGuidelines: [],
    changedCurrentVersions: [],
    newHistoricalVersions: [],
    timestamp: new Date().toISOString()
  };
  
  // 1. Scrape current page
  const { guidelines: currentGuidelines, html } = await scrapeGuidelinesPage('EN');
  
  // 2. Compare with stored index
  for (const guideline of currentGuidelines) {
    const existing = index.guidelines[guideline.id];
    
    if (!existing) {
      // NEW guideline
      console.log(`  🆕 NEW: ${guideline.id} - ${guideline.title.substring(0, 60)}...`);
      updates.newGuidelines.push(guideline);
      
      // Download immediately
      const versions = await extractVersionHistory(guideline, html);
      await downloadGuideline(guideline, versions);
      
    } else {
      // Check current version for changes
      const currentHash = await fetchAndHash(guideline.currentPdfUrl);
      const storedHash = existing.currentFile?.hash;
      
      if (currentHash !== storedHash) {
        console.log(`  📄 CHANGED: ${guideline.id} (current version)`);
        updates.changedCurrentVersions.push({
          id: guideline.id,
          oldHash: storedHash,
          newHash: currentHash,
          oldDate: existing.effectiveDate,
          newDate: guideline.effectiveDate
        });
        
        // Re-download current version
        await downloadGuideline(guideline, [], { downloadHistory: false });
      }
      
      // Check for new historical versions (if count changed)
      if (guideline.versionCount > existing.versionCount) {
        console.log(`  📚 NEW VERSIONS: ${guideline.id} (${existing.versionCount} → ${guideline.versionCount})`);
        
        const versions = await extractVersionHistory(guideline, html);
        const newVersions = versions.slice(existing.versionCount - 1);
        
        updates.newHistoricalVersions.push({
          id: guideline.id,
          previousCount: existing.versionCount,
          newCount: guideline.versionCount,
          addedVersions: newVersions.length
        });
        
        // Download new historical versions
        for (const version of newVersions) {
          await downloadVersion(guideline, version);
        }
      }
    }
  }
  
  // 3. Update index if changes found
  if (updates.newGuidelines.length > 0 || 
      updates.changedCurrentVersions.length > 0 ||
      updates.newHistoricalVersions.length > 0) {
    await updateGuidelinesIndex(updates);
    await notifyUser(updates);
  }
  
  // 4. Save check timestamp
  await saveGuidelinesLastCheck({
    timestamp: updates.timestamp,
    checked: currentGuidelines.length,
    found: updates.newGuidelines.length + 
           updates.changedCurrentVersions.length + 
           updates.newHistoricalVersions.length
  });
  
  return updates;
}

// Helper: Fetch PDF and compute hash
async function fetchAndHash(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return computeHash(buffer);
}
```

---

## 📁 Storage Structure

```
sfc-data/
├── guidelines/
│   ├── index.json                     # Master index
│   ├── last-check.json                # Last update check
│   ├── metadata/                      # Individual metadata files
│   │   ├── 56F165F53E8E46BE82DC015EDCF41197.json
│   │   └── ...
│   ├── current/                       # Current versions (all languages)
│   │   ├── EN/
│   │   │   ├── Fit-and-Proper-Guidelines.pdf
│   │   │   ├── Guidelines-for-VATP-Operators.pdf
│   │   │   └── ...
│   │   ├── TC/                       # Traditional Chinese
│   │   └── SC/                       # Simplified Chinese
│   └── historical/                    # Version history
│       ├── Fit-and-Proper-Guidelines/
│       │   ├── 2022-01-01.pdf        # Current version effective date
│       │   ├── 2013-10-01.pdf        # Historical versions
│       │   ├── 2006-09-01.pdf
│       │   └── 2003-03-01.pdf
│       └── ...
└── ...
```

---

## 🆚 Comparison: Guidelines vs e-Distribution Categories

| Aspect | Guidelines | Circulars/News/Consultations |
|--------|------------|------------------------------|
| **System** | Main website (www.sfc.hk) | e-Distribution (apps.sfc.hk) |
| **API** | ❌ None - HTML scraping | ✅ JSON API |
| **Structure** | Table with data attributes | JSON response |
| **Count** | 50 guidelines | ~700 circulars, 5,205 news, 217 consultations |
| **Versioning** | Built-in history (32/50 have multiple versions) | Single version per item |
| **Update Detection** | Re-scrape + hash comparison | API query + date comparison |
| **Languages** | EN, TC, SC (separate pages) | EN, TC, SC (same API, lang param) |
| **Historical Data** | ✅ Full version history available | ❌ Only current version |

---

## 🔧 Implementation Modules

```
sfc-fetch/
├── src/
│   ├── scrapers/
│   │   └── guidelinesScraper.js       # HTML scraping for guidelines
│   ├── downloaders/
│   │   ├── pdfDownloader.js           # Generic PDF downloader
│   │   └── guidelinesDownloader.js    # Guidelines-specific logic
│   ├── processors/
│   │   └── versionExtractor.js        # Extract version history from HTML
│   ├── storage/
│   │   ├── guidelinesIndex.js         # Guidelines index management
│   │   └── fileManager.js             # File I/O operations
│   ├── workflows/
│   │   ├── guidelinesFullDownload.js  # Initial download workflow
│   │   └── guidelinesUpdateCheck.js   # Update detection workflow
│   └── utils/
│       ├── htmlParser.js              # cheerio wrapper
│       ├── hashHelper.js               # SHA256 hashing
│       ├── rateLimiter.js             # Request throttling
│       └── logger.js                  # Logging utility
├── config/
│   └── guidelines.js                  # Guidelines-specific config
└── data/guidelines/                   # Downloaded data directory
```

---

## ⚙️ Configuration

```javascript
// config/guidelines.js
module.exports = {
  scraper: {
    baseUrl: 'https://www.sfc.hk',
    paths: {
      EN: '/en/Rules-and-standards/Codes-and-guidelines/Guidelines',
      TC: '/tc/Rules-and-standards/Codes-and-guidelines/Guidelines',
      SC: '/sc/Rules-and-standards/Codes-and-guidelines/Guidelines'
    },
    requestTimeout: 30000,
    userAgent: 'sfc-fetch/1.0 (research bot)',
    rateLimit: {
      requestsPerSecond: 1,  // More conservative than API
      delayBetweenRequests: 1000
    }
  },
  
  storage: {
    basePath: './data/guidelines',
    saveCurrent: true,
    saveHistory: true,       // Download all historical versions
    saveMetadata: true,
    organizeByTopic: false   // Organize by title instead
  },
  
  workflow: {
    fullDownload: {
      languages: ['EN', 'TC'],  // Which languages to fetch
      downloadHistory: true
    },
    updateCheck: {
      frequency: 'weekly',      // 'daily', 'weekly', 'monthly'
      checkLanguages: ['EN'],
      compareHashes: true,      // Re-download if hash changed
      notifyOnNew: true
    }
  },
  
  selectors: {
    // CSS selectors for HTML parsing
    guidelineRow: 'tr[data-code-guideline-id]',
    titleCell: 'td:first',
    currentVersionCell: 'td:eq(1) a',
    versionHistoryButton: 'td:eq(2) .popup-btn',
    versionPopup: '.section-popup__content',
    versionHistoryRow: 'table tbody tr'
  }
};
```

---

## ⚠️ Error Handling & Edge Cases

### HTML Structure Changes

```javascript
async function scrapeWithFallback($) {
  // Primary selector
  let guidelines = $('tr[data-code-guideline-id]');
  
  // Fallback if structure changed
  if (guidelines.length === 0) {
    console.warn('Primary selector failed, trying fallback...');
    guidelines = $('table tr').filter((i, el) => {
      return $(el).find('td').length >= 2 && 
             $(el).find('a[href*=".pdf"]').length > 0;
    });
  }
  
  if (guidelines.length === 0) {
    throw new Error('Unable to parse guidelines - page structure may have changed');
  }
  
  return guidelines;
}
```

### PDF Download Failures

```javascript
async function downloadWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { timeout: 30000 });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('pdf')) {
        throw new Error(`Unexpected content type: ${contentType}`);
      }
      
      return await response.arrayBuffer();
      
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`  Download attempt ${attempt} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}
```

### Missing Version History

```javascript
async function safeExtractVersionHistory(guideline, html) {
  try {
    return await extractVersionHistory(guideline, html);
  } catch (error) {
    console.warn(`  Failed to extract version history for ${guideline.id}:`, error.message);
    // Return empty array - don't fail entire workflow
    return [];
  }
}
```

---

## 📊 Progress Tracking

```javascript
// During full download
const progress = {
  stage: 'downloading',
  totalGuidelines: 50,
  processedGuidelines: 0,
  currentDownloads: {
    currentVersions: 0,
    historicalVersions: 0
  },
  errors: []
};

// Real-time logging
function logProgress(guideline, version, status) {
  console.log(`[${progress.processedGuidelines}/${progress.totalGuidelines}] ` +
              `${guideline.title.substring(0, 40)}... - ${status}`);
}

// Save progress periodically
setInterval(async () => {
  await saveGuidelinesProgress(progress);
}, 30000);
```

---

## 📝 Update Check Summary Report

```
SFC Guidelines Update Check - 2026-02-17 09:00:00
====================================================

Checked: 50 guidelines
Last check: 2026-02-10 09:00:00 (7 days ago)

Results:
--------
🆕 New guidelines: 1
   - Guidelines for Market Soundings (Effective: 2 May 2025)

📄 Changed current versions: 1
   - Licensing Handbook (15 Jul 2025) - hash changed

📚 New historical versions: 0

✅ Guidelines index updated.
Total guidelines in database: 50
With version history: 32
Total PDFs stored: 107
```

---

## 🎓 Best Practices

1. **Conservative Rate Limiting:** 1 req/sec (vs 2 for API) - HTML scraping is heavier
2. **Hash Everything:** Store SHA256 hashes for all PDFs to detect changes
3. **Graceful Degradation:** If version history extraction fails, still save current version
4. **Multi-language:** Check all configured languages (EN/TC/SC may differ)
5. **Structure Validation:** Verify HTML structure before parsing; fail gracefully
6. **Incremental History:** When new versions appear, only download new ones
7. **Backup:** Guidelines structure changes rarely, but keep backups of old parsers
8. **Logging:** Log full HTML structure on parse failure for debugging

---

## 🔗 Integration with sfc-fetch

### Combined Index Structure

```json
{
  "generatedAt": "2026-02-17T09:00:00Z",
  "categories": {
    "circulars": {
      "source": "e-Distribution API",
      "count": 929,
      "lastUpdated": "2026-02-17T08:30:00Z"
    },
    "news": {
      "source": "e-Distribution API",
      "count": 5205,
      "lastUpdated": "2026-02-17T08:35:00Z"
    },
    "consultations": {
      "source": "e-Distribution API",
      "count": 217,
      "lastUpdated": "2026-02-17T08:40:00Z"
    },
    "guidelines": {
      "source": "Main SFC Website (HTML)",
      "count": 50,
      "withVersionHistory": 32,
      "lastUpdated": "2026-02-17T09:00:00Z"
    }
  }
}
```

---

## 📚 References

- **Research Notes:** `notes/20260217_guidelines_main_website_phase1.md`
- **API Summary:** `findings/GUIDELINES_SUMMARY.md`
- **Comparison:** Guidelines are on main website (scraping), not e-Distribution (API)
- **Related Workflows:**
  - `findings/SFC_FETCH_WORKFLOW.md` (Circulars - API-based)
  - `findings/NEWS_WORKFLOW.md` (News - API-based)
  - `findings/CONSULTATION_WORKFLOW.md` (Consultations - API-based)

---

*Ready for implementation. Estimated initial download: 50 guidelines, ~100-150 PDFs including historical versions.*
