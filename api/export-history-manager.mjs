import { query } from './db/connection.mjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Export History Manager Configuration */
const HISTORY_MANAGER_CONFIG = {
  // Storage
  STORAGE: {
    downloadsDir: path.join(__dirname, '../temp/downloads'),
    maxConcurrentDownloads: 10,
    downloadTimeout: 30 * 60 * 1000, // 30 minutes
    cleanupInterval: 60 * 60 * 1000 // 1 hour
  },

  // Download Management
  DOWNLOADS: {
    maxDownloadsPerUser: 100,
    downloadRetentionHours: 24,
    rateLimitPerMinute: 10,
    requireAuthentication: true
  },

  // History Features
  HISTORY: {
    maxHistoryPerUser: 1000,
    enableSearch: true,
    enableFiltering: true,
    enableSorting: true,
    enableBulkOperations: true
  },

  // Security
  SECURITY: {
    validateFileAccess: true,
    logDownloadAttempts: true,
    preventPathTraversal: true,
    requireValidToken: true
  }
};

/** Export History Manager Service */
class ExportHistoryManagerService {
  constructor() {
    this.ensureDirectories();
    this.activeDownloads = new Map();
    this.downloadCounts = new Map();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    const dirs = [
      HISTORY_MANAGER_CONFIG.STORAGE.downloadsDir,
      path.join(HISTORY_MANAGER_CONFIG.STORAGE.downloadsDir, 'temp'),
      path.join(HISTORY_MANAGER_CONFIG.STORAGE.downloadsDir, 'completed')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Get comprehensive export history for user
   */
  async getUserExportHistory(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      format = null,
      exportType = null,
      status = null,
      dateFrom = null,
      dateTo = null,
      search = null,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    let sql = `
      SELECT 
        eh.*,
        u.username as user_name,
        u.email as user_email,
        et.name as template_name,
        et.type as template_type
      FROM export_history eh
      LEFT JOIN users u ON eh.user_id = u.id
      LEFT JOIN export_templates et ON eh.template_id = et.id
      WHERE eh.user_id = $1
    `;
    
    const values = [userId];
    let paramCount = 1;

    // Add filters
    if (format) {
      paramCount++;
      sql += ` AND eh.format = $${paramCount}`;
      values.push(format);
    }

    if (exportType) {
      paramCount++;
      sql += ` AND eh.export_type = $${paramCount}`;
      values.push(exportType);
    }

    if (status) {
      paramCount++;
      sql += ` AND eh.status = $${paramCount}`;
      values.push(status);
    }

    if (dateFrom) {
      paramCount++;
      sql += ` AND eh.created_at >= $${paramCount}`;
      values.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      sql += ` AND eh.created_at <= $${paramCount}`;
      values.push(dateTo);
    }

    if (search) {
      paramCount++;
      sql += ` AND (eh.file_name ILIKE $${paramCount} OR eh.template_name ILIKE $${paramCount})`;
      values.push(`%${search}%`);
    }

    // Add sorting
    const validSortFields = ['created_at', 'file_name', 'file_size', 'export_type', 'format', 'status'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    sql += ` ORDER BY eh.${sortField} ${sortDirection}`;
    sql += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
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
   * Get export history statistics
   */
  async getExportHistoryStats(userId) {
    const sql = `
      SELECT 
        COUNT(*) as total_exports,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_exports,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_exports,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_exports,
        COALESCE(SUM(file_size), 0) as total_size,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as exports_last_7_days,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as exports_last_30_days,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '90 days' THEN 1 END) as exports_last_90_days,
        COALESCE(AVG(file_size), 0) as avg_file_size,
        MIN(created_at) as first_export_date,
        MAX(created_at) as last_export_date
      FROM export_history
      WHERE user_id = $1 AND status != 'deleted'
    `;

    try {
      const result = await query(sql, [userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting export stats:', error);
      throw new Error('Failed to get export statistics');
    }
  }

  /**
   * Get export history by format
   */
  async getExportsByFormat(userId) {
    const sql = `
      SELECT 
        format,
        COUNT(*) as count,
        COALESCE(SUM(file_size), 0) as total_size,
        COALESCE(AVG(file_size), 0) as avg_size,
        MAX(created_at) as last_export
      FROM export_history
      WHERE user_id = $1 AND status != 'deleted'
      GROUP BY format
      ORDER BY count DESC
    `;

    try {
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting exports by format:', error);
      throw new Error('Failed to get exports by format');
    }
  }

  /**
   * Get export history by type
   */
  async getExportsByType(userId) {
    const sql = `
      SELECT 
        export_type,
        COUNT(*) as count,
        COALESCE(SUM(file_size), 0) as total_size,
        COALESCE(AVG(file_size), 0) as avg_size,
        MAX(created_at) as last_export
      FROM export_history
      WHERE user_id = $1 AND status != 'deleted'
      GROUP BY export_type
      ORDER BY count DESC
    `;

    try {
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting exports by type:', error);
      throw new Error('Failed to get exports by type');
    }
  }

  /**
   * Search export history
   */
  async searchExportHistory(userId, searchTerm, options = {}) {
    const {
      limit = 20,
      offset = 0,
      searchFields = ['file_name', 'template_name', 'export_type']
    } = options;

    let sql = `
      SELECT 
        eh.*,
        u.username as user_name,
        et.name as template_name
      FROM export_history eh
      LEFT JOIN users u ON eh.user_id = u.id
      LEFT JOIN export_templates et ON eh.template_id = et.id
      WHERE eh.user_id = $1 AND eh.status != 'deleted'
    `;

    const values = [userId];
    let paramCount = 1;

    // Build search conditions
    const searchConditions = [];
    searchFields.forEach(field => {
      paramCount++;
      searchConditions.push(`eh.${field} ILIKE $${paramCount}`);
      values.push(`%${searchTerm}%`);
    });

    if (searchConditions.length > 0) {
      sql += ` AND (${searchConditions.join(' OR ')})`;
    }

    sql += ` ORDER BY eh.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    try {
      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      console.error('Error searching export history:', error);
      throw new Error('Failed to search export history');
    }
  }

  /**
   * Create download record
   */
  async createDownloadRecord(userId, exportId) {
    // Verify export exists and user has access
    const exportSql = `
      SELECT * FROM export_history 
      WHERE id = $1 AND user_id = $2 AND status = 'completed'
    `;

    try {
      const exportResult = await query(exportSql, [exportId, userId]);
      
      if (exportResult.rows.length === 0) {
        throw new Error('Export not found or access denied');
      }

      const exportRecord = exportResult.rows[0];

      // Check if file exists
      if (!fs.existsSync(exportRecord.file_path)) {
        throw new Error('Export file not found');
      }

      // Create download record
      const downloadId = crypto.randomUUID();
      const now = new Date().toISOString();

      const downloadSql = `
        INSERT INTO export_downloads (
          id, user_id, export_id, file_path, file_name, file_size,
          download_token, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const downloadToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + HISTORY_MANAGER_CONFIG.DOWNLOADS.downloadRetentionHours * 60 * 60 * 1000);

      const downloadValues = [
        downloadId, userId, exportId, exportRecord.file_path,
        exportRecord.file_name, exportRecord.file_size,
        downloadToken, expiresAt, now
      ];

      const downloadResult = await query(downloadSql, downloadValues);
      
      return {
        download: downloadResult.rows[0],
        export: exportRecord
      };
    } catch (error) {
      console.error('Error creating download record:', error);
      throw error;
    }
  }

  /**
   * Get download by token
   */
  async getDownloadByToken(token) {
    const sql = `
      SELECT 
        ed.*,
        eh.export_type,
        eh.format,
        eh.template_name,
        u.username as user_name
      FROM export_downloads ed
      LEFT JOIN export_history eh ON ed.export_id = eh.id
      LEFT JOIN users u ON ed.user_id = u.id
      WHERE ed.download_token = $1 AND ed.expires_at > NOW()
    `;

    try {
      const result = await query(sql, [token]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting download by token:', error);
      throw new Error('Failed to get download');
    }
  }

  /**
   * Mark download as completed
   */
  async markDownloadCompleted(downloadId) {
    const sql = `
      UPDATE export_downloads 
      SET downloaded_at = NOW(), download_count = download_count + 1
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await query(sql, [downloadId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error marking download completed:', error);
      throw new Error('Failed to mark download completed');
    }
  }

  /**
   * Get user download history
   */
  async getUserDownloadHistory(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      status = null
    } = options;

    let sql = `
      SELECT 
        ed.*,
        eh.export_type,
        eh.format,
        eh.template_name
      FROM export_downloads ed
      LEFT JOIN export_history eh ON ed.export_id = eh.id
      WHERE ed.user_id = $1
    `;

    const values = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      sql += ` AND ed.status = $${paramCount}`;
      values.push(status);
    }

    sql += ` ORDER BY ed.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    try {
      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting download history:', error);
      throw new Error('Failed to get download history');
    }
  }

  /**
   * Bulk delete exports
   */
  async bulkDeleteExports(userId, exportIds) {
    if (!Array.isArray(exportIds) || exportIds.length === 0) {
      throw new Error('No export IDs provided');
    }

    // Verify all exports belong to user
    const verifySql = `
      SELECT id, file_path FROM export_history 
      WHERE id = ANY($1) AND user_id = $2
    `;

    try {
      const verifyResult = await query(verifySql, [exportIds, userId]);
      
      if (verifyResult.rows.length !== exportIds.length) {
        throw new Error('Some exports not found or access denied');
      }

      // Delete from database
      const deleteSql = `
        DELETE FROM export_history 
        WHERE id = ANY($1) AND user_id = $2
        RETURNING file_path
      `;

      const deleteResult = await query(deleteSql, [exportIds, userId]);

      // Delete actual files
      for (const row of deleteResult.rows) {
        try {
          if (fs.existsSync(row.file_path)) {
            fs.unlinkSync(row.file_path);
          }
        } catch (fileError) {
          console.error('Error deleting file:', row.file_path, fileError);
        }
      }

      return deleteResult.rowCount;
    } catch (error) {
      console.error('Error bulk deleting exports:', error);
      throw error;
    }
  }

  /**
   * Bulk archive exports
   */
  async bulkArchiveExports(userId, exportIds) {
    if (!Array.isArray(exportIds) || exportIds.length === 0) {
      throw new Error('No export IDs provided');
    }

    const sql = `
      UPDATE export_history 
      SET status = 'archived', updated_at = NOW()
      WHERE id = ANY($1) AND user_id = $2
      RETURNING id
    `;

    try {
      const result = await query(sql, [exportIds, userId]);
      return result.rowCount;
    } catch (error) {
      console.error('Error bulk archiving exports:', error);
      throw new Error('Failed to archive exports');
    }
  }

  /**
   * Clean up expired downloads
   */
  async cleanupExpiredDownloads() {
    const sql = `
      DELETE FROM export_downloads 
      WHERE expires_at < NOW()
      RETURNING id
    `;

    try {
      const result = await query(sql);
      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning up expired downloads:', error);
      throw new Error('Failed to cleanup expired downloads');
    }
  }

  /**
   * Get download statistics
   */
  async getDownloadStats(userId) {
    const sql = `
      SELECT 
        COUNT(*) as total_downloads,
        COUNT(CASE WHEN downloaded_at IS NOT NULL THEN 1 END) as completed_downloads,
        COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_downloads,
        COALESCE(SUM(file_size), 0) as total_downloaded_size,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as downloads_last_7_days,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as downloads_last_30_days
      FROM export_downloads
      WHERE user_id = $1
    `;

    try {
      const result = await query(sql, [userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting download stats:', error);
      throw new Error('Failed to get download statistics');
    }
  }

  /**
   * Validate file access
   */
  validateFileAccess(filePath, userId) {
    // Prevent path traversal
    const normalizedPath = path.normalize(filePath);
    const baseDir = HISTORY_MANAGER_CONFIG.STORAGE.downloadsDir;
    
    if (!normalizedPath.startsWith(baseDir)) {
      throw new Error('Invalid file path');
    }

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      throw new Error('File not found');
    }

    return true;
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file info
   */
  getFileInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return {
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      return null;
    }
  }
}

// Create service instance
const exportHistoryManager = new ExportHistoryManagerService();

/** API Handlers */
export async function historyManagerHandler(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    switch (req.method) {
      case 'GET':
        return await handleGetHistory(req, res, userId);
      case 'POST':
        return await handleCreateDownload(req, res, userId);
      case 'DELETE':
        return await handleBulkDelete(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('History manager handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetHistory(req, res, userId) {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      format, 
      exportType, 
      status, 
      dateFrom, 
      dateTo,
      search,
      sortBy,
      sortOrder
    } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      format,
      exportType,
      status,
      dateFrom,
      dateTo,
      search,
      sortBy,
      sortOrder
    };

    const history = await exportHistoryManager.getUserExportHistory(userId, options);
    const stats = await exportHistoryManager.getExportHistoryStats(userId);
    const formatStats = await exportHistoryManager.getExportsByFormat(userId);
    const typeStats = await exportHistoryManager.getExportsByType(userId);

    res.status(200).json({
      history,
      stats,
      formatStats,
      typeStats,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: history.length
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
}

async function handleCreateDownload(req, res, userId) {
  try {
    const { exportId } = req.body;

    if (!exportId) {
      return res.status(400).json({ error: 'Export ID required' });
    }

    const { download, export: exportRecord } = await exportHistoryManager.createDownloadRecord(userId, exportId);

    res.status(201).json({
      message: 'Download created successfully',
      download: {
        id: download.id,
        downloadToken: download.download_token,
        expiresAt: download.expires_at,
        fileSize: download.file_size,
        fileName: download.file_name
      },
      export: {
        id: exportRecord.id,
        exportType: exportRecord.export_type,
        format: exportRecord.format,
        templateName: exportRecord.template_name
      }
    });
  } catch (error) {
    console.error('Create download error:', error);
    res.status(500).json({ error: error.message || 'Failed to create download' });
  }
}

async function handleBulkDelete(req, res, userId) {
  try {
    const { exportIds, action = 'delete' } = req.body;

    if (!exportIds || !Array.isArray(exportIds)) {
      return res.status(400).json({ error: 'Export IDs array required' });
    }

    let result;
    if (action === 'archive') {
      result = await exportHistoryManager.bulkArchiveExports(userId, exportIds);
    } else {
      result = await exportHistoryManager.bulkDeleteExports(userId, exportIds);
    }

    res.status(200).json({
      message: `Bulk ${action} completed successfully`,
      deletedCount: result
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to perform bulk operation' });
  }
}

export async function downloadHandler(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Download token required' });
    }

    const download = await exportHistoryManager.getDownloadByToken(token);
    
    if (!download) {
      return res.status(404).json({ error: 'Download not found or expired' });
    }

    // Validate file access
    try {
      exportHistoryManager.validateFileAccess(download.file_path, download.user_id);
    } catch (error) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark download as completed
    await exportHistoryManager.markDownloadCompleted(download.id);

    // Set response headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${download.file_name}"`);
    res.setHeader('Content-Length', download.file_size);

    // Stream the file
    const fileStream = fs.createReadStream(download.file_path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
}

export async function searchHandler(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { q: searchTerm, limit = 20, offset = 0 } = req.query;

    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term required' });
    }

    const results = await exportHistoryManager.searchExportHistory(userId, searchTerm, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      results,
      searchTerm,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: results.length
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search history' });
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

    const deletedCount = await exportHistoryManager.cleanupExpiredDownloads();

    res.status(200).json({
      message: 'Cleanup completed successfully',
      deletedCount
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup expired downloads' });
  }
}

export async function healthHandler(req, res) {
  res.status(200).json({
    status: 'healthy',
    service: 'export-history-manager',
    timestamp: new Date().toISOString(),
    config: {
      storage: HISTORY_MANAGER_CONFIG.STORAGE,
      downloads: HISTORY_MANAGER_CONFIG.DOWNLOADS,
      history: HISTORY_MANAGER_CONFIG.HISTORY,
      security: HISTORY_MANAGER_CONFIG.SECURITY
    }
  });
}

export { exportHistoryManager, HISTORY_MANAGER_CONFIG };
