import { query } from './db/connection.mjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Export Templates Configuration */
const TEMPLATE_CONFIG = {
  // Storage
  STORAGE: {
    templatesDir: path.join(__dirname, '../templates/export-templates'),
    maxTemplatesPerUser: 20,
    maxTemplateSize: 1024 * 1024 // 1MB
  },
  
  // Template Types
  TEMPLATE_TYPES: {
    REVENUE_ANALYSIS: 'revenue_analysis',
    COMMISSION_ANALYSIS: 'commission_analysis',
    COMPREHENSIVE: 'comprehensive',
    CUSTOM: 'custom',
    EXECUTIVE: 'executive',
    OPERATIONAL: 'operational'
  },
  
  // Supported Formats
  SUPPORTED_FORMATS: ['pdf', 'excel', 'csv', 'json'],
  
  // Default Templates
  DEFAULT_TEMPLATES: {
    revenue_analysis: {
      name: 'Revenue Analysis',
      description: 'Standard revenue analysis report with KPIs and breakdowns',
      type: 'revenue_analysis',
      sections: ['kpis', 'revenue_breakdown', 'company_performance', 'payment_methods', 'trends'],
      charts: ['pie_chart', 'bar_chart', 'line_chart'],
      formatting: {
        headerStyle: { fontSize: 16, bold: true, color: '#2E86AB' },
        subheaderStyle: { fontSize: 14, bold: true, color: '#A23B72' },
        bodyStyle: { fontSize: 12, color: '#333333' },
        highlightStyle: { fontSize: 12, bold: true, color: '#F18F01' }
      },
      layout: {
        pageOrientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        spacing: { section: 15, paragraph: 8, line: 4 }
      }
    },
    commission_analysis: {
      name: 'Commission Analysis',
      description: 'Detailed commission analysis with financial waterfall',
      type: 'commission_analysis',
      sections: ['kpis', 'financial_waterfall', 'employee_commissions', 'referral_commissions', 'trends'],
      charts: ['waterfall_chart', 'pie_chart', 'line_chart'],
      formatting: {
        headerStyle: { fontSize: 16, bold: true, color: '#2E86AB' },
        subheaderStyle: { fontSize: 14, bold: true, color: '#A23B72' },
        bodyStyle: { fontSize: 12, color: '#333333' },
        highlightStyle: { fontSize: 12, bold: true, color: '#F18F01' }
      },
      layout: {
        pageOrientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        spacing: { section: 15, paragraph: 8, line: 4 }
      }
    },
    comprehensive: {
      name: 'Comprehensive Dashboard',
      description: 'Complete dashboard report with all sections and charts',
      type: 'comprehensive',
      sections: ['kpis', 'revenue_breakdown', 'financial_waterfall', 'company_performance', 'commissions', 'trends'],
      charts: ['all'],
      formatting: {
        headerStyle: { fontSize: 16, bold: true, color: '#2E86AB' },
        subheaderStyle: { fontSize: 14, bold: true, color: '#A23B72' },
        bodyStyle: { fontSize: 12, color: '#333333' },
        highlightStyle: { fontSize: 12, bold: true, color: '#F18F01' }
      },
      layout: {
        pageOrientation: 'landscape',
        margins: { top: 15, right: 15, bottom: 15, left: 15 },
        spacing: { section: 12, paragraph: 6, line: 3 }
      }
    }
  }
};

/** Export Templates Service */
class ExportTemplatesService {
  constructor() {
    this.ensureTemplatesDirectory();
  }
  
  ensureTemplatesDirectory() {
    if (!fs.existsSync(TEMPLATE_CONFIG.STORAGE.templatesDir)) {
      fs.mkdirSync(TEMPLATE_CONFIG.STORAGE.templatesDir, { recursive: true });
    }
  }
  
  generateTemplateId() {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async validateTemplateRequest(templateData, user) {
    // Validate required fields
    if (!templateData.name || !templateData.type) {
      throw new Error('Template name and type are required');
    }
    
    // Validate template type
    if (!Object.values(TEMPLATE_CONFIG.TEMPLATE_TYPES).includes(templateData.type)) {
      throw new Error(`Invalid template type: ${templateData.type}`);
    }
    
    // Validate supported formats
    if (templateData.supportedFormats) {
      for (const format of templateData.supportedFormats) {
        if (!TEMPLATE_CONFIG.SUPPORTED_FORMATS.includes(format)) {
          throw new Error(`Unsupported format: ${format}`);
        }
      }
    }
    
    // Check user template limits
    const userTemplateCount = await this.getUserTemplateCount(user.id);
    if (userTemplateCount >= TEMPLATE_CONFIG.STORAGE.maxTemplatesPerUser) {
      throw new Error(`Maximum templates per user (${TEMPLATE_CONFIG.STORAGE.maxTemplatesPerUser}) exceeded`);
    }
    
    // Validate template size if provided
    if (templateData.content && templateData.content.length > TEMPLATE_CONFIG.STORAGE.maxTemplateSize) {
      throw new Error(`Template content exceeds maximum size (${TEMPLATE_CONFIG.STORAGE.maxTemplateSize} bytes)`);
    }
    
    return true;
  }
  
  async getUserTemplateCount(userId) {
    const result = await query(
      'SELECT COUNT(*) FROM export_templates WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );
    return parseInt(result.rows[0].count);
  }
  
  async createTemplate(templateData, user) {
    const templateId = this.generateTemplateId();
    
    // Create template record in database
    const result = await query(
      `INSERT INTO export_templates (
        id, user_id, name, description, type, content, supported_formats,
        sections, charts, formatting, layout, is_default, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        templateId,
        user.id,
        templateData.name,
        templateData.description || '',
        templateData.type,
        JSON.stringify(templateData.content || {}),
        JSON.stringify(templateData.supportedFormats || TEMPLATE_CONFIG.SUPPORTED_FORMATS),
        JSON.stringify(templateData.sections || []),
        JSON.stringify(templateData.charts || []),
        JSON.stringify(templateData.formatting || {}),
        JSON.stringify(templateData.layout || {}),
        templateData.isDefault || false,
        'active',
        new Date().toISOString()
      ]
    );
    
    const template = result.rows[0];
    
    // Save template file if content is provided
    if (templateData.content) {
      await this.saveTemplateFile(templateId, templateData.content);
    }
    
    return template;
  }
  
  async saveTemplateFile(templateId, content) {
    const filePath = path.join(TEMPLATE_CONFIG.STORAGE.templatesDir, `${templateId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  }
  
  async loadTemplateFile(templateId) {
    const filePath = path.join(TEMPLATE_CONFIG.STORAGE.templatesDir, `${templateId}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
    return null;
  }
  
  async getTemplates(userId, type = null, includeDefaults = true) {
    let queryText = 'SELECT * FROM export_templates WHERE (user_id = $1 OR is_default = true)';
    let params = [userId];
    
    if (type) {
      queryText += ' AND type = $2';
      params.push(type);
    }
    
    if (!includeDefaults) {
      queryText = 'SELECT * FROM export_templates WHERE user_id = $1';
      params = [userId];
    }
    
    queryText += ' ORDER BY is_default DESC, created_at DESC';
    
    const result = await query(queryText, params);
    
    // Load template files for each template
    for (const template of result.rows) {
      template.content = await this.loadTemplateFile(template.id);
    }
    
    return result.rows;
  }
  
  async getTemplate(templateId, userId) {
    const result = await query(
      'SELECT * FROM export_templates WHERE id = $1 AND (user_id = $2 OR is_default = true)',
      [templateId, userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const template = result.rows[0];
    template.content = await this.loadTemplateFile(template.id);
    
    return template;
  }
  
  async updateTemplate(templateId, userId, updateData) {
    // Validate the template exists and belongs to user
    const existingTemplate = await this.getTemplate(templateId, userId);
    if (!existingTemplate) {
      throw new Error('Template not found');
    }
    
    if (existingTemplate.is_default) {
      throw new Error('Cannot modify default templates');
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
    
    if (updateData.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      params.push(updateData.type);
    }
    
    if (updateData.content !== undefined) {
      updateFields.push(`content = $${paramIndex++}`);
      params.push(JSON.stringify(updateData.content));
    }
    
    if (updateData.supportedFormats !== undefined) {
      updateFields.push(`supported_formats = $${paramIndex++}`);
      params.push(JSON.stringify(updateData.supportedFormats));
    }
    
    if (updateData.sections !== undefined) {
      updateFields.push(`sections = $${paramIndex++}`);
      params.push(JSON.stringify(updateData.sections));
    }
    
    if (updateData.charts !== undefined) {
      updateFields.push(`charts = $${paramIndex++}`);
      params.push(JSON.stringify(updateData.charts));
    }
    
    if (updateData.formatting !== undefined) {
      updateFields.push(`formatting = $${paramIndex++}`);
      params.push(JSON.stringify(updateData.formatting));
    }
    
    if (updateData.layout !== undefined) {
      updateFields.push(`layout = $${paramIndex++}`);
      params.push(JSON.stringify(updateData.layout));
    }
    
    if (updateData.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      params.push(updateData.status);
    }
    
    updateFields.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());
    
    params.push(templateId);
    params.push(userId);
    
    const result = await query(
      `UPDATE export_templates SET ${updateFields.join(', ')} 
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} RETURNING *`,
      params
    );
    
    const updatedTemplate = result.rows[0];
    
    // Update template file if content was changed
    if (updateData.content) {
      await this.saveTemplateFile(templateId, updateData.content);
    }
    
    updatedTemplate.content = await this.loadTemplateFile(templateId);
    
    return updatedTemplate;
  }
  
  async deleteTemplate(templateId, userId) {
    // Validate the template exists and belongs to user
    const existingTemplate = await this.getTemplate(templateId, userId);
    if (!existingTemplate) {
      throw new Error('Template not found');
    }
    
    if (existingTemplate.is_default) {
      throw new Error('Cannot delete default templates');
    }
    
    // Delete from database
    const result = await query(
      'DELETE FROM export_templates WHERE id = $1 AND user_id = $2 RETURNING *',
      [templateId, userId]
    );
    
    if (result.rows.length > 0) {
      // Delete template file
      const filePath = path.join(TEMPLATE_CONFIG.STORAGE.templatesDir, `${templateId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return result.rows[0];
    }
    
    return null;
  }
  
  async duplicateTemplate(templateId, userId, newName) {
    const sourceTemplate = await this.getTemplate(templateId, userId);
    if (!sourceTemplate) {
      throw new Error('Source template not found');
    }
    
    // Create new template based on source
    const newTemplateData = {
      name: newName || `${sourceTemplate.name} (Copy)`,
      description: sourceTemplate.description,
      type: sourceTemplate.type,
      content: sourceTemplate.content,
      supportedFormats: sourceTemplate.supported_formats,
      sections: sourceTemplate.sections,
      charts: sourceTemplate.charts,
      formatting: sourceTemplate.formatting,
      layout: sourceTemplate.layout,
      isDefault: false
    };
    
    return await this.createTemplate(newTemplateData, { id: userId });
  }
  
  async getDefaultTemplates() {
    return TEMPLATE_CONFIG.DEFAULT_TEMPLATES;
  }
  
  async getTemplateTypes() {
    return TEMPLATE_CONFIG.TEMPLATE_TYPES;
  }
  
  async getSupportedFormats() {
    return TEMPLATE_CONFIG.SUPPORTED_FORMATS;
  }
  
  async validateTemplateContent(content) {
    const errors = [];
    
    // Validate required sections
    if (!content.sections || !Array.isArray(content.sections)) {
      errors.push('Template must have a sections array');
    }
    
    // Validate formatting
    if (content.formatting) {
      if (content.formatting.headerStyle && !content.formatting.headerStyle.fontSize) {
        errors.push('Header style must have fontSize property');
      }
    }
    
    // Validate layout
    if (content.layout) {
      if (content.layout.pageOrientation && !['portrait', 'landscape'].includes(content.layout.pageOrientation)) {
        errors.push('Page orientation must be portrait or landscape');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  async exportTemplate(templateId, userId, format = 'json') {
    const template = await this.getTemplate(templateId, userId);
    if (!template) {
      throw new Error('Template not found');
    }
    
    const exportData = {
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        type: template.type,
        content: template.content,
        supportedFormats: template.supported_formats,
        sections: template.sections,
        charts: template.charts,
        formatting: template.formatting,
        layout: template.layout,
        isDefault: template.is_default,
        createdAt: template.created_at,
        updatedAt: template.updated_at
      },
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: userId,
        format: format,
        version: '1.0'
      }
    };
    
    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'yaml':
        // Would need yaml library
        return JSON.stringify(exportData, null, 2);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
  
  async importTemplate(importData, userId) {
    try {
      const data = typeof importData === 'string' ? JSON.parse(importData) : importData;
      
      if (!data.template || !data.template.name || !data.template.type) {
        throw new Error('Invalid template data: missing required fields');
      }
      
      // Validate template content
      const validation = await this.validateTemplateContent(data.template.content || {});
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Create template
      const templateData = {
        name: data.template.name,
        description: data.template.description || '',
        type: data.template.type,
        content: data.template.content || {},
        supportedFormats: data.template.supportedFormats || TEMPLATE_CONFIG.SUPPORTED_FORMATS,
        sections: data.template.sections || [],
        charts: data.template.charts || [],
        formatting: data.template.formatting || {},
        layout: data.template.layout || {},
        isDefault: false
      };
      
      return await this.createTemplate(templateData, { id: userId });
      
    } catch (error) {
      throw new Error(`Failed to import template: ${error.message}`);
    }
  }
}

// Initialize templates service
const templatesService = new ExportTemplatesService();

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

// Main templates handler
export async function templatesHandler(req, res) {
  try {
    // Authenticate user
    const user = await authenticateToken(req);
    
    if (req.method === 'POST') {
      // Create new template
      const templateData = req.body;
      
      await templatesService.validateTemplateRequest(templateData, user);
      
      const template = await templatesService.createTemplate(templateData, user);
      
      return res.status(201).json({
        success: true,
        template: template
      });
      
    } else if (req.method === 'GET') {
      const { templateId, type, includeDefaults, export: exportFormat } = req.query;
      
      if (templateId) {
        if (exportFormat) {
          // Export template
          const exportData = await templatesService.exportTemplate(templateId, user.id, exportFormat);
          
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="template_${templateId}.${exportFormat}"`);
          
          return res.status(200).send(exportData);
        } else {
          // Get specific template
          const template = await templatesService.getTemplate(templateId, user.id);
          
          if (!template) {
            return res.status(404).json({ error: 'Template not found' });
          }
          
          return res.status(200).json({
            success: true,
            template: template
          });
        }
      } else {
        // Get all templates
        const templates = await templatesService.getTemplates(
          user.id, 
          type, 
          includeDefaults !== 'false'
        );
        
        return res.status(200).json({
          success: true,
          templates: templates,
          limits: {
            maxTemplatesPerUser: TEMPLATE_CONFIG.STORAGE.maxTemplatesPerUser,
            maxTemplateSize: TEMPLATE_CONFIG.STORAGE.maxTemplateSize
          }
        });
      }
      
    } else if (req.method === 'PUT') {
      const { templateId } = req.params;
      const updateData = req.body;
      
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' });
      }
      
      const updatedTemplate = await templatesService.updateTemplate(templateId, user.id, updateData);
      
      return res.status(200).json({
        success: true,
        template: updatedTemplate
      });
      
    } else if (req.method === 'DELETE') {
      const { templateId } = req.params;
      
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' });
      }
      
      const deletedTemplate = await templatesService.deleteTemplate(templateId, user.id);
      
      if (!deletedTemplate) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Template deleted successfully'
      });
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Templates API error:', error);
    
    return res.status(error.message.includes('token') ? 401 : 500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Duplicate template handler
export async function duplicateTemplateHandler(req, res) {
  try {
    // Authenticate user
    const user = await authenticateToken(req);
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { templateId } = req.params;
    const { newName } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }
    
    const duplicatedTemplate = await templatesService.duplicateTemplate(templateId, user.id, newName);
    
    return res.status(201).json({
      success: true,
      template: duplicatedTemplate
    });
    
  } catch (error) {
    console.error('Duplicate template error:', error);
    
    return res.status(error.message.includes('token') ? 401 : 500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Import template handler
export async function importTemplateHandler(req, res) {
  try {
    // Authenticate user
    const user = await authenticateToken(req);
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { templateData } = req.body;
    
    if (!templateData) {
      return res.status(400).json({ error: 'Template data is required' });
    }
    
    const importedTemplate = await templatesService.importTemplate(templateData, user.id);
    
    return res.status(201).json({
      success: true,
      template: importedTemplate
    });
    
  } catch (error) {
    console.error('Import template error:', error);
    
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
      service: 'export-templates-api',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      templates: {
        templatesDir: TEMPLATE_CONFIG.STORAGE.templatesDir,
        templatesDirExists: fs.existsSync(TEMPLATE_CONFIG.STORAGE.templatesDir),
        defaultTemplates: Object.keys(TEMPLATE_CONFIG.DEFAULT_TEMPLATES).length
      },
      config: {
        maxTemplatesPerUser: TEMPLATE_CONFIG.STORAGE.maxTemplatesPerUser,
        supportedFormats: TEMPLATE_CONFIG.SUPPORTED_FORMATS,
        templateTypes: Object.keys(TEMPLATE_CONFIG.TEMPLATE_TYPES)
      }
    };
    
    return res.status(200).json(healthStatus);
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return res.status(500).json({
      service: 'export-templates-api',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
