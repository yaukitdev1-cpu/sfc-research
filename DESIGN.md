# SFC Document Processing Microservice

> A workflow orchestration and document metadata service for the SFC document processing pipeline. Manages document lifecycle, stores provenance information, and provides query APIs for downstream consumers.

## 🎯 Service Responsibilities

This microservice is responsible for:

1. **Workflow Orchestration** - Managing the end-to-end processing of documents across four categories
2. **Document Metadata Management** - Storing document attributes, source URLs, and output file locations
3. **State Tracking** - Maintaining processing state at both document and sub-workflow step level
4. **Provenance Tracking** - Recording where documents came from and how they were processed
5. **Query Interface** - Providing APIs for other microservices to retrieve workflow and document information
6. **Re-run Management** - Supporting both retry (resume from failure) and re-run (start from scratch) workflows

## 📊 Document Categories

The service manages four distinct document types, each with unique characteristics:

### 1. Guidelines (HTML Scraping)
- **Source**: Main SFC website (www.sfc.hk)
- **Count**: ~50 guidelines
- **Format**: PDF with version history
- **Discovery**: HTML table scraping
- **Key Challenge**: No API, structure changes possible

### 2. Circulars (API-Based)
- **Source**: e-Distribution API (apps.sfc.hk)
- **Count**: ~700 circulars (2000-2026)
- **Format Gap**: 2000-2011 PDF only, 2012+ PDF + HTML
- **Discovery**: Search API with pagination
- **Key Challenge**: Legacy vs modern format differences

### 3. Consultations (API-Based)
- **Source**: e-Distribution API
- **Count**: ~217 consultations (1989-2026)
- **Format**: Consultation Paper PDF + Conclusion Paper PDF (when concluded)
- **Lifecycle**: Active → Comment Period Closed → Concluded
- **Key Challenge**: Two-phase document lifecycle

### 4. News (API-Based)
- **Source**: e-Distribution API
- **Count**: ~5,205 articles (1996-2026)
- **Format**: HTML + Images + Appendices
- **Discovery**: Search API with year filtering
- **Key Challenge**: Large volume, image handling

## 🏗️ Core Concepts

### Workflow
A workflow represents a processing job for one document category. Each workflow:
- Has a mode: `full_download` (all documents) or `update_check` (incremental)
- Maintains aggregate statistics
- Can be paused, resumed, or cancelled
- Tracks overall progress

### Document
A document represents a single item to be processed:
- Has a unique reference (e.g., "26EC6", "25CP11", guideline UUID)
- Stores metadata (title, dates, categories)
- Maintains processing state
- Records output file locations
- Tracks provenance (source URLs, API endpoints used)

### Sub-Workflow Steps
Each document type has a defined sequence of processing steps:
- **Discovery**: Finding the document (search API or HTML scrape)
- **Metadata Fetch**: Getting document attributes
- **Content Download**: Downloading PDFs, HTML, images
- **Content Transformation**: Converting HTML to Markdown, extracting text
- **Storage**: Saving metadata and updating indices

### Provenance
Every document tracks:
- Source URLs (where it was discovered)
- API endpoints called
- File hashes (for integrity verification)
- Processing timestamps
- Transformation steps applied

## 🔄 Workflow States

### Document State Machine

```
                    ┌─────────────┐
    ┌──────────────►│   PENDING   │◄────────────────┐
    │               └──────┬──────┘                 │
    │                      │                         │
    │                      ▼                         │
    │               ┌─────────────┐                  │
    │               │ DISCOVERED  │                  │
    │               └──────┬──────┘                  │
    │                      │                         │
    │                      ▼                         │
    │               ┌─────────────┐    ┌───────────┐ │
    │               │ DOWNLOADING │───►│  PAUSED   │─┘
    │               └──────┬──────┘    └───────────┘
    │                      │
    │         ┌────────────┼────────────┐
    │         │            │            │
    │         ▼            ▼            ▼
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐
    └──┤ COMPLETED│  │  FAILED  │  │  STALE   │
       └──────────┘  └────┬─────┘  └────┬─────┘
                          │              │
                          ▼              │
                   ┌────────────┐        │
                   │  RETRYING  │        │
                   └─────┬──────┘        │
                         │               │
                         ▼               │
                   ┌────────────┐        │
                   │ RE-RUNNING │◄───────┘
                   └─────┬──────┘
                         │
                         ▼
                   ┌────────────┐
                   │  PENDING   │
                   └────────────┘
```

### State Definitions

| State | Description | Actions Allowed |
|-------|-------------|-----------------|
| `PENDING` | Waiting to be processed | Start processing, Cancel |
| `DISCOVERED` | Found in source, not yet downloaded | Download, Cancel |
| `DOWNLOADING` | Content download in progress | Pause, Cancel |
| `PROCESSING` | Content transformation in progress | Pause, Cancel |
| `COMPLETED` | All steps finished successfully | Re-run, View outputs |
| `FAILED` | One or more steps failed | Retry, Re-run, View error |
| `PAUSED` | User-initiated pause | Resume, Cancel |
| `RETRYING` | Automatic or manual retry in progress | Cancel |
| `RE-RUNNING` | Complete reprocessing from scratch | Cancel |
| `STALE` | Completed but source changed (update check mode) | Re-run, Mark current |

### State Transitions

| From | To | Trigger | Notes |
|------|-----|---------|-------|
| `PENDING` | `DISCOVERED` | Document found in search/scrape | Initial discovery |
| `DISCOVERED` | `DOWNLOADING` | Download initiated | - |
| `DOWNLOADING` | `PROCESSING` | Download completed | All files downloaded |
| `PROCESSING` | `COMPLETED` | All transformations done | Success path |
| `DOWNLOADING` | `FAILED` | Download error | After retries exhausted |
| `PROCESSING` | `FAILED` | Transformation error | After retries exhausted |
| `FAILED` | `RETRYING` | Retry initiated | Resume from failed step |
| `RETRYING` | `DOWNLOADING` | Retry started | Or `PROCESSING` depending on failure point |
| `COMPLETED` | `RE-RUNNING` | Re-run initiated | Start from scratch |
| `RE-RUNNING` | `PENDING` | Re-run setup complete | Reset for fresh start |
| `COMPLETED` | `STALE` | Source content changed | Detected in update check mode |
| `ANY` | `PAUSED` | Pause command issued | User intervention |
| `PAUSED` | `DOWNLOADING` | Resume command issued | Continue from pause point |

## 📦 Data Model

### Document Metadata

Each document stores:

```yaml
document:
  # Identity
  document_ref: "26EC6"                    # Unique identifier
  workflow_type: "circulars"               # Category
  
  # Source Information (Provenance)
  source:
    discovery_url: "https://apps.sfc.hk/edistributionWeb/gateway/EN/circular/doc?refNo=26EC6"
    search_api_endpoint: "POST /api/circular/search"
    content_api_endpoint: "GET /api/circular/content?refNo=26EC6&lang=EN"
    download_api_endpoint: "GET /api/circular/openFile?refNo=26EC6&lang=EN"
    discovered_at: "2026-02-17T10:00:00Z"
    source_version: "2026-02-11"           # Version/date from source
  
  # Content Metadata
  metadata:
    title: "Circular to Licensed Corporations"
    issue_date: "2026-02-11"
    year: 2026
    language: "EN"
    document_type: "110"                 # Category code
    department_code: "IS"                # Department
    has_appendices: true
    appendix_count: 2
    is_modern_format: true               # Circulars 2012+
    file_hashes:                          # For integrity verification
      main_pdf: "sha256:abc123..."
      appendix_0: "sha256:def456..."
  
  # Output Locations
  outputs:
    main_pdf: 
      path: "circulars/pdf/2026/26EC6.pdf"
      size_bytes: 1024000
      mime_type: "application/pdf"
      created_at: "2026-02-17T10:05:00Z"
    raw_html:
      path: "circulars/html/2026/26EC6.html"
      size_bytes: 15000
      mime_type: "text/html"
    markdown:
      path: "circulars/markdown/2026/26EC6.md"
      size_bytes: 12000
      mime_type: "text/markdown"
      conversion_tool: "html-to-markdown-v2"
    plain_text:
      path: "circulars/text/2026/26EC6.txt"
      size_bytes: 11000
      mime_type: "text/plain"
    appendices:
      - index: 0
        path: "circulars/appendix/2026/26EC6_appendix_0.pdf"
        caption: "Appendix A"
        size_bytes: 500000
  
  # Processing State
  state:
    status: "COMPLETED"
    current_step: "update_index"
    started_at: "2026-02-17T10:00:00Z"
    completed_at: "2026-02-17T10:10:00Z"
    duration_seconds: 600
    retry_count: 0
  
  # Sub-Workflow Step States
  steps:
    - step: "search_api"
      status: "COMPLETED"
      started_at: "2026-02-17T10:00:00Z"
      completed_at: "2026-02-17T10:00:02Z"
      duration_ms: 234
    - step: "fetch_content_api"
      status: "COMPLETED"
      started_at: "2026-02-17T10:00:02Z"
      completed_at: "2026-02-17T10:00:03Z"
      duration_ms: 567
    - step: "download_main_pdf"
      status: "COMPLETED"
      started_at: "2026-02-17T10:00:03Z"
      completed_at: "2026-02-17T10:00:05Z"
      duration_ms: 2341
    - step: "convert_to_markdown"
      status: "COMPLETED"
      started_at: "2026-02-17T10:00:05Z"
      completed_at: "2026-02-17T10:00:06Z"
      duration_ms: 890
  
  # Error History (for retries and debugging)
  errors:
    - timestamp: "2026-02-17T10:00:04Z"
      step: "download_main_pdf"
      attempt: 1
      error_type: "HTTP_503"
      message: "Service temporarily unavailable"
      retry_after_seconds: 2
    - timestamp: "2026-02-17T10:00:05Z"
      step: "download_main_pdf"
      attempt: 2
      error_type: "HTTP_503"
      message: "Service temporarily unavailable"
      retry_after_seconds: 4
  
  # Re-run History
  re_runs:
    - re_run_id: "rr-001"
      reason: "false_positive_in_markdown_conversion"
      triggered_at: "2026-02-17T12:00:00Z"
      previous_outputs_preserved: true
      previous_outputs_path: "archive/circulars/2026/26EC6_20260217_100000/"
```

### Workflow Metadata

```yaml
workflow:
  id: "wf-001"
  type: "circulars"
  mode: "full_download"                    # or "update_check"
  status: "RUNNING"
  
  configuration:
    years: [2000, 2001, ..., 2026]
    languages: ["EN"]
    download_historical_versions: true
    convert_to_markdown: true
    rate_limit_requests_per_second: 2
  
  statistics:
    total_documents: 700
    discovered: 700
    completed: 650
    failed: 5
    retrying: 10
    re_running: 5
    pending: 30
    completion_percentage: 92.9
  
  timing:
    created_at: "2026-02-17T09:00:00Z"
    started_at: "2026-02-17T09:05:00Z"
    paused_at: null
    resumed_at: null
    completed_at: null
    estimated_completion: "2026-02-17T14:00:00Z"
  
  current_state:
    active_document: "26EC50"
    current_step: "download_appendices"
    queue_depth: 30
```

## 🔁 Retry vs Re-run Semantics

### Retry (Resume from Failure)

**Use Case**: Temporary failure (network error, rate limiting) that might succeed on next attempt.

**Behavior**:
- Resumes from the failed step
- Preserves successful steps
- Increment retry counter
- Apply exponential backoff between attempts
- Maximum retry attempts configurable per step

**Example**:
```
Document: 26EC50
Failed at: download_main_pdf (attempt 3/5)
Action: RETRY
Result: Attempt 4/5 → Success
Final state: COMPLETED (all steps done)
```

### Re-run (Start from Scratch)

**Use Case**: 
- False positive (converter produced wrong output)
- Code fix required (bug in transformation logic)
- Source content changed (update check mode)
- User wants fresh processing

**Behavior**:
- Resets document to PENDING state
- Clears all step states
- Preserves previous outputs (archived with timestamp)
- Starts fresh discovery
- Previous outputs available for comparison

**Example**:
```
Document: 26EC50
Issue: Markdown conversion produced garbled text (code bug fixed)
Action: RE-RUN
Result: 
  - Previous outputs moved to: archive/26EC50_20260217_100000/
  - Document reset to PENDING
  - Fresh processing started
  - New outputs: markdown/26EC50.md (correctly converted)
```

## 📡 API Design (for Other Microservices)

### Workflow APIs

#### List Workflows
```
GET /workflows

Response:
{
  workflows: [
    {
      id: "wf-001",
      type: "circulars",
      mode: "full_download",
      status: "RUNNING",
      progress: {
        total: 700,
        completed: 650,
        percentage: 92.9
      },
      created_at: "2026-02-17T09:00:00Z"
    }
  ]
}
```

#### Get Workflow Details
```
GET /workflows/{workflow_id}

Response:
{
  id: "wf-001",
  type: "circulars",
  status: "RUNNING",
  statistics: { ... },
  configuration: { ... },
  current_state: {
    active_document: "26EC50",
    current_step: "download_appendices"
  }
}
```

#### Get Workflow Documents
```
GET /workflows/{workflow_id}/documents

Query Parameters:
- status: Filter by status (completed, failed, pending, etc.)
- limit: Number of results
- offset: Pagination offset
- sort: Sort field (discovered_at, completed_at, etc.)

Response:
{
  total: 700,
  documents: [
    {
      document_ref: "26EC6",
      status: "COMPLETED",
      title: "Circular to Licensed Corporations",
      discovered_at: "2026-02-17T10:00:00Z",
      completed_at: "2026-02-17T10:10:00Z"
    }
  ]
}
```

### Document APIs

#### Get Document Info
```
GET /documents/{document_ref}

Response:
{
  document_ref: "26EC6",
  workflow_type: "circulars",
  status: "COMPLETED",
  
  metadata: {
    title: "Circular to Licensed Corporations",
    issue_date: "2026-02-11",
    year: 2026,
    document_type: "110"
  },
  
  source: {
    discovery_url: "...",
    discovered_at: "2026-02-17T10:00:00Z"
  },
  
  outputs: {
    main_pdf: { path: "...", size_bytes: 1024000 },
    markdown: { path: "...", size_bytes: 12000 }
  },
  
  processing: {
    started_at: "2026-02-17T10:00:00Z",
    completed_at: "2026-02-17T10:10:00Z",
    duration_seconds: 600,
    steps_completed: 10
  }
}
```

#### Get Document Content Locations
```
GET /documents/{document_ref}/content

Response:
{
  document_ref: "26EC6",
  content_types: {
    main_pdf: {
      path: "circulars/pdf/2026/26EC6.pdf",
      url: "https://storage.internal/circulars/pdf/2026/26EC6.pdf",
      mime_type: "application/pdf",
      size_bytes: 1024000,
      hash: "sha256:abc123..."
    },
    markdown: {
      path: "circulars/markdown/2026/26EC6.md",
      url: "https://storage.internal/circulars/markdown/2026/26EC6.md",
      mime_type: "text/markdown",
      size_bytes: 12000
    },
    plain_text: {
      path: "circulars/text/2026/26EC6.txt",
      url: "...",
      mime_type: "text/plain",
      size_bytes: 11000
    }
  },
  
  appendices: [
    {
      index: 0,
      caption: "Appendix A",
      content_type: "pdf",
      path: "circulars/appendix/2026/26EC6_appendix_0.pdf",
      url: "...",
      size_bytes: 500000
    }
  ]
}
```

#### Query Documents
```
POST /documents/query

Request Body:
{
  filters: {
    workflow_type: "circulars",
    year: 2026,
    document_type: "110",
    status: "COMPLETED",
    has_appendices: true
  },
  date_range: {
    from: "2026-02-01",
    to: "2026-02-28"
  },
  pagination: {
    limit: 50,
    offset: 0
  },
  sort: {
    field: "issue_date",
    order: "desc"
  }
}

Response:
{
  total: 48,
  documents: [ ... ]
}
```

#### Get Document Processing State
```
GET /documents/{document_ref}/state

Response:
{
  document_ref: "26EC6",
  status: "COMPLETED",
  current_step: "update_index",
  steps: [
    {
      step: "search_api",
      status: "COMPLETED",
      duration_ms: 234
    },
    {
      step: "download_main_pdf",
      status: "COMPLETED",
      duration_ms: 2341,
      attempts: 3,
      errors: [ ... ]
    }
  ]
}
```

### Control APIs

#### Start Workflow
```
POST /workflows

Request Body:
{
  type: "circulars",
  mode: "full_download",
  config: {
    years: [2026],
    languages: ["EN"]
  }
}

Response:
{
  workflow_id: "wf-002",
  status: "PENDING"
}
```

#### Pause Workflow
```
POST /workflows/{workflow_id}/pause

Response:
{
  workflow_id: "wf-001",
  previous_status: "RUNNING",
  current_status: "PAUSED",
  paused_at: "2026-02-17T12:00:00Z",
  active_document: "26EC50"
}
```

#### Resume Workflow
```
POST /workflows/{workflow_id}/resume

Response:
{
  workflow_id: "wf-001",
  status: "RUNNING",
  resuming_from: "26EC50"
}
```

#### Retry Failed Document
```
POST /documents/{document_ref}/retry

Request Body:
{
  reason: "network_timeout_recovery",
  from_step: "download_main_pdf"  // Optional: specific step to retry
}

Response:
{
  document_ref: "26EC50",
  previous_status: "FAILED",
  current_status: "RETRYING",
  retry_count: 1,
  resuming_from_step: "download_main_pdf"
}
```

#### Re-run Document
```
POST /documents/{document_ref}/re-run

Request Body:
{
  reason: "markdown_converter_fix_applied",
  preserve_previous: true,  // Archive old outputs
  archive_path: "auto"      // Or specify custom path
}

Response:
{
  document_ref: "26EC50",
  previous_status: "COMPLETED",
  current_status: "RE-RUNNING",
  re_run_id: "rr-001",
  archived_outputs: "archive/26EC50_20260217_100000/"
}
```

#### Batch Retry
```
POST /workflows/{workflow_id}/retry-failed

Request Body:
{
  reason: "service_outage_recovery",
  max_documents: 10  // Process in batches
}

Response:
{
  workflow_id: "wf-001",
  queued: 5,
  documents: ["26EC45", "26EC46", "26EC47", "26EC48", "26EC49"]
}
```

### Status & Health APIs

#### Service Health
```
GET /health

Response:
{
  status: "healthy",
  version: "1.0.0",
  active_workflows: 2,
  queue_depth: 45,
  storage_usage: {
    documents: "1.2GB",
    metadata: "15MB"
  }
}
```

#### Get Failed Documents Report
```
GET /reports/failed-documents

Query Parameters:
- workflow_id: Filter by workflow
- from_date: Error occurred after
- to_date: Error occurred before
- error_type: Filter by error type

Response:
{
  total: 5,
  documents: [
    {
      document_ref: "26EC45",
      workflow_type: "circulars",
      workflow_id: "wf-001",
      status: "FAILED",
      failed_step: "download_main_pdf",
      error: {
        type: "HTTP_503",
        message: "Service temporarily unavailable",
        timestamp: "2026-02-17T11:00:00Z",
        attempts: 5
      },
      last_successful_step: "fetch_content_api"
    }
  ]
}
```

## 🔌 Integration Points

### Downstream Consumers

Other microservices can:

1. **Document Search Service**
   - Query: `GET /documents/query` with filters
   - Use: Full-text search index building

2. **Document Delivery Service**
   - Query: `GET /documents/{ref}/content`
   - Use: Serve documents to end users

3. **Analytics Service**
   - Query: `GET /workflows/{id}/documents?status=completed`
   - Use: Generate processing statistics

4. **Notification Service**
   - Listen: Webhook on document state changes
   - Use: Notify users of new/updated documents

5. **Audit Service**
   - Query: `GET /documents/{ref}/state`
   - Use: Compliance and provenance tracking

### Event Streaming

The service publishes events for state changes:

```yaml
events:
  - type: "document.discovered"
    payload: { document_ref, workflow_type, discovered_at }
    
  - type: "document.step.completed"
    payload: { document_ref, step, duration_ms }
    
  - type: "document.completed"
    payload: { document_ref, workflow_type, outputs }
    
  - type: "document.failed"
    payload: { document_ref, failed_step, error_type, retry_eligible }
    
  - type: "document.retry.scheduled"
    payload: { document_ref, retry_count, retry_after }
    
  - type: "document.re-run.started"
    payload: { document_ref, re_run_id, previous_outputs_archived }
    
  - type: "workflow.started"
    payload: { workflow_id, type, mode, config }
    
  - type: "workflow.paused"
    payload: { workflow_id, paused_at, active_document }
    
  - type: "workflow.completed"
    payload: { workflow_id, statistics, duration_seconds }
```

## 📋 Requirements Summary

### Functional Requirements

1. **Support 4 document types** with different processing workflows
2. **Track document state** at both document and sub-workflow step level
3. **Store provenance** including source URLs and API endpoints
4. **Store output locations** for all generated files (PDF, HTML, Markdown, Text)
5. **Support pause/resume** for long-running workflows
6. **Support retry** from point of failure
7. **Support re-run** from scratch with output archiving
8. **Provide query APIs** for workflows and documents
9. **Publish events** for state changes
10. **Handle false positives** via re-run capability

### Non-Functional Requirements

1. **Atomic document processing** - One document at a time
2. **Idempotent operations** - Safe to retry
3. **Durable state** - State survives service restarts
4. **Observable** - Clear visibility into processing
5. **Queryable** - Fast lookups by document ref, status, date, etc.
6. **Archivable** - Preserve old outputs on re-run
7. **Event-driven** - Publish state changes for integration

### Edge Cases to Handle

1. **Network failures** during download (retry with backoff)
2. **API rate limiting** (respect limits, retry after delay)
3. **Partial downloads** (resume download, don't restart)
4. **Corrupt files** (hash verification, re-download)
5. **Source format changes** (detect, mark stale, re-run)
6. **False positive completions** (re-run capability)
7. **Service interruption** (pause/resume)
8. **Concurrent modifications** (optimistic locking)
9. **Storage full** (fail gracefully, alert operator)
10. **Dependency failures** (cancel dependent steps)

## 🎯 Success Criteria

The service is successful when:

1. ✅ All 6,172 documents can be processed (50 + 700 + 217 + 5,205)
2. ✅ Processing can be paused and resumed without data loss
3. ✅ Failed documents can be retried and recovered
4. ✅ False positives can be re-processed via re-run
5. ✅ Other microservices can query document status and locations
6. ✅ Document provenance is complete and auditable
7. ✅ State changes are published for real-time integration
8. ✅ No document is left in an ambiguous state
9. ✅ Re-runs preserve previous outputs for comparison
10. ✅ The service can recover from its own failures
