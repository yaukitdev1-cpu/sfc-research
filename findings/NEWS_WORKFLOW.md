# SFC News Fetch Workflow

**Purpose:** Automated SFC news fetching with daily update checking  
**Date:** 2026-02-17  
**Based on:** SFC News API Research (1996-2026)  
**Coverage:** 5,205 news articles, 30 years

---

## 🎯 Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     INITIAL FETCH (One-time)                  │
├─────────────────────────────────────────────────────────────┤
│  1. Fetch all years (1996-2026) via search API                │
│  2. For each news article:                                   │
│     - Download HTML content (convert to Markdown)            │
│     - Download images if any                                 │
│     - Download appendices if any                             │
│  3. Build master index                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     DAILY UPDATE CHECK                        │
├─────────────────────────────────────────────────────────────┤
│  1. Query current year (e.g., 2026) page 0                   │
│  2. Compare with stored index                                │
│  3. Detect new/modified news articles                        │
│  4. Fetch new content                                          │
│  5. Update index                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Key Differences from Circulars/Consultations

| Aspect | News | Circulars | Consultations |
|--------|------|-----------|---------------|
| **Main Content** | HTML only | PDF + HTML (2012+) | PDF + HTML intro |
| **Format Gap** | ❌ None (ALL years) | ✅ 2000-2011: PDF only | ❌ None |
| **Images** | ✅ Yes | ❌ No | ❌ No |
| **External Links** | ✅ `newsExtLink` | ❌ No | ❌ No |
| **Enforcement Targets** | ✅ `targetCeList` | ❌ No | ❌ No |
| **Total Items** | 5,205 | ~700 | 217 |
| **Year Range** | 1996-2026 | 2000-2025 | 1989-2026 |

**Key Insight:** News has the largest dataset (5,205 items) and requires image handling, but has NO PDF main documents.

---

## 📥 Full Download Workflow

### Phase 1: Discovery (All Years)

```javascript
async function discoverAllNews() {
  const allNews = [];
  
  // News spans 1996-2026 (31 years)
  for (let year = 1996; year <= 2026; year++) {
    console.log(`Fetching year ${year}...`);
    
    let pageNo = 0;
    let hasMore = true;
    
    while (hasMore) {
      const response = await newsSearchAPI({
        lang: "EN",
        category: "all",
        year: year,
        pageNo: pageNo,
        pageSize: 100,  // Optimal for news (max 1000)
        sort: { 
          field: "issueDate", 
          order: "desc" 
        }
      });
      
      allNews.push(...response.items);
      
      // Pagination check
      const totalPages = Math.ceil(response.total / 100);
      hasMore = pageNo < totalPages - 1;
      pageNo++;
      
      // Rate limiting - be polite
      await sleep(500);
    }
  }
  
  console.log(`Total news discovered: ${allNews.length}`);
  return allNews;
}
```

**Alternative: Fetch All at Once**

Since news has consistent API across all years:

```javascript
// Fetch all 5,205 items using year="all"
const allNews = [];
let pageNo = 0;
let hasMore = true;

while (hasMore) {
  const response = await newsSearchAPI({
    lang: "EN",
    category: "all",
    year: "all",      // Get all years
    pageNo: pageNo,
    pageSize: 1000,   // Max allowed
    sort: { 
      field: "issueDate", 
      order: "desc" 
    }
  });
  
  allNews.push(...response.items);
  
  const totalPages = Math.ceil(response.total / 1000);
  hasMore = pageNo < totalPages - 1;
  pageNo++;
  
  console.log(`Page ${pageNo}/${totalPages} - ${allNews.length}/${response.total}`);
  await sleep(500);
}

// ~6 pages to get all 5,205 items
```

---

### Phase 2: Content Download

```javascript
async function downloadNewsArticle(news) {
  const { newsRefNo, issueDate, title, newsType, targetCeList } = news;
  const year = new Date(issueDate).getFullYear();
  
  const downloaded = {
    newsRefNo,
    year,
    files: {},
    metadata: {
      title,
      issueDate,
      newsType,           // "GN" or "EF"
      hasExternalLink: !!news.newsExtLink,
      externalLink: news.newsExtLink || null,
      hasTargets: targetCeList && targetCeList.length > 0,
      targetCount: targetCeList?.length || 0,
      targets: targetCeList || []
    }
  };
  
  // 1. Download HTML content (ALL years have HTML!)
  console.log(`  [${newsRefNo}] Downloading HTML...`);
  const content = await newsContentAPI(newsRefNo, "EN");
  
  if (content.html) {
    // Save raw HTML
    const htmlPath = `news/html/${year}/${newsRefNo}.html`;
    await saveFile(htmlPath, content.html);
    downloaded.files.rawHtml = htmlPath;
    
    // Convert to Markdown
    const markdown = newsHtmlToMarkdown(content.html, content.title);
    const mdPath = `news/markdown/${year}/${newsRefNo}.md`;
    await saveFile(mdPath, markdown);
    downloaded.files.markdown = mdPath;
    
    // Extract plain text for search indexing
    const plainText = stripHtml(content.html);
    const txtPath = `news/text/${year}/${newsRefNo}.txt`;
    await saveFile(txtPath, plainText);
    downloaded.files.plainText = txtPath;
    
    // Update metadata
    downloaded.metadata.hasImages = content.imageList && content.imageList.length > 0;
    downloaded.metadata.imageCount = content.imageList?.length || 0;
    downloaded.metadata.hasAppendix = content.appendixDocList && content.appendixDocList.length > 0;
    downloaded.metadata.appendixCount = content.appendixDocList?.length || 0;
    downloaded.metadata.modificationTime = content.modificationTime;
    downloaded.metadata.maskedFooterType = content.maskedFooterType;
  }
  
  // 2. Download images (if any)
  if (content.imageList && content.imageList.length > 0) {
    console.log(`  [${newsRefNo}] Downloading ${content.imageList.length} image(s)...`);
    downloaded.files.images = [];
    
    for (let i = 0; i < content.imageList.length; i++) {
      try {
        const imageBuffer = await newsOpenImageAPI(newsRefNo, i, "EN");
        const imagePath = `news/images/${year}/${newsRefNo}_image_${i}.jpg`;
        await saveFile(imagePath, imageBuffer);
        downloaded.files.images.push({
          index: i,
          caption: content.imageList[i].caption,
          file: imagePath,
          lang: content.imageList[i].lang
        });
      } catch (error) {
        console.error(`    Failed to download image ${i}: ${error.message}`);
        downloaded.errors = downloaded.errors || [];
        downloaded.errors.push({ type: 'image', index: i, error: error.message });
      }
    }
  }
  
  // 3. Download appendices (if any)
  if (content.appendixDocList && content.appendixDocList.length > 0) {
    console.log(`  [${newsRefNo}] Downloading ${content.appendixDocList.length} appendix(es)...`);
    downloaded.files.appendices = [];
    
    for (let i = 0; i < content.appendixDocList.length; i++) {
      try {
        const appendixBuffer = await newsOpenAppendixAPI(newsRefNo, i, "EN");
        const appendixPath = `news/appendix/${year}/${newsRefNo}_appendix_${i}.pdf`;
        await saveFile(appendixPath, appendixBuffer);
        downloaded.files.appendices.push({
          index: i,
          caption: content.appendixDocList[i].caption,
          file: appendixPath,
          fileKeySeq: content.appendixDocList[i].fileKeySeq,
          lang: content.appendixDocList[i].lang
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
async function buildMasterIndex(allNews, allDownloads) {
  const index = {
    generatedAt: new Date().toISOString(),
    totalCount: allNews.length,
    byYear: {},
    byType: {},
    byCategory: {},
    hasImages: 0,
    hasAppendices: 0,
    hasExternalLinks: 0,
    enforcementNews: 0,
    news: {}
  };
  
  for (const news of allNews) {
    const year = new Date(news.issueDate).getFullYear();
    const download = allDownloads.find(d => d.newsRefNo === news.newsRefNo);
    const meta = download?.metadata || {};
    
    // Build entry
    index.news[news.newsRefNo] = {
      newsRefNo: news.newsRefNo,
      title: news.title,
      issueDate: news.issueDate,
      year: year,
      lang: news.lang,
      newsType: news.newsType,              // "GN" or "EF"
      category: news.category || "all",
      hasHtml: !!download?.files?.rawHtml,
      hasMarkdown: !!download?.files?.markdown,
      hasPlainText: !!download?.files?.plainText,
      hasImages: meta.hasImages || false,
      imageCount: meta.imageCount || 0,
      hasAppendix: meta.hasAppendix || false,
      appendixCount: meta.appendixCount || 0,
      hasExternalLink: meta.hasExternalLink || false,
      externalLink: meta.externalLink || null,
      isEnforcement: news.newsType === "EF",
      targetCeList: meta.targets || [],
      maskedFooterType: meta.maskedFooterType || null,
      modificationTime: meta.modificationTime || null,
      files: download?.files || {},
      errors: download?.errors || [],
      lastFetched: new Date().toISOString()
    };
    
    // Aggregate by year
    if (!index.byYear[year]) {
      index.byYear[year] = { count: 0, news: [] };
    }
    index.byYear[year].count++;
    index.byYear[year].news.push(news.newsRefNo);
    
    // Aggregate by type (GN/EF)
    const type = news.newsType;
    if (!index.byType[type]) {
      index.byType[type] = { 
        count: 0, 
        name: type === "GN" ? "General News" : "Enforcement News" 
      };
    }
    index.byType[type].count++;
    
    // Count special features
    if (meta.hasImages) index.hasImages++;
    if (meta.hasAppendix) index.hasAppendices++;
    if (meta.hasExternalLink) index.hasExternalLinks++;
    if (news.newsType === "EF") index.enforcementNews++;
  }
  
  return index;
}
```

---

## 🔄 Daily Update Check Workflow

### Strategy: Check Current Year Only

News is published continuously, so check current year daily.

```javascript
async function checkForNewsUpdates() {
  const currentYear = new Date().getFullYear();
  const index = await loadIndex();
  const lastCheck = await loadLastCheck();
  
  console.log(`Checking for news updates in ${currentYear}...`);
  console.log(`Last check: ${lastCheck?.timestamp || 'Never'}`);
  
  const updates = {
    new: [],
    modified: [],
    timestamp: new Date().toISOString()
  };
  
  // Fetch current year page 0 (most recent)
  const recentResponse = await newsSearchAPI({
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
  
  // Check each news article
  for (const news of recentResponse.items) {
    const existing = index.news[news.newsRefNo];
    
    if (!existing) {
      // NEW news article
      console.log(`  🆕 NEW: ${news.newsRefNo} - ${news.title.substring(0, 60)}...`);
      updates.new.push(news);
      
      // Download immediately
      const downloaded = await downloadNewsArticle(news);
      await updateIndexWithNews(downloaded);
      
    } else if (existing.modificationTime !== news.modificationTime) {
      // MODIFIED (content updated)
      console.log(`  ✏️  MODIFIED: ${news.newsRefNo}`);
      updates.modified.push({
        newsRefNo: news.newsRefNo,
        oldModificationTime: existing.modificationTime,
        newModificationTime: news.modificationTime
      });
      
      // Re-download
      const downloaded = await downloadNewsArticle(news);
      await updateIndexWithNews(downloaded);
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

News HTML is simpler than circulars (no ordered list structure like circulars):

```javascript
function newsHtmlToMarkdown(html, title) {
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  
  let markdown = '';
  
  // Add title as H1
  if (title) {
    markdown += `# ${title}\n\n`;
  }
  
  // Process all elements in order
  $('body > *').each((i, elem) => {
    const tag = elem.tagName.toLowerCase();
    
    switch (tag) {
      case 'p':
        let paraText = $(elem).html()
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<em>(.*?)<\/em>/gi, '*$1*')
          .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
          .replace(/&nbsp;/g, ' ')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        
        // Strip remaining HTML
        paraText = paraText.replace(/<[^>]+>/g, '');
        
        if (paraText.trim()) {
          markdown += paraText.trim() + '\n\n';
        }
        break;
        
      case 'ol':
        $(elem).find('li').each((j, li) => {
          let liText = $(li).text().trim();
          if (liText) {
            markdown += `${j + 1}. ${liText}\n`;
          }
        });
        markdown += '\n';
        break;
        
      case 'ul':
        $(elem).find('li').each((j, li) => {
          let liText = $(li).text().trim();
          if (liText) {
            markdown += `- ${liText}\n`;
          }
        });
        markdown += '\n';
        break;
        
      case 'h1':
      case 'h2':
      case 'h3':
        const level = parseInt(tag[1]);
        const hashes = '#'.repeat(level);
        markdown += `${hashes} ${$(elem).text().trim()}\n\n`;
        break;
    }
  });
  
  return markdown.trim();
}
```

---

## 📁 Storage Structure

```
data/news/
├── html/
│   ├── 1996/
│   │   └── 091296.html
│   ├── 1997/
│   ├── ...
│   ├── 2000/
│   ├── ...
│   └── 2026/
│       └── 26PR27.html
├── markdown/
│   ├── 1996/
│   │   └── 091296.md
│   └── ...
├── text/
│   ├── 1996/
│   │   └── 091296.txt
│   └── ...
├── images/
│   ├── 2024/
│   │   ├── 24PR218_image_0.jpg
│   │   └── 24PR218_image_1.jpg
│   └── ...
├── appendix/
│   ├── 2015/
│   │   └── 15PR128_appendix_0.pdf
│   ├── 2023/
│   │   └── 23PR100_appendix_0.pdf
│   └── ...
├── index.json              # Master index with all metadata
├── last-check.json         # Last update check timestamp
└── progress.json           # Download progress tracking
```

---

## 🧩 API Client Functions

```javascript
// Search API
async function newsSearchAPI(params) {
  const response = await fetch(
    'https://apps.sfc.hk/edistributionWeb/api/news/search',
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

// Content API
async function newsContentAPI(refNo, lang = 'EN') {
  const response = await fetch(
    `https://apps.sfc.hk/edistributionWeb/api/news/content?refNo=${refNo}&lang=${lang}`
  );
  
  if (response.status === 404) {
    return null; // News not found
  }
  
  if (!response.ok) {
    throw new Error(`Content API error: ${response.status}`);
  }
  
  return await response.json();
}

// Notification API (bilingual)
async function newsNotificationAPI(refNo) {
  const response = await fetch(
    `https://apps.sfc.hk/edistributionWeb/api/news/notification?refNo=${refNo}`
  );
  
  if (!response.ok) {
    throw new Error(`Notification API error: ${response.status}`);
  }
  
  return await response.json();
}

// Image download API
async function newsOpenImageAPI(refNo, index, lang = 'EN') {
  const response = await fetch(
    `https://apps.sfc.hk/edistributionWeb/api/news/openImage?refNo=${refNo}&lang=${lang}&image=${index}`
  );
  
  if (!response.ok) {
    throw new Error(`Image API error: ${response.status}`);
  }
  
  return await response.arrayBuffer();
}

// Appendix download API
async function newsOpenAppendixAPI(refNo, index, lang = 'EN') {
  const response = await fetch(
    `https://apps.sfc.hk/edistributionWeb/api/news/openAppendix?lang=${lang}&refNo=${refNo}&appendix=${index}`
  );
  
  if (!response.ok) {
    throw new Error(`Appendix API error: ${response.status}`);
  }
  
  return await response.arrayBuffer();
}
```

---

## 📊 Progress Tracking

```javascript
// During full download
const progress = {
  totalYears: 31,           // 1996-2026
  currentYear: 2026,
  totalNews: 5205,          // Total expected
  processedNews: 0,
  downloadedHtml: 0,
  downloadedMarkdown: 0,
  downloadedImages: 0,
  downloadedAppendices: 0,
  errors: [],
  startTime: new Date().toISOString(),
  estimatedEndTime: null
};

// Save progress periodically
const progressInterval = setInterval(async () => {
  progress.estimatedEndTime = calculateETA(progress);
  await saveProgress(progress);
  
  const percent = ((progress.processedNews / progress.totalNews) * 100).toFixed(1);
  console.log(`Progress: ${progress.processedNews}/${progress.totalNews} (${percent}%)`);
}, 60000); // Every minute
```

---

## 📝 Daily Check Summary Report

```
═══════════════════════════════════════════════════════════
SFC News Daily Check - 2026-02-17 10:30:00 UTC
═══════════════════════════════════════════════════════════

Checked: Year 2026 (page 0)
News examined: 48

Results:
--------
🆕 New news articles: 3
   ├─ 26PR28: SFC warns against fraudulent... [GN]
   ├─ 26PR29: Disciplinary action against... [EF]
   └─ 26PR30: New guidelines published... [GN]

✏️  Modified articles: 1
   └─ 26PR15: Updated contact information

Statistics:
-----------
Total news in database: 5,208
Images downloaded: 2
Appendices downloaded: 0

Next check: 2026-02-18 10:30:00 UTC
═══════════════════════════════════════════════════════════
```

---

## 🎓 Best Practices & Lessons Learned

### 1. Always Include `lang` Parameter
```javascript
// ❌ BAD - Will cause HTTP 500
{}

// ✅ GOOD
{ lang: "EN", pageNo: 0 }
```

### 2. Handle Images Properly
- News articles can have 0-N images
- Image captions may contain important context
- Save image metadata (caption, language)

### 3. External Links
- Some news has `newsExtLink` to external SFC pages
- These should be preserved in metadata

### 4. Enforcement News Special Handling
- `newsType: "EF"` = Enforcement news
- Has `targetCeList` with affected entities
- May be important for compliance tracking

### 5. Rate Limiting
- No formal rate limiting detected
- Use 500ms delay between requests
- Use pageSize=100 for bulk, pageSize=1000 for initial full fetch

### 6. Error Resilience
- Images and appendices may fail (handle gracefully)
- Some news may not have HTML (rare, but possible)
- Always check `response.ok` before parsing JSON

---

## 🔍 Common Issues & Solutions

### Issue 1: Empty HTML Content
**Cause:** Very old news or system migration artifacts  
**Solution:** Check for empty/whitespace-only HTML, flag in index

### Issue 2: Image Download Fails
**Cause:** Image may have been removed or URL changed  
**Solution:** Catch errors, continue with other assets, log for manual review

### Issue 3: Appendix Has No fileKeySeq
**Cause:** Some appendices have null fileKeySeq but are still downloadable  
**Solution:** Try download anyway, rely on `caption` for identification

---

## 📚 References

- **API Documentation:** `findings/NEWS_API_SUMMARY.md`
- **Edge Case Testing:** `notes/20260217_news_phase6_edge_cases.md`
- **Research Notes:** `notes/20260217_news_phase1_reconnaissance.md`
- **Research Notes:** `notes/20260217_news_phase2_endpoint_analysis.md`

---

## ✅ Checklist for Implementation

- [ ] Implement search API with pagination
- [ ] Implement content API with HTML extraction
- [ ] Implement image download with caption preservation
- [ ] Implement appendix download
- [ ] Add HTML → Markdown conversion
- [ ] Add HTML → Plain text extraction
- [ ] Build index with all metadata
- [ ] Implement daily update check
- [ ] Add progress tracking
- [ ] Add error handling and retry logic
- [ ] Add notification system
- [ ] Test with oldest news (1996)
- [ ] Test with enforcement news (targetCeList)
- [ ] Test with news containing images
- [ ] Test with news containing appendices

---

*Ready for implementation*  
*Estimated initial download: ~5,205 articles, ~30-60 minutes*  
*Estimated storage: ~100-200MB (mostly text/HTML)*
