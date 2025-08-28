import React, { useState, useRef } from 'react';
import { Download, FileText, Image, FileSpreadsheet, Settings, Check, X } from 'lucide-react';
import { exportChart, ExportOptions, generateFilename, validateExportOptions } from '../../utils/chartExport';

export interface ChartExportButtonProps {
  chartRef: React.RefObject<HTMLElement>;
  data: any[];
  chartType: string;
  title?: string;
  subtitle?: string;
  className?: string;
  disabled?: boolean;
  onExportStart?: () => void;
  onExportComplete?: (format: string) => void;
  onExportError?: (error: string) => void;
}

const ChartExportButton: React.FC<ChartExportButtonProps> = ({
  chartRef,
  data,
  chartType,
  title,
  subtitle,
  className = '',
  disabled = false,
  onExportStart,
  onExportComplete,
  onExportError,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png' | 'csv'>('pdf');
  const [includeData, setIncludeData] = useState(false);
  const [quality, setQuality] = useState(2);
  const [paperSize, setPaperSize] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const exportOptions = [
    {
      format: 'pdf' as const,
      label: 'PDF Document',
      icon: FileText,
      description: 'High-quality vector graphics for reports',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    {
      format: 'png' as const,
      label: 'PNG Image',
      icon: Image,
      description: 'Raster image for presentations and sharing',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      format: 'csv' as const,
      label: 'CSV Data',
      icon: FileSpreadsheet,
      description: 'Raw data for further analysis',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
  ];

  const handleExport = async () => {
    if (!chartRef.current || disabled || isExporting) return;

    try {
      setIsExporting(true);
      onExportStart?.();

      const options: ExportOptions = {
        format: exportFormat,
        filename: generateFilename(chartType, exportFormat, title),
        title,
        subtitle,
        includeData,
        quality,
        paperSize,
        orientation,
        data: exportFormat === 'pdf' ? data : undefined, // Include data for PDF export
      };

      validateExportOptions(options);

      if (exportFormat === 'csv') {
        // For CSV, we only need the data
        const { exportChartAsCSV } = await import('../../utils/chartExport');
        exportChartAsCSV(data, options);
      } else {
        // For PDF and PNG, we need the chart element
        const { exportChart } = await import('../../utils/chartExport');
        await exportChart(chartRef.current, data, options);
      }

      onExportComplete?.(exportFormat);
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      onExportError?.(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFormatSelect = (format: 'pdf' | 'png' | 'csv') => {
    setExportFormat(format);
    // Auto-adjust settings based on format
    if (format === 'csv') {
      setIncludeData(true); // CSV is always data
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Export Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className={`
          inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md
          ${disabled || isExporting
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }
        `}
      >
        {isExporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Exporting...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Export
          </>
        )}
      </button>

      {/* Export Options Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Export Chart</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Format Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <div className="space-y-2">
                {exportOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.format}
                      onClick={() => handleFormatSelect(option.format)}
                      className={`
                        w-full flex items-center p-3 rounded-lg border-2 transition-colors
                        ${exportFormat === option.format
                          ? `${option.borderColor} ${option.bgColor}`
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <Icon className={`h-5 w-5 mr-3 ${option.color}`} />
                      <div className="text-left">
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                      {exportFormat === option.format && (
                        <Check className="h-5 w-5 text-green-600 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Export Options */}
            {exportFormat !== 'csv' && (
              <div className="mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quality
                  </label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Low (1x)</option>
                    <option value={2}>Medium (2x)</option>
                    <option value={3}>High (3x)</option>
                    <option value={4}>Ultra (4x)</option>
                  </select>
                </div>

                {exportFormat === 'pdf' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Paper Size
                      </label>
                      <select
                        value={paperSize}
                        onChange={(e) => setPaperSize(e.target.value as 'a4' | 'letter')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="a4">A4</option>
                        <option value="letter">Letter</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Orientation
                      </label>
                      <select
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeData"
                    checked={includeData}
                    onChange={(e) => setIncludeData(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="includeData" className="ml-2 block text-sm text-gray-700">
                    Include data table
                  </label>
                </div>
              </div>
            )}

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ChartExportButton;
