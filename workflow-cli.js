#!/usr/bin/env node
/**
 * SFC-Fetch State-Managed Workflow System
 * 
 * This is a practical implementation example showing:
 * 1. Database initialization
 * 2. Workflow creation and execution
 * 3. Stop/resume functionality
 * 4. Per-document retry logic
 * 5. Progress monitoring
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  database: {
    path: './data/sfc-fetch.db',
    busyTimeout: 5000
  },
  retry: {
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    defaultMaxRetries: 3,
    retriableStatusCodes: [408, 429, 500, 502, 503, 504]
  },
  rateLimit: {
    requestsPerSecond: 2,
    delayMs: 500
  }
};

// ============================================================================
// Database Manager
// ============================================================================

class DatabaseManager {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else {
          this.db.run('PRAGMA busy_timeout = ' + CONFIG.database.busyTimeout);
          resolve(this);
        }
      });
    });
  }

  async initSchema() {
    const schema = await fs.readFile('./schema.sql', 'utf8');
    const statements = schema.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      await this.run(statement);
    }
    console.log('✅ Database schema initialized');
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// ============================================================================
// Workflow Manager
// ============================================================================

class WorkflowManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflowType, config) {
    const result = await this.db.run(
      `INSERT INTO workflows (workflow_type, status, mode, config, stats) 
       VALUES (?, 'pending', ?, ?, ?)`,
      [
        workflowType,
        config.mode || 'full_download',
        JSON.stringify(config),
        JSON.stringify({ total: 0, completed: 0, failed: 0 })
      ]
    );

    console.log(`✅ Created ${workflowType} workflow #${result.lastID}`);
    return result.lastID;
  }

  /**
   * Start workflow execution
   */
  async startWorkflow(workflowId) {
    await this.db.run(
      `UPDATE workflows SET status = 'running', started_at = datetime('now') 
       WHERE id = ?`,
      workflowId
    );

    console.log(`🚀 Started workflow #${workflowId}`);
    
    // Load workflow config
    const workflow = await this.db.get(
      `SELECT * FROM workflows WHERE id = ?`,
      workflowId
    );
    
    const config = JSON.parse(workflow.config);
    
    // Execute based on workflow type
    switch (workflow.workflow_type) {
      case 'circulars':
        await this.executeCircularsWorkflow(workflowId, config);
        break;
      case 'consultations':
        await this.executeConsultationsWorkflow(workflowId, config);
        break;
      case 'news':
        await this.executeNewsWorkflow(workflowId, config);
        break;
      case 'guidelines':
        await this.executeGuidelinesWorkflow(workflowId, config);
        break;
      default:
        throw new Error(`Unknown workflow type: ${workflow.workflow_type}`);
    }
  }

  /**
   * Pause a running workflow
   */
  async pauseWorkflow(workflowId) {
    // Update workflow status
    await this.db.run(
      `UPDATE workflows SET status = 'paused' WHERE id = ?`,
      workflowId
    );

    // Get current document being processed
    const currentDoc = await this.db.get(
      `SELECT id, document_ref, status, current_step 
       FROM documents 
       WHERE workflow_id = ? AND status IN ('downloading', 'processing', 'running')
       ORDER BY started_at DESC
       LIMIT 1`,
      workflowId
    );

    if (currentDoc) {
      // Pause the current document
      await this.db.run(
        `UPDATE documents SET status = 'paused' WHERE id = ?`,
        currentDoc.id
      );

      // Save pause state
      await this.db.run(
        `INSERT OR REPLACE INTO system_state (key, value, updated_at) 
         VALUES (?, ?, datetime('now'))`,
        [
          `workflow_${workflowId}_pause_state`,
          JSON.stringify({
            paused_at: new Date().toISOString(),
            document_id: currentDoc.id,
            document_ref: currentDoc.document_ref,
            current_step: currentDoc.current_step,
            document_status: currentDoc.status
          })
        ]
      );

      console.log(`⏸️  Paused workflow #${workflowId} at document ${currentDoc.document_ref} (step: ${currentDoc.current_step})`);
    } else {
      console.log(`⏸️  Paused workflow #${workflowId} (no active document)`);
    }
  }

  /**
   * Resume a paused workflow
   */
  async resumeWorkflow(workflowId) {
    // Get pause state
    const pauseState = await this.db.get(
      `SELECT value FROM system_state WHERE key = ?`,
      `workflow_${workflowId}_pause_state`
    );

    if (pauseState) {
      const state = JSON.parse(pauseState.value);
      
      // Reset the paused document
      await this.db.run(
        `UPDATE documents 
         SET status = 'pending', 
             current_step = NULL,
             started_at = NULL
         WHERE id = ?`,
        state.document_id
      );

      // Clear step states for the current document to allow restart
      await this.db.run(
        `UPDATE subworkflow_steps 
         SET status = 'pending', 
             started_at = NULL,
             completed_at = NULL
         WHERE document_id = ? AND status = 'running'`,
        state.document_id
      );

      console.log(`▶️  Resuming workflow #${workflowId} from document ${state.document_ref}`);
    }

    // Update workflow status back to running
    await this.db.run(
      `UPDATE workflows SET status = 'running' WHERE id = ?`,
      workflowId
    );

    // Continue execution
    const workflow = await this.db.get(
      `SELECT * FROM workflows WHERE id = ?`,
      workflowId
    );
    
    const config = JSON.parse(workflow.config);
    
    switch (workflow.workflow_type) {
      case 'circulars':
        await this.executeCircularsWorkflow(workflowId, config, true);  // true = resume mode
        break;
      case 'consultations':
        await this.executeConsultationsWorkflow(workflowId, config, true);
        break;
      case 'news':
        await this.executeNewsWorkflow(workflowId, config, true);
        break;
      case 'guidelines':
        await this.executeGuidelinesWorkflow(workflowId, config, true);
        break;
    }
  }

  /**
   * Execute circulars workflow
   */
  async executeCircularsWorkflow(workflowId, config, isResume = false) {
    console.log(`\n📋 Executing Circulars Workflow #${workflowId}`);
    console.log(`   Mode: ${config.mode}`);
    console.log(`   Years: ${config.years?.join(', ') || 'all'}`);
    console.log(`   Resume: ${isResume}\n`);

    // Discovery phase (only if not resuming)
    if (!isResume) {
      await this.discoverCirculars(workflowId, config);
    }

    // Process documents one by one
    let hasMore = true;
    let processed = 0;
    let failed = 0;

    while (hasMore) {
      // Check if workflow should pause
      const workflow = await this.db.get(
        `SELECT status FROM workflows WHERE id = ?`,
        workflowId
      );
      
      if (workflow.status === 'paused') {
        console.log('⏸️  Workflow paused by user');
        return;
      }

      // Get next pending document
      const document = await this.db.get(
        `SELECT * FROM documents 
         WHERE workflow_id = ? AND status = 'pending' 
         ORDER BY discovered_at ASC 
         LIMIT 1`,
        workflowId
      );

      if (!document) {
        hasMore = false;
        break;
      }

      try {
        await this.processCircularDocument(document, config);
        processed++;
      } catch (error) {
        failed++;
        console.error(`❌ Failed to process ${document.document_ref}: ${error.message}`);
        
        // Mark as failed
        await this.db.run(
          `UPDATE documents 
           SET status = 'failed', 
               last_error = ?,
               error_timestamp = datetime('now')
           WHERE id = ?`,
          [error.message, document.id]
        );
      }

      // Progress update every 10 documents
      if (processed % 10 === 0) {
        await this.printProgress(workflowId);
      }

      // Rate limiting
      await this.sleep(CONFIG.rateLimit.delayMs);
    }

    // Mark workflow completed
    await this.db.run(
      `UPDATE workflows 
       SET status = 'completed', 
           completed_at = datetime('now'),
           stats = ?
       WHERE id = ?`,
      [JSON.stringify({ processed, failed }), workflowId]
    );

    console.log(`\n✅ Workflow #${workflowId} completed: ${processed} processed, ${failed} failed`);
  }

  /**
   * Discover circulars via API and create document records
   */
  async discoverCirculars(workflowId, config) {
    console.log('🔍 Discovering circulars...');
    
    const years = config.years || ['2026'];  // Default to current year
    let discovered = 0;

    for (const year of years) {
      console.log(`  Fetching year ${year}...`);
      
      let pageNo = 0;
      let hasMore = true;

      while (hasMore) {
        try {
          // Simulated API call - replace with actual implementation
          const response = await this.searchCircularsAPI({
            lang: config.lang || 'EN',
            year: year,
            pageNo: pageNo,
            pageSize: 50
          });

          for (const item of response.items) {
            // Check if already exists
            const existing = await this.db.get(
              `SELECT id FROM documents WHERE workflow_id = ? AND document_ref = ?`,
              [workflowId, item.refNo]
            );

            if (!existing) {
              // Create document record
              await this.db.run(
                `INSERT INTO documents 
                 (workflow_id, workflow_type, document_ref, status, metadata, discovered_at)
                 VALUES (?, 'circulars', ?, 'pending', ?, datetime('now'))`,
                [
                  workflowId,
                  item.refNo,
                  JSON.stringify({
                    refNo: item.refNo,
                    title: item.title,
                    releasedDate: item.releasedDate,
                    year: year,
                    postDocType: item.postDocType,
                    hasAppendix: item.appendixDocList && item.appendixDocList.length > 0,
                    appendixCount: item.appendixDocList?.length || 0
                  })
                ]
              );
              discovered++;
            }
          }

          // Check pagination
          const totalPages = Math.ceil(response.total / 50);
          hasMore = pageNo < totalPages - 1;
          pageNo++;

          await this.sleep(CONFIG.rateLimit.delayMs);

        } catch (error) {
          console.error(`  Error fetching year ${year}, page ${pageNo}: ${error.message}`);
          hasMore = false;
        }
      }
    }

    console.log(`✅ Discovered ${discovered} circulars\n`);
  }

  /**
   * Process a single circular document through all sub-workflow steps
   */
  async processCircularDocument(document, config) {
    console.log(`📄 Processing ${document.document_ref}: ${document.metadata?.title?.substring(0, 60)}...`);

    // Update status to downloading
    await this.db.run(
      `UPDATE documents 
       SET status = 'downloading', 
           started_at = datetime('now'),
           subworkflow_state = ?
       WHERE id = ?`,
      [JSON.stringify({ step: 'init', progress: 0 }), document.id]
    );

    // Load subworkflow definition
    const workflowType = await this.db.get(
      `SELECT default_subworkflow FROM workflow_types WHERE name = 'circulars'`
    );
    const subworkflow = JSON.parse(workflowType.default_subworkflow);

    // Execute each step
    for (const stepDef of subworkflow.steps) {
      const stepResult = await this.executeStep(document, stepDef, config);
      
      if (!stepResult.success && !stepDef.continue_on_error) {
        throw new Error(`Step ${stepDef.step} failed: ${stepResult.error}`);
      }

      // Update current step
      await this.db.run(
        `UPDATE documents SET current_step = ? WHERE id = ?`,
        [stepDef.step, document.id]
      );
    }

    // Mark document as completed
    await this.db.run(
      `UPDATE documents 
       SET status = 'completed', 
           completed_at = datetime('now')
       WHERE id = ?`,
      document.id
    );

    console.log(`   ✅ Completed ${document.document_ref}\n`);
  }

  /**
   * Execute a single sub-workflow step with retry logic
   */
  async executeStep(document, stepDef, config) {
    const maxRetries = stepDef.max_retries || CONFIG.retry.defaultMaxRetries;
    
    // Check if step already completed
    const existingStep = await this.db.get(
      `SELECT status FROM subworkflow_steps WHERE document_id = ? AND step_name = ?`,
      [document.id, stepDef.step]
    );

    if (existingStep && existingStep.status === 'completed') {
      console.log(`   ⏭️  Step ${stepDef.step} already completed, skipping`);
      return { success: true, skipped: true };
    }

    // Check condition
    if (stepDef.condition) {
      const metadata = JSON.parse(document.metadata || '{}');
      const shouldExecute = this.evaluateCondition(stepDef.condition, metadata);
      
      if (!shouldExecute) {
        console.log(`   ⏭️  Step ${stepDef.step} skipped (condition: ${stepDef.condition})`);
        
        // Mark as skipped
        await this.db.run(
          `INSERT OR REPLACE INTO subworkflow_steps 
           (document_id, step_name, status, max_retries)
           VALUES (?, ?, 'skipped', ?)`,
          [document.id, stepDef.step, maxRetries]
        );
        
        return { success: true, skipped: true };
      }
    }

    // Execute with retry
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      
      try {
        console.log(`   🔄 Step ${stepDef.step} (attempt ${attempt + 1}/${maxRetries + 1})`);

        // Mark step as running
        await this.db.run(
          `INSERT OR REPLACE INTO subworkflow_steps 
           (document_id, step_name, status, started_at, max_retries, retry_count)
           VALUES (?, ?, 'running', datetime('now'), ?, ?)`,
          [document.id, stepDef.step, maxRetries, attempt]
        );

        // Execute step logic
        const result = await this.executeStepLogic(document, stepDef, config);

        // Mark step as completed
        const duration = Date.now() - startTime;
        await this.db.run(
          `UPDATE subworkflow_steps 
           SET status = 'completed', 
               completed_at = datetime('now'),
               duration_ms = ?,
               output_data = ?
           WHERE document_id = ? AND step_name = ?`,
          [duration, JSON.stringify(result), document.id, stepDef.step]
        );

        console.log(`   ✅ Step ${stepDef.step} completed (${duration}ms)`);
        return { success: true, data: result };

      } catch (error) {
        const duration = Date.now() - startTime;
        
        if (attempt === maxRetries) {
          // Max retries reached
          await this.db.run(
            `UPDATE subworkflow_steps 
             SET status = 'failed',
                 error_data = ?,
                 duration_ms = ?
             WHERE document_id = ? AND step_name = ?`,
            [JSON.stringify({ error: error.message, stack: error.stack }), duration, document.id, stepDef.step]
          );

          console.error(`   ❌ Step ${stepDef.step} failed after ${maxRetries + 1} attempts: ${error.message}`);
          return { success: false, error: error.message };
        }

        // Calculate backoff
        const delay = Math.min(
          CONFIG.retry.baseDelayMs * Math.pow(2, attempt),
          CONFIG.retry.maxDelayMs
        );

        console.log(`   ⚠️  Step ${stepDef.step} failed (attempt ${attempt + 1}), retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Execute the actual step logic
   */
  async executeStepLogic(document, stepDef, config) {
    // This is where you'd implement the actual step handlers
    // For now, simulating the steps
    
    switch (stepDef.step) {
      case 'search_api':
        return { api_called: true, items_found: 10 };
        
      case 'fetch_content_api':
        return { content: { title: 'Sample Title', html: '<p>Content</p>' } };
        
      case 'download_main_pdf':
        // Simulate PDF download
        await this.simulateDownload('PDF', 2000);
        return { file_path: `./data/circulars/pdf/2026/${document.document_ref}.pdf`, size: 1024000 };
        
      case 'download_html_content':
        if (this.isModernCircular(document)) {
          await this.simulateDownload('HTML', 500);
          return { file_path: `./data/circulars/html/2026/${document.document_ref}.html`, size: 15000 };
        }
        return { skipped: true, reason: 'legacy_circular' };
        
      case 'convert_to_markdown':
        return { file_path: `./data/circulars/markdown/2026/${document.document_ref}.md`, size: 12000 };
        
      case 'download_appendices':
        const metadata = JSON.parse(document.metadata || '{}');
        if (metadata.hasAppendix) {
          for (let i = 0; i < metadata.appendixCount; i++) {
            await this.simulateDownload(`Appendix ${i}`, 1000);
          }
          return { downloaded: metadata.appendixCount };
        }
        return { downloaded: 0 };
        
      case 'save_metadata':
        return { metadata_saved: true };
        
      case 'update_index':
        return { index_updated: true };
        
      default:
        throw new Error(`Unknown step: ${stepDef.step}`);
    }
  }

  /**
   * Retry a failed document
   */
  async retryDocument(documentId, reason = 'manual_retry') {
    const document = await this.db.get(
      `SELECT * FROM documents WHERE id = ?`,
      documentId
    );

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    if (document.status !== 'failed') {
      throw new Error(`Document ${documentId} is not in failed state: ${document.status}`);
    }

    // Reset document status
    await this.db.run(
      `UPDATE documents 
       SET status = 'retry_scheduled',
           retry_count = retry_count + 1,
           retry_after = datetime('now'),
           retry_reason = ?,
           last_error = NULL,
           error_timestamp = NULL,
           current_step = NULL,
           started_at = NULL
       WHERE id = ?`,
      [reason, documentId]
    );

    // Reset failed steps
    await this.db.run(
      `UPDATE subworkflow_steps 
       SET status = 'pending', 
           started_at = NULL,
           completed_at = NULL,
           retry_count = retry_count + 1
       WHERE document_id = ? AND status = 'failed'`,
      documentId
    );

    console.log(`🔄 Scheduled retry for document ${document.document_ref} (${reason})`);
  }

  /**
   * Retry all failed documents in a workflow
   */
  async retryAllFailed(workflowId, reason = 'batch_retry') {
    const failed = await this.db.all(
      `SELECT id FROM documents WHERE workflow_id = ? AND status = 'failed'`,
      workflowId
    );

    for (const doc of failed) {
      await this.retryDocument(doc.id, reason);
    }

    console.log(`🔄 Scheduled ${failed.length} documents for retry (${reason})`);
  }

  /**
   * Print workflow progress
   */
  async printProgress(workflowId) {
    const progress = await this.db.get(
      `SELECT * FROM workflow_progress WHERE workflow_id = ?`,
      workflowId
    );

    if (progress) {
      console.log(`\n📊 Progress: ${progress.completion_percentage}% (${progress.completed}/${progress.total_docs})`);
      console.log(`   Pending: ${progress.pending}, Downloading: ${progress.downloading}, Processing: ${progress.processing}`);
      console.log(`   Failed: ${progress.failed}, Retry Scheduled: ${progress.retry_scheduled}\n`);
    }
  }

  /**
   * Get failed documents report
   */
  async getFailedDocumentsReport(workflowId) {
    const failed = await this.db.all(
      `SELECT * FROM failed_documents WHERE workflow_id = ?`,
      workflowId
    );

    return failed;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  evaluateCondition(condition, metadata) {
    // Simple condition evaluation
    switch (condition) {
      case 'is_modern_circular':
        return metadata.year >= 2012;
      case 'has_html_content':
        return !!metadata.hasHtml;
      case 'has_appendices':
        return metadata.hasAppendix && metadata.appendixCount > 0;
      case 'is_concluded':
        return metadata.isConcluded;
      case 'has_images':
        return metadata.hasImages;
      default:
        return true;
    }
  }

  isModernCircular(document) {
    const metadata = JSON.parse(document.metadata || '{}');
    return metadata.year >= 2012;
  }

  async simulateDownload(type, duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  async searchCircularsAPI(params) {
    // Simulated API - replace with actual implementation
    return {
      items: [
        { refNo: '26EC6', title: 'Sample Circular 1', releasedDate: '2026-02-11', postDocType: 110, appendixDocList: [] },
        { refNo: '26EC7', title: 'Sample Circular 2', releasedDate: '2026-02-10', postDocType: 120, appendixDocList: [{ caption: 'Appendix A' }] }
      ],
      total: 2
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Placeholder methods for other workflow types
  async executeConsultationsWorkflow(workflowId, config, isResume = false) {
    console.log(`Consultations workflow not yet implemented`);
  }

  async executeNewsWorkflow(workflowId, config, isResume = false) {
    console.log(`News workflow not yet implemented`);
  }

  async executeGuidelinesWorkflow(workflowId, config, isResume = false) {
    console.log(`Guidelines workflow not yet implemented`);
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

class CLI {
  constructor() {
    this.dbManager = new DatabaseManager(CONFIG.database.path);
    this.workflowManager = null;
  }

  async init() {
    await this.dbManager.connect();
    
    // Ensure data directory exists
    await fs.mkdir('./data', { recursive: true });
    
    // Initialize schema if needed
    try {
      await this.dbManager.initSchema();
    } catch (err) {
      console.log('Schema already initialized or error:', err.message);
    }
    
    this.workflowManager = new WorkflowManager(this.dbManager);
  }

  async run(args) {
    const command = args[0];

    switch (command) {
      case 'init':
        await this.init();
        console.log('✅ Database initialized');
        break;

      case 'start':
        await this.init();
        const workflowType = args[1] || 'circulars';
        const workflowId = await this.workflowManager.createWorkflow(workflowType, {
          mode: 'full_download',
          years: ['2026'],
          lang: 'EN'
        });
        await this.workflowManager.startWorkflow(workflowId);
        break;

      case 'pause':
        await this.init();
        const pauseId = parseInt(args[1]);
        if (!pauseId) {
          console.error('Usage: pause <workflow_id>');
          process.exit(1);
        }
        await this.workflowManager.pauseWorkflow(pauseId);
        break;

      case 'resume':
        await this.init();
        const resumeId = parseInt(args[1]);
        if (!resumeId) {
          console.error('Usage: resume <workflow_id>');
          process.exit(1);
        }
        await this.workflowManager.resumeWorkflow(resumeId);
        break;

      case 'retry':
        await this.init();
        const docId = parseInt(args[1]);
        if (!docId) {
          console.error('Usage: retry <document_id>');
          process.exit(1);
        }
        await this.workflowManager.retryDocument(docId, 'manual_retry');
        break;

      case 'retry-all':
        await this.init();
        const workflowId = parseInt(args[1]);
        if (!workflowId) {
          console.error('Usage: retry-all <workflow_id>');
          process.exit(1);
        }
        await this.workflowManager.retryAllFailed(workflowId, 'batch_retry');
        break;

      case 'status':
        await this.init();
        const statusId = parseInt(args[1]);
        if (statusId) {
          await this.workflowManager.printProgress(statusId);
        } else {
          // Show all workflows
          const workflows = await this.dbManager.all(
            `SELECT * FROM workflow_progress ORDER BY workflow_id DESC`
          );
          console.table(workflows);
        }
        break;

      case 'failed':
        await this.init();
        const failedId = parseInt(args[1]);
        if (!failedId) {
          console.error('Usage: failed <workflow_id>');
          process.exit(1);
        }
        const failed = await this.workflowManager.getFailedDocumentsReport(failedId);
        console.table(failed);
        break;

      default:
        console.log(`
SFC-Fetch State-Managed Workflow System

Usage:
  node workflow-cli.js <command> [args]

Commands:
  init                    Initialize database schema
  start [workflow_type]   Start a new workflow (default: circulars)
  pause <workflow_id>     Pause a running workflow
  resume <workflow_id>    Resume a paused workflow
  retry <document_id>     Retry a failed document
  retry-all <workflow_id> Retry all failed documents in workflow
  status [workflow_id]    Show workflow progress
  failed <workflow_id>    Show failed documents report

Examples:
  node workflow-cli.js init
  node workflow-cli.js start circulars
  node workflow-cli.js pause 1
  node workflow-cli.js resume 1
  node workflow-cli.js retry 42
  node workflow-cli.js status 1
  node workflow-cli.js failed 1
        `);
    }
  }

  async close() {
    if (this.dbManager) {
      await this.dbManager.close();
    }
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  const cli = new CLI();
  
  try {
    await cli.run(process.argv.slice(2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await cli.close();
  }
}

main();
