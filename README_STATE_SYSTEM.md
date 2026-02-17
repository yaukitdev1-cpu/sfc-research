# SFC-Fetch: State-Managed Resumable Workflow System

> A robust document processing system with SQLite-based state management, supporting stop/resume capability and per-document retry logic for handling edge cases.

## 🎯 Problem Statement

The SFC document processing involves four distinct workflows:
1. **Guidelines** - HTML scraping from main website (50 guidelines, version history)
2. **Circulars** - API-based (700 documents, 2000-2026, PDF + HTML)
3. **Consultations** - API-based (217 documents, 1989-2026, consultation + conclusion papers)
4. **News** - API-based (5,205 articles, 1996-2026, HTML + images)

**Challenges:**
- Long-running processes that may need to be interrupted
- Network failures and API errors requiring retry
- Edge cases that need manual intervention before retry
- Need to process documents atomically (one at a time)
- Must track state at sub-workflow step level

## 💡 Solution: SQLite State Management

We use **SQLite** (with JSON1 extension) as a lightweight, embedded NoSQL-like database to track:
- **Workflow state** - Overall progress and status
- **Document state** - Individual document processing status
- **Sub-workflow state** - Each step within a document
- **Retry scheduling** - When and why to retry

### Key Benefits

✅ **Stop/Resume Anytime** - Each document tracked individually  
✅ **Per-Document Retry** - Failed docs can be retried after fixes  
✅ **Atomic Processing** - One document at a time with full rollback  
✅ **Sub-Workflow Tracking** - Know exactly which step failed  
✅ **No Server Required** - SQLite is embedded, zero setup  
✅ **ACID Compliant** - Transaction safety for all state changes  

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Workflow Manager                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Guidelines │  │  Circulars  │  │Consultations│  │  News      │
│  │  Workflow   │  │  Workflow   │  │  Workflow   │  │ Workflow   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────┬─────┘
│         │                │                │               │
│         └────────────────┴────────────────┴───────────────┘
│                           │
│                    ┌────────▼────────┐
│                    │  Step Executor  │
│                    │  with Retry     │
│                    └────────┬────────┘
│                             │
│                    ┌────────▼────────┐
│                    │  State Manager  │
│                    │  (SQLite DB)    │
│                    └────────┬────────┘
│                             │
│                    ┌────────▼────────┐
│                    │   SQLite DB     │
│                    │  sfc-fetch.db   │
│                    └─────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Database Schema

### Core Tables

```sql
-- Workflows: One row per workflow run
workflows (id, workflow_type, status, mode, config, stats, ...)

-- Documents: One row per document (50 guidelines, 700 circulars, etc.)
documents (
  id, workflow_id, workflow_type, document_ref, status,
  metadata (JSON), subworkflow_state (JSON),
  current_step, retry_count, last_error,
  discovered_at, started_at, completed_at,
  output_files (JSON), retry_after, retry_reason
)

-- Subworkflow Steps: Detailed step tracking
subworkflow_steps (
  id, document_id, step_name, status,
  input_data (JSON), output_data (JSON), error_data (JSON),
  started_at, completed_at, duration_ms,
  retry_count, max_retries
)

-- System State: Pause/resume checkpoints
system_state (key, value (JSON), updated_at)
```

## 🔄 Sub-Workflow Definitions

Each document type has a defined sequence of steps:

### Circulars Sub-Workflow (10 steps)

```
1. search_api              → Discover circulars via API
2. paginate_results        → Handle pagination
3. fetch_content_api       → Get metadata
4. download_main_pdf       → Download PDF (✅ always works)
5. download_html_content  → Get HTML (⏭️ 2012+ only)
6. convert_to_markdown     → Convert HTML (⏭️ if HTML exists)
7. download_appendices     → Get appendices (⏭️ if any)
8. extract_plain_text      → For search indexing
9. save_metadata           → Write metadata JSON
10. update_index           → Update master index
```

**Key Features:**
- **Conditional steps**: Step 5-8 only run for modern circulars (2012+)
- **Dependencies**: Each step declares dependencies
- **Retry limits**: PDF downloads get 5 retries, HTML conversion gets 2
- **Timeouts**: PDF downloads timeout at 60s, HTML at 30s

### Other Workflows

- **Guidelines**: 8 steps (HTML scraping focused)
- **Consultations**: 8 steps (consultation + conclusion papers)
- **News**: 10 steps (HTML + images + appendices)

## 🎛️ State Machine

```
Document States:

pending ──► discovered ──► downloading ──► processing ──► completed
   │                                              │
   │                                              ▼
   └─────────────────────────────────────────► failed
                                                   │
                                                   ▼
                                            retry_scheduled
                                                   │
                                                   └──► downloading (retry)
```

### State Transitions

| From | To | Trigger |
|------|-----|---------|
| `pending` | `discovered` | Found in search/scrape |
| `discovered` | `downloading` | Download started |
| `downloading` | `processing` | Download complete |
| `processing` | `completed` | All steps successful |
| `processing` | `failed` | Any step fails |
| `failed` | `retry_scheduled` | User schedules retry |
| `retry_scheduled` | `downloading` | Retry initiated |
| `any` | `paused` | User pause command |

## 🔄 Retry Logic

### Exponential Backoff

```javascript
// delay = baseDelay * (2 ^ attempt)
Attempt 1: 1000ms   (1 second)
Attempt 2: 2000ms   (2 seconds)
Attempt 3: 4000ms   (4 seconds)
Attempt 4: 8000ms   (8 seconds)
Attempt 5: 16000ms  (16 seconds) - max reached
```

### Retriable vs Non-Retriable Errors

**Retriable (auto-retry):**
- HTTP 408 (Timeout)
- HTTP 429 (Rate limited)
- HTTP 500/502/503/504 (Server errors)
- Network timeouts
- Connection reset

**Non-Retriable (fail immediately):**
- DNS lookup failed (ENOTFOUND)
- Permission denied (EACCES)
- Parse errors (data format changed)
- Validation errors

### Retry Configuration by Step

```json
{
  "download_main_pdf": {
    "max_retries": 5,
    "timeout_ms": 60000,
    "critical": true
  },
  "convert_to_markdown": {
    "max_retries": 2,
    "timeout_ms": 10000,
    "critical": false
  },
  "download_images": {
    "max_retries": 5,
    "timeout_ms": 120000,
    "continue_on_error": true  // Don't fail entire doc if images fail
  }
}
```

## 🚀 Usage Examples

### 1. Start a New Workflow

```bash
# Initialize database
node workflow-cli.js init

# Start circulars workflow
node workflow-cli.js start circulars

# Output:
# ✅ Created circulars workflow #1
# 🚀 Started workflow #1
# 📋 Executing Circulars Workflow #1
#    Mode: full_download
#    Years: 2026
# 🔍 Discovering circulars...
#   Fetching year 2026...
# ✅ Discovered 48 circulars
# 📄 Processing 26EC6: Circular to Licensed Corporations...
#    🔄 Step search_api (attempt 1/4)
#    ✅ Step search_api completed (234ms)
#    🔄 Step fetch_content_api (attempt 1/4)
#    ✅ Step fetch_content_api completed (567ms)
#    🔄 Step download_main_pdf (attempt 1/6)
#    ✅ Step download_main_pdf completed (2341ms)
#    ...
#    ✅ Completed 26EC6
```

### 2. Pause and Resume

```bash
# While workflow is running, in another terminal:
node workflow-cli.js pause 1

# Output:
# ⏸️  Paused workflow #1 at document 26EC15 (step: download_main_pdf)

# Resume later:
node workflow-cli.js resume 1

# Output:
# ▶️  Resuming workflow #1 from document 26EC15
# 🔄 Step download_main_pdf (attempt 1/6)
# ...
```

### 3. Retry Failed Documents

```bash
# Check status
node workflow-cli.js status 1

# Output:
# 📊 Progress: 87.5% (42/48)
#    Pending: 0, Downloading: 1, Processing: 2
#    Failed: 3, Retry Scheduled: 0

# View failed documents
node workflow-cli.js failed 1

# Output:
# ┌─────────┬────────────┬────────────────────────────────────────┐
# │ doc_ref │ error      │ failed_steps                           │
# ├─────────┼────────────┼────────────────────────────────────────┤
# │ 26EC45  │ timeout    │ download_main_pdf                      │
# │ 26EC46  │ 500 error  │ fetch_content_api                      │
# │ 26EC47  │ parse error│ convert_to_markdown                    │
# └─────────┴────────────┴────────────────────────────────────────┘

# Fix the code (e.g., increase timeout, handle new HTML format)
# Then retry all failed:
node workflow-cli.js retry-all 1

# Or retry specific document:
node workflow-cli.js retry 45
```

## 📈 Monitoring & Reporting

### Real-Time Progress

```sql
-- Workflow progress view
SELECT 
    workflow_type,
    completion_percentage,
    total_docs,
    completed,
    failed,
    pending
FROM workflow_progress
WHERE workflow_id = 1;
```

### Failed Document Analysis

```sql
-- Get all failures with error details
SELECT 
    document_ref,
    title,
    retry_count,
    last_error,
    failed_steps
FROM failed_documents
WHERE workflow_id = 1
ORDER BY error_timestamp DESC;
```

### Step Performance

```sql
-- Step completion statistics
SELECT 
    step_name,
    completed,
    failed,
    avg_duration_ms
FROM step_statistics
WHERE workflow_id = 1;
```

## 🛠️ Implementation Checklist

### Phase 1: Core Infrastructure
- [x] Database schema design
- [x] Schema SQL file
- [x] Database connection manager
- [ ] Migration system
- [ ] Unit tests for DB layer

### Phase 2: Workflow Engine
- [x] Base workflow class
- [x] Workflow manager
- [x] State machine implementation
- [x] Pause/resume logic
- [ ] Step dependency resolver
- [ ] Parallel step execution (where safe)

### Phase 3: Step Execution
- [x] Step executor engine
- [x] Retry logic with exponential backoff
- [x] Error classification
- [ ] Step handlers for each workflow type
- [ ] Condition evaluation

### Phase 4: API Integration
- [ ] Circulars API client
- [ ] Consultations API client
- [ ] News API client
- [ ] Guidelines HTML scraper
- [ ] Rate limiting
- [ ] Circuit breaker for failures

### Phase 5: CLI & Monitoring
- [x] CLI interface
- [x] Start/pause/resume commands
- [x] Retry commands
- [x] Status reporting
- [ ] Progress bars
- [ ] Log aggregation
- [ ] Metrics export (Prometheus)

### Phase 6: Edge Case Handling
- [ ] Network failure simulation tests
- [ ] Partial download handling
- [ ] Corrupt file detection
- [ ] API schema change detection
- [ ] Manual intervention workflows

## 📚 File Structure

```
sfc-research/
├── findings/
│   ├── GUIDELINES_WORKFLOW.md      # Guidelines workflow docs
│   ├── CIRCULAR_WORKFLOW.md        # Circulars workflow docs
│   ├── CONSULTATION_WORKFLOW.md   # Consultations workflow docs
│   ├── NEWS_WORKFLOW.md            # News workflow docs
│   ├── GUIDELINES_SUMMARY.md       # Guidelines API summary
│   ├── CIRCULAR_API_SUMMARY.md     # Circulars API summary
│   ├── CONSULTATION_API_SUMMARY.md # Consultations API summary
│   ├── NEWS_API_SUMMARY.md         # News API summary
│   └── RESEARCH_METHODOLOGY.md     # Research methodology
│
├── STATE_MANAGED_WORKFLOW_SYSTEM.md # This system design
├── schema.sql                       # SQLite schema
├── workflow-cli.js                  # CLI implementation example
└── README.md                        # This file
```

## 🔧 Configuration

### Database Configuration

```json
{
  "database": {
    "path": "./data/sfc-fetch.db",
    "busy_timeout": 5000,
    "journal_mode": "WAL"
  }
}
```

### Workflow Configuration

```json
{
  "workflows": {
    "circulars": {
      "enabled": true,
      "concurrency": 1,
      "rate_limit": {
        "requests_per_second": 2,
        "delay_ms": 500
      },
      "retry": {
        "max_retries": 3,
        "base_delay_ms": 1000,
        "max_delay_ms": 30000
      }
    }
  }
}
```

## 🎓 Best Practices

### 1. Always Process One Document at a Time

This ensures:
- Clean state tracking
- Easy debugging
- Safe interruption
- Clear error attribution

### 2. Use Transactions for State Updates

```javascript
await db.run('BEGIN TRANSACTION');
try {
  await updateDocumentStatus(docId, 'completed');
  await updateStepStatus(stepId, 'completed');
  await db.run('COMMIT');
} catch (error) {
  await db.run('ROLLBACK');
  throw error;
}
```

### 3. Log Everything

- Document discovery
- Step start/completion
- Retry attempts
- State transitions
- Errors with full context

### 4. Test Edge Cases

- Network failures at each step
- API returning 500 errors
- Partial file downloads
- Disk full scenarios
- Process interruption at each state

## 🚨 Handling Edge Cases

### Case 1: Network Failure During PDF Download

```
Step: download_main_pdf
Attempt 1: HTTP 500 → Retry in 1s
Attempt 2: HTTP 503 → Retry in 2s
Attempt 3: HTTP 502 → Retry in 4s
Attempt 4: HTTP 504 → Retry in 8s
Attempt 5: Connection timeout → Retry in 16s
Attempt 6: Success! ✅
```

### Case 2: HTML Format Changed (Parse Error)

```
Step: convert_to_markdown
Attempt 1: Parse error (non-retriable)
Status: FAILED
Error: "Unexpected HTML structure"
Action: Manual fix required

# Fix the converter code
# Then retry:
node workflow-cli.js retry 42
```

### Case 3: Large Appendix Download Timeout

```
Step: download_appendices
Attempt 1: Timeout after 60s
Attempt 2: Timeout after 60s (with 2s backoff)
Attempt 3: Success! ✅
```

### Case 4: User Interruption

```
# User presses Ctrl+C or runs pause command
Workflow: PAUSED
Document: 26EC20
Step: download_appendices
Attempt: 2/5

# On resume:
Document status reset to: PENDING
Failed steps reset to: PENDING
# Reprocess from beginning of document
```

## 🔮 Future Enhancements

1. **Parallel Processing** - Process multiple documents concurrently (within rate limits)
2. **Distributed State** - Redis for multi-node coordination
3. **Web Dashboard** - Real-time monitoring UI
4. **Notifications** - Slack/email alerts for failures
5. **Auto-Retry Scheduling** - Cron-based retry of failed docs
6. **Incremental Updates** - Detect changed content without full re-download
7. **Content Hashing** - Detect modified PDFs/HTML

## 📞 Support

For issues or questions:
1. Check the workflow status: `node workflow-cli.js status <id>`
2. Review failed documents: `node workflow-cli.js failed <id>`
3. Check error logs in database: `sqlite3 data/sfc-fetch.db "SELECT * FROM documents WHERE status='failed'"`

## ✅ Summary

This state-managed workflow system provides:

✅ **Reliability** - Never lose progress, always resume safely  
✅ **Observability** - Full visibility into every step  
✅ **Recoverability** - Retry individual failed documents  
✅ **Flexibility** - Handle all four SFC document types  
✅ **Simplicity** - SQLite requires zero infrastructure  

**Ready to process all 6,172 SFC documents (50 + 700 + 217 + 5,205) with confidence!**
