# Auto-Discovery Architecture

**Date:** 2026-04-07
**Status:** Complete
**Category:** System Architecture

---

## Overview

The auto-discovery system automatically discovers all SFC documents via API and queues them for processing on a configurable daily schedule. This eliminates manual document registration and ensures the system stays current with the SFC e-Distribution platform.

### Design Goals

1. **Automatic Enumeration**: Discover all documents across all categories without manual intervention
2. **Idempotent Discovery**: Skip documents already successfully processed (status = COMPLETED)
3. **Comprehensive Coverage**: Handle pagination to enumerate complete document sets
4. **Configurable Scheduling**: Allow flexible cron-based scheduling
5. **Deduplication**: Avoid re-queuing documents currently being processed

---

## Components

### DiscoveryScheduler Service

The `DiscoveryScheduler` is the orchestrating component that runs on a cron schedule and coordinates the discovery process.

```
DiscoveryScheduler
├── CronScheduler (node-cron)
├── CategoryDiscoverers[]
│   ├── CircularsDiscoverer
│   ├── ConsultationsDiscoverer
│   ├── NewsDiscoverer
│   └── GuidelinesDiscoverer
└── JobQueuePublisher
```

#### Responsibilities

- **Schedule Management**: Trigger discovery runs based on cron expression
- **Category Coordination**: Iterate through all configured categories
- **Pagination Handling**: Walk through all pages of API results
- **Deduplication Check**: Query database to skip already-COMPLETED documents
- **Job Publishing**: Add discovered documents to the processing queue
- **Statistics Logging**: Record discovery metrics (found, queued, skipped, errors)

#### Scheduler Configuration

```typescript
interface DiscoverySchedulerConfig {
  enabled: boolean;                    // Toggle discovery on/off
  scheduleCron: string;                 // Cron expression (default: "0 2 * * *")
  categories: string[];                 // Categories to discover
  startYear: number;                   // Earliest year to discover
  pageSize: number;                     // API page size per request
  minRequestIntervalMs: number;        // Throttle between API calls
}
```

#### Discovery Results

```typescript
interface DiscoveryResult {
  category: string;
  discoveredAt: string;                 // ISO timestamp
  totalFound: number;                   // Total documents found in API
  newlyQueued: number;                 // Added to processing queue
  alreadyCompleted: number;           // Skipped (already processed)
  inProgress: number;                  // Skipped (currently processing)
  errors: number;                      // API or other errors
  durationMs: number;                  // Total discovery time
  documentRefs: string[];              // All discovered refNos
}
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DISCOVERY_ENABLED` | `true` | Enable auto-discovery scheduler |
| `DISCOVERY_SCHEDULE_CRON` | `0 2 * * *` | Cron schedule (daily at 2 AM) |
| `DISCOVERY_CATEGORIES` | `circulars,consultations,news,guidelines` | Categories to discover |
| `DISCOVERY_START_YEAR` | `2020` | Earliest year to discover |
| `DISCOVERY_PAGE_SIZE` | `100` | API page size |
| `DISCOVERY_REQUEST_INTERVAL_MS` | `500` | Minimum interval between API requests |

### Cron Expression Examples

| Expression | Meaning |
|------------|---------|
| `0 2 * * *` | Daily at 2:00 AM |
| `0 */6 * * *` | Every 6 hours |
| `0 2 * * 1-5` | Weekdays at 2 AM |
| `30 1 * * *` | Daily at 1:30 AM |

---

## API Endpoints Used

### Circulars

```
POST https://apps.sfc.hk/edistributionWeb/api/circular/search
```

**Key Fields:**
- `refNo` - Reference number (e.g., "26EC6")
- `releasedDate` - Issue date
- `postDocType` - Category code

**Pagination:** `pageNo` (0-based) + `pageSize`, total in response

**Year Range:** 2000-2026

### Consultations

```
POST https://apps.sfc.hk/edistributionWeb/api/consultation/search
```

**Key Fields:**
- `cpRefNo` - Consultation paper reference (e.g., "25CP11")
- `cpIssueDate` - Issue date
- `commentDeadline` - Comment deadline

**Pagination:** `pageNo` (0-based) + `pageSize`, total in response

**Year Range:** 1989-2026

### News

```
POST https://apps.sfc.hk/edistributionWeb/api/news/search
```

**Key Fields:**
- `newsRefNo` - Reference number (e.g., "26PR27")
- `issueDate` - Issue date
- `newsType` - "GN" (General) or "EF" (Enforcement)

**Pagination:** `pageNo` (0-based) + `pageSize`, total in response

**Year Range:** 1996-2026

### Guidelines

**No e-Distribution API exists.** Guidelines are served from the main SFC website.

```
GET https://www.sfc.hk/en/Rules-and-standards/Codes-and-guidelines/Guidelines
```

**Approach:** HTML scraping of table with `data-code-guideline-id` attributes

**Key Fields:**
- `guidelineId` - UUID identifier (not same pattern as other categories)
- `title` - Guideline title
- `effectiveDate` - Effective date
- `pdfUrl` - PDF download URL

**Note:** Guidelines has no API; requires web scraping instead.

---

## Discovery Flow

### Sequence Diagram

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ DiscoveryScheduler│      │  CategoryClient  │      │    Database      │
└────────┬─────────┘      └────────┬─────────┘      └────────┬─────────┘
         │                         │                         │
         │  1. Cron Trigger        │                         │
         │────────────────────────▶│                         │
         │                         │                         │
         │  2. For each category   │                         │
         │────────────────────────▶│                         │
         │                         │                         │
         │                         │  3. API Search (page 0)  │
         │                         │────────────────────────▶│
         │                         │                         │
         │                         │◀────────────────────────│
         │                         │  4. Total count         │
         │                         │                         │
         │                         │  5. Calculate pages     │
         │                         │                         │
         │                         │  6. For each page...    │
         │                         │────────────────────────▶│
         │                         │                         │
         │                         │◀────────────────────────│
         │                         │  7. Page items          │
         │                         │                         │
         │  8. For each item      │                         │
         │────────────────────────▶│                         │
         │                         │  9. Check status       │
         │                         │────────────────────────▶│
         │                         │                         │
         │                         │◀────────────────────────│
         │                         │  10. Status result     │
         │                         │                         │
         │  11. If not COMPLETED   │                         │
         │                         │  12. Add to queue      │
         │                         │────────────────────────▶│
         │                         │                         │
         │                         │◀────────────────────────│
         │                         │  13. Queue confirm     │
         │                         │                         │
         │  14. Log statistics     │                         │
         │                         │                         │
```

### Step-by-Step Process

1. **Scheduler Trigger**
   - Cron job fires at configured time (default: daily 2 AM)
   - Logs start of discovery run with timestamp

2. **Category Iteration**
   - For each category in `DISCOVERY_CATEGORIES`:
     - Initialize category-specific discoverer
     - Begin pagination from page 0

3. **API Pagination Loop**
   - Call search API with `pageNo`, `pageSize`, `lang=EN`
   - Extract `total` from response
   - Calculate total pages: `Math.ceil(total / pageSize)`
   - Iterate through all pages until exhausted

4. **Document Reference Extraction**
   - For each item on page, extract reference number:
     - Circulars: `refNo`
     - Consultations: `cpRefNo`
     - News: `newsRefNo`
     - Guidelines: `guidelineId`

5. **Deduplication Check**
   - Query database for document with this refNo
   - If `workflow.status === 'COMPLETED'`:
     - Skip (already processed)
     - Increment `alreadyCompleted` counter
   - If `workflow.status` is one of `PENDING`, `DISCOVERED`, `DOWNLOADING`, `PROCESSING`, `RETRYING`:
     - Skip (currently being processed)
     - Increment `inProgress` counter
   - Otherwise:
     - Proceed to queue

6. **Queue Publishing**
   - For new/pending documents, add to processing queue
   - Set status to `DISCOVERED` or `PENDING`
   - Increment `newlyQueued` counter

7. **Statistics Logging**
   - Log completion message with all counters
   - Include duration, errors encountered

---

## Discovery State Machine

```
                    ┌─────────────────────────────────────┐
                    │         DISCOVERY_RUN               │
                    └─────────────────────────────────────┘
                                      │
                                      ▼
              ┌───────────────────────────────────────────┐
              │  For each category in DISCOVERY_CATEGORIES │
              └───────────────────────────────────────────┘
                                      │
                                      ▼
              ┌───────────────────────────────────────────┐
              │  While more pages exist                   │
              │  ┌─────────────────────────────────────┐  │
              │  │  API Search (page N)                │  │
              │  └─────────────────────────────────────┘  │
              │              │                           │
              │              ▼                           │
              │  ┌─────────────────────────────────────┐  │
              │  │  For each item on page              │  │
              │  │  ┌─────────────────────────────┐    │  │
              │  │  │  Extract refNo              │    │  │
              │  │  │  Check DB status           │    │  │
              │  │  │  Decision:                  │    │  │
              │  │  │  - COMPLETED → skip        │    │  │
              │  │  │  - IN_PROGRESS → skip      │    │  │
              │  │  │  - OTHER → queue           │    │  │
              │  │  └─────────────────────────────┘    │  │
              │  └─────────────────────────────────────┘  │
              └───────────────────────────────────────────┘
                                      │
                                      ▼
              ┌───────────────────────────────────────────┐
              │  Log statistics                           │
              │  - Total found                            │
              │  - Newly queued                           │
              │  - Already completed                      │
              │  - In progress                            │
              │  - Errors                                 │
              │  - Duration                               │
              └───────────────────────────────────────────┘
```

---

## Deduplication Strategy

### Why Deduplication Matters

1. **Avoid Re-processing**: Documents already successfully converted to markdown should not be re-queued
2. **Queue Efficiency**: Prevent queue bloat from duplicate entries
3. **Cost Savings**: Avoid unnecessary API calls and processing
4. **Consistency**: Ensure document state remains consistent

### Status-Based Filtering

| Document Status | Action | Reason |
|-----------------|--------|--------|
| `PENDING` | Skip | Already queued for processing |
| `DISCOVERED` | Skip | Already discovered, awaiting processing |
| `DOWNLOADING` | Skip | Currently being downloaded |
| `PROCESSING` | Skip | Currently being processed |
| `RETRYING` | Skip | Currently being retried after failure |
| `COMPLETED` | Skip | Successfully processed, no action needed |
| `FAILED` | Queue | Failed previously, should retry |
| `STALE` | Queue | Source may have changed, should re-run |
| Not Found | Queue | New document, first discovery |

### Implementation

```typescript
async function shouldQueueDocument(refNo: string, category: string): Promise<boolean> {
  const doc = await db.collection(category).findOne({ _id: refNo });

  if (!doc) {
    return true; // New document
  }

  const nonQueuedStatuses = ['PENDING', 'DISCOVERED', 'DOWNLOADING', 'PROCESSING', 'RETRYING', 'COMPLETED'];
  if (nonQueuedStatuses.includes(doc.workflow?.status)) {
    return false; // Already in progress or completed
  }

  return true; // Failed, stale, or unknown - should queue
}
```

---

## Known Limitations

### Guidelines API Gap

- **Issue**: Guidelines does not have an e-Distribution API
- **Impact**: Requires web scraping of the main SFC website
- **Mitigation**: Separate `GuidelinesDiscoverer` uses HTML scraping
- **Reference**: Scraping approach documented in `GUIDELINES_SUMMARY.md`

### Pre-2012 Circulars

- **Issue**: Pre-2012 circulars have `html: null` in content API response
- **Impact**: Only PDF available for legacy documents
- **Mitigation**: Fall back to PDF extraction for `hasHtml: false` cases
- **Reference**: Documented in `CIRCULAR_API_SUMMARY.md`

### Pagination Performance

- **Issue**: Large categories (e.g., News with 5000+ items) require many API pages
- **Impact**: Discovery run may take 10+ minutes for full enumeration
- **Mitigation**:
  - Use maximum page size (100) to reduce page count
  - Implement request throttling (500ms between requests)
  - Consider incremental discovery (only recent years)

### Historical Year Discovery

- **Issue**: Full historical discovery from 1989/1996 is time-consuming
- **Impact**: Initial full discovery run takes significant time
- **Mitigation**: `DISCOVERY_START_YEAR` limits discovery to recent years

---

## Integration with Workflow System

### Queue Entry Format

```typescript
interface DiscoveryQueueEntry {
  refNo: string;
  category: 'circulars' | 'consultations' | 'news' | 'guidelines';
  discoveredFrom: 'auto-discovery';
  discoveredAt: string;         // ISO timestamp
  sourceApi: string;            // e.g., "POST /api/circular/search"
  priority: 'normal' | 'high';
  metadata?: {
    year?: number;
    issueDate?: string;
    language?: string;
  };
}
```

### Integration Points

1. **DiscoveryScheduler** → **JobQueue**: Publishes discovered documents
2. **JobQueue** → **ProcessingWorker**: Workers consume and process
3. **ProcessingWorker** → **Database**: Updates document status
4. **Database** → **DiscoveryScheduler**: Status queries for deduplication

---

## Monitoring & Observability

### Discovery Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `discovery.run.duration` | Histogram | Time to complete discovery run |
| `discovery.category.items_found` | Counter | Documents found per category |
| `discovery.category.items_queued` | Counter | Documents queued per category |
| `discovery.category.items_skipped_completed` | Counter | Already-completed documents |
| `discovery.category.items_skipped_in_progress` | Counter | Currently-processing documents |
| `discovery.api.errors` | Counter | API errors encountered |

### Health Checks

```
GET /health/discovery

Response:
{
  "schedulerEnabled": true,
  "lastRunAt": "2026-04-07T02:00:00Z",
  "lastRunDurationMs": 234567,
  "nextScheduledRun": "2026-04-08T02:00:00Z",
  "categories": ["circulars", "consultations", "news", "guidelines"],
  "status": "healthy"
}
```

---

## File Structure

```
sfc-fetch/
├── src/
│   ├── discovery/
│   │   ├── DiscoveryScheduler.ts      # Main scheduler service
│   │   ├── discoverers/
│   │   │   ├── BaseDiscoverer.ts       # Common discovery logic
│   │   │   ├── CircularsDiscoverer.ts
│   │   │   ├── ConsultationsDiscoverer.ts
│   │   │   ├── NewsDiscoverer.ts
│   │   │   └── GuidelinesDiscoverer.ts # Web scraper
│   │   └── types.ts                     # Discovery types
│   └── queue/
│       └── discoveryQueue.ts           # Queue publisher
└── config/
    └── discovery.config.ts             # Configuration loader
```

---

## References

- [auto-discovery-api-summary.md](./auto-discovery-api-summary.md) - API research findings
- [CIRCULAR_API_SUMMARY.md](./CIRCULAR_API_SUMMARY.md) - Circulars API details
- [CONSULTATION_API_SUMMARY.md](./CONSULTATION_API_SUMMARY.md) - Consultations API details
- [NEWS_API_SUMMARY.md](./NEWS_API_SUMMARY.md) - News API details
- [GUIDELINES_SUMMARY.md](./GUIDELINES_SUMMARY.md) - Guidelines scraping approach
