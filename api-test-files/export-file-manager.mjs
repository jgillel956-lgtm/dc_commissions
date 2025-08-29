import { query } from './db/connection.mjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Export File Manager Configuration */
const FILE_MANAGER_CONFIG = {
  // Storage
  STORAGE: {
    exportsDir: path.join(__dirname, '../temp/exports'),
    maxFileSize: 100 * 1024 * 1024, // 100MB
    retentionDays: 30,
    cleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
  },

  // File Naming
  NAMING: {
    patterns: {
      revenue_analysis: '{date}_{user}_{type}_Revenue_Analysis_{format}',
      commission_analysis: '{date}_{user}_{type}_Commission_Analysis_{format}',
      comprehensive: '{date}_{user}_{type}_Comprehensive_Report_{format}',
      custom: '{date}_{user}_{type}_Custom_Report_{format}',
      executive: '{date}_{user}_{type}_Executive_Summary_{format}',
      operational: '{date}_{user}_{type}_Operational_Report_{format}'
    },
    dateFormat: 'YYYY-MM-DD_HH-mm-ss',
    maxFileNameLength: 255,
    sanitizeOptions: {
      replacement: '_',
      remove: /[*?"<>|]/g
    }
  },

  // Organization
  ORGANIZATION: {
    structure: {
      byUser: true,
      byDate: true,
      byType: true,
      byFormat: false
    },
    folderDepth: 3, // user/date/type
    maxFilesPerFolder: 1000
  },

  // Metadata
  METADATA: {
    includeUserInfo: true,
    includeFilterContext: true,
    includeTemplateInfo: true,
    includeExportStats: true
  }
};

/** Export File Manager Service */
class ExportFileManagerService {
  constructor() {
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    const dirs = [
      FILE_MANAGER_CONFIG.STORAGE.exportsDir,
      path.join(FILE_MANAGER_CONFIG.STORAGE.exportsDir, 'users'),
      path.join(FILE_MANAGER_CONFIG.STORAGE.exportsDir, 'temp'),
      path.join(FILE_MANAGER_CONFIG.STORAGE.exportsDir, 'archived')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate organized file path based on configuration
   */
  generateFilePath(userId, exportType, format, template = null) {
    const date = new Date();
    const dateStr = this.formatDate(date, FILE_MANAGER_CONFIG.NAMING.dateFormat);
    
    // Create folder structure
    const folders = [];
    
    if (FILE_MANAGER_CONFIG.ORGANIZATION.structure.byUser) {
      folders.push(`user_${userId}`);
    }
    
    if (FILE_MANAGER_CONFIG.ORGANIZATION.structure.byDate) {
      folders.push(dateStr.split('_')[0]); // YYYY-MM-DD
    }
    
    if (FILE_MANAGER_CONFIG.ORGANIZATION.structure.byType) {
      folders.push(exportType);
    }
    
    if (FILE_MANAGER_CONFIG.ORGANIZATION.structure.byFormat) {
      folders.push(format);
    }

    const folderPath = path.join(FILE_MANAGER_CONFIG.STORAGE.exportsDir, ...folders);
    
    // Ensure folder exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    return folderPath;
  }

  /**
   * Generate file name based on template and configuration
   */
  generateFileName(userId, exportType, format, template = null, filters = null) {
    const date = new Date();
    const dateStr = this.formatDate(date, FILE_MANAGER_CONFIG.NAMING.dateFormat);
    
    // Get naming pattern
    const pattern = FILE_MANAGER_CONFIG.NAMING.patterns[exportType] || 
                   FILE_MANAGER_CONFIG.NAMING.patterns.custom;
    
    // Replace placeholders
    let fileName = pattern
      .replace('{date}', dateStr)
      .replace('{user}', `user_${userId}`)
      .replace('{type}', exportType)
      .replace('{format}', format.toUpperCase());
    
    // Add template info if available
    if (template && template.name) {
      fileName = fileName.replace('_Custom_Report_', `_${this.sanitizeFileName(template.name)}_`);
    }
    
    // Add filter context if available
    if (filters && Object.keys(filters).length > 0) {
      const filterSummary = this.generateFilterSummary(filters);
      if (filterSummary) {
        fileName = fileName.replace(`_${format.toUpperCase()}`, `_${filterSummary}_${format.toUpperCase()}`);
      }
    }
    
    // Sanitize file name
    fileName = this.sanitizeFileName(fileName);
    
    // Ensure length limit
    if (fileName.length > FILE_MANAGER_CONFIG.NAMING.maxFileNameLength) {
      const extension = path.extname(fileName);
      const baseName = fileName.substring(0, fileName.length - extension.length);
      const maxBaseLength = FILE_MANAGER_CONFIG.NAMING.maxFileNameLength - extension.length;
      fileName = baseName.substring(0, maxBaseLength) + extension;
    }
    
    return fileName;
  }

  /**
   * Generate complete file path with name
   */
  generateCompleteFilePath(userId, exportType, format, template = null, filters = null) {
    const folderPath = this.generateFilePath(userId, exportType, format, template);
    const fileName = this.generateFileName(userId, exportType, format, template, filters);
    return path.join(folderPath, fileName);
  }

  /**
   * Create export record in database
   */
  async createExportRecord(userId, exportData) {
    const {
      exportType,
      format,
      template,
      filters,
      filePath,
      fileSize,
      metadata = {}
    } = exportData;

    const exportId = crypto.randomUUID();
    const now = new Date().toISOString();

    const record = {
      id: exportId,
      user_id: userId,
      export_type: exportType,
      format: format,
      template_id: template?.id || null,
      template_name: template?.name || null,
      filters: filters || {},
      file_path: filePath,
      file_name: path.basename(filePath),
      file_size: fileSize || 0,
      metadata: {
        ...metadata,
        created_at: now,
        user_id: userId,
        export_type: exportType,
        format: format
      },
      status: 'completed',
      created_at: now,
      updated_at: now
    };

    const sql = `
      INSERT INTO export_history (
        id, user_id, export_type, format, template_id, template_name,
        filters, file_path, file_name, file_size, metadata, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      record.id, record.user_id, record.export_type, record.format,
      record.template_id, record.template_name, record.filters,
      record.file_path, record.file_name, record.file_size,
      JSON.stringify(record.metadata), record.status,
      record.created_at, record.updated_at
    ];

    try {
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating export record:', error);
      throw new Error('Failed to create export record');
    }
  }

  /**
   * Get user's export history
   */
  async getUserExportHistory(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      format = null,
      exportType = null,
      status = null,
      dateFrom = null,
      dateTo = null
    } = options;

    let sql = `
      SELECT * FROM export_history 
      WHERE user_id = $1
    `;
    
    const values = [userId];
    let paramCount = 1;

    if (format) {
      paramCount++;
      sql += ` AND format = $${paramCount}`;
      values.push(format);
    }

    if (exportType) {
      paramCount++;
      sql += ` AND export_type = $${paramCount}`;
      values.push(exportType);
    }

    if (status) {
      paramCount++;
      sql += ` AND status = $${paramCount}`;
      values.push(status);
    }

    if (dateFrom) {
      paramCount++;
      sql += ` AND created_at >= $${paramCount}`;
      values.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      sql += ` AND created_at <= $${paramCount}`;
      values.push(dateTo);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    try {
      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting export history:', error);
      throw new Error('Failed to get export history');
    }
  }

  /**
   * Get export statistics for user
   */
  async getUserExportStats(userId) {
    const sql = `
      SELECT 
        COUNT(*) as total_exports,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_exports,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_exports,
        SUM(file_size) as total_size,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as exports_last_7_days,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as exports_last_30_days,
        format,
        export_type
      FROM export_history 
      WHERE user_id = $1
      GROUP BY format, export_type
      ORDER BY total_exports DESC
    `;

    try {
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting export stats:', error);
      throw new Error('Failed to get export statistics');
    }
  }

  /**
   * Clean up old export files
   */
  async cleanupOldExports() {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - FILE_MANAGER_CONFIG.STORAGE.retentionDays);

    const sql = `
      DELETE FROM export_history 
      WHERE created_at < $1 AND status = 'completed'
      RETURNING file_path
    `;

    try {
      const result = await query(sql, [retentionDate.toISOString()]);
      
      // Delete actual files
      for (const row of result.rows) {
        try {
          if (fs.existsSync(row.file_path)) {
            fs.unlinkSync(row.file_path);
          }
        } catch (fileError) {
          console.error('Error deleting file:', row.file_path, fileError);
        }
      }

      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning up old exports:', error);
      throw new Error('Failed to cleanup old exports');
    }
  }

  /**
   * Archive export file
   */
  async archiveExport(exportId, userId) {
    const sql = `
      UPDATE export_history 
      SET status = 'archived', updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    try {
      const result = await query(sql, [exportId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error archiving export:', error);
      throw new Error('Failed to archive export');
    }
  }

  /**
   * Delete export file
   */
  async deleteExport(exportId, userId) {
    // Get file path first
    const getSql = `
      SELECT file_path FROM export_history 
      WHERE id = $1 AND user_id = $2
    `;

    try {
      const getResult = await query(getSql, [exportId, userId]);
      
      if (getResult.rows.length === 0) {
        throw new Error('Export not found');
      }

      const filePath = getResult.rows[0].file_path;

      // Delete from database
      const deleteSql = `
        DELETE FROM export_history 
        WHERE id = $1 AND user_id = $2
      `;
      
      await query(deleteSql, [exportId, userId]);

      // Delete actual file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return true;
    } catch (error) {
      console.error('Error deleting export:', error);
      throw new Error('Failed to delete export');
    }
  }

  /**
   * Helper methods
   */
  formatDate(date, format) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  sanitizeFileName(fileName) {
    return fileName
      .replace(FILE_MANAGER_CONFIG.NAMING.sanitizeOptions.remove, 
               FILE_MANAGER_CONFIG.NAMING.sanitizeOptions.replacement)
      .replace(/\s+/g, '_')
      .replace(/[^\w\-_.]/g, '');
  }

  generateFilterSummary(filters) {
    const summaries = [];
    
    if (filters.dateRange) {
      summaries.push(filters.dateRange.type || 'custom_range');
    }
    
    if (filters.companies && filters.companies.selected_companies) {
      summaries.push(`${filters.companies.selected_companies.length}_companies`);
    }
    
    if (filters.payment_methods && filters.payment_methods.selected_methods) {
      summaries.push(`${filters.payment_methods.selected_methods.length}_methods`);
    }

    return summaries.length > 0 ? summaries.join('_') : null;
  }

  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }
}

// Create service instance
const exportFileManager = new ExportFileManagerService();

/** API Handlers */
export async function fileManagerHandler(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    switch (req.method) {
      case 'GET':
        return await handleGetExports(req, res, userId);
      case 'POST':
        return await handleCreateExport(req, res, userId);
      case 'DELETE':
        return await handleDeleteExport(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('File manager handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetExports(req, res, userId) {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      format, 
      exportType, 
      status, 
      dateFrom, 
      dateTo 
    } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      format,
      exportType,
      status,
      dateFrom,
      dateTo
    };

    const exports = await exportFileManager.getUserExportHistory(userId, options);
    const stats = await exportFileManager.getUserExportStats(userId);

    res.status(200).json({
      exports,
      stats,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: exports.length
      }
    });
  } catch (error) {
    console.error('Get exports error:', error);
    res.status(500).json({ error: 'Failed to get exports' });
  }
}

async function handleCreateExport(req, res, userId) {
  try {
    const { exportType, format, template, filters, filePath } = req.body;

    if (!exportType || !format || !filePath) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const fileSize = exportFileManager.getFileSize(filePath);
    
    const exportRecord = await exportFileManager.createExportRecord(userId, {
      exportType,
      format,
      template,
      filters,
      filePath,
      fileSize
    });

    res.status(201).json({
      message: 'Export record created successfully',
      export: exportRecord
    });
  } catch (error) {
    console.error('Create export error:', error);
    res.status(500).json({ error: 'Failed to create export record' });
  }
}

async function handleDeleteExport(req, res, userId) {
  try {
    const { exportId } = req.params;

    if (!exportId) {
      return res.status(400).json({ error: 'Export ID required' });
    }

    await exportFileManager.deleteExport(exportId, userId);

    res.status(200).json({
      message: 'Export deleted successfully'
    });
  } catch (error) {
    console.error('Delete export error:', error);
    res.status(500).json({ error: 'Failed to delete export' });
  }
}

export async function cleanupHandler(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const deletedCount = await exportFileManager.cleanupOldExports();

    res.status(200).json({
      message: 'Cleanup completed successfully',
      deletedCount
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup old exports' });
  }
}

export async function healthHandler(req, res) {
  res.status(200).json({
    status: 'healthy',
    service: 'export-file-manager',
    timestamp: new Date().toISOString(),
    config: {
      storage: FILE_MANAGER_CONFIG.STORAGE,
      naming: FILE_MANAGER_CONFIG.NAMING,
      organization: FILE_MANAGER_CONFIG.ORGANIZATION
    }
  });
}

export { exportFileManager, FILE_MANAGER_CONFIG };
