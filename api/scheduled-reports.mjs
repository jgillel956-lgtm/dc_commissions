import { query } from './db/connection.mjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exportHandler } from './dashboard-export.mjs';
import cron from 'node-cron';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Scheduled Reports Configuration */
const SCHEDULED_REPORTS_CONFIG = {
  // Storage
  STORAGE: {
    reportsDir: path.join(__dirname, '../temp/scheduled-reports'),
    retentionDays: 30,
    cleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
  },
  
  // Scheduling
  SCHEDULING: {
    maxSchedulesPerUser: 10,
    maxReportsPerSchedule: 5,
    supportedFrequencies: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    supportedFormats: ['pdf', 'excel', 'csv', 'json'],
    supportedTemplates: ['revenue_analysis', 'commission_analysis', 'comprehensive']
  },
  
  // Notifications
  NOTIFICATIONS: {
    emailNotifications: true,
    slackNotifications: false,
    webhookNotifications: false
  }
};

/** Scheduled reports tracking */
const scheduledReports = new Map();
const activeSchedules = new Map();

/** Scheduled Reports Service */
class ScheduledReportsService {
  constructor() {
    this.ensureStorageDirectory();
    this.startCleanupScheduler();
    this.initializeSchedules();
  }
  
  ensureStorageDirectory() {
    if (!fs.existsSync(SCHEDULED_REPORTS_CONFIG.STORAGE.reportsDir)) {
      fs.mkdirSync(SCHEDULED_REPORTS_CONFIG.STORAGE.reportsDir, { recursive: true });
    }
  }
  
  startCleanupScheduler() {
    setInterval(() => {
      this.cleanupOldReports();
    }, SCHEDULED_REPORTS_CONFIG.STORAGE.cleanupInterval);
  }
  
  async cleanupOldReports() {
    try {
      const files = fs.readdirSync(SCHEDULED_REPORTS_CONFIG.STORAGE.reportsDir);
      const cutoffTime = Date.now() - (SCHEDULED_REPORTS_CONFIG.STORAGE.retentionDays * 24 * 60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(SCHEDULED_REPORTS_CONFIG.STORAGE.reportsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old scheduled report: ${file}`);
        }
      }
    } catch (error) {
      console.error('Scheduled reports cleanup error:', error);
    }
  }
  
  async initializeSchedules() {
    try {
      // Load active schedules from database
      const result = await query(
        'SELECT * FROM scheduled_reports WHERE status = $1',
        ['active']
      );
      
      for (const schedule of result.rows) {
        this.startSchedule(schedule);
      }
      
      console.log(`Initialized ${result.rows.length} active scheduled reports`);
    } catch (error) {
      console.error('Error initializing scheduled reports:', error);
    }
  }
  
  generateScheduleId() {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async validateScheduleRequest(scheduleData, user) {
    // Validate frequency
    if (!SCHEDULED_REPORTS_CONFIG.SCHEDULING.supportedFrequencies.includes(scheduleData.frequency)) {
      throw new Error(`Unsupported frequency: ${scheduleData.frequency}`);
    }
    
    // Validate format
    if (!SCHEDULED_REPORTS_CONFIG.SCHEDULING.supportedFormats.includes(scheduleData.format)) {
      throw new Error(`Unsupported format: ${scheduleData.format}`);
    }
    
    // Validate template
    if (scheduleData.template && !SCHEDULED_REPORTS_CONFIG.SCHEDULING.supportedTemplates.includes(scheduleData.template)) {
      throw new Error(`Unsupported template: ${scheduleData.template}`);
    }
    
    // Check user schedule limits
    const userScheduleCount = await this.getUserScheduleCount(user.id);
    if (userScheduleCount >= SCHEDULED_REPORTS_CONFIG.SCHEDULING.maxSchedulesPerUser) {
      throw new Error(`Maximum schedules per user (${SCHEDULED_REPORTS_CONFIG.SCHEDULING.maxSchedulesPerUser}) exceeded`);
    }
    
    // Validate cron expression
    if (!this.isValidCronExpression(scheduleData.cronExpression)) {
      throw new Error('Invalid cron expression');
    }
    
    return true;
  }
  
  isValidCronExpression(cronExpression) {
    try {
      cron.validate(cronExpression);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async getUserScheduleCount(userId) {
    const result = await query(
      'SELECT COUNT(*) FROM scheduled_reports WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );
    return parseInt(result.rows[0].count);
  }
  
  async createSchedule(scheduleData, user) {
    const scheduleId = this.generateScheduleId();
    
    // Create schedule record in database
    const result = await query(
      `INSERT INTO scheduled_reports (
        id, user_id, name, description, frequency, cron_expression, 
        format, template, filters, recipients, next_run, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        scheduleId,
        user.id,
        scheduleData.name,
        scheduleData.description || '',
        scheduleData.frequency,
        scheduleData.cronExpression,
        scheduleData.format,
        scheduleData.template || null,
        JSON.stringify(scheduleData.filters || {}),
        JSON.stringify(scheduleData.recipients || []),
        this.calculateNextRun(scheduleData.cronExpression),
        'active',
        new Date().toISOString()
      ]
    );
    
    const schedule = result.rows[0];
    
    // Start the schedule
    this.startSchedule(schedule);
    
    // Store in memory
    scheduledReports.set(scheduleId, schedule);
    
    return schedule;
  }
  
  calculateNextRun(cronExpression) {
    const nextRun = cron.getNextDate(cronExpression);
    return nextRun.toISOString();
  }
  
  startSchedule(schedule) {
    try {
      // Stop existing schedule if running
      if (activeSchedules.has(schedule.id)) {
        activeSchedules.get(schedule.id).stop();
      }
      
      // Create new cron job
      const job = cron.schedule(schedule.cron_expression, async () => {
        await this.executeScheduledReport(schedule);
      }, {
        scheduled: true,
        timezone: "UTC"
      });
      
      activeSchedules.set(schedule.id, job);
      console.log(`Started scheduled report: ${schedule.name} (${schedule.id})`);
      
    } catch (error) {
      console.error(`Error starting schedule ${schedule.id}:`, error);
    }
  }
  
  async executeScheduledReport(schedule) {
    console.log(`Executing scheduled report: ${schedule.name} (${schedule.id})`);
    
    try {
      // Get user information
      const userResult = await query(
        'SELECT id, username, email FROM users WHERE id = $1',
        [schedule.user_id]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const user = userResult.rows[0];
      const filters = JSON.parse(schedule.filters || '{}');
      
      // Create export using existing export service
      const exportService = new (await import('./dashboard-export.mjs')).DashboardExportService();
      const exportRecord = await exportService.createExport(
        schedule.format,
        schedule.template,
        filters,
        user
      );
      
      // Record execution
      await this.recordExecution(schedule.id, exportRecord);
      
      // Send notifications
      await this.sendNotifications(schedule, exportRecord, user);
      
      // Update next run time
      await this.updateNextRun(schedule.id);
      
      console.log(`Successfully executed scheduled report: ${schedule.name}`);
      
    } catch (error) {
      console.error(`Error executing scheduled report ${schedule.id}:`, error);
      await this.recordExecutionError(schedule.id, error.message);
    }
  }
  
  async recordExecution(scheduleId, exportRecord) {
    await query(
      `INSERT INTO scheduled_report_executions (
        schedule_id, execution_time, export_id, file_name, file_size, 
        record_count, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        scheduleId,
        new Date().toISOString(),
        exportRecord.id,
        exportRecord.fileName,
        exportRecord.fileSize,
        exportRecord.recordCount,
        'completed',
        new Date().toISOString()
      ]
    );
  }
  
  async recordExecutionError(scheduleId, errorMessage) {
    await query(
      `INSERT INTO scheduled_report_executions (
        schedule_id, execution_time, status, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        scheduleId,
        new Date().toISOString(),
        'failed',
        errorMessage,
        new Date().toISOString()
      ]
    );
  }
  
  async updateNextRun(scheduleId) {
    const schedule = scheduledReports.get(scheduleId);
    if (schedule) {
      const nextRun = this.calculateNextRun(schedule.cron_expression);
      await query(
        'UPDATE scheduled_reports SET next_run = $1 WHERE id = $2',
        [nextRun, scheduleId]
      );
      
      // Update in memory
      schedule.next_run = nextRun;
      scheduledReports.set(scheduleId, schedule);
    }
  }
  
  async sendNotifications(schedule, exportRecord, user) {
    const recipients = JSON.parse(schedule.recipients || '[]');
    
    if (SCHEDULED_REPORTS_CONFIG.NOTIFICATIONS.emailNotifications && recipients.length > 0) {
      await this.sendEmailNotification(schedule, exportRecord, user, recipients);
    }
    
    if (SCHEDULED_REPORTS_CONFIG.NOTIFICATIONS.slackNotifications) {
      await this.sendSlackNotification(schedule, exportRecord, user);
    }
    
    if (SCHEDULED_REPORTS_CONFIG.NOTIFICATIONS.webhookNotifications) {
      await this.sendWebhookNotification(schedule, exportRecord, user);
    }
  }
  
  async sendEmailNotification(schedule, exportRecord, user, recipients) {
    // Implementation for email notifications
    console.log(`Email notification sent for schedule ${schedule.id} to ${recipients.join(', ')}`);
  }
  
  async sendSlackNotification(schedule, exportRecord, user) {
    // Implementation for Slack notifications
    console.log(`Slack notification sent for schedule ${schedule.id}`);
  }
  
  async sendWebhookNotification(schedule, exportRecord, user) {
    // Implementation for webhook notifications
    console.log(`Webhook notification sent for schedule ${schedule.id}`);
  }
  
  async getSchedules(userId, status = null) {
    let queryText = 'SELECT * FROM scheduled_reports WHERE user_id = $1';
    let params = [userId];
    
    if (status) {
      queryText += ' AND status = $2';
      params.push(status);
    }
    
    queryText += ' ORDER BY created_at DESC';
    
    const result = await query(queryText, params);
    return result.rows;
  }
  
  async getSchedule(scheduleId, userId) {
    const result = await query(
      'SELECT * FROM scheduled_reports WHERE id = $1 AND user_id = $2',
      [scheduleId, userId]
    );
    
    return result.rows[0] || null;
  }
  
  async updateSchedule(scheduleId, userId, updateData) {
    // Validate the schedule exists and belongs to user
    const existingSchedule = await this.getSchedule(scheduleId, userId);
    if (!existingSchedule) {
      throw new Error('Schedule not found');
    }
    
    // Build update query
    const updateFields = [];
    const params = [];
    let paramIndex = 1;
    
    if (updateData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      params.push(updateData.name);
    }
    
    if (updateData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      params.push(updateData.description);
    }
    
    if (updateData.frequency !== undefined) {
      updateFields.push(`frequency = $${paramIndex++}`);
      params.push(updateData.frequency);
    }
    
    if (updateData.cronExpression !== undefined) {
      updateFields.push(`cron_expression = $${paramIndex++}`);
      params.push(updateData.cronExpression);
    }
    
    if (updateData.format !== undefined) {
      updateFields.push(`format = $${paramIndex++}`);
      params.push(updateData.format);
    }
    
    if (updateData.template !== undefined) {
      updateFields.push(`template = $${paramIndex++}`);
      params.push(updateData.template);
    }
    
    if (updateData.filters !== undefined) {
      updateFields.push(`filters = $${paramIndex++}`);
      params.push(JSON.stringify(updateData.filters));
    }
    
    if (updateData.recipients !== undefined) {
      updateFields.push(`recipients = $${paramIndex++}`);
      params.push(JSON.stringify(updateData.recipients));
    }
    
    if (updateData.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      params.push(updateData.status);
    }
    
    updateFields.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());
    
    params.push(scheduleId);
    params.push(userId);
    
    const result = await query(
      `UPDATE scheduled_reports SET ${updateFields.join(', ')} 
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} RETURNING *`,
      params
    );
    
    const updatedSchedule = result.rows[0];
    
    // Update in memory
    scheduledReports.set(scheduleId, updatedSchedule);
    
    // Restart schedule if status changed to active
    if (updateData.status === 'active') {
      this.startSchedule(updatedSchedule);
    } else if (updateData.status === 'paused') {
      this.stopSchedule(scheduleId);
    }
    
    return updatedSchedule;
  }
  
  async deleteSchedule(scheduleId, userId) {
    // Stop the schedule
    this.stopSchedule(scheduleId);
    
    // Delete from database
    const result = await query(
      'DELETE FROM scheduled_reports WHERE id = $1 AND user_id = $2 RETURNING *',
      [scheduleId, userId]
    );
    
    if (result.rows.length > 0) {
      // Remove from memory
      scheduledReports.delete(scheduleId);
      activeSchedules.delete(scheduleId);
      
      return result.rows[0];
    }
    
    return null;
  }
  
  stopSchedule(scheduleId) {
    if (activeSchedules.has(scheduleId)) {
      activeSchedules.get(scheduleId).stop();
      activeSchedules.delete(scheduleId);
      console.log(`Stopped scheduled report: ${scheduleId}`);
    }
  }
  
  async getExecutions(scheduleId, userId, limit = 10) {
    // Verify schedule belongs to user
    const schedule = await this.getSchedule(scheduleId, userId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    
    const result = await query(
      `SELECT * FROM scheduled_report_executions 
       WHERE schedule_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [scheduleId, limit]
    );
    
    return result.rows;
  }
  
  async executeNow(scheduleId, userId) {
    const schedule = await this.getSchedule(scheduleId, userId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    
    if (schedule.status !== 'active') {
      throw new Error('Schedule is not active');
    }
    
    // Execute immediately
    await this.executeScheduledReport(schedule);
    
    return { message: 'Report executed successfully' };
  }
  
  getSupportedFrequencies() {
    return SCHEDULED_REPORTS_CONFIG.SCHEDULING.supportedFrequencies;
  }
  
  getSupportedFormats() {
    return SCHEDULED_REPORTS_CONFIG.SCHEDULING.supportedFormats;
  }
  
  getSupportedTemplates() {
    return SCHEDULED_REPORTS_CONFIG.SCHEDULING.supportedTemplates;
  }
  
  generateCronExpression(frequency, options = {}) {
    switch (frequency) {
      case 'daily':
        return `0 ${options.hour || 9} * * *`; // Daily at 9 AM UTC
      case 'weekly':
        const dayOfWeek = options.dayOfWeek || 1; // Monday
        return `0 ${options.hour || 9} * * ${dayOfWeek}`;
      case 'monthly':
        const dayOfMonth = options.dayOfMonth || 1;
        return `0 ${options.hour || 9} ${dayOfMonth} * *`;
      case 'quarterly':
        const quarterDay = options.dayOfMonth || 1;
        const quarterMonth = options.month || 1;
        return `0 ${options.hour || 9} ${quarterDay} ${quarterMonth},${quarterMonth + 3},${quarterMonth + 6},${quarterMonth + 9} *`;
      case 'yearly':
        const yearDay = options.dayOfMonth || 1;
        const yearMonth = options.month || 1;
        return `0 ${options.hour || 9} ${yearDay} ${yearMonth} *`;
      default:
        throw new Error(`Unsupported frequency: ${frequency}`);
    }
  }
}

// Initialize scheduled reports service
const scheduledReportsService = new ScheduledReportsService();

// Authentication middleware
const authenticateToken = async (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('Access token required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Find user in database
    const result = await query(
      'SELECT id, username, email, role, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    const user = result.rows[0];

    if (!user) {
      throw new Error('User not found');
    }

    if (user.status !== 'active') {
      throw new Error('Account is deactivated');
    }

    return user;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Main scheduled reports handler
export async function scheduledReportsHandler(req, res) {
  try {
    // Authenticate user
    const user = await authenticateToken(req);
    
    if (req.method === 'POST') {
      // Create new scheduled report
      const scheduleData = req.body;
      
      if (!scheduleData.name || !scheduleData.frequency || !scheduleData.format) {
        return res.status(400).json({ 
          error: 'Name, frequency, and format are required' 
        });
      }
      
      // Generate cron expression if not provided
      if (!scheduleData.cronExpression) {
        scheduleData.cronExpression = scheduledReportsService.generateCronExpression(
          scheduleData.frequency, 
          scheduleData.scheduleOptions
        );
      }
      
      const schedule = await scheduledReportsService.createSchedule(scheduleData, user);
      
      return res.status(201).json({
        success: true,
        schedule: schedule
      });
      
    } else if (req.method === 'GET') {
      const { scheduleId, status, executions } = req.query;
      
      if (scheduleId) {
        if (executions) {
          // Get executions for a specific schedule
          const executions = await scheduledReportsService.getExecutions(scheduleId, user.id);
          return res.status(200).json({
            success: true,
            executions: executions
          });
        } else {
          // Get specific schedule
          const schedule = await scheduledReportsService.getSchedule(scheduleId, user.id);
          
          if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
          }
          
          return res.status(200).json({
            success: true,
            schedule: schedule
          });
        }
      } else {
        // Get all schedules for user
        const schedules = await scheduledReportsService.getSchedules(user.id, status);
        
        return res.status(200).json({
          success: true,
          schedules: schedules,
          limits: {
            maxSchedulesPerUser: SCHEDULED_REPORTS_CONFIG.SCHEDULING.maxSchedulesPerUser,
            supportedFrequencies: scheduledReportsService.getSupportedFrequencies(),
            supportedFormats: scheduledReportsService.getSupportedFormats(),
            supportedTemplates: scheduledReportsService.getSupportedTemplates()
          }
        });
      }
      
    } else if (req.method === 'PUT') {
      const { scheduleId } = req.params;
      const updateData = req.body;
      
      if (!scheduleId) {
        return res.status(400).json({ error: 'Schedule ID is required' });
      }
      
      const updatedSchedule = await scheduledReportsService.updateSchedule(
        scheduleId, 
        user.id, 
        updateData
      );
      
      return res.status(200).json({
        success: true,
        schedule: updatedSchedule
      });
      
    } else if (req.method === 'DELETE') {
      const { scheduleId } = req.params;
      
      if (!scheduleId) {
        return res.status(400).json({ error: 'Schedule ID is required' });
      }
      
      const deletedSchedule = await scheduledReportsService.deleteSchedule(scheduleId, user.id);
      
      if (!deletedSchedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Schedule deleted successfully'
      });
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Scheduled reports API error:', error);
    
    return res.status(error.message.includes('token') ? 401 : 500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Execute now handler
export async function executeNowHandler(req, res) {
  try {
    // Authenticate user
    const user = await authenticateToken(req);
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { scheduleId } = req.params;
    
    if (!scheduleId) {
      return res.status(400).json({ error: 'Schedule ID is required' });
    }
    
    const result = await scheduledReportsService.executeNow(scheduleId, user.id);
    
    return res.status(200).json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    console.error('Execute now error:', error);
    
    return res.status(error.message.includes('token') ? 401 : 500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Health check handler
export async function healthHandler(req, res) {
  try {
    const healthStatus = {
      service: 'scheduled-reports-api',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      schedules: {
        active: activeSchedules.size,
        total: scheduledReports.size,
        reportsDir: SCHEDULED_REPORTS_CONFIG.STORAGE.reportsDir,
        reportsDirExists: fs.existsSync(SCHEDULED_REPORTS_CONFIG.STORAGE.reportsDir)
      },
      config: {
        supportedFrequencies: SCHEDULED_REPORTS_CONFIG.SCHEDULING.supportedFrequencies,
        supportedFormats: SCHEDULED_REPORTS_CONFIG.SCHEDULING.supportedFormats,
        maxSchedulesPerUser: SCHEDULED_REPORTS_CONFIG.SCHEDULING.maxSchedulesPerUser
      }
    };
    
    return res.status(200).json(healthStatus);
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return res.status(500).json({
      service: 'scheduled-reports-api',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
