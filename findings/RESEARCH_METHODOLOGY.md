# SFC Research Methodology

> Systematic approach for investigating SFC e-Distribution APIs and document structures.

**Based on:** SFC Circular Research (2026-02-16)  
**Objective:** Replicable technique for researching other SFC categories (News, Consultations, Guidelines, etc.)

---

## 🔬 Research Technique Summary

### Phase 1: Initial Reconnaissance (15-30 min)

**Goal:** Understand the website structure and identify if it's a static site or dynamic application.

**Steps:**

1. **Direct HTTP Test**
   ```bash
   curl -s "https://apps.sfc.hk/edistributionWeb/gateway/EN/{category}/" | head -50
   ```
   
   **What to look for:**
   - If returns full HTML with content → Static site (easier to scrape)
   - If returns empty `<div id="root">` or `<noscript>` → React/SPA (need browser inspection)
   - Look for JavaScript bundles in HTML

2. **Check for Public APIs**
   ```bash
   # Common API patterns to test
   curl -s "https://apps.sfc.hk/edistributionWeb/api/{category}"
   curl -s "https://apps.sfc.hk/edistributionWeb/api/{category}/list"
   curl -s "https://apps.sfc.hk/edistributionWeb/api/v1/{category}"
   ```
   
3. **Inspect JavaScript Bundles**
   ```bash
   # Download main JS file and grep for API endpoints
   curl -s "https://apps.sfc.hk/edistributionWeb/static/js/main.xxx.chunk.js" | \
     grep -oE "/api/[^\"'\s]+" | sort | uniq
   ```

**Deliverable:** Initial assessment report - SPA vs Static, potential API patterns

---

### Phase 2: Browser-Based API Discovery (30-60 min)

**Goal:** Capture actual API calls made by the web application using headless browser.

**Tools:** Playwright (or Puppeteer)

**Script Template:**

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture ALL API calls
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/')) {
      console.log(`[REQUEST] ${request.method()} ${url}`);
      console.log(`  Body: ${request.postData() || 'none'}`);
    }
  });
  
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/')) {
      console.log(`\n[RESPONSE] ${response.status()} ${url}`);
      try {
        const body = await response.json();
        console.log(JSON.stringify(body, null, 2).substring(0, 1000));
      } catch (e) {}
    }
  });
  
  // Load the page and wait
  await page.goto('https://apps.sfc.hk/edistributionWeb/gateway/EN/{category}/', {
    waitUntil: 'networkidle'
  });
  
  // Wait for lazy loading
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
```

**Key Actions:**
1. Load main listing page → Capture search/list API
2. Click on single item → Capture detail/content API
3. Click download links → Capture file download API
4. Navigate pagination → Capture pagination pattern

**Deliverable:** Complete list of API endpoints with request/response examples

---

### Phase 3: Endpoint Analysis & Documentation (30-45 min)

**Goal:** Systematically test and document each discovered endpoint.

**Template for Each Endpoint:**

```markdown
## Endpoint: {METHOD} {URL}

### Request
- **Method:** POST/GET
- **URL Pattern:** /api/{category}/{action}
- **Parameters:**
  - `param1` (type): Description
  - `param2` (type): Description

### Request Body Example (POST)
```json
{
  "lang": "EN",
  "pageNo": 0,
  "pageSize": 20
}
```

### Response Structure
```json
{
  "field1": "type - description",
  "field2": "type - description"
}
```

### Test Commands
```bash
# Test request
curl -X {METHOD} "{URL}" -H "Content-Type: application/json" -d '{...}'
```
```

**Steps:**
1. **Test with minimal parameters** → What is required vs optional?
2. **Test pagination** → How does `pageNo`, `pageSize`, `total` work?
3. **Test filtering** → What filter parameters exist?
4. **Test sorting** → What `sort.field` and `sort.order` options?
5. **Test languages** → EN/TC/SC support?

**Deliverable:** Endpoint documentation with examples

---

### Phase 4: Historical Coverage Testing (30-45 min)

**Goal:** Determine how far back the API provides data and what formats are available.

**Testing Strategy:**

```bash
# Test different years
for year in 2025 2020 2015 2010 2005 2000 1995; do
  echo "=== Year $year ==="
  curl -s -X POST "{search_api}" \
    -H "Content-Type: application/json" \
    -d "{\"lang\":\"EN\",\"year\":$year,\"pageNo\":0,\"pageSize\":5}" | \
    python3 -c "import sys,json;d=json.load(sys.stdin);print(f'Total: {d.get(\"total\",\"N/A\")}')"
done
```

**What to Document:**

| Year | Total Items | Has Content | Format | Notes |
|------|-------------|-------------|--------|-------|
| 2025 | 48 | ✅ | HTML+PDF | Full data |
| 2010 | 31 | ❌ | PDF only | Content API returns null |

**Look for:**
- Content format changes over time
- Reference number format changes (e.g., H### → YYEC##)
- When full structured data becomes available
- Legacy data limitations

**Deliverable:** Historical coverage matrix with format breakdown

---

### Phase 5: Content & File Access Testing (45-60 min)

**Goal:** Understand how to access full document content and downloads.

**Testing Approach:**

1. **Content API Testing**
   ```bash
   curl -s "{content_api}?refNo={ref}&lang=EN" | python3 -m json.tool
   ```
   - Check if `html` field exists and has content
   - Check if `pdfUrl` or `fileKeySeq` provided
   - Check for `appendixDocList`

2. **Download URL Testing**
   ```bash
   # Test various download patterns
   curl -sI "{download_api}/{fileKeySeq}"
   curl -sI "{openFile_api}?refNo={ref}"
   curl -sI "{gateway_url}/openFile?refNo={ref}"
   ```
   
   **Check headers:**
   - `Content-Type: application/pdf` → Direct PDF
   - `Content-Type: text/html` → SPA shell (need browser)

3. **Appendix Testing**
   ```bash
   # If search API returns appendixDocList
   curl -sI "{appendix_api}?refNo={ref}&appendix=0&lang=EN"
   ```

**Browser Inspection for Hidden Downloads:**

```javascript
// If openFile returns HTML shell, check for download links
const downloadLinks = await page.locator('a', { 
  hasText: /download|pdf/i 
}).all();

for (const link of downloadLinks) {
  const href = await link.getAttribute('href');
  console.log('Download link:', href);
  // Click and capture resulting API call
}
```

**Deliverable:** Complete file access documentation with working URLs

---

### Phase 6: Edge Case & Error Handling (30 min)

**Goal:** Understand API behavior under various conditions.

**Tests:**

1. **Invalid Parameters**
   ```bash
   curl -s "{api}?refNo=INVALID"  # Non-existent ref
   curl -s "{api}?year=1990"       # Year out of range
   curl -s "{api}?lang=FR"        # Unsupported language
   ```

2. **Rate Limiting**
   ```bash
   # Send 10 rapid requests, check for 429 errors
   for i in {1..10}; do
     curl -s "{api}"
   done
   ```

3. **Large Pagination**
   ```bash
   # Test max pageSize
   curl -s -X POST "{api}" -d '{"pageSize": 1000}'
   ```

**Deliverable:** Error response patterns and rate limiting notes

---

### Phase 7: Synthesis & Documentation (60 min)

**Goal:** Compile findings into actionable documentation.

**Required Deliverables:**

1. **API Summary Document**
   - All endpoints with examples
   - Request/response schemas
   - Authentication requirements (if any)

2. **Workflow Guide**
   - How to fetch all data
   - How to check for updates
   - Data transformation steps

3. **Architecture Diagram**
   - System flow
   - Data storage structure

4. **Implementation Notes**
   - Gotchas and edge cases
   - Recommended approach
   - Sample code snippets

---

## 📋 Research Checklist

### Discovery Phase
- [ ] Initial HTTP test completed
- [ ] Browser API capture completed
- [ ] All endpoints identified

### Analysis Phase  
- [ ] Each endpoint tested individually
- [ ] Pagination understood
- [ ] Filtering/sorting options documented
- [ ] Language support confirmed

### Historical Phase
- [ ] Tested years: 2000, 2005, 2010, 2015, 2020, 2025
- [ ] Content format changes identified
- [ ] Reference number patterns noted
- [ ] Coverage gaps documented

### Content Phase
- [ ] Content API tested
- [ ] Download URLs working
- [ ] Appendix handling confirmed
- [ ] File formats identified (HTML, PDF, etc.)

### Edge Cases
- [ ] Error responses documented
- [ ] Rate limiting tested
- [ ] Invalid parameter handling noted

### Documentation
- [ ] API summary written
- [ ] Workflow guide created
- [ ] Architecture diagram drawn
- [ ] Implementation notes added

---

## 🎯 Key Principles

1. **Start Simple** → Begin with curl, escalate to browser only if needed
2. **Capture Everything** → Log all API calls, you never know what's important
3. **Test Systematically** → Methodical year-by-year, endpoint-by-endpoint testing
4. **Follow the Links** → If you find a download link, click it and capture what happens
5. **Document Immediately** → Write findings as you go, not at the end
6. **Prove Negatives** → If something "doesn't work," prove it with multiple approaches

---

## 🛠️ Essential Tools

| Tool | Purpose |
|------|---------|
| `curl` | Quick HTTP testing |
| `python3 -m json.tool` | Pretty-print JSON |
| Playwright | Browser automation for SPA inspection |
| `grep`, `awk` | Log analysis |
| Git | Version control for findings |

---

## 📚 Example Research Output Structure

```
research-output/
├── notes/
│   ├── YYYYMMDD_initial_assessment.md
│   ├── YYYYMMDD_api_discovery.md
│   ├── YYYYMMDD_historical_testing.md
│   └── YYYYMMDD_edge_cases.md
├── findings/
│   ├── API_SUMMARY.md
│   ├── WORKFLOW_GUIDE.md
│   └── ARCHITECTURE.md
└── progress/
    ├── todo.md
    ├── completed.md
    └── decisions.md
```

---

## 🚀 Ready to Apply

This methodology was successfully used to:
- Discover 4 SFC Circular APIs
- Uncover full 2000-2025 coverage
- Identify PDF access for legacy data
- Document complete implementation workflow

**Apply this same technique to:**
- SFC News API
- SFC Consultations API  
- SFC Codes
- Any other SFC e-Distribution category

---

*Methodology version 1.0 - Based on SFC Circular Research*
