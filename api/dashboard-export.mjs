import axios from "axios";
import { getAccessTokenShared, withTokenRetry } from './db/getAccessTokenShared.mjs';
import { getSharedToken, getSharedBackoffUntil, clearSharedToken } from './db/zohoTokenStore.mjs';
import { query } from './db/connection.mjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** DC-aware hosts */
const DC = process.env.ZOHO_DC || "com";
const ANALYTICS_HOST = `https://analyticsapi.zoho.${DC}`;
const BASE_URL = `${ANALYTICS_HOST}/restapi/v2`;

/** Export configuration and settings */
const EXPORT_CONFIG = {
  // File size limits
  MAX_FILE_SIZE_MB: 50,
  MAX_RECORDS_PER_EXPORT: 10000,
  
  // Export formats
  SUPPORTED_FORMATS: ['pdf', 'excel', 'csv', 'json'],
  
  // Export templates
  TEMPLATES: {
    revenue_analysis: {
      title: 'Revenue Analysis Report',
      sections: ['kpis', 'revenue_breakdown', 'company_performance', 'payment_methods', 'trends'],
      charts: ['pie_chart', 'bar_chart', 'line_chart']
    },
    commission_analysis: {
      title: 'Commission Analysis Report',
      sections: ['kpis', 'financial_waterfall', 'employee_commissions', 'referral_commissions', 'trends'],
      charts: ['waterfall_chart', 'pie_chart', 'line_chart']
    },
    comprehensive: {
      title: 'Comprehensive Dashboard Report',
      sections: ['kpis', 'revenue_breakdown', 'financial_waterfall', 'company_performance', 'commissions', 'trends'],
      charts: ['all']
    }
  },
  
  // Export file naming
  FILE_NAMING: {
    prefix: 'revenue-dashboard',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH-mm-ss',
    includeUser: true,
    includeFilters: true
  },
  
  // Export storage
  STORAGE: {
    tempDir: path.join(__dirname, '../temp/exports'),
    retentionDays: 7,
    cleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
  }
};

/** Export history tracking */
const exportHistory = new Map();
const EXPORT_HISTORY_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Export progress tracking */
const exportProgress = new Map();

/** Export service class */
class DashboardExportService {
  constructor() {
    this.ensureTempDirectory();
    this.startCleanupScheduler();
  }
  
  ensureTempDirectory() {
    if (!fs.existsSync(EXPORT_CONFIG.STORAGE.tempDir)) {
      fs.mkdirSync(EXPORT_CONFIG.STORAGE.tempDir, { recursive: true });
    }
  }
  
  startCleanupScheduler() {
    setInterval(() => {
      this.cleanupOldExports();
    }, EXPORT_CONFIG.STORAGE.cleanupInterval);
  }
  
  async cleanupOldExports() {
    try {
      const files = fs.readdirSync(EXPORT_CONFIG.STORAGE.tempDir);
      const cutoffTime = Date.now() - (EXPORT_CONFIG.STORAGE.retentionDays * 24 * 60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(EXPORT_CONFIG.STORAGE.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old export file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Export cleanup error:', error);
    }
  }
  
  generateExportId() {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateFileName(format, template, filters, user) {
    const timestamp = new Date().toISOString().split('T')[0];
    const time = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    
    let fileName = `${EXPORT_CONFIG.FILE_NAMING.prefix}`;
    
    if (template) {
      fileName += `_${template}`;
    }
    
    if (EXPORT_CONFIG.FILE_NAMING.includeUser && user) {
      fileName += `_${user.username}`;
    }
    
    if (EXPORT_CONFIG.FILE_NAMING.includeFilters && filters) {
      const filterSummary = this.getFilterSummary(filters);
      if (filterSummary) {
        fileName += `_${filterSummary}`;
      }
    }
    
    fileName += `_${timestamp}_${time}.${format}`;
    
    return fileName;
  }
  
  getFilterSummary(filters) {
    const parts = [];
    
    if (filters.dateRange?.type) {
      parts.push(filters.dateRange.type);
    }
    
    if (filters.companies?.selected_companies?.length) {
      parts.push(`${filters.companies.selected_companies.length}companies`);
    }
    
    if (filters.payment_methods?.selected_methods?.length) {
      parts.push(`${filters.payment_methods.selected_methods.length}methods`);
    }
    
    return parts.length > 0 ? parts.join('-') : null;
  }
  
  async validateExportRequest(format, template, filters, user) {
    // Validate format
    if (!EXPORT_CONFIG.SUPPORTED_FORMATS.includes(format)) {
      throw new Error(`Unsupported export format: ${format}`);
    }
    
    // Validate template
    if (template && !EXPORT_CONFIG.TEMPLATES[template]) {
      throw new Error(`Unsupported export template: ${template}`);
    }
    
    // Check user permissions
    if (!user) {
      throw new Error('User authentication required');
    }
    
    // Check export limits
    const userExportCount = this.getUserExportCount(user.id);
    if (userExportCount > 10) { // Max 10 exports per day per user
      throw new Error('Export limit exceeded. Please try again tomorrow.');
    }
    
    return true;
  }
  
  getUserExportCount(userId) {
    const today = new Date().toISOString().split('T')[0];
    const userExports = Array.from(exportHistory.values())
      .filter(exportRecord => exportRecord.userId === userId && exportRecord.createdAt.startsWith(today));
    
    return userExports.length;
  }
  
  async fetchDashboardData(filters, user) {
    try {
      // Use the existing revenue dashboard API logic to fetch data
      const accessToken = await getAccessTokenShared();
      
      // Build the complex SQL query based on filters
      const sqlQuery = this.buildExportQuery(filters);
      
      const response = await axios.post(`${BASE_URL}/workspaces/${process.env.ZOHO_WORKSPACE_ID}/data`, {
        query: sqlQuery,
        format: 'json'
      }, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minutes timeout for large exports
      });
      
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching dashboard data for export:', error);
      throw new Error('Failed to fetch dashboard data for export');
    }
  }
  
  buildExportQuery(filters) {
    // Base query - same as revenue dashboard but optimized for export
    let query = `
      SELECT 
        id,
        disbursement_id,
        payment_method_id,
        payment_method_payee_fee,
        payment_method_payor_fee,
        api_transaction_status,
        created_at,
        updated_at,
        check_delivery_payee_fee,
        check_delivery_payor_fee,
        bundle_charges,
        postage_fee,
        company_id,
        disbursement_updated_at,
        amount,
        disbursement_status_id,
        company,
        payment_method_description,
        cost_amount,
        cost_percentage,
        vendor_name,
        employee_name,
        employee_commission_amount,
        employee_commission_percentage,
        referral_partner_name,
        referral_partner_type,
        partner_default_rate,
        company_override_rate,
        base_fee_upcharge,
        multiplier_upcharge,
        max_fee_upcharge,
        applied_employee_commission_percentage,
        applied_employee_commission_amount,
        applied_referral_rate,
        Company_Upcharge_Fees,
        Is_Revenue_Transaction,
        Gross_Revenue,
        Is_Total_Transaction,
        Payor_Fee_Revenue,
        Payee_Fee_Revenue,
        Total_Combined_Revenue,
        Revenue_Per_Transaction,
        Total_Vendor_Cost,
        Revenue_After_Upcharges,
        Revenue_After_Operational_Costs,
        Employee_Commission,
        Revenue_After_Employee_Commission,
        Referral_Partner_Commission,
        Final_Net_Profit
      FROM revenue_master_view
      WHERE 1=1
    `;
    
    // Add filter conditions
    if (filters.dateRange) {
      query += this.buildDateRangeFilter(filters.dateRange);
    }
    
    if (filters.companies?.selected_companies?.length) {
      const companyIds = filters.companies.selected_companies.join(',');
      query += ` AND company_id IN (${companyIds})`;
    }
    
    if (filters.payment_methods?.selected_methods?.length) {
      const methodIds = filters.payment_methods.selected_methods.join(',');
      query += ` AND payment_method_id IN (${methodIds})`;
    }
    
    if (filters.amount_range?.min_amount) {
      query += ` AND amount >= ${filters.amount_range.min_amount}`;
    }
    
    if (filters.amount_range?.max_amount) {
      query += ` AND amount <= ${filters.amount_range.max_amount}`;
    }
    
    // Add ordering and limit
    query += ` ORDER BY created_at DESC LIMIT ${EXPORT_CONFIG.MAX_RECORDS_PER_EXPORT}`;
    
    return query;
  }
  
  buildDateRangeFilter(dateRange) {
    if (dateRange.type === 'custom' && dateRange.start_date && dateRange.end_date) {
      return ` AND created_at >= '${dateRange.start_date}' AND created_at <= '${dateRange.end_date}'`;
    }
    
    // Handle preset ranges
    const now = new Date();
    let startDate, endDate;
    
    switch (dateRange.type) {
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last_90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last_12_months':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      default:
        return '';
    }
    
    return ` AND created_at >= '${startDate.toISOString().split('T')[0]}' AND created_at <= '${endDate.toISOString().split('T')[0]}'`;
  }
  
  async exportToJSON(data, metadata) {
    const filterContext = this.createFilterMetadataSection(metadata.filters);
    
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        template: metadata.template,
        user: metadata.user,
        recordCount: data.length,
        format: 'json',
        filterContext: filterContext,
        appliedFilters: this.buildDetailedFilterContext(metadata.filters),
        exportConfiguration: {
          totalActiveFilters: filterContext.totalActiveFilters,
          filterSummary: filterContext.filterSummary,
          dateRange: filterContext.dateRange,
          companies: filterContext.companies,
          paymentMethods: filterContext.paymentMethods,
          amountRange: filterContext.amountRange,
          revenueSources: filterContext.revenueSources,
          commissionTypes: filterContext.commissionTypes
        }
      },
      data: data
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  async exportToCSV(data, metadata) {
    if (!data || data.length === 0) {
      return 'No data available for export';
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvRows.push(values.join(','));
    }
    
         // Add enhanced metadata as comments at the top
     const filterContext = this.createFilterMetadataSection(metadata.filters);
     const metadataComments = [
       `# Export Date: ${metadata.exportDate}`,
       `# Template: ${metadata.template || 'custom'}`,
       `# Record Count: ${data.length}`,
       `# Total Active Filters: ${filterContext.totalActiveFilters}`,
       `# Date Range: ${filterContext.dateRange}`,
       `# Companies: ${filterContext.companies}`,
       `# Payment Methods: ${filterContext.paymentMethods}`,
       `# Amount Range: ${filterContext.amountRange}`,
       `# Revenue Sources: ${filterContext.revenueSources}`,
       `# Commission Types: ${filterContext.commissionTypes}`,
       `# Filter Summary: ${filterContext.filterSummary}`,
       ''
     ];
    
    return metadataComments.join('\n') + csvRows.join('\n');
  }
  
  async exportToExcel(data, metadata) {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Define styles for headers and data
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      }
    };
    
    const currencyStyle = {
      numFmt: '"$"#,##0.00',
      alignment: { horizontal: "right" }
    };
    
    const percentageStyle = {
      numFmt: "0.00%",
      alignment: { horizontal: "right" }
    };
    
    const dateStyle = {
      numFmt: "yyyy-mm-dd",
      alignment: { horizontal: "center" }
    };
    
    // Sheet 1: Filter Context
    const filterContextData = this.createFilterContextSheet(metadata.filters, metadata);
    const filterContextSheet = XLSX.utils.aoa_to_sheet(filterContextData);
    
    // Apply styles to filter context sheet
    this.applyExcelStyles(filterContextSheet, headerStyle, currencyStyle, percentageStyle);
    
    XLSX.utils.book_append_sheet(workbook, filterContextSheet, "Filter Context");
    
    // Sheet 2: Executive Summary
    const summaryData = this.createExecutiveSummarySheet(data, metadata);
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Apply styles to summary sheet
    this.applyExcelStyles(summarySheet, headerStyle, currencyStyle, percentageStyle);
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Executive Summary");
    
    // Sheet 3: Financial Data
    const financialData = this.createFinancialDataSheet(data);
    const financialSheet = XLSX.utils.aoa_to_sheet(financialData);
    
    // Apply styles to financial sheet
    this.applyExcelStyles(financialSheet, headerStyle, currencyStyle, percentageStyle, dateStyle);
    
    XLSX.utils.book_append_sheet(workbook, financialSheet, "Financial Data");
    
    // Sheet 4: Company Performance
    const companyData = this.createCompanyPerformanceSheet(data);
    const companySheet = XLSX.utils.aoa_to_sheet(companyData);
    
    // Apply styles to company sheet
    this.applyExcelStyles(companySheet, headerStyle, currencyStyle, percentageStyle);
    
    XLSX.utils.book_append_sheet(workbook, companySheet, "Company Performance");
    
    // Sheet 5: Payment Method Analysis
    const paymentData = this.createPaymentMethodSheet(data);
    const paymentSheet = XLSX.utils.aoa_to_sheet(paymentData);
    
    // Apply styles to payment sheet
    this.applyExcelStyles(paymentSheet, headerStyle, currencyStyle, percentageStyle);
    
    XLSX.utils.book_append_sheet(workbook, paymentSheet, "Payment Methods");
    
    // Sheet 6: Commission Analysis
    const commissionData = this.createCommissionAnalysisSheet(data);
    const commissionSheet = XLSX.utils.aoa_to_sheet(commissionData);
    
    // Apply styles to commission sheet
    this.applyExcelStyles(commissionSheet, headerStyle, currencyStyle, percentageStyle);
    
    XLSX.utils.book_append_sheet(workbook, commissionSheet, "Commission Analysis");
    
    // Sheet 7: Raw Data
    const rawData = this.createRawDataSheet(data);
    const rawSheet = XLSX.utils.aoa_to_sheet(rawData);
    
    // Apply styles to raw data sheet
    this.applyExcelStyles(rawSheet, headerStyle, currencyStyle, percentageStyle, dateStyle);
    
    XLSX.utils.book_append_sheet(workbook, rawSheet, "Raw Data");
    
    // Set workbook properties
    workbook.Props = {
      Title: "Revenue Dashboard Export Report",
      Subject: "Revenue Analytics Dashboard Export",
      Author: metadata.user.username,
      CreatedDate: new Date(metadata.exportDate)
    };
    
    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return excelBuffer;
  }
  
  async exportToPDF(data, metadata) {
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Set document properties
    doc.setProperties({
      title: 'Revenue Dashboard Export Report',
      subject: 'Revenue Analytics Dashboard Export',
      author: metadata.user.username,
      creator: 'Revenue Dashboard Export API',
      creationDate: new Date(metadata.exportDate)
    });
    
    // Define styles and colors
    const styles = {
      title: { fontSize: 20, fontStyle: 'bold', textColor: [41, 128, 185] },
      subtitle: { fontSize: 14, fontStyle: 'bold', textColor: [52, 73, 94] },
      header: { fontSize: 12, fontStyle: 'bold', textColor: [44, 62, 80] },
      body: { fontSize: 10, textColor: [52, 73, 94] },
      highlight: { fontSize: 10, fontStyle: 'bold', textColor: [39, 174, 96] },
      warning: { fontSize: 10, fontStyle: 'bold', textColor: [231, 76, 60] }
    };
    
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // Helper function to add text with styling
    const addStyledText = (text, style, x = margin, y = yPosition) => {
      doc.setTextColor(...style.textColor);
      doc.setFontSize(style.fontSize);
      if (style.fontStyle === 'bold') {
        doc.setFont(undefined, 'bold');
      } else {
        doc.setFont(undefined, 'normal');
      }
      doc.text(text, x, y);
      return y + style.fontSize * 0.5;
    };
    
    // Helper function to add a section
    const addSection = (title, content, startY) => {
      let y = startY;
      
      // Section title
      y = addStyledText(title, styles.subtitle, margin, y);
      y += 5;
      
      // Section content
      if (Array.isArray(content)) {
        content.forEach(item => {
          y = addStyledText(item, styles.body, margin + 10, y);
          y += 3;
        });
      } else {
        y = addStyledText(content, styles.body, margin + 10, y);
        y += 3;
      }
      
      return y + 10;
    };
    
    // Helper function to add a table
    const addTable = (headers, rows, startY) => {
      let y = startY;
      const colWidth = contentWidth / headers.length;
      
      // Table headers
      headers.forEach((header, index) => {
        const x = margin + (index * colWidth);
        y = addStyledText(header, styles.header, x, y);
      });
      y += 5;
      
      // Table rows
      rows.forEach(row => {
        if (y > doc.internal.pageSize.height - 30) {
          doc.addPage();
          y = 20;
        }
        
        row.forEach((cell, index) => {
          const x = margin + (index * colWidth);
          y = addStyledText(cell.toString(), styles.body, x, y);
        });
        y += 3;
      });
      
      return y + 10;
    };
    
    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace) => {
      if (yPosition + requiredSpace > doc.internal.pageSize.height - 30) {
        doc.addPage();
        yPosition = 20;
      }
    };
    
    // Page 1: Report Header
    yPosition = addStyledText('REVENUE DASHBOARD EXPORT REPORT', styles.title, margin, yPosition);
    yPosition += 10;
    
    yPosition = addStyledText(`Generated: ${new Date(metadata.exportDate).toLocaleString()}`, styles.body, margin, yPosition);
    yPosition += 5;
    yPosition = addStyledText(`Template: ${metadata.template || 'Custom Report'}`, styles.body, margin, yPosition);
    yPosition += 5;
    yPosition = addStyledText(`User: ${metadata.user.username}`, styles.body, margin, yPosition);
    yPosition += 15;
    
    // Executive Summary
    checkNewPage(50);
    yPosition = addSection('Executive Summary', [
      `Total Records: ${data.length.toLocaleString()}`,
      `Date Range: ${this.getDateRangeSummary(metadata.filters)}`,
      `Companies: ${this.getCompanySummary(data)}`,
      `Payment Methods: ${this.getPaymentMethodSummary(data)}`
    ], yPosition);
    
    // Financial Summary
    if (data.length > 0) {
      checkNewPage(60);
      const financialSummary = this.calculateFinancialSummary(data);
      yPosition = addSection('Financial Summary', [
        `Total Revenue: $${financialSummary.totalRevenue.toLocaleString()}`,
        `Total Vendor Costs: $${financialSummary.totalVendorCosts.toLocaleString()}`,
        `Total Commissions: $${financialSummary.totalCommissions.toLocaleString()}`,
        `Net Profit: $${financialSummary.netProfit.toLocaleString()}`,
        `Profit Margin: ${financialSummary.profitMargin.toFixed(2)}%`
      ], yPosition);
    }
    
         // Enhanced Filter Context
     checkNewPage(100);
     const filterContext = this.buildDetailedFilterContext(metadata.filters);
     yPosition = addStyledText('FILTER CONTEXT AND CONFIGURATION', styles.subtitle, margin, yPosition);
     yPosition += 10;
     
     // Filter summary table
     const filterHeaders = ['Filter Type', 'Applied Value', 'Description'];
     const filterRows = filterContext.map(filter => [
       filter.type,
       filter.value,
       filter.description
     ]);
     
     yPosition = addTable(filterHeaders, filterRows, yPosition);
     
     // Filter statistics
     yPosition += 10;
     yPosition = addStyledText('Filter Statistics:', styles.header, margin, yPosition);
     yPosition += 5;
     yPosition = addStyledText(`Total Active Filters: ${filterContext.length}`, styles.body, margin + 10, yPosition);
     yPosition += 3;
     yPosition = addStyledText(`Date Range: ${this.getDateRangeDescription(metadata.filters.dateRange)}`, styles.body, margin + 10, yPosition);
     yPosition += 3;
     yPosition = addStyledText(`Companies: ${this.getCompanyFilterDescription(metadata.filters.companies)}`, styles.body, margin + 10, yPosition);
     yPosition += 3;
     yPosition = addStyledText(`Payment Methods: ${this.getPaymentMethodFilterDescription(metadata.filters.payment_methods)}`, styles.body, margin + 10, yPosition);
    
    // Data Sample (first 10 records)
    if (data.length > 0) {
      checkNewPage(100);
      yPosition = addStyledText('Data Sample (First 10 Records)', styles.subtitle, margin, yPosition);
      yPosition += 10;
      
      const sampleData = data.slice(0, 10);
      const headers = ['Company', 'Amount', 'Revenue', 'Commission', 'Date'];
      const rows = sampleData.map(record => [
        record.company || 'N/A',
        `$${record.amount?.toLocaleString() || '0'}`,
        `$${record.Total_Combined_Revenue?.toLocaleString() || '0'}`,
        `$${((record.Employee_Commission || 0) + (record.Referral_Partner_Commission || 0)).toLocaleString()}`,
        new Date(record.created_at).toLocaleDateString()
      ]);
      
      yPosition = addTable(headers, rows, yPosition);
    }
    
    // Add page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setTextColor(128, 128, 128);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, doc.internal.pageSize.height - 10);
    }
    
    // Return the PDF as a buffer
    return doc.output('arraybuffer');
  }
  
  getDateRangeSummary(filters) {
    if (filters.dateRange?.type === 'custom') {
      return `${filters.dateRange.start_date} to ${filters.dateRange.end_date}`;
    }
    return filters.dateRange?.type || 'All time';
  }
  
  getCompanySummary(data) {
    const companies = [...new Set(data.map(row => row.company).filter(Boolean))];
    return companies.length > 0 ? companies.join(', ') : 'All companies';
  }
  
  getPaymentMethodSummary(data) {
    const methods = [...new Set(data.map(row => row.payment_method_description).filter(Boolean))];
    return methods.length > 0 ? methods.join(', ') : 'All methods';
  }
  
  calculateFinancialSummary(data) {
    const summary = {
      totalRevenue: 0,
      totalVendorCosts: 0,
      totalCommissions: 0,
      netProfit: 0,
      profitMargin: 0
    };
    
    if (data.length === 0) return summary;
    
    summary.totalRevenue = data.reduce((sum, record) => sum + (record.Total_Combined_Revenue || 0), 0);
    summary.totalVendorCosts = data.reduce((sum, record) => sum + (record.Total_Vendor_Cost || 0), 0);
    summary.totalCommissions = data.reduce((sum, record) => 
      sum + (record.Employee_Commission || 0) + (record.Referral_Partner_Commission || 0), 0);
    summary.netProfit = data.reduce((sum, record) => sum + (record.Final_Net_Profit || 0), 0);
    summary.profitMargin = summary.totalRevenue > 0 ? (summary.netProfit / summary.totalRevenue) * 100 : 0;
    
    return summary;
  }
  
  formatFiltersForPDF(filters) {
    const filterDetails = [];
    
    if (filters.dateRange) {
      if (filters.dateRange.type === 'custom') {
        filterDetails.push(`Date Range: ${filters.dateRange.start_date} to ${filters.dateRange.end_date}`);
      } else {
        filterDetails.push(`Date Range: ${filters.dateRange.type.replace(/_/g, ' ').toUpperCase()}`);
      }
    }
    
    if (filters.companies?.selected_companies?.length) {
      filterDetails.push(`Companies: ${filters.companies.selected_companies.length} selected`);
    }
    
    if (filters.payment_methods?.selected_methods?.length) {
      filterDetails.push(`Payment Methods: ${filters.payment_methods.selected_methods.length} selected`);
    }
    
    if (filters.amount_range?.min_amount || filters.amount_range?.max_amount) {
      const range = [];
      if (filters.amount_range.min_amount) range.push(`Min: $${filters.amount_range.min_amount}`);
      if (filters.amount_range.max_amount) range.push(`Max: $${filters.amount_range.max_amount}`);
      filterDetails.push(`Amount Range: ${range.join(' - ')}`);
    }
    
    if (filters.revenue_sources?.selected_sources?.length) {
      filterDetails.push(`Revenue Sources: ${filters.revenue_sources.selected_sources.join(', ')}`);
    }
    
    if (filters.commission_types?.selected_types?.length) {
      filterDetails.push(`Commission Types: ${filters.commission_types.selected_types.join(', ')}`);
    }
    
    if (filterDetails.length === 0) {
      filterDetails.push('No filters applied (all data included)');
    }
    
    return filterDetails;
  }
  
  // Enhanced filter context preservation methods
  createFilterContextSheet(filters, metadata) {
    const filterContext = this.buildDetailedFilterContext(filters);
    
    return [
      ['FILTER CONTEXT - EXPORT CONFIGURATION'],
      [''],
      ['Export Information'],
      ['Generated Date', new Date(metadata.exportDate).toLocaleString()],
      ['Template', metadata.template || 'Custom Report'],
      ['User', metadata.user.username],
      ['Export Format', metadata.format || 'Unknown'],
      [''],
      ['Applied Filters'],
      ['Filter Type', 'Filter Value', 'Description'],
      ...filterContext.map(filter => [
        filter.type,
        filter.value,
        filter.description
      ]),
      [''],
      ['Filter Summary'],
      ['Total Active Filters', filterContext.length],
      ['Date Range Applied', this.getDateRangeDescription(filters.dateRange)],
      ['Companies Filtered', this.getCompanyFilterDescription(filters.companies)],
      ['Payment Methods Filtered', this.getPaymentMethodFilterDescription(filters.payment_methods)],
      ['Amount Range Applied', this.getAmountRangeDescription(filters.amount_range)],
      ['Revenue Sources Filtered', this.getRevenueSourceFilterDescription(filters.revenue_sources)],
      ['Commission Types Filtered', this.getCommissionTypeFilterDescription(filters.commission_types)]
    ];
  }
  
  buildDetailedFilterContext(filters) {
    const filterContext = [];
    
    // Date Range Filter
    if (filters.dateRange) {
      filterContext.push({
        type: 'Date Range',
        value: this.getDateRangeDescription(filters.dateRange),
        description: 'Time period for data analysis'
      });
    }
    
    // Company Filter
    if (filters.companies?.selected_companies?.length) {
      filterContext.push({
        type: 'Companies',
        value: `${filters.companies.selected_companies.length} companies selected`,
        description: 'Specific companies included in analysis'
      });
    }
    
    // Payment Method Filter
    if (filters.payment_methods?.selected_methods?.length) {
      filterContext.push({
        type: 'Payment Methods',
        value: `${filters.payment_methods.selected_methods.length} methods selected`,
        description: 'Specific payment methods included in analysis'
      });
    }
    
    // Amount Range Filter
    if (filters.amount_range?.min_amount || filters.amount_range?.max_amount) {
      filterContext.push({
        type: 'Amount Range',
        value: this.getAmountRangeDescription(filters.amount_range),
        description: 'Transaction amount range filter'
      });
    }
    
    // Revenue Sources Filter
    if (filters.revenue_sources?.selected_sources?.length) {
      filterContext.push({
        type: 'Revenue Sources',
        value: filters.revenue_sources.selected_sources.join(', '),
        description: 'Specific revenue sources included in analysis'
      });
    }
    
    // Commission Types Filter
    if (filters.commission_types?.selected_types?.length) {
      filterContext.push({
        type: 'Commission Types',
        value: filters.commission_types.selected_types.join(', '),
        description: 'Specific commission types included in analysis'
      });
    }
    
    // Employee Filter
    if (filters.employees?.selected_employees?.length) {
      filterContext.push({
        type: 'Employees',
        value: `${filters.employees.selected_employees.length} employees selected`,
        description: 'Specific employees included in analysis'
      });
    }
    
    // Referral Partner Filter
    if (filters.referral_partners?.selected_partners?.length) {
      filterContext.push({
        type: 'Referral Partners',
        value: `${filters.referral_partners.selected_partners.length} partners selected`,
        description: 'Specific referral partners included in analysis'
      });
    }
    
    // Disbursement Status Filter
    if (filters.disbursement_status?.selected_statuses?.length) {
      filterContext.push({
        type: 'Disbursement Status',
        value: filters.disbursement_status.selected_statuses.join(', '),
        description: 'Specific disbursement statuses included in analysis'
      });
    }
    
    return filterContext;
  }
  
  getDateRangeDescription(dateRange) {
    if (!dateRange) return 'All time';
    
    if (dateRange.type === 'custom') {
      return `${dateRange.start_date} to ${dateRange.end_date}`;
    }
    
    return dateRange.type.replace(/_/g, ' ').toUpperCase();
  }
  
  getCompanyFilterDescription(companies) {
    if (!companies?.selected_companies?.length) return 'All companies';
    return `${companies.selected_companies.length} companies selected`;
  }
  
  getPaymentMethodFilterDescription(paymentMethods) {
    if (!paymentMethods?.selected_methods?.length) return 'All payment methods';
    return `${paymentMethods.selected_methods.length} methods selected`;
  }
  
  getAmountRangeDescription(amountRange) {
    if (!amountRange) return 'All amounts';
    
    const parts = [];
    if (amountRange.min_amount) parts.push(`Min: $${amountRange.min_amount}`);
    if (amountRange.max_amount) parts.push(`Max: $${amountRange.max_amount}`);
    
    return parts.length > 0 ? parts.join(' - ') : 'All amounts';
  }
  
  getRevenueSourceFilterDescription(revenueSources) {
    if (!revenueSources?.selected_sources?.length) return 'All revenue sources';
    return revenueSources.selected_sources.join(', ');
  }
  
  getCommissionTypeFilterDescription(commissionTypes) {
    if (!commissionTypes?.selected_types?.length) return 'All commission types';
    return commissionTypes.selected_types.join(', ');
  }
  
  createFilterMetadataSection(filters) {
    return {
      dateRange: this.getDateRangeDescription(filters.dateRange),
      companies: this.getCompanyFilterDescription(filters.companies),
      paymentMethods: this.getPaymentMethodFilterDescription(filters.payment_methods),
      amountRange: this.getAmountRangeDescription(filters.amount_range),
      revenueSources: this.getRevenueSourceFilterDescription(filters.revenue_sources),
      commissionTypes: this.getCommissionTypeFilterDescription(filters.commission_types),
      totalActiveFilters: this.buildDetailedFilterContext(filters).length,
      filterSummary: this.buildDetailedFilterContext(filters).map(f => `${f.type}: ${f.value}`).join('; ')
    };
  }
  
  // Excel Sheet Creation Methods
  createExecutiveSummarySheet(data, metadata) {
    const financialSummary = this.calculateFinancialSummary(data);
    
    return [
      ['REVENUE DASHBOARD - EXECUTIVE SUMMARY'],
      [''],
      ['Report Information'],
      ['Generated Date', new Date(metadata.exportDate).toLocaleString()],
      ['Template', metadata.template || 'Custom Report'],
      ['User', metadata.user.username],
      ['Total Records', data.length],
      [''],
      ['Financial Summary'],
      ['Total Revenue', financialSummary.totalRevenue],
      ['Total Vendor Costs', financialSummary.totalVendorCosts],
      ['Total Commissions', financialSummary.totalCommissions],
      ['Net Profit', financialSummary.netProfit],
      ['Profit Margin', financialSummary.profitMargin / 100],
      [''],
      ['Filter Summary'],
      ['Date Range', this.getDateRangeSummary(metadata.filters)],
      ['Companies', this.getCompanySummary(data)],
      ['Payment Methods', this.getPaymentMethodSummary(data)]
    ];
  }
  
  createFinancialDataSheet(data) {
    if (!data || data.length === 0) {
      return [['No financial data available']];
    }
    
    const headers = [
      'Company',
      'Transaction Date',
      'Amount',
      'Total Revenue',
      'Vendor Cost',
      'Employee Commission',
      'Referral Commission',
      'Net Profit',
      'Payment Method'
    ];
    
    const rows = data.map(record => [
      record.company || 'N/A',
      new Date(record.created_at),
      record.amount || 0,
      record.Total_Combined_Revenue || 0,
      record.Total_Vendor_Cost || 0,
      record.Employee_Commission || 0,
      record.Referral_Partner_Commission || 0,
      record.Final_Net_Profit || 0,
      record.payment_method_description || 'N/A'
    ]);
    
    return [headers, ...rows];
  }
  
  createCompanyPerformanceSheet(data) {
    if (!data || data.length === 0) {
      return [['No company data available']];
    }
    
    // Group by company
    const companyStats = {};
    data.forEach(record => {
      const company = record.company || 'Unknown';
      if (!companyStats[company]) {
        companyStats[company] = {
          totalAmount: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalCommission: 0,
          totalProfit: 0,
          transactionCount: 0
        };
      }
      
      companyStats[company].totalAmount += record.amount || 0;
      companyStats[company].totalRevenue += record.Total_Combined_Revenue || 0;
      companyStats[company].totalCost += record.Total_Vendor_Cost || 0;
      companyStats[company].totalCommission += (record.Employee_Commission || 0) + (record.Referral_Partner_Commission || 0);
      companyStats[company].totalProfit += record.Final_Net_Profit || 0;
      companyStats[company].transactionCount += 1;
    });
    
    const headers = [
      'Company',
      'Transaction Count',
      'Total Amount',
      'Total Revenue',
      'Total Cost',
      'Total Commission',
      'Net Profit',
      'Profit Margin %'
    ];
    
    const rows = Object.entries(companyStats).map(([company, stats]) => [
      company,
      stats.transactionCount,
      stats.totalAmount,
      stats.totalRevenue,
      stats.totalCost,
      stats.totalCommission,
      stats.totalProfit,
      stats.totalRevenue > 0 ? (stats.totalProfit / stats.totalRevenue) : 0
    ]);
    
    return [headers, ...rows];
  }
  
  createPaymentMethodSheet(data) {
    if (!data || data.length === 0) {
      return [['No payment method data available']];
    }
    
    // Group by payment method
    const methodStats = {};
    data.forEach(record => {
      const method = record.payment_method_description || 'Unknown';
      if (!methodStats[method]) {
        methodStats[method] = {
          totalAmount: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalCommission: 0,
          totalProfit: 0,
          transactionCount: 0
        };
      }
      
      methodStats[method].totalAmount += record.amount || 0;
      methodStats[method].totalRevenue += record.Total_Combined_Revenue || 0;
      methodStats[method].totalCost += record.Total_Vendor_Cost || 0;
      methodStats[method].totalCommission += (record.Employee_Commission || 0) + (record.Referral_Partner_Commission || 0);
      methodStats[method].totalProfit += record.Final_Net_Profit || 0;
      methodStats[method].transactionCount += 1;
    });
    
    const headers = [
      'Payment Method',
      'Transaction Count',
      'Total Amount',
      'Total Revenue',
      'Total Cost',
      'Total Commission',
      'Net Profit',
      'Profit Margin %'
    ];
    
    const rows = Object.entries(methodStats).map(([method, stats]) => [
      method,
      stats.transactionCount,
      stats.totalAmount,
      stats.totalRevenue,
      stats.totalCost,
      stats.totalCommission,
      stats.totalProfit,
      stats.totalRevenue > 0 ? (stats.totalProfit / stats.totalRevenue) : 0
    ]);
    
    return [headers, ...rows];
  }
  
  createCommissionAnalysisSheet(data) {
    if (!data || data.length === 0) {
      return [['No commission data available']];
    }
    
    const headers = [
      'Employee Name',
      'Referral Partner',
      'Company',
      'Transaction Amount',
      'Employee Commission',
      'Referral Commission',
      'Total Commission',
      'Commission Rate %',
      'Transaction Date'
    ];
    
    const rows = data.map(record => {
      const totalCommission = (record.Employee_Commission || 0) + (record.Referral_Partner_Commission || 0);
      const commissionRate = record.amount > 0 ? (totalCommission / record.amount) : 0;
      
      return [
        record.employee_name || 'N/A',
        record.referral_partner_name || 'N/A',
        record.company || 'N/A',
        record.amount || 0,
        record.Employee_Commission || 0,
        record.Referral_Partner_Commission || 0,
        totalCommission,
        commissionRate,
        new Date(record.created_at)
      ];
    });
    
    return [headers, ...rows];
  }
  
  createRawDataSheet(data) {
    if (!data || data.length === 0) {
      return [['No raw data available']];
    }
    
    const headers = Object.keys(data[0]);
    const rows = data.map(record => headers.map(header => record[header]));
    
    return [headers, ...rows];
  }
  
  applyExcelStyles(sheet, headerStyle, currencyStyle, percentageStyle, dateStyle) {
    // Get the range of the sheet
    const range = XLSX.utils.decode_range(sheet['!ref']);
    
    // Apply styles to each cell
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellRef];
        
        if (cell) {
          // Apply header style to first row
          if (row === 0) {
            cell.s = headerStyle;
          } else {
            // Apply appropriate style based on content
            if (typeof cell.v === 'number') {
              if (cell.v < 1 && cell.v > 0) {
                // Likely a percentage
                cell.s = percentageStyle;
              } else if (col >= 2 && col <= 7) {
                // Likely currency values
                cell.s = currencyStyle;
              }
            } else if (cell.v instanceof Date) {
              cell.s = dateStyle;
            }
          }
        }
      }
    }
    
    // Set column widths
    sheet['!cols'] = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      sheet['!cols'].push({ width: 15 });
    }
  }
  
  async createExport(format, template, filters, user) {
    const exportId = this.generateExportId();
    const fileName = this.generateFileName(format, template, filters, user);
    const filePath = path.join(EXPORT_CONFIG.STORAGE.tempDir, fileName);
    
    // Initialize progress tracking
    exportProgress.set(exportId, {
      status: 'preparing',
      progress: 0,
      message: 'Preparing export...'
    });
    
    try {
      // Validate request
      await this.validateExportRequest(format, template, filters, user);
      
      // Update progress
      exportProgress.set(exportId, {
        status: 'fetching',
        progress: 20,
        message: 'Fetching dashboard data...'
      });
      
      // Fetch data
      const data = await this.fetchDashboardData(filters, user);
      
      // Update progress
      exportProgress.set(exportId, {
        status: 'processing',
        progress: 60,
        message: 'Processing data for export...'
      });
      
      // Prepare metadata
      const metadata = {
        exportDate: new Date().toISOString(),
        template,
        filters,
        user: { id: user.id, username: user.username },
        recordCount: data.length
      };
      
      // Generate export content based on format
      let content;
      switch (format) {
        case 'json':
          content = await this.exportToJSON(data, metadata);
          break;
        case 'csv':
          content = await this.exportToCSV(data, metadata);
          break;
        case 'excel':
          content = await this.exportToExcel(data, metadata);
          break;
        case 'pdf':
          content = await this.exportToPDF(data, metadata);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      // Update progress
      exportProgress.set(exportId, {
        status: 'writing',
        progress: 80,
        message: 'Writing export file...'
      });
      
             // Write file
       if (format === 'pdf' || format === 'excel') {
         // For PDF and Excel, content is a buffer
         fs.writeFileSync(filePath, Buffer.from(content));
       } else {
         // For other formats, content is a string
         fs.writeFileSync(filePath, content);
       }
      
      // Update progress
      exportProgress.set(exportId, {
        status: 'completed',
        progress: 100,
        message: 'Export completed successfully'
      });
      
      // Record export history
      const exportRecord = {
        id: exportId,
        fileName,
        filePath,
        format,
        template,
        filters,
        userId: user.id,
        username: user.username,
        recordCount: data.length,
        fileSize: fs.statSync(filePath).size,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + EXPORT_CONFIG.STORAGE.retentionDays * 24 * 60 * 60 * 1000).toISOString()
      };
      
      exportHistory.set(exportId, exportRecord);
      
      return exportRecord;
      
    } catch (error) {
      // Update progress with error
      exportProgress.set(exportId, {
        status: 'error',
        progress: 0,
        message: error.message
      });
      
      throw error;
    }
  }
  
  getExportProgress(exportId) {
    return exportProgress.get(exportId) || null;
  }
  
  getExportHistory(userId, limit = 10) {
    const userExports = Array.from(exportHistory.values())
      .filter(exportRecord => exportRecord.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
    
    return userExports;
  }
  
  async downloadExport(exportId, user) {
    const exportRecord = exportHistory.get(exportId);
    
    if (!exportRecord) {
      throw new Error('Export not found');
    }
    
    if (exportRecord.userId !== user.id) {
      throw new Error('Access denied');
    }
    
    if (!fs.existsSync(exportRecord.filePath)) {
      throw new Error('Export file not found');
    }
    
    return {
      filePath: exportRecord.filePath,
      fileName: exportRecord.fileName,
      fileSize: exportRecord.fileSize
    };
  }
}

// Initialize export service
const exportService = new DashboardExportService();

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
      'SELECT id, username, role, status FROM users WHERE id = $1',
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

// Main export handler
export async function exportHandler(req, res) {
  const startTime = Date.now();
  
  try {
    // Authenticate user
    const user = await authenticateToken(req);
    
    if (req.method === 'POST') {
      // Create new export
      const { format, template, filters } = req.body;
      
      if (!format) {
        return res.status(400).json({ error: 'Export format is required' });
      }
      
      const exportRecord = await exportService.createExport(format, template, filters, user);
      
      return res.status(200).json({
        success: true,
        exportId: exportRecord.id,
        fileName: exportRecord.fileName,
        recordCount: exportRecord.recordCount,
        fileSize: exportRecord.fileSize,
        downloadUrl: `/api/dashboard-export/download/${exportRecord.id}`
      });
      
    } else if (req.method === 'GET') {
      // Get export progress or history
      const { exportId, history } = req.query;
      
      if (exportId) {
        // Get export progress
        const progress = exportService.getExportProgress(exportId);
        
        if (!progress) {
          return res.status(404).json({ error: 'Export not found' });
        }
        
        return res.status(200).json({
          success: true,
          exportId,
          progress: progress.progress,
          status: progress.status,
          message: progress.message
        });
        
      } else if (history) {
        // Get export history
        const history = exportService.getExportHistory(user.id);
        
        return res.status(200).json({
          success: true,
          exports: history
        });
        
      } else {
        // Get available templates and formats
        return res.status(200).json({
          success: true,
          formats: EXPORT_CONFIG.SUPPORTED_FORMATS,
          templates: Object.keys(EXPORT_CONFIG.TEMPLATES),
          limits: {
            maxRecords: EXPORT_CONFIG.MAX_RECORDS_PER_EXPORT,
            maxFileSize: EXPORT_CONFIG.MAX_FILE_SIZE_MB,
            retentionDays: EXPORT_CONFIG.STORAGE.retentionDays
          }
        });
      }
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Export API error:', error);
    
    return res.status(error.message.includes('token') ? 401 : 500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Download handler
export async function downloadHandler(req, res) {
  try {
    // Authenticate user
    const user = await authenticateToken(req);
    
    const { exportId } = req.params;
    
    if (!exportId) {
      return res.status(400).json({ error: 'Export ID is required' });
    }
    
    const downloadInfo = await exportService.downloadExport(exportId, user);
    
         // Set headers for file download
     let contentType = 'application/octet-stream';
     if (downloadInfo.fileName.endsWith('.pdf')) {
       contentType = 'application/pdf';
     } else if (downloadInfo.fileName.endsWith('.xlsx')) {
       contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
     } else if (downloadInfo.fileName.endsWith('.csv')) {
       contentType = 'text/csv';
     } else if (downloadInfo.fileName.endsWith('.json')) {
       contentType = 'application/json';
     }
     res.setHeader('Content-Type', contentType);
     res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.fileName}"`);
     res.setHeader('Content-Length', downloadInfo.fileSize);
    
    // Stream the file
    const fileStream = fs.createReadStream(downloadInfo.filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Download error:', error);
    
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
      service: 'dashboard-export-api',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      exports: {
        active: exportProgress.size,
        history: exportHistory.size,
        tempDir: EXPORT_CONFIG.STORAGE.tempDir,
        tempDirExists: fs.existsSync(EXPORT_CONFIG.STORAGE.tempDir)
      },
      config: {
        supportedFormats: EXPORT_CONFIG.SUPPORTED_FORMATS,
        maxRecords: EXPORT_CONFIG.MAX_RECORDS_PER_EXPORT,
        maxFileSize: EXPORT_CONFIG.MAX_FILE_SIZE_MB
      }
    };
    
    return res.status(200).json(healthStatus);
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return res.status(500).json({
      service: 'dashboard-export-api',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
