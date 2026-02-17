-- SFC-Fetch State Management Database Schema
-- SQLite with JSON1 extension support

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;

-- Workflow types reference table
CREATE TABLE workflow_types (
    name TEXT PRIMARY KEY,
    description TEXT,
    document_ref_pattern TEXT,
    default_subworkflow JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert workflow type definitions
INSERT INTO workflow_types (name, description, document_ref_pattern, default_subworkflow) VALUES
('guidelines', 'SFC Guidelines from main website (HTML scraping)', 'UUID', 
 '{
  "steps": [
    {"step": "scrape_list", "name": "Scrape Guidelines List", "max_retries": 3},
    {"step": "extract_metadata", "name": "Extract Metadata", "depends_on": ["scrape_list"], "max_retries": 3},
    {"step": "check_version_history", "name": "Check Version History", "depends_on": ["extract_metadata"], "max_retries": 2},
    {"step": "download_current_pdf", "name": "Download Current PDF", "depends_on": ["extract_metadata"], "max_retries": 5, "timeout_ms": 60000},
    {"step": "download_historical_pdfs", "name": "Download Historical PDFs", "depends_on": ["check_version_history"], "condition": "has_version_history", "max_retries": 5, "timeout_ms": 120000},
    {"step": "compute_hashes", "name": "Compute File Hashes", "depends_on": ["download_current_pdf"], "max_retries": 2},
    {"step": "save_metadata", "name": "Save Metadata", "depends_on": ["extract_metadata", "compute_hashes"], "max_retries": 3},
    {"step": "update_index", "name": "Update Master Index", "depends_on": ["save_metadata"], "max_retries": 3}
  ]
 }'),

('circulars', 'SFC Circulars from e-Distribution API', 'YYEC##|H###',
 '{
  "steps": [
    {"step": "search_api", "name": "Search Circulars", "max_retries": 3, "timeout_ms": 30000},
    {"step": "paginate_results", "name": "Paginate Results", "depends_on": ["search_api"], "max_retries": 3},
    {"step": "fetch_content_api", "name": "Fetch Content Metadata", "depends_on": ["paginate_results"], "max_retries": 3, "timeout_ms": 30000},
    {"step": "download_main_pdf", "name": "Download Main PDF", "depends_on": ["fetch_content_api"], "max_retries": 5, "timeout_ms": 60000},
    {"step": "download_html_content", "name": "Download HTML Content", "depends_on": ["fetch_content_api"], "condition": "is_modern_circular", "max_retries": 3, "timeout_ms": 30000},
    {"step": "convert_to_markdown", "name": "Convert HTML to Markdown", "depends_on": ["download_html_content"], "condition": "has_html_content", "max_retries": 2},
    {"step": "download_appendices", "name": "Download Appendices", "depends_on": ["fetch_content_api"], "condition": "has_appendices", "max_retries": 5, "timeout_ms": 120000},
    {"step": "extract_plain_text", "name": "Extract Plain Text", "depends_on": ["convert_to_markdown"], "condition": "has_markdown", "max_retries": 2},
    {"step": "save_metadata", "name": "Save Metadata", "depends_on": ["download_main_pdf", "download_appendices"], "max_retries": 3},
    {"step": "update_index", "name": "Update Master Index", "depends_on": ["save_metadata"], "max_retries": 3}
  ]
 }'),

('consultations', 'SFC Consultations from e-Distribution API', 'YYCP##',
 '{
  "steps": [
    {"step": "search_api", "name": "Search Consultations", "max_retries": 3, "timeout_ms": 30000},
    {"step": "fetch_content_api", "name": "Fetch Content Metadata", "depends_on": ["search_api"], "max_retries": 3, "timeout_ms": 30000},
    {"step": "download_consultation_pdf", "name": "Download Consultation Paper PDF", "depends_on": ["fetch_content_api"], "max_retries": 5, "timeout_ms": 60000},
    {"step": "download_conclusion_pdf", "name": "Download Conclusion Paper PDF", "depends_on": ["fetch_content_api"], "condition": "is_concluded", "max_retries": 5, "timeout_ms": 60000},
    {"step": "download_html_intro", "name": "Download HTML Intro", "depends_on": ["fetch_content_api"], "max_retries": 3, "timeout_ms": 30000},
    {"step": "download_appendices", "name": "Download Appendices", "depends_on": ["fetch_content_api"], "condition": "has_appendices", "max_retries": 5, "timeout_ms": 120000},
    {"step": "save_metadata", "name": "Save Metadata", "depends_on": ["download_consultation_pdf", "download_conclusion_pdf"], "max_retries": 3},
    {"step": "update_index", "name": "Update Master Index", "depends_on": ["save_metadata"], "max_retries": 3}
  ]
 }'),

('news', 'SFC News from e-Distribution API', 'YYPR##',
 '{
  "steps": [
    {"step": "search_api", "name": "Search News", "max_retries": 3, "timeout_ms": 30000},
    {"step": "paginate_results", "name": "Paginate Results", "depends_on": ["search_api"], "max_retries": 3},
    {"step": "fetch_content_api", "name": "Fetch Content", "depends_on": ["paginate_results"], "max_retries": 3, "timeout_ms": 30000},
    {"step": "download_html", "name": "Download HTML", "depends_on": ["fetch_content_api"], "max_retries": 3, "timeout_ms": 30000},
    {"step": "convert_to_markdown", "name": "Convert to Markdown", "depends_on": ["download_html"], "max_retries": 2},
    {"step": "extract_plain_text", "name": "Extract Plain Text", "depends_on": ["download_html"], "max_retries": 2},
    {"step": "download_images", "name": "Download Images", "depends_on": ["fetch_content_api"], "condition": "has_images", "max_retries": 5, "timeout_ms": 120000, "continue_on_error": true},
    {"step": "download_appendices", "name": "Download Appendices", "depends_on": ["fetch_content_api"], "condition": "has_appendices", "max_retries": 5, "timeout_ms": 60000},
    {"step": "save_metadata", "name": "Save Metadata", "depends_on": ["download_html", "convert_to_markdown"], "max_retries": 3},
    {"step": "update_index", "name": "Update Master Index", "depends_on": ["save_metadata"], "max_retries": 3}
  ]
 }');

-- Main workflow tracking table
CREATE TABLE workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
    mode TEXT CHECK (mode IN ('full_download', 'update_check')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    config JSON,
    stats JSON,
    error_log TEXT,
    FOREIGN KEY (workflow_type) REFERENCES workflow_types(name)
);

-- Create index on workflow status
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_type ON workflows(workflow_type);

-- Individual document tracking (one row per document)
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL,
    workflow_type TEXT NOT NULL,
    document_ref TEXT NOT NULL,  -- e.g., '26EC6', '25CP11', guideline UUID
    status TEXT NOT NULL CHECK (status IN ('pending', 'discovered', 'downloading', 'processing', 'completed', 'failed', 'retry_scheduled', 'paused')),
    
    -- Document metadata (stored as JSON for flexibility)
    metadata JSON,
    
    -- Sub-workflow state tracking
    subworkflow_state JSON,
    
    -- Processing tracking
    current_step TEXT,
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
    
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (workflow_type) REFERENCES workflow_types(name),
    UNIQUE(workflow_id, document_ref)
);

-- Create indexes for document queries
CREATE INDEX idx_documents_workflow ON documents(workflow_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_ref ON documents(document_ref);
CREATE INDEX idx_documents_workflow_status ON documents(workflow_id, status);

-- Sub-workflow step tracking (detailed per-step state)
CREATE TABLE subworkflow_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    
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
    
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    UNIQUE(document_id, step_name)
);

-- Create indexes for step queries
CREATE INDEX idx_steps_document ON subworkflow_steps(document_id);
CREATE INDEX idx_steps_status ON subworkflow_steps(status);

-- System state for resume capability and other system-level data
CREATE TABLE system_state (
    key TEXT PRIMARY KEY,
    value JSON,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for system state lookups
CREATE INDEX idx_system_state_key ON system_state(key);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_workflows_timestamp 
AFTER UPDATE ON workflows
BEGIN
    UPDATE workflows SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to log document status changes
CREATE TRIGGER log_document_status_change
AFTER UPDATE OF status ON documents
WHEN OLD.status != NEW.status
BEGIN
    INSERT INTO system_state (key, value)
    VALUES (
        'document_status_log_' || datetime('now'),
        json_object(
            'document_id', NEW.id,
            'document_ref', NEW.document_ref,
            'old_status', OLD.status,
            'new_status', NEW.status,
            'timestamp', datetime('now')
        )
    );
END;

-- Views for common queries

-- Workflow progress view
CREATE VIEW workflow_progress AS
SELECT 
    w.id as workflow_id,
    w.workflow_type,
    w.status as workflow_status,
    w.mode,
    COUNT(d.id) as total_docs,
    SUM(CASE WHEN d.status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN d.status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN d.status = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN d.status = 'downloading' THEN 1 ELSE 0 END) as downloading,
    SUM(CASE WHEN d.status = 'processing' THEN 1 ELSE 0 END) as processing,
    SUM(CASE WHEN d.status = 'retry_scheduled' THEN 1 ELSE 0 END) as retry_scheduled,
    MIN(d.discovered_at) as first_discovered,
    MAX(d.completed_at) as last_completed,
    ROUND(
        100.0 * SUM(CASE WHEN d.status = 'completed' THEN 1 ELSE 0 END) / COUNT(d.id),
        2
    ) as completion_percentage
FROM workflows w
LEFT JOIN documents d ON w.id = d.workflow_id
GROUP BY w.id;

-- Failed documents view
CREATE VIEW failed_documents AS
SELECT 
    d.id as document_id,
    d.workflow_id,
    d.workflow_type,
    d.document_ref,
    d.metadata->>'title' as title,
    d.retry_count,
    d.last_error,
    d.error_timestamp,
    d.discovered_at,
    json_group_array(DISTINCT ss.step_name) as failed_steps
FROM documents d
LEFT JOIN subworkflow_steps ss ON d.id = ss.document_id AND ss.status = 'failed'
WHERE d.status = 'failed'
GROUP BY d.id
ORDER BY d.error_timestamp DESC;

-- Step completion statistics view
CREATE VIEW step_statistics AS
SELECT 
    d.workflow_id,
    ss.step_name,
    COUNT(*) as total_executions,
    SUM(CASE WHEN ss.status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN ss.status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN ss.status = 'skipped' THEN 1 ELSE 0 END) as skipped,
    AVG(ss.duration_ms) as avg_duration_ms,
    MIN(ss.duration_ms) as min_duration_ms,
    MAX(ss.duration_ms) as max_duration_ms
FROM subworkflow_steps ss
JOIN documents d ON ss.document_id = d.id
GROUP BY d.workflow_id, ss.step_name
ORDER BY d.workflow_id, ss.step_name;

-- Active documents view (currently being processed)
CREATE VIEW active_documents AS
SELECT 
    d.id as document_id,
    d.workflow_id,
    d.workflow_type,
    d.document_ref,
    d.status,
    d.current_step,
    d.started_at,
    d.metadata->>'title' as title,
    datetime('now') as current_time,
    CASE 
        WHEN d.started_at IS NOT NULL 
        THEN (julianday('now') - julianday(d.started_at)) * 24 * 60 * 60
        ELSE NULL 
    END as processing_seconds
FROM documents d
WHERE d.status IN ('downloading', 'processing', 'running');
