# SFC Document Processing Microservice

> Document-oriented workflow service with Git-backed persistence. Each document (identified by refNo) is stored as a complete record containing all metadata, workflow state, and processing history.

## 🎯 Design Philosophy

### Document-Centric Model
- **One refNo = One Document**: Each SFC document is a self-contained JSON document in the database
- **Embedded State**: Workflow state, sub-workflow steps, and metadata all live in one record
- **Category-Specific Collections**: Guidelines, Circulars, Consultations, and News each have their own collection structure

### Git as Backup Strategy
- **Compressed Archives**: Database files and markdown documents are zipped
- **Version Control**: Committed and pushed to GitHub for backup and history
- **Hydration/Dehydration**: Service dehydrates (zips) before shutdown, hydrates (unzips) on startup
- **Portability**: Can restore full state on any machine with git clone + unzip

### Markdown-Only Storage
- **Single Source of Truth**: Only processed markdown is stored
- **No Raw Files**: PDFs and HTML are processed but not retained after conversion
- **Content API**: Serve markdown content directly via API

## 📊 Data Model

### Document Structure (Per Category)

Each refNo is one document record containing:

```json
{
  "_id": "26EC6",
  "category": "circulars",
  
  "metadata": {
    "title": "Circular to Licensed Corporations",
    "issueDate": "2026-02-11T16:10:23.117",
    "year": 2026,
    "language": "EN",
    "documentType": "110",
    "departmentCode": "IS",
    "hasAppendices": true,
    "appendixCount": 2,
    "isModernFormat": true,
    "lastModified": "2026-02-11T16:10:23.117"
  },
  
  "source": {
    "discoveryMethod": "api_search",
    "searchEndpoint": "POST /api/circular/search",
    "contentEndpoint": "GET /api/circular/content?refNo=26EC6&lang=EN",
    "downloadEndpoint": "GET /api/circular/openFile?refNo=26EC6&lang=EN",
    "discoveredAt": "2026-02-17T10:00:00Z",
    "sourceVersion": "2026-02-11"
  },
  
  "content": {
    "markdownPath": "circulars/markdown/2026/26EC6.md",
    "markdownSize": 12500,
    "markdownHash": "sha256:abc123...",
    "wordCount": 2500,
    "lastConverted": "2026-02-17T10:10:00Z"
  },
  
  "workflow": {
    "status": "COMPLETED",
    "currentStep": "update_index",
    "startedAt": "2026-02-17T10:00:00Z",
    "completedAt": "2026-02-17T10:10:00Z",
    "durationSeconds": 600,
    "retryCount": 0,
    "reRunCount": 0
  },
  
  "subworkflow": {
    "steps": [
      {
        "step": "search_api",
        "status": "COMPLETED",
        "startedAt": "2026-02-17T10:00:00Z",
        "completedAt": "2026-02-17T10:00:02Z",
        "durationMs": 234,
        "attempts": 1
      },
      {
        "step": "fetch_content_api",
        "status": "COMPLETED",
        "startedAt": "2026-02-17T10:00:02Z",
        "completedAt": "2026-02-17T10:00:03Z",
        "durationMs": 567,
        "attempts": 1
      },
      {
        "step": "download_main_pdf",
        "status": "COMPLETED",
        "startedAt": "2026-02-17T10:00:03Z",
        "completedAt": "2026-02-17T10:00:05Z",
        "durationMs": 2341,
        "attempts": 3,
        "errors": [
          {
            "attempt": 1,
            "timestamp": "2026-02-17T10:00:04Z",
            "errorType": "HTTP_503",
            "message": "Service temporarily unavailable"
          },
          {
            "attempt": 2,
            "timestamp": "2026-02-17T10:00:05Z",
            "errorType": "HTTP_503",
            "message": "Service temporarily unavailable"
          }
        ]
      },
      {
        "step": "convert_to_markdown",
        "status": "COMPLETED",
        "startedAt": "2026-02-17T10:00:05Z",
        "completedAt": "2026-02-17T10:00:06Z",
        "durationMs": 890,
        "attempts": 1
      }
    ]
  },
  
  "history": {
    "runs": [
      {
        "runId": "initial",
        "reason": "initial_download",
        "startedAt": "2026-02-17T10:00:00Z",
        "completedAt": "2026-02-17T10:10:00Z",
        "status": "COMPLETED"
      }
    ],
    "reRuns": [],
    "errors": []
  },
  
  "createdAt": "2026-02-17T10:00:00Z",
  "updatedAt": "2026-02-17T10:10:00Z"
}
```

### Category-Specific Variations

#### Circulars
```json
{
  "_id": "26EC6",
  "category": "circulars",
  "metadata": {
    "refNo": "26EC6",
    "refFormat": "YYEC##",
    "isLegacyFormat": false,
    "postDocType": "110",
    "postDocSubtype": "105",
    "hasHtml": true
  },
  "content": {
    "markdownPath": "circulars/markdown/2026/26EC6.md",
    "appendices": [
      {
        "index": 0,
        "caption": "Appendix A",
        "markdownPath": "circulars/markdown/2026/26EC6_appendix_0.md"
      }
    ]
  }
}
```

#### Guidelines
```json
{
  "_id": "56F165F53E8E46BE82DC015EDCF41197",
  "category": "guidelines",
  "metadata": {
    "guidelineId": "56F165F53E8E46BE82DC015EDCF41197",
    "topics": ["Licensing", "Intermediaries_supervision"],
    "title": "Fit and Proper Guidelines",
    "effectiveDate": "2022-01-01",
    "hasVersionHistory": true,
    "versionCount": 4,
    "language": "EN"
  },
  "content": {
    "markdownPath": "guidelines/markdown/EN/fit-and-proper-guidelines.md",
    "historicalVersions": [
      {
        "version": "2022-01-01",
        "effectivePeriod": "2022-01-01 - present",
        "markdownPath": "guidelines/markdown/EN/fit-and-proper-guidelines_2022-01-01.md"
      },
      {
        "version": "2013-10-01",
        "effectivePeriod": "2013-10-01 - 2021-12-31",
        "markdownPath": "guidelines/markdown/EN/fit-and-proper-guidelines_2013-10-01.md"
      }
    ]
  }
}
```

#### Consultations
```json
{
  "_id": "25CP11",
  "category": "consultations",
  "metadata": {
    "cpRefNo": "25CP11",
    "cpTitle": "Consultation on Chinese version...",
    "cpIssueDate": "2025-11-07",
    "isConcluded": true,
    "commentDeadline": "2026-02-06",
    "ccRefNo": "25CC7",
    "ccIssueDate": "2025-12-24"
  },
  "content": {
    "consultationMarkdownPath": "consultations/markdown/2025/25CP11_consultation.md",
    "conclusionMarkdownPath": "consultations/markdown/2025/25CP11_conclusion.md",
    "appendices": [
      {
        "index": 0,
        "caption": "Draft Amendment",
        "markdownPath": "consultations/markdown/2025/25CP11_appendix_0.md"
      }
    ]
  }
}
```

#### News
```json
{
  "_id": "26PR27",
  "category": "news",
  "metadata": {
    "newsRefNo": "26PR27",
    "title": "SFC warns against fraudulent...",
    "issueDate": "2026-02-16",
    "newsType": "GN",
    "hasExternalLink": false,
    "hasImages": true,
    "imageCount": 2,
    "hasAppendices": false
  },
  "content": {
    "markdownPath": "news/markdown/2026/26PR27.md",
    "plainTextPath": "news/text/2026/26PR27.txt",
    "images": [
      {
        "index": 0,
        "caption": "Chart showing...",
        "imagePath": "news/images/2026/26PR27_image_0.jpg"
      }
    ]
  }
}
```

## 🏗️ Collection Structure

### Database: `sfc_documents`

#### Collections

1. **`circulars`** - 700 documents (refNo: YYEC## or H###)
2. **`guidelines`** - 50 documents (refNo: UUID)
3. **`consultations`** - 217 documents (refNo: YYCP##)
4. **`news`** - 5,205 documents (refNo: YYPR##)

#### Collection Schema (Example: circulars)

```javascript
// Collection: circulars
{
  _id: String,              // refNo (e.g., "26EC6")
  category: String,         // "circulars"
  
  metadata: {
    title: String,
    issueDate: Date,
    year: Number,
    language: String,
    documentType: String,
    departmentCode: String,
    hasAppendices: Boolean,
    appendixCount: Number,
    isModernFormat: Boolean,  // year >= 2012
    isLegacyFormat: Boolean,  // year < 2012
    lastModified: Date
  },
  
  source: {
    discoveryMethod: String,  // "api_search", "html_scrape"
    searchEndpoint: String,
    contentEndpoint: String,
    downloadEndpoint: String,
    discoveredAt: Date,
    sourceVersion: String
  },
  
  content: {
    markdownPath: String,
    markdownSize: Number,
    markdownHash: String,
    wordCount: Number,
    lastConverted: Date,
    appendices: [{
      index: Number,
      caption: String,
      markdownPath: String
    }]
  },
  
  workflow: {
    status: String,           // PENDING, DISCOVERED, DOWNLOADING, PROCESSING, COMPLETED, FAILED, RETRYING, RE_RUNNING, STALE
    currentStep: String,
    startedAt: Date,
    completedAt: Date,
    durationSeconds: Number,
    retryCount: Number,
    reRunCount: Number
  },
  
  subworkflow: {
    steps: [{
      step: String,
      status: String,         // PENDING, RUNNING, COMPLETED, FAILED, SKIPPED
      startedAt: Date,
      completedAt: Date,
      durationMs: Number,
      attempts: Number,
      errors: [{
        attempt: Number,
        timestamp: Date,
        errorType: String,
        message: String
      }]
    }]
  },
  
  history: {
    runs: [{
      runId: String,
      reason: String,
      startedAt: Date,
      completedAt: Date,
      status: String
    }],
    reRuns: [{
      reRunId: String,
      reason: String,
      triggeredAt: Date,
      previousMarkdownPath: String,
      newMarkdownPath: String
    }]
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

## 🔌 API Design

### Base URL Pattern

```
https://api.sfc-docs.internal/{category}/{refNo}
```

### Category-Specific Endpoints

#### Circulars

```
GET /circulars/{refNo}
GET /circulars/{refNo}/content                    # Markdown content
GET /circulars/{refNo}/content/appendix/{index}     # Appendix markdown
GET /circulars/{refNo}/workflow/status             # Workflow state
GET /circulars/{refNo}/workflow/steps              # Sub-workflow steps
POST /circulars/{refNo}/workflow/retry             # Retry from failure
POST /circulars/{refNo}/workflow/re-run            # Re-run from scratch
GET /circulars/{refNo}/history                   # Processing history
```

#### Guidelines

```
GET /guidelines/{refNo}
GET /guidelines/{refNo}/content                    # Current version markdown
GET /guidelines/{refNo}/content/{versionDate}      # Historical version
GET /guidelines/{refNo}/versions                   # List all versions
GET /guidelines/{refNo}/workflow/status
POST /guidelines/{refNo}/workflow/retry
POST /guidelines/{refNo}/workflow/re-run
```

#### Consultations

```
GET /consultations/{refNo}
GET /consultations/{refNo}/content/consultation    # Consultation paper markdown
GET /consultations/{refNo}/content/conclusion      # Conclusion paper markdown
GET /consultations/{refNo}/content/appendix/{index}
GET /consultations/{refNo}/workflow/status
POST /consultations/{refNo}/workflow/retry
POST /consultations/{refNo}/workflow/re-run
```

#### News

```
GET /news/{refNo}
GET /news/{refNo}/content                          # Article markdown
GET /news/{refNo}/content/plain                    # Plain text version
GET /news/{refNo}/image/{index}                    # Embedded images
GET /news/{refNo}/workflow/status
POST /news/{refNo}/workflow/retry
POST /news/{refNo}/workflow/re-run
```

### Query Endpoints

```
GET /circulars?status=COMPLETED&year=2026&limit=50
GET /circulars?workflowStatus=FAILED&retryCount=0
GET /guidelines?hasVersionHistory=true
GET /consultations?isConcluded=false              # Active consultations
GET /news?newsType=EF&year=2026                   # Enforcement news

POST /query
{
  "category": "circulars",
  "filters": {
    "status": "COMPLETED",
    "year": 2026,
    "documentType": "110"
  },
  "sort": { "field": "issueDate", "order": "desc" },
  "pagination": { "limit": 50, "offset": 0 }
}
```

### Workflow Control Endpoints

```
# Workflow-level operations
GET /workflows                                    # List all workflows
GET /workflows/{workflowId}                       # Workflow details
GET /workflows/{workflowId}/documents             # All documents in workflow
GET /workflows/{workflowId}/failed                # Failed documents

# Batch operations
POST /workflows/{workflowId}/retry-failed
POST /workflows/{workflowId}/pause
POST /workflows/{workflowId}/resume
POST /workflows/{workflowId}/cancel

# Global operations
POST /hydrate                                     # Restore from git backup
POST /dehydrate                                   # Create zip and commit
GET /backup/status                                # Last backup info
```

## 📡 API Response Examples

### Get Document Content

```
GET /circulars/26EC6/content

Response:
{
  "refNo": "26EC6",
  "category": "circulars",
  "content": {
    "markdown": "# Circular to Licensed Corporations\n\n**Date:** 2026-02-11\n\n1. This circular sets out...",
    "size": 12500,
    "hash": "sha256:abc123...",
    "lastConverted": "2026-02-17T10:10:00Z"
  },
  "metadata": {
    "title": "Circular to Licensed Corporations",
    "issueDate": "2026-02-11"
  }
}
```

### Get Workflow Status

```
GET /circulars/26EC6/workflow/status

Response:
{
  "refNo": "26EC6",
  "category": "circulars",
  "workflow": {
    "status": "COMPLETED",
    "currentStep": "update_index",
    "startedAt": "2026-02-17T10:00:00Z",
    "completedAt": "2026-02-17T10:10:00Z",
    "durationSeconds": 600,
    "retryCount": 0,
    "reRunCount": 0
  },
  "isRetryable": false,
  "isReRunnable": true,
  "lastError": null
}
```

### Retry Failed Document

```
POST /circulars/26EC50/workflow/retry
Request Body:
{
  "reason": "network_timeout_recovery",
  "fromStep": "download_main_pdf"
}

Response:
{
  "refNo": "26EC50",
  "previousStatus": "FAILED",
  "currentStatus": "RETRYING",
  "retryCount": 1,
  "resumingFromStep": "download_main_pdf",
  "estimatedCompletion": "2026-02-17T11:05:00Z"
}
```

### Re-run Document

```
POST /circulars/26EC6/workflow/re-run
Request Body:
{
  "reason": "markdown_converter_bug_fix",
  "preservePrevious": true
}

Response:
{
  "refNo": "26EC6",
  "previousStatus": "COMPLETED",
  "currentStatus": "RE_RUNNING",
  "reRunId": "rr-001",
  "reRunCount": 1,
  "archivedContent": "archive/circulars/26EC6_20260217_101000.md",
  "newContentPath": "circulars/markdown/2026/26EC6.md"
}
```

## 💾 Storage & Backup Strategy

### Directory Structure

```
data/
├── db/
│   ├── circulars.json          # Circulars collection (NoSQL dump)
│   ├── guidelines.json         # Guidelines collection
│   ├── consultations.json      # Consultations collection
│   ├── news.json               # News collection
│   └── workflow_state.json     # Global workflow state
│
├── content/
│   ├── circulars/
│   │   └── markdown/
│   │       └── 2026/
│   │           ├── 26EC6.md
│   │           ├── 26EC7.md
│   │           └── ...
│   ├── guidelines/
│   │   └── markdown/
│   │       ├── EN/
│   │       │   ├── fit-and-proper-guidelines.md
│   │       │   └── ...
│   │       └── TC/
│   ├── consultations/
│   │   └── markdown/
│   │       └── 2025/
│   │           ├── 25CP11_consultation.md
│   │           ├── 25CP11_conclusion.md
│   │           └── ...
│   └── news/
│       └── markdown/
│           └── 2026/
│               ├── 26PR27.md
│               └── ...
│
└── archive/
    └── re-runs/
        ├── circulars_26EC6_20260217_101000.md
        └── ...
```

### Dehydration Process (Backup)

```
1. Stop accepting new requests
2. Flush any pending writes to disk
3. Create zip archive:
   - backup_YYYYMMDD_HHMMSS.zip
   - Contains: db/*.json, content/**/*.md
4. Git operations:
   - git add backup_YYYYMMDD_HHMMSS.zip
   - git commit -m "Backup: YYYY-MM-DD HH:MM:SS - {stats}"
   - git push origin master
5. Cleanup old backups (keep last 10)
6. Resume accepting requests
```

### Hydration Process (Restore)

```
On Service Startup:

1. Check for local data:
   - If data/db/*.json exists → Load from local
   - If not → Proceed to hydration

2. Check git repository:
   - git pull origin master
   - Find latest backup zip

3. Decompress:
   - Unzip backup_YYYYMMDD_HHMMSS.zip
   - Extract to data/ directory

4. Load collections:
   - Load each JSON file into NoSQL collections
   - Build indexes (refNo, status, year, etc.)

5. Verify integrity:
   - Check document count matches expected
   - Verify hash of random sample
   - Report any inconsistencies

6. Start API server
```

### Backup API

```
POST /dehydrate
Response:
{
  "backupId": "backup_20260217_143000",
  "filesArchived": 6247,
  "sizeBytes": 52428800,
  "compressedSizeBytes": 15728640,
  "commitHash": "a1b2c3d",
  "commitUrl": "https://github.com/.../commit/a1b2c3d"
}

POST /hydrate
Request Body:
{
  "backupId": "backup_20260217_143000"  // Optional: use latest if not specified
}

Response:
{
  "restoredFrom": "backup_20260217_143000",
  "collectionsRestored": 4,
  "documentsRestored": 6172,
  "contentFilesRestored": 6172,
  "durationSeconds": 45
}

GET /backup/status
Response:
{
  "lastBackup": "2026-02-17T14:30:00Z",
  "backupId": "backup_20260217_143000",
  "commitHash": "a1b2c3d",
  "totalDocuments": 6172,
  "totalSize": "50MB",
  "compressionRatio": 0.3
}
```

## 🔄 Workflow State Machine

### Document Lifecycle

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   PENDING   │────▶│  DISCOVERED  │────▶│  DOWNLOADING │
└─────────────┘     └──────────────┘     └──────────────┘
                                              │
                                              ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  COMPLETED  │◀────│  PROCESSING  │◀────│    FAILED    │
└─────────────┘     └──────────────┘     └──────────────┘
      │                                              │
      │                                              │
      │         ┌────────────┐                       │
      │         │   STALE    │◀──────────────────────┘
      │         └─────┬──────┘
      │               │
      └───────────────┘
              │
              ▼
       ┌────────────┐
       │ RE_RUNNING │
       └─────┬──────┘
             │
             ▼
       ┌────────────┐
       │   PENDING  │ (reset)
       └────────────┘
```

### State Definitions

| State | Description | Can Transition To |
|-------|-------------|-------------------|
| `PENDING` | Not yet discovered or re-run reset | DISCOVERED |
| `DISCOVERED` | Found in source, ready to download | DOWNLOADING |
| `DOWNLOADING` | Fetching raw content from SFC | PROCESSING, FAILED |
| `PROCESSING` | Converting to markdown | COMPLETED, FAILED |
| `COMPLETED` | All done, markdown available | RE_RUNNING, STALE |
| `FAILED` | Error during download or processing | RETRYING (auto/manual) |
| `RETRYING` | Attempting recovery from failure | DOWNLOADING, FAILED |
| `RE_RUNNING` | Complete reprocessing requested | PENDING (reset) |
| `STALE` | Source changed since last processing | RE_RUNNING |

## 🎯 Service Operations

### Startup Sequence

1. **Hydration Check**
   - If local data exists → Load and start
   - If no local data → Hydrate from git backup

2. **Index Building**
   - Ensure indexes on: refNo, status, year, workflow.status
   - Verify document counts match expected

3. **API Server Start**
   - Listen on configured port
   - Ready to accept requests

### Shutdown Sequence

1. **Drain Requests**
   - Stop accepting new requests
   - Wait for in-flight requests to complete

2. **Dehydration**
   - Create zip backup
   - Git commit and push

3. **Cleanup**
   - Close database connections
   - Release resources

### Health Checks

```
GET /health

Response:
{
  "status": "healthy",
  "collections": {
    "circulars": { "count": 700, "status": "loaded" },
    "guidelines": { "count": 50, "status": "loaded" },
    "consultations": { "count": 217, "status": "loaded" },
    "news": { "count": 5205, "status": "loaded" }
  },
  "lastBackup": "2026-02-17T14:30:00Z",
  "activeWorkflows": 2,
  "storageUsage": "45MB"
}
```

## 📋 Requirements Summary

### Data Model Requirements

1. **One refNo = One Document**: Each SFC document is a single JSON document
2. **Embedded State**: Workflow and sub-workflow states stored in document
3. **Category Collections**: Separate collections for each category (circulars, guidelines, consultations, news)
4. **RefNo as _id**: Use SFC refNo as the document identifier

### Storage Requirements

1. **Markdown Only**: Only converted markdown is stored (no raw PDF/HTML)
2. **Git Backup**: Database files and markdown content zipped and committed to git
3. **Dehydration**: Automatic zip + commit on shutdown
4. **Hydration**: Automatic unzip + restore on startup

### API Requirements

1. **Category-Based**: `GET /<category>/<refNo>/content`
2. **Workflow Status**: `GET /<category>/<refNo>/workflow/status`
3. **Category-Specific**: Different endpoints per category (different file types)
4. **Control APIs**: Retry and re-run endpoints for recovery

### Processing Requirements

1. **Convert to Markdown**: All content converted to markdown before storage
2. **Retry Capability**: Resume from failed step
3. **Re-run Capability**: Start from scratch with output archiving
4. **False Positive Handling**: Re-run when processing errors are discovered

### Portability Requirements

1. **Git Clone = Full Restore**: New instance can restore from git backup
2. **Compressed Storage**: All data compressed for efficient git storage
3. **Self-Contained**: No external dependencies for data restoration
