# SFC-Fetch State-Managed Workflow System

> Comprehensive document processing system with SQLite state management, stop/resume capability, and per-document retry logic.

## 🎯 System Overview

This system uses **SQLite** (with JSON1 extension) as a lightweight NoSQL-like state store to track the processing of SFC documents across four categories:
- **Guidelines** (HTML scraping)
- **Circulars** (API-based)
- **Consultations** (API-based)
- **News** (API-based)

### Key Features

✅ **Stop/Resume Anytime** - Each document tracked individually  
✅ **Per-Document Retry** - Failed docs can be retried after fixes  
✅ **One Document at a Time** - Atomic processing with rollback capability  
✅ **Sub-Workflow State Tracking** - Each step within a document is tracked  
✅ **Lightweight** - SQLite requires no separate server process  
✅ **ACID Compliant** - Transaction safety for state updates  

---

## 📊 Database Schema

```sql
-- Main workflow tracking table
CREATE TABLE workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_type TEXT NOT NULL,  -- 'guidelines', 'circulars', 'consultations', 'news'
    status TEXT NOT NULL,  -- 'pending', 'running', 'paused', 'completed', 'failed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    config JSON,  -- Workflow-specific configuration
    stats JSON,   -- Aggregate statistics
    error_log TEXT,
    FOREIGN KEY (workflow_type) REFERENCES workflow_types(name)
);

-- Individual document tracking (one row per document)
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL,
    workflow_type TEXT NOT NULL,
    document_ref TEXT NOT NULL,  -- e.g., '26EC6', '25CP11', guideline UUID
    status TEXT NOT NULL,  -- 'pending', 'discovered', 'downloading', 'processing', 'completed', 'failed', 'retry_scheduled'
    
    -- Document metadata (stored as JSON for flexibility)
    metadata JSON,
    
    -- Sub-workflow state tracking
    subworkflow_state JSON,
    
    -- Processing tracking
    current_step TEXT,  -- Current sub-workflow step
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    error_timestamp DATETIME,
    
    -- Timing
    discovered_at DATETIME,
    started_at DATETIME,
    completed_at DATETIME,
    
    -- File paths (stored as JSON array)
    output_files JSON,
    
    -- Retry scheduling
    retry_after DATETIME,
    retry_reason TEXT,
    
    FOREIGN KEY (workflow_id) REFERENCES workflows(id),
    UNIQUE(workflow_id, document_ref)
);

-- Sub-workflow step tracking (detailed per-step state)
CREATE TABLE subworkflow_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    step_name TEXT NOT NULL,  -- e.g., 'fetch_metadata', 'download_pdf', 'convert_html_to_md'
    status TEXT NOT NULL,  -- 'pending', 'running', 'completed', 'failed', 'skipped'
    
    -- Step-specific data
    input_data JSON,
    output_data JSON,
    error_data JSON,
    
    -- Timing
    started_at DATETIME,
    completed_at DATETIME,
    duration_ms INTEGER,
    
    -- Retry info
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    FOREIGN KEY (document_id) REFERENCES documents(id),
    UNIQUE(document_id, step_name)
);

-- Workflow types reference
CREATE TABLE workflow_types (
    name TEXT PRIMARY KEY,
    description TEXT,
    document_ref_pattern TEXT,  -- e.g., 'YYEC##' for circulars
    default_subworkflow JSON  -- Default sub-workflow definition
);

-- System state for resume capability
CREATE TABLE system_state (
    key TEXT PRIMARY KEY,
    value JSON,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 Sub-Workflow Definitions by Document Type

### 1. Guidelines Sub-Workflow

```json
{
  "workflow_type": "guidelines",
  "steps": [
    {
      "step": "scrape_list",
      "name": "Scrape Guidelines List",
      "description": "Fetch and parse HTML page to extract guideline list",
      "handler": "GuidelinesScraper.scrapeList",
      "retryable": true,
      "max_retries": 3
    },
    {
      "step": "extract_metadata",
      "name": "Extract Metadata",
      "description": "Parse HTML to extract guideline ID, title, topics, current PDF URL",
      "handler": "GuidelinesScraper.extractMetadata",
      "depends_on": ["scrape_list"],
      "retryable": true,
      "max_retries": 3
    },
    {
      "step": "check_version_history",
      "name": "Check Version History",
      "description": "Check if guideline has historical versions",
      "handler": "GuidelinesScraper.checkVersionHistory",
      "depends_on": ["extract_metadata"],
      "retryable": true,
      "max_retries": 2
    },
    {
      "step": "download_current_pdf",
      "name": "Download Current PDF",
      "description": "Download current version PDF",
      "handler": "GuidelinesDownloader.downloadCurrentPDF",
      "depends_on": ["extract_metadata"],
      "retryable": true,
      "max_retries": 5,
      "timeout_ms": 60000
    },
    {
      "step": "download_historical_pdfs",
      "name": "Download Historical PDFs",
      "description": "Download all historical version PDFs",
      "handler": "GuidelinesDownloader.downloadHistoricalPDFs",
      "depends_on": ["check_version_history"],
      "condition": "has_version_history",
      "retryable": true,
      "max_retries": 5,
      "timeout_ms": 120000
    },
    {
      "step": "compute_hashes",
      "name": "Compute File Hashes",
      "description": "Compute SHA256 hashes for all downloaded PDFs",
      "handler": "FileProcessor.computeHashes",
      "depends_on": ["download_current_pdf"],
      "retryable": true,
      "max_retries": 2
    },
    {
      "step": "save_metadata",
      "name": "Save Metadata",
      "description": "Save guideline metadata to JSON file",
      "handler": "Storage.saveMetadata",
      "depends_on": ["extract_metadata", "compute_hashes"],
      "retryable": true,
      "max_retries": 3
    },
    {
      "step": "update_index",
      "name": "Update Master Index",
      "description": "Add guideline entry to master index",
      "handler": "IndexManager.updateGuidelinesIndex",
      "depends_on": ["save_metadata"],
      "retryable": true,
      "max_retries": 3
    }
  ]
}
```

### 2. Circulars Sub-Workflow

```json
{
  "workflow_type": "circulars",
  "steps": [
    {
      "step": "search_api",
      "name": "Search Circulars",
      "description": "Query search API to discover circulars for year",
      "handler": "CircularAPI.search",
      "retryable": true,
      "max_retries": 3,
      "timeout_ms": 30000
    },
    {
      "step": "paginate_results",
      "name": "Paginate Results",
      "description": "Handle pagination to get all circulars",
      "handler": "CircularAPI.paginate",
      "depends_on": ["search_api"],
      "retryable": true,
      "max_retries": 3
    },
    {
      "step": "fetch_content_api",
      "name": "Fetch Content Metadata",
      "description": "Get circular content metadata from API",
      "handler": "CircularAPI.getContent",
      "depends_on": ["paginate_results"],
      "retryable": true,
      "max_retries": 3,
      "timeout_ms": 30000
    },
    {
      "step": "download_main_pdf",
      "name": "Download Main PDF",
      "description": "Download circular PDF via openFile API",
      "handler": "CircularDownloader.downloadPDF",
      "depends_on": ["fetch_content_api"],
      "retryable": true,
      "max_retries": 5,
      "timeout_ms": 60000
    },
    {
      "step": "download_html_content",
      "name": "Download HTML Content",
      "description": "Download HTML content (2012+ only)",
      "handler": "CircularDownloader.downloadHTML",
      "depends_on": ["fetch_content_api"],
      "condition": "is_modern_circular",  // year >= 2012
      "retryable": true,
      "max_retries": 3,
      "timeout_ms": 30000
    },
    {
      "step": "convert_to_markdown",
      "name": "Convert HTML to Markdown",
      "description": "Convert circular HTML to Markdown format",
      "handler": "CircularConverter.htmlToMarkdown",
      "depends_on": ["download_html_content"],
      "condition": "has_html_content",
      "retryable": true,
      "max_retries": 2
    },
    {
      "step": "download_appendices",
      "name": "Download Appendices",
      "description": "Download all appendix PDFs if any",
      "handler": "CircularDownloader.downloadAppendices",
      "depends_on": ["fetch_content_api"],
      "condition": "has_appendices",
      "retryable": true,
      "max_retries": 5,
      "timeout_ms": 120000
    },
    {
      "step": "extract_plain_text",
      "name": "Extract Plain Text",
      "description": "Extract plain text from Markdown for indexing",
      "handler": "TextExtractor.extract",
      "depends_on": ["convert_to_markdown"],
      "condition": "has_markdown",
      "retryable": true,
      "max_retries": 2
    },
    {
      "step": "save_metadata",
      "name": "Save Metadata",
      "description": "Save circular metadata to JSON",
      "handler": "Storage.saveCircularMetadata",
      "depends_on": ["download_main_pdf", "download_appendices"],
      "retryable": true,
      "max_retries": 3
    },
    {
      "step": "update_index",
      "name": "Update Master Index",
      "description": "Update circulars index",
      "handler": "IndexManager.updateCircularsIndex",
      "depends_on": ["save_metadata"],
      "retryable": true,
      "max_retries": 3
    }
  ]
}
```

### 3. Consultations Sub-Workflow

```json
{
  "workflow_type": "consultations",
  "steps": [
    {
      "step": "search_api",
      "name": "Search Consultations",
      "description": "Query search API to discover consultations",
      "handler": "ConsultationAPI.search",
      "retryable": true,
      "max_retries": 3,
      "timeout_ms": 30000
    },
    {
      "step": "fetch_content_api",
      "name": "Fetch Content Metadata",
      "description": "Get consultation content metadata",
      "handler": "ConsultationAPI.getContent",
      "depends_on": ["search_api"],
      "retryable": true,
      "max_retries": 3,
      "timeout_ms": 30000
    },
    {
      "step": "download_consultation_pdf",
      "name": "Download Consultation Paper PDF",
      "description": "Download consultation paper PDF",
      "handler": "ConsultationDownloader.downloadConsultationPDF",
      "depends_on": ["fetch_content_api"],
      "retryable": true,
      "max_retries": 5,
      "timeout_ms": 60000
    },
    {
      "step": "download_conclusion_pdf",
      "name": "Download Conclusion Paper PDF",
      "description": "Download conclusion paper PDF (if concluded)",
      "handler": "ConsultationDownloader.downloadConclusionPDF",
      "depends_on": ["fetch_content_api"],
      "condition": "is_concluded",
      "retryable": true,
      "max_retries": 5,
      "timeout_ms": 60000
    },
    {
      "step": "download_html_intro",
      "name": "Download HTML Intro",
      "description": "Download HTML intro text",
      "handler": "ConsultationDownloader.downloadHTML",
      "depends_on": ["fetch_content_api"],
      "retryable": true,
      "max_retries": 3,
      "timeout_ms": 30000
    },
    {
      "step": "download_appendices",
      "name": "Download Appendices",
      "description": "Download appendix PDFs if any",
      "handler": "ConsultationDownloader.downloadAppendices",
      "depends_on": ["fetch_content_api"],
      "condition": "has_appendices",
      "retryable": true,
      "max_retries": 5,
      "timeout_ms": 120000
    },
    {
      "step": "save_metadata",
      "name": "Save Metadata",
      "description": "Save consultation metadata",
      "handler": "Storage.saveConsultationMetadata",
      "depends_on": ["download_consultation_pdf", "download_conclusion_pdf"],
      "retryable": true,
      "max_retries": 3
    },
    {
      "step": "update_index",
      "name": "Update Master Index",
      "description": "Update consultations index",
      "handler": "IndexManager.updateConsultationsIndex",
      "depends_on": ["save_metadata"],
      "retryable": true,
      "max_retries": 3
    }
  ]
}
```

### 4. News Sub-Workflow

```json
{
  "workflow_type": "news",
  "steps": [
    {
      "step": "search_api",
      "name": "Search News",
      "description": "Query search API to discover news articles",
      "handler": "NewsAPI.search",
      "retryable": true,
      "max_retries": 3,
      "timeout_ms": 30000
    },
    {
      "step": "paginate_results",
      "name": "Paginate Results",
      "description": "Handle pagination for large result sets",
      "handler": "NewsAPI.paginate",
      "depends_on": ["search_api"],
      "retryable": true,
      "max_retries": 3
    },
    {
      "step": "fetch_content_api",
      "name": "Fetch Content",
      "description": "Get news content metadata and HTML",
      "handler": "NewsAPI.getContent",
      "depends_on": ["paginate_results"],
      "retryable": true,
      "max_retries": 3,
      "timeout_ms": 30000
    },
    {
      "step": "download_html",
      "name": "Download HTML",
      "description": "Download raw HTML content",
      "handler": "NewsDownloader.downloadHTML",
      "depends_on": ["fetch_content_api"],
      "retryable": true,
      "max_retries": 3,
      "timeout_ms": 30000
    },
    {
      "step": "convert_to_markdown",
      "name": "Convert to Markdown",
      "description": "Convert HTML to Markdown",
      "handler": "NewsConverter.htmlToMarkdown",
      "depends_on": ["download_html"],
      "retryable": true,
      "max_retries": 2
    },
    {
      "step": "extract_plain_text",
      "name": "Extract Plain Text",
      "description": "Extract plain text for search indexing",
      "handler": "TextExtractor.extract",
      "depends_on": ["download_html"],
      "retryable": true,
      "max_retries": 2
    },
    {
      "step": "download_images",
      "name": "Download Images",
      "description": "Download embedded images if any",
      "handler": "NewsDownloader.downloadImages",
      "depends_on": ["fetch_content_api"],
      "condition": "has_images",
      "retryable": true,
      "max_retries": 5,
      "timeout_ms": 120000,
      "continue_on_error": true  // Don't fail entire workflow if images fail
    },
    {
      "step": "download_appendices",
      "name": "Download Appendices",
      "description": "Download appendix PDFs if any",
      "handler": "NewsDownloader.downloadAppendices",
      "depends_on": ["fetch_content_api"],
      "condition": "has_appendices",
      "retryable": true,
      "max_retries": 5,
      "timeout_ms": 60000
    },
    {
      "step": "save_metadata",
      "name": "Save Metadata",
      "description": "Save news metadata",
      "handler": "Storage.saveNewsMetadata",
      "depends_on": ["download_html", "convert_to_markdown"],
      "retryable": true,
      "max_retries": 3
    },
    {
      "step": "update_index",
      "name": "Update Master Index",
      "description": "Update news index",
      "handler": "IndexManager.updateNewsIndex",
      "depends_on": ["save_metadata"],
      "retryable": true,
      "max_retries": 3
    }
  ]
}
```

---

## 🎛️ State Machine for Document Processing

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   pending   │────▶│  discovered  │────▶│  downloading │
└─────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  completed  │◀────│  processing  │◀────│    failed    │
└─────────────┘     └──────────────┘     └──────────────┘
      ▲                    │                     │
      └────────────────────┴─────────────────────┘
                           │
                    ┌──────┴──────┐
                    │ retry_scheduled │
                    └─────────────┘
```

### State Transitions

| From | To | Trigger |
|------|-----|---------|
| `pending` | `discovered` | Document discovered in search/scrape |
| `discovered` | `downloading` | Download started |
| `downloading` | `processing` | Download complete, processing started |
| `processing` | `completed` | All sub-workflow steps complete |
| `processing` | `failed` | Error in any step |
| `failed` | `retry_scheduled` | Retry scheduled after fix |
| `retry_scheduled` | `downloading` | Retry initiated |
| `any` | `paused` | User pause command |
| `paused` | `downloading` | User resume command |

---

## 🔄 Retry Logic & Error Handling

### Retry Configuration

```javascript
const RetryPolicy = {
  // Exponential backoff: delay = baseDelay * (2 ^ attempt)
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  
  // Max retries per step (from subworkflow definition)
  defaultMaxRetries: 3,
  
  // Retriable HTTP status codes
  retriableStatusCodes: [408, 429, 500, 502, 503, 504],
  
  // Non-retriable errors (fail immediately)
  nonRetriableErrors: [
    'ENOTFOUND',      // DNS lookup failed
    'EACCES',         // Permission denied
    'PARSE_ERROR',    // Data format error
    'VALIDATION_ERROR'
  ],
  
  // Should we continue with other steps if this one fails?
  continueOnError: {
    'download_images': true,      // News images are optional
    'download_appendices': false,  // Appendices are required
  }
};
```

### Retry Process

```javascript
async function executeWithRetry(step, document, attempt = 0) {
  const stepDef = getStepDefinition(step);
  const maxRetries = stepDef.max_retries || RetryPolicy.defaultMaxRetries;
  
  try {
    // Update step status to running
    await updateStepStatus(document.id, step, 'running');
    
    // Execute step
    const result = await executeStep(step, document);
    
    // Success - mark completed
    await updateStepStatus(document.id, step, 'completed', {
      output_data: result,
      completed_at: new Date().toISOString()
    });
    
    return result;
    
  } catch (error) {
    // Check if retriable
    if (!isRetriableError(error) || attempt >= maxRetries) {
      // Non-retriable or max retries reached - fail
      await updateStepStatus(document.id, step, 'failed', {
        error_data: serializeError(error),
        retry_count: attempt
      });
      
      // Check if we should continue
      if (stepDef.continue_on_error) {
        console.warn(`Step ${step} failed but continuing: ${error.message}`);
        return null;  // Continue with null result
      } else {
        throw error;  // Fail the entire document
      }
    }
    
    // Calculate backoff delay
    const delay = Math.min(
      RetryPolicy.baseDelayMs * Math.pow(2, attempt),
      RetryPolicy.maxDelayMs
    );
    
    console.log(`Retry ${step} after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
    await sleep(delay);
    
    // Retry
    return executeWithRetry(step, document, attempt + 1);
  }
}
```

---

## 🚀 Usage Examples

### Starting a New Workflow

```javascript
// Initialize workflow
const workflowId = await workflowManager.createWorkflow('circulars', {
  mode: 'full_download',  // or 'update_check'
  years: [2000, 2001, 2002, ..., 2026],  // All years for full download
  languages: ['EN'],
  download_history: true,
  convert_to_markdown: true
});

// Start processing
await workflowManager.startWorkflow(workflowId);
```

### Processing Documents One-by-One

```javascript
// Get next pending document
async function processNextDocument(workflowId) {
  const document = await db.get(
    `SELECT * FROM documents 
     WHERE workflow_id = ? AND status = 'pending' 
     ORDER BY discovered_at ASC 
     LIMIT 1`,
    workflowId
  );
  
  if (!document) {
    console.log('No more pending documents');
    return null;
  }
  
  // Update status to downloading
  await db.run(
    `UPDATE documents SET status = 'downloading', started_at = ? WHERE id = ?`,
    [new Date().toISOString(), document.id]
  );
  
  try {
    // Process all sub-workflow steps
    await processSubWorkflow(document);
    
    // Mark completed
    await db.run(
      `UPDATE documents SET status = 'completed', completed_at = ? WHERE id = ?`,
      [new Date().toISOString(), document.id]
    );
    
    return document;
    
  } catch (error) {
    // Mark failed
    await db.run(
      `UPDATE documents SET status = 'failed', last_error = ?, error_timestamp = ? WHERE id = ?`,
      [error.message, new Date().toISOString(), document.id]
    );
    
    throw error;
  }
}
```

### Pausing and Resuming

```javascript
// Pause workflow
async function pauseWorkflow(workflowId) {
  await db.run(
    `UPDATE workflows SET status = 'paused', updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), workflowId]
  );
  
  // Save current position
  const currentDoc = await db.get(
    `SELECT document_ref FROM documents 
     WHERE workflow_id = ? AND status IN ('downloading', 'processing') 
     LIMIT 1`,
    workflowId
  );
  
  await db.run(
    `INSERT OR REPLACE INTO system_state (key, value) 
     VALUES (?, ?)`,
    [`workflow_${workflowId}_paused_at`, JSON.stringify({
      document_ref: currentDoc?.document_ref,
      timestamp: new Date().toISOString()
    })]
  );
}

// Resume workflow
async function resumeWorkflow(workflowId) {
  // Update status back to running
  await db.run(
    `UPDATE workflows SET status = 'running', started_at = ? WHERE id = ?`,
    [new Date().toISOString(), workflowId]
  );
  
  // Get the document that was being processed
  const state = await db.get(
    `SELECT value FROM system_state WHERE key = ?`,
    `workflow_${workflowId}_paused_at`
  );
  
  if (state) {
    const pausedState = JSON.parse(state.value);
    console.log(`Resuming from document: ${pausedState.document_ref}`);
    
    // Reset the document status to allow reprocessing
    await db.run(
      `UPDATE documents SET status = 'pending' 
       WHERE workflow_id = ? AND document_ref = ?`,
      [workflowId, pausedState.document_ref]
    );
  }
}
```

### Retrying Failed Documents

```javascript
// Retry a specific failed document
async function retryDocument(documentId, reason = 'manual_retry') {
  const document = await db.get(
    `SELECT * FROM documents WHERE id = ?`,
    documentId
  );
  
  if (document.status !== 'failed') {
    throw new Error(`Document ${documentId} is not in failed state: ${document.status}`);
  }
  
  // Increment retry count
  await db.run(
    `UPDATE documents 
     SET status = 'retry_scheduled',
         retry_count = retry_count + 1,
         retry_after = ?,
         retry_reason = ?,
         last_error = NULL,
         error_timestamp = NULL
     WHERE id = ?`,
    [new Date().toISOString(), reason, documentId]
  );
  
  // Reset all failed steps to pending
  await db.run(
    `UPDATE subworkflow_steps 
     SET status = 'pending', retry_count = retry_count + 1
     WHERE document_id = ? AND status = 'failed'`,
    documentId
  );
  
  console.log(`Scheduled retry for document ${document.document_ref}`);
}

// Retry all failed documents in a workflow
async function retryAllFailed(workflowId) {
  const failed = await db.all(
    `SELECT id FROM documents WHERE workflow_id = ? AND status = 'failed'`,
    workflowId
  );
  
  for (const doc of failed) {
    await retryDocument(doc.id, 'batch_retry_after_fix');
  }
  
  console.log(`Scheduled ${failed.length} documents for retry`);
}
```

---

## 📊 Monitoring & Reporting

### Workflow Status Query

```sql
-- Get workflow progress
SELECT 
    w.workflow_type,
    w.status as workflow_status,
    COUNT(d.id) as total_docs,
    SUM(CASE WHEN d.status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN d.status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN d.status = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN d.status = 'downloading' THEN 1 ELSE 0 END) as downloading,
    SUM(CASE WHEN d.status = 'processing' THEN 1 ELSE 0 END) as processing,
    SUM(CASE WHEN d.status = 'retry_scheduled' THEN 1 ELSE 0 END) as retry_scheduled,
    MIN(d.discovered_at) as first_discovered,
    MAX(d.completed_at) as last_completed
FROM workflows w
LEFT JOIN documents d ON w.id = d.workflow_id
WHERE w.id = ?
GROUP BY w.id;
```

### Sub-Workflow Step Report

```sql
-- Get step completion status for a workflow
SELECT 
    step_name,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
    AVG(duration_ms) as avg_duration_ms
FROM subworkflow_steps
WHERE document_id IN (
    SELECT id FROM documents WHERE workflow_id = ?
)
GROUP BY step_name
ORDER BY step_name;
```

### Failed Documents Report

```sql
-- Get all failed documents with error details
SELECT 
    d.document_ref,
    d.workflow_type,
    d.metadata->>'title' as title,
    d.retry_count,
    d.last_error,
    d.error_timestamp,
    GROUP_CONCAT(ss.step_name) as failed_steps
FROM documents d
LEFT JOIN subworkflow_steps ss ON d.id = ss.document_id AND ss.status = 'failed'
WHERE d.workflow_id = ? AND d.status = 'failed'
GROUP BY d.id
ORDER BY d.error_timestamp DESC;
```

---

## 🛠️ Implementation Structure

```
sfc-fetch/
├── src/
│   ├── database/
│   │   ├── schema.sql          # Database schema
│   │   ├── migrations/         # Schema migrations
│   │   └── connection.js       # SQLite connection management
│   │
│   ├── workflows/
│   │   ├── base-workflow.js    # Abstract base class
│   │   ├── guidelines-workflow.js
│   │   ├── circulars-workflow.js
│   │   ├── consultations-workflow.js
│   │   └── news-workflow.js
│   │
│   ├── subworkflows/
│   │   ├── step-executor.js    # Step execution engine
│   │   ├── retry-manager.js    # Retry logic
│   │   └── definitions/        # JSON step definitions
│   │       ├── guidelines.json
│   │       ├── circulars.json
│   │       ├── consultations.json
│   │       └── news.json
│   │
│   ├── handlers/
│   │   ├── api/               # API clients
│   │   │   ├── circular-api.js
│   │   │   ├── consultation-api.js
│   │   │   ├── news-api.js
│   │   │   └── guidelines-scraper.js
│   │   ├── downloaders/       # Download logic
│   │   ├── converters/        # HTML to Markdown, etc.
│   │   └── storage/           # File storage
│   │
│   ├── state/
│   │   ├── workflow-manager.js
│   │   ├── document-tracker.js
│   │   └── resume-handler.js
│   │
│   └── cli/
│       ├── commands/
│       │   ├── start.js
│       │   ├── pause.js
│       │   ├── resume.js
│       │   ├── retry.js
│       │   └── status.js
│       └── index.js
│
├── data/
│   ├── sfc-fetch.db           # SQLite database
│   ├── guidelines/
│   ├── circulars/
│   ├── consultations/
│   └── news/
│
└── config/
    └── workflows.json         # Default workflow configs
```

---

## 📝 Configuration Example

```json
{
  "database": {
    "path": "./data/sfc-fetch.db",
    "busy_timeout": 5000,
    "journal_mode": "WAL"
  },
  
  "workflows": {
    "guidelines": {
      "enabled": true,
      "concurrency": 1,
      "rate_limit": {
        "requests_per_second": 1,
        "delay_ms": 1000
      },
      "languages": ["EN", "TC"],
      "download_history": true
    },
    
    "circulars": {
      "enabled": true,
      "concurrency": 1,
      "rate_limit": {
        "requests_per_second": 2,
        "delay_ms": 500
      },
      "languages": ["EN"],
      "years": "all",
      "download_history": true,
      "convert_to_markdown": true
    },
    
    "consultations": {
      "enabled": true,
      "concurrency": 1,
      "rate_limit": {
        "requests_per_second": 2,
        "delay_ms": 500
      },
      "languages": ["EN"],
      "download_conclusions": true
    },
    
    "news": {
      "enabled": true,
      "concurrency": 1,
      "rate_limit": {
        "requests_per_second": 2,
        "delay_ms": 500
      },
      "languages": ["EN"],
      "download_images": true,
      "convert_to_markdown": true
    }
  },
  
  "retry": {
    "max_retries": 3,
    "base_delay_ms": 1000,
    "max_delay_ms": 30000,
    "retriable_status_codes": [408, 429, 500, 502, 503, 504]
  }
}
```

---

## ✅ Checklist for Implementation

### Database Layer
- [ ] SQLite schema creation
- [ ] Connection pooling/management
- [ ] JSON field handling
- [ ] Migration system

### Workflow Engine
- [ ] Base workflow class
- [ ] Workflow-specific implementations
- [ ] State machine implementation
- [ ] Pause/resume logic

### Step Execution
- [ ] Step executor engine
- [ ] Dependency resolution
- [ ] Condition evaluation
- [ ] Parallel step support (where safe)

### Retry System
- [ ] Retry policy configuration
- [ ] Exponential backoff
- [ ] Error classification
- [ ] Manual retry interface

### CLI Interface
- [ ] Start workflow command
- [ ] Pause/resume commands
- [ ] Retry commands (single/batch)
- [ ] Status/monitoring commands
- [ ] Progress reporting

### Error Handling
- [ ] Comprehensive error logging
- [ ] Failed document quarantine
- [ ] Error analysis tools
- [ ] Fix and retry workflow

---

*Ready for implementation. This system provides complete state management for reliable, resumable, and retryable document processing.*
