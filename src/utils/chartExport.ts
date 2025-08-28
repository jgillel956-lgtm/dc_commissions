import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';

export interface ExportOptions {
  format: 'pdf' | 'png' | 'csv';
  filename?: string;
  title?: string;
  subtitle?: string;
  includeData?: boolean;
  quality?: number;
  paperSize?: 'a4' | 'letter' | 'custom';
  orientation?: 'portrait' | 'landscape';
  data?: any[]; // Add data property for PDF export
}

export interface ChartData {
  title: string;
  data: any[];
  type: 'pie' | 'bar' | 'line' | 'waterfall';
  xAxisDataKey?: string;
  yAxisDataKey?: string;
  [key: string]: any;
}

/**
 * Export chart as PNG image
 */
export const exportChartAsPNG = async (
  chartElement: HTMLElement,
  options: ExportOptions
): Promise<void> => {
  try {
    const canvas = await html2canvas(chartElement, {
      scale: options.quality || 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const filename = options.filename || `chart-${Date.now()}.png`;
        saveAs(blob, filename);
      }
    }, 'image/png');
  } catch (error) {
    console.error('Error exporting chart as PNG:', error);
    throw new Error('Failed to export chart as PNG');
  }
};

/**
 * Export chart as PDF
 */
export const exportChartAsPDF = async (
  chartElement: HTMLElement,
  options: ExportOptions
): Promise<void> => {
  try {
    const canvas = await html2canvas(chartElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.paperSize || 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate image dimensions to fit the page
    const imgWidth = pdfWidth - 20; // 10mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let yPosition = 20; // Start 20mm from top

    // Add title if provided
    if (options.title) {
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(options.title, pdfWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    }

    // Add subtitle if provided
    if (options.subtitle) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(options.subtitle, pdfWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    }

    // Add chart image
    if (imgHeight > pdfHeight - yPosition - 20) {
      // If image is too tall, scale it down
      const scale = (pdfHeight - yPosition - 20) / imgHeight;
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;
      const xPosition = (pdfWidth - scaledWidth) / 2;
      pdf.addImage(imgData, 'PNG', xPosition, yPosition, scaledWidth, scaledHeight);
    } else {
      const xPosition = (pdfWidth - imgWidth) / 2;
      pdf.addImage(imgData, 'PNG', xPosition, yPosition, imgWidth, imgHeight);
    }

    // Add data table if requested
    if (options.includeData && options.data) {
      yPosition += imgHeight + 20;
      if (yPosition < pdfHeight - 50) {
        addDataTableToPDF(pdf, options.data, yPosition, pdfWidth);
      }
    }

    const filename = options.filename || `chart-${Date.now()}.pdf`;
    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting chart as PDF:', error);
    throw new Error('Failed to export chart as PDF');
  }
};

/**
 * Export chart data as CSV
 */
export const exportChartAsCSV = (
  data: any[],
  options: ExportOptions
): void => {
  try {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    // Get headers from the first data object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values that need quotes (contain commas, quotes, or newlines)
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = options.filename || `chart-data-${Date.now()}.csv`;
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error exporting chart as CSV:', error);
    throw new Error('Failed to export chart as CSV');
  }
};

/**
 * Add data table to PDF
 */
const addDataTableToPDF = (
  pdf: jsPDF,
  data: any[],
  startY: number,
  pageWidth: number
): void => {
  const headers = Object.keys(data[0] || {});
  if (headers.length === 0) return;

  const colWidth = (pageWidth - 20) / headers.length;
  const rowHeight = 8;
  let currentY = startY;

  // Add table header
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(240, 240, 240);
  
  headers.forEach((header, index) => {
    const x = 10 + (index * colWidth);
    pdf.rect(x, currentY, colWidth, rowHeight, 'F');
    pdf.text(header, x + 2, currentY + 5);
  });

  currentY += rowHeight;

  // Add table data
  pdf.setFont('helvetica', 'normal');
  data.slice(0, 20).forEach((row, rowIndex) => { // Limit to 20 rows to avoid page overflow
    headers.forEach((header, colIndex) => {
      const x = 10 + (colIndex * colWidth);
      const value = String(row[header] || '');
      pdf.text(value, x + 2, currentY + 5);
    });
    currentY += rowHeight;
  });
};

/**
 * Main export function that handles all formats
 */
export const exportChart = async (
  chartElement: HTMLElement,
  data: any[],
  options: ExportOptions
): Promise<void> => {
  switch (options.format) {
    case 'png':
      await exportChartAsPNG(chartElement, options);
      break;
    case 'pdf':
      await exportChartAsPDF(chartElement, options);
      break;
    case 'csv':
      exportChartAsCSV(data, options);
      break;
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
};

/**
 * Generate filename based on chart type and current date
 */
export const generateFilename = (
  chartType: string,
  format: string,
  customName?: string
): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  const baseName = customName || `${chartType}-chart`;
  return `${baseName}-${timestamp}.${format}`;
};

/**
 * Validate export options
 */
export const validateExportOptions = (options: ExportOptions): void => {
  if (!options.format) {
    throw new Error('Export format is required');
  }
  
  if (!['pdf', 'png', 'csv'].includes(options.format)) {
    throw new Error('Invalid export format');
  }
  
  if (options.quality && (options.quality < 1 || options.quality > 4)) {
    throw new Error('Quality must be between 1 and 4');
  }
};
