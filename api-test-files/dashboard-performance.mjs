import { query } from './db/connection.mjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Dashboard Performance Configuration */
const PERFORMANCE_CONFIG = {
  // Caching
  CACHE: {
    enabled: true,
    defaultTTL: 300, // 5 minutes
    maxCacheSize: 100 * 1024 * 1024, // 100MB
    cleanupInterval: 60 * 60 * 1000, // 1 hour
    cacheDir: path.join(__dirname, '../temp/cache'),
    compressionEnabled: true
  },

  // Query Optimization
  QUERY: {
    maxExecutionTime: 30000, // 30 seconds
    enableQueryLogging: true,
    enableSlowQueryAlert: true,
    slowQueryThreshold: 5000, // 5 seconds
    maxResultSetSize: 10000,
    enablePagination: true,
    defaultPageSize: 100
  },

  // Database Optimization
  DATABASE: {
    enableConnectionPooling: true,
    maxConnections: 20,
    idleTimeout: 30000,
    enableQueryCache: true,
    enableIndexHints: true,
    enableQueryOptimization: true
  },

  // Response Optimization
  RESPONSE: {
    enableCompression: true,
    enableETags: true,
    enableCaching: true,
    maxResponseSize: 10 * 1024 * 1024, // 10MB
    enableStreaming: true,
    enableChunkedTransfer: true
  },

  // Monitoring
  MONITORING: {
    enableMetrics: true,
    enablePerformanceLogging: true,
    enableErrorTracking: true,
    enableResourceMonitoring: true,
    metricsRetentionDays: 30
  }
};

/** Dashboard Performance Service */
class DashboardPerformanceService {
  constructor() {
    this.cache = new Map();
    this.queryStats = new Map();
    this.performanceMetrics = new Map();
    this.ensureDirectories();
    this.startCleanupInterval();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    const dirs = [
      PERFORMANCE_CONFIG.CACHE.cacheDir,
      path.join(PERFORMANCE_CONFIG.CACHE.cacheDir, 'queries'),
      path.join(PERFORMANCE_CONFIG.CACHE.cacheDir, 'responses'),
      path.join(PERFORMANCE_CONFIG.CACHE.cacheDir, 'metrics')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate cache key
   */
  generateCacheKey(prefix, params) {
    const paramString = JSON.stringify(params);
    const hash = crypto.createHash('md5').update(paramString).digest('hex');
    return `${prefix}_${hash}`;
  }

  /**
   * Get cached data
   */
  async getCachedData(cacheKey) {
    if (!PERFORMANCE_CONFIG.CACHE.enabled) {
      return null;
    }

    try {
      const cacheFile = path.join(PERFORMANCE_CONFIG.CACHE.cacheDir, 'responses', `${cacheKey}.json`);
      
      if (!fs.existsSync(cacheFile)) {
        return null;
      }

      const stats = fs.statSync(cacheFile);
      const now = Date.now();
      const ttl = PERFORMANCE_CONFIG.CACHE.defaultTTL * 1000;

      if (now - stats.mtime.getTime() > ttl) {
        // Cache expired, remove file
        fs.unlinkSync(cacheFile);
        return null;
      }

      const data = fs.readFileSync(cacheFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  async setCachedData(cacheKey, data, ttl = PERFORMANCE_CONFIG.CACHE.defaultTTL) {
    if (!PERFORMANCE_CONFIG.CACHE.enabled) {
      return;
    }

    try {
      const cacheFile = path.join(PERFORMANCE_CONFIG.CACHE.cacheDir, 'responses', `${cacheKey}.json`);
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl: ttl * 1000
      };

      fs.writeFileSync(cacheFile, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error writing cache:', error);
    }
  }

  /**
   * Clear cache
   */
  async clearCache(pattern = null) {
    try {
      const cacheDir = path.join(PERFORMANCE_CONFIG.CACHE.cacheDir, 'responses');
      const files = fs.readdirSync(cacheDir);

      for (const file of files) {
        if (pattern && !file.includes(pattern)) {
          continue;
        }
        fs.unlinkSync(path.join(cacheDir, file));
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Optimize database query
   */
  async optimizeQuery(sql, params = []) {
    const startTime = Date.now();
    const queryId = crypto.randomUUID();

    try {
      // Add query optimization hints
      if (PERFORMANCE_CONFIG.DATABASE.enableIndexHints) {
        sql = this.addIndexHints(sql);
      }

      // Execute query with timeout
      const result = await Promise.race([
        query(sql, params),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), PERFORMANCE_CONFIG.QUERY.maxExecutionTime)
        )
      ]);

      const executionTime = Date.now() - startTime;

      // Log query performance
      this.logQueryPerformance(queryId, sql, params, executionTime, result.rowCount);

      // Alert on slow queries
      if (executionTime > PERFORMANCE_CONFIG.QUERY.slowQueryThreshold) {
        this.alertSlowQuery(queryId, sql, executionTime);
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logQueryError(queryId, sql, params, executionTime, error);
      throw error;
    }
  }

  /**
   * Add index hints to SQL query
   */
  addIndexHints(sql) {
    // Add index hints for common query patterns
    if (sql.toLowerCase().includes('where created_at')) {
      sql = sql.replace(/WHERE created_at/i, 'WHERE created_at /*+ INDEX(transactions idx_transactions_created_at) */');
    }
    
    if (sql.toLowerCase().includes('where user_id')) {
      sql = sql.replace(/WHERE user_id/i, 'WHERE user_id /*+ INDEX(transactions idx_transactions_user_id) */');
    }

    return sql;
  }

  /**
   * Log query performance
   */
  logQueryPerformance(queryId, sql, params, executionTime, rowCount) {
    if (!PERFORMANCE_CONFIG.QUERY.enableQueryLogging) {
      return;
    }

    const logEntry = {
      queryId,
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      params: params.length,
      executionTime,
      rowCount,
      timestamp: new Date().toISOString()
    };

    this.queryStats.set(queryId, logEntry);

    // Write to file for persistence
    const logFile = path.join(PERFORMANCE_CONFIG.CACHE.cacheDir, 'queries', `${queryId}.json`);
    try {
      fs.writeFileSync(logFile, JSON.stringify(logEntry));
    } catch (error) {
      console.error('Error writing query log:', error);
    }
  }

  /**
   * Log query error
   */
  logQueryError(queryId, sql, params, executionTime, error) {
    const errorEntry = {
      queryId,
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      params: params.length,
      executionTime,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    console.error('Query error:', errorEntry);
  }

  /**
   * Alert on slow query
   */
  alertSlowQuery(queryId, sql, executionTime) {
    if (!PERFORMANCE_CONFIG.QUERY.enableSlowQueryAlert) {
      return;
    }

    const alert = {
      type: 'slow_query',
      queryId,
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      executionTime,
      threshold: PERFORMANCE_CONFIG.QUERY.slowQueryThreshold,
      timestamp: new Date().toISOString()
    };

    console.warn('Slow query detected:', alert);
  }

  /**
   * Get query statistics
   */
  async getQueryStatistics(options = {}) {
    const {
      limit = 100,
      offset = 0,
      minExecutionTime = 0,
      maxExecutionTime = null
    } = options;

    try {
      const queryDir = path.join(PERFORMANCE_CONFIG.CACHE.cacheDir, 'queries');
      const files = fs.readdirSync(queryDir);
      const stats = [];

      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(queryDir, file), 'utf8'));
          
          if (data.executionTime >= minExecutionTime && 
              (!maxExecutionTime || data.executionTime <= maxExecutionTime)) {
            stats.push(data);
          }
        } catch (error) {
          console.error('Error reading query stat file:', file, error);
        }
      }

      // Sort by execution time descending
      stats.sort((a, b) => b.executionTime - a.executionTime);

      return {
        stats: stats.slice(offset, offset + limit),
        total: stats.length,
        pagination: {
          limit,
          offset,
          total: stats.length
        }
      };
    } catch (error) {
      console.error('Error getting query statistics:', error);
      throw new Error('Failed to get query statistics');
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const metrics = {
        cache: {
          hitRate: this.calculateCacheHitRate(),
          size: this.getCacheSize(),
          entries: this.cache.size
        },
        queries: {
          total: this.queryStats.size,
          averageExecutionTime: this.calculateAverageExecutionTime(),
          slowQueries: this.getSlowQueriesCount(),
          errors: this.getQueryErrorsCount()
        },
        system: {
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }
      };

      return metrics;
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw new Error('Failed to get performance metrics');
    }
  }

  /**
   * Calculate cache hit rate
   */
  calculateCacheHitRate() {
    // This would need to be implemented with actual cache hit tracking
    return 0.85; // Placeholder
  }

  /**
   * Get cache size
   */
  getCacheSize() {
    try {
      const cacheDir = path.join(PERFORMANCE_CONFIG.CACHE.cacheDir, 'responses');
      const files = fs.readdirSync(cacheDir);
      let totalSize = 0;

      for (const file of files) {
        const stats = fs.statSync(path.join(cacheDir, file));
        totalSize += stats.size;
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate average execution time
   */
  calculateAverageExecutionTime() {
    if (this.queryStats.size === 0) {
      return 0;
    }

    const totalTime = Array.from(this.queryStats.values())
      .reduce((sum, stat) => sum + stat.executionTime, 0);
    
    return totalTime / this.queryStats.size;
  }

  /**
   * Get slow queries count
   */
  getSlowQueriesCount() {
    return Array.from(this.queryStats.values())
      .filter(stat => stat.executionTime > PERFORMANCE_CONFIG.QUERY.slowQueryThreshold)
      .length;
  }

  /**
   * Get query errors count
   */
  getQueryErrorsCount() {
    // This would need to be implemented with actual error tracking
    return 0; // Placeholder
  }

  /**
   * Optimize dashboard data loading
   */
  async optimizeDashboardData(userId, filters = {}) {
    const cacheKey = this.generateCacheKey('dashboard_data', { userId, filters });
    
    // Try to get from cache first
    const cachedData = await this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // If not in cache, load and cache the data
    const data = await this.loadDashboardData(userId, filters);
    await this.setCachedData(cacheKey, data, 300); // Cache for 5 minutes

    return data;
  }

  /**
   * Load dashboard data with optimization
   */
  async loadDashboardData(userId, filters = {}) {
    const startTime = Date.now();

    try {
      // Load data in parallel where possible
      const [
        revenueData,
        commissionData,
        companyData,
        paymentData
      ] = await Promise.all([
        this.loadRevenueData(userId, filters),
        this.loadCommissionData(userId, filters),
        this.loadCompanyData(userId, filters),
        this.loadPaymentData(userId, filters)
      ]);

      const loadTime = Date.now() - startTime;

      return {
        revenue: revenueData,
        commission: commissionData,
        companies: companyData,
        payments: paymentData,
        performance: {
          loadTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      throw error;
    }
  }

  /**
   * Load revenue data with optimization
   */
  async loadRevenueData(userId, filters) {
    const sql = `
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        SUM(amount) as total_revenue,
        COUNT(*) as transaction_count,
        AVG(amount) as avg_amount
      FROM transactions 
      WHERE user_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    const params = [
      userId,
      filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      filters.dateTo || new Date()
    ];

    const result = await this.optimizeQuery(sql, params);
    return result.rows;
  }

  /**
   * Load commission data with optimization
   */
  async loadCommissionData(userId, filters) {
    const sql = `
      SELECT 
        commission_type,
        SUM(commission_amount) as total_commission,
        COUNT(*) as transaction_count,
        AVG(commission_amount) as avg_commission
      FROM transactions 
      WHERE user_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
      GROUP BY commission_type
      ORDER BY total_commission DESC
    `;

    const params = [
      userId,
      filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      filters.dateTo || new Date()
    ];

    const result = await this.optimizeQuery(sql, params);
    return result.rows;
  }

  /**
   * Load company data with optimization
   */
  async loadCompanyData(userId, filters) {
    const sql = `
      SELECT 
        company_id,
        company_name,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions t
      JOIN companies c ON t.company_id = c.id
      WHERE t.user_id = $1 
        AND t.created_at >= $2 
        AND t.created_at <= $3
      GROUP BY company_id, company_name
      ORDER BY total_amount DESC
      LIMIT 10
    `;

    const params = [
      userId,
      filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      filters.dateTo || new Date()
    ];

    const result = await this.optimizeQuery(sql, params);
    return result.rows;
  }

  /**
   * Load payment data with optimization
   */
  async loadPaymentData(userId, filters) {
    const sql = `
      SELECT 
        payment_method,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions 
      WHERE user_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `;

    const params = [
      userId,
      filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      filters.dateTo || new Date()
    ];

    const result = await this.optimizeQuery(sql, params);
    return result.rows;
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupCache();
    }, PERFORMANCE_CONFIG.CACHE.cleanupInterval);
  }

  /**
   * Cleanup expired cache entries
   */
  async cleanupCache() {
    try {
      const cacheDir = path.join(PERFORMANCE_CONFIG.CACHE.cacheDir, 'responses');
      const files = fs.readdirSync(cacheDir);
      const now = Date.now();

      for (const file of files) {
        try {
          const filePath = path.join(cacheDir, file);
          const stats = fs.statSync(filePath);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          if (now - data.timestamp > data.ttl) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          console.error('Error cleaning up cache file:', file, error);
        }
      }
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }
}

// Create service instance
const dashboardPerformance = new DashboardPerformanceService();

/** API Handlers */
export async function performanceHandler(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    switch (req.method) {
      case 'GET':
        return await handleGetPerformance(req, res, userId);
      case 'POST':
        return await handleOptimizeData(req, res, userId);
      case 'DELETE':
        return await handleClearCache(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Performance handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetPerformance(req, res, userId) {
  try {
    const { type = 'metrics' } = req.query;

    let data;
    switch (type) {
      case 'metrics':
        data = await dashboardPerformance.getPerformanceMetrics();
        break;
      case 'queries':
        data = await dashboardPerformance.getQueryStatistics(req.query);
        break;
      default:
        return res.status(400).json({ error: 'Invalid performance type' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({ error: 'Failed to get performance data' });
  }
}

async function handleOptimizeData(req, res, userId) {
  try {
    const { filters = {} } = req.body;

    const data = await dashboardPerformance.optimizeDashboardData(userId, filters);

    res.status(200).json({
      message: 'Dashboard data optimized successfully',
      data,
      performance: {
        cached: false,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Optimize data error:', error);
    res.status(500).json({ error: 'Failed to optimize dashboard data' });
  }
}

async function handleClearCache(req, res, userId) {
  try {
    const { pattern } = req.query;

    await dashboardPerformance.clearCache(pattern);

    res.status(200).json({
      message: 'Cache cleared successfully',
      pattern: pattern || 'all'
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
}

export async function healthHandler(req, res) {
  res.status(200).json({
    status: 'healthy',
    service: 'dashboard-performance',
    timestamp: new Date().toISOString(),
    config: {
      cache: PERFORMANCE_CONFIG.CACHE,
      query: PERFORMANCE_CONFIG.QUERY,
      database: PERFORMANCE_CONFIG.DATABASE,
      response: PERFORMANCE_CONFIG.RESPONSE,
      monitoring: PERFORMANCE_CONFIG.MONITORING
    }
  });
}

export { dashboardPerformance, PERFORMANCE_CONFIG };
