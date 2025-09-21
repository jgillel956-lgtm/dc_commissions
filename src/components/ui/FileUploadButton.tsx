import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, BarChart3 } from 'lucide-react';
import Button from './Button';
import Tooltip from './Tooltip';
import axios from 'axios';

interface FileUploadButtonProps {
  onUploadComplete?: (success: boolean, data?: any) => void;
  className?: string;
}

export const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  onUploadComplete,
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
    progress?: {
      currentChunk: number;
      totalChunks: number;
      currentChunkRecords: number;
      totalRecordsProcessed: number;
    };
    syncResults?: {
      totalInserted: number;
      totalUpdated: number;
      duration: number;
      duplicatePrevention: boolean;
    };
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getApiUrl = (endpoint: string = '/api/zoho-analytics'): string => {
    return new URL(endpoint, window.location.origin).toString();
  };

  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
    };
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setUploadStatus({
        success: false,
        error: 'Please select a CSV file'
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus({});

    try {
      console.log('📁 Starting chunked file upload for revenue_master_view...');
      
      // Read the file content
      const fileContent = await file.text();
      const lines = fileContent.split('\n');
      const header = lines[0];
      const dataLines = lines.slice(1);
      
      console.log(`📊 File has ${dataLines.length} data rows (plus header)`);
      
      // Process in chunks of 1000 rows to avoid size limits
      const chunkSize = 1000;
      const chunks = [];
      
      for (let i = 0; i < dataLines.length; i += chunkSize) {
        const chunk = dataLines.slice(i, i + chunkSize);
        chunks.push([header, ...chunk].join('\n'));
      }
      
      console.log(`📦 Split into ${chunks.length} chunks of up to ${chunkSize} rows each`);
      
      let totalProcessed = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let successCount = 0;
      const startTime = Date.now();
      
      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkNumber = i + 1;
        
        console.log(`📤 Uploading chunk ${chunkNumber}/${chunks.length}...`);
        
        // Update progress
        setUploadStatus(prev => ({
          ...prev,
          progress: {
            currentChunk: chunkNumber,
            totalChunks: chunks.length,
            currentChunkRecords: 0,
            totalRecordsProcessed: totalProcessed
          }
        }));
        
        try {
          // Debug: Log what we're sending
          console.log('🔍 DEBUG: Sending CSV chunk:', {
            chunkNumber,
            totalChunks: chunks.length,
            chunkLength: chunk.length,
            chunkPreview: chunk.substring(0, 500) + '...',
            fileName: file.name
          });
          
          // Debug: Parse the CSV chunk to see what fields are present
          try {
            const lines = chunk.split('\n');
            if (lines.length > 0) {
              const headers = lines[0].split(',');
              console.log('🔍 DEBUG: CSV Headers found:', headers);
              
              // Look for commission-related fields
              const commissionFields = headers.filter(h => 
                h.toLowerCase().includes('commission') || 
                h.toLowerCase().includes('employee') ||
                h.toLowerCase().includes('emp_id')
              );
              console.log('🔍 DEBUG: Commission-related fields:', commissionFields);
              
              // Show sample data row if available
              if (lines.length > 1) {
                const dataRow = lines[1].split(',');
                console.log('🔍 DEBUG: Sample data row:', dataRow);
                
                // Show commission field values from sample row
                const commissionValues = {};
                commissionFields.forEach(field => {
                  const index = headers.indexOf(field);
                  if (index >= 0 && index < dataRow.length) {
                    commissionValues[field] = dataRow[index];
                  }
                });
                console.log('🔍 DEBUG: Commission field values from sample row:', commissionValues);
              }
            }
          } catch (parseError) {
            console.log('🔍 DEBUG: Could not parse CSV chunk for debugging:', parseError);
          }
          
          const response = await axios.post(getApiUrl(), {
            tableName: 'revenue_master_view',
            action: 'import-csv-chunk',
            csvData: chunk,
            fileName: file.name,
            chunkNumber: chunkNumber,
            totalChunks: chunks.length,
            isFirstChunk: i === 0
          }, {
            headers: getHeaders(),
            timeout: 120000 // 2 minute timeout per chunk
          });

          if (response.data.success) {
            console.log('🔍 DEBUG: Server response data:', response.data);
            const chunkProcessed = response.data.recordsProcessed || 0;
            const chunkInserted = response.data.syncResult?.recordsInserted || 0;
            const chunkUpdated = response.data.syncResult?.recordsUpdated || 0;
            
            totalProcessed += chunkProcessed;
            totalInserted += chunkInserted;
            totalUpdated += chunkUpdated;
            successCount++;
            
            // Update progress with chunk results
            setUploadStatus(prev => ({
              ...prev,
              progress: {
                currentChunk: chunkNumber,
                totalChunks: chunks.length,
                currentChunkRecords: chunkProcessed,
                totalRecordsProcessed: totalProcessed
              }
            }));
            
            console.log(`✅ Chunk ${chunkNumber} completed: ${chunkProcessed} records (${chunkInserted} inserted, ${chunkUpdated} updated)`);
          } else {
            throw new Error(response.data.error || `Chunk ${chunkNumber} failed`);
          }
        } catch (chunkError: any) {
          console.error(`❌ Chunk ${chunkNumber} failed:`, chunkError);
          throw new Error(`Chunk ${chunkNumber} failed: ${chunkError.message}`);
        }
      }
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      setUploadStatus({
        success: true,
        message: `Successfully imported ${totalProcessed} records from ${file.name} (${successCount}/${chunks.length} chunks)`,
        syncResults: {
          totalInserted,
          totalUpdated,
          duration,
          duplicatePrevention: totalUpdated > 0
        }
      });
      console.log('✅ All chunks uploaded successfully:', { 
        totalProcessed, 
        totalInserted, 
        totalUpdated, 
        successCount, 
        totalChunks: chunks.length,
        duration 
      });
      onUploadComplete?.(true, { 
        totalProcessed, 
        totalInserted, 
        totalUpdated, 
        successCount, 
        totalChunks: chunks.length,
        duration 
      });
      
    } catch (error: any) {
      console.error('❌ File upload failed:', error);
      
      let errorMessage = 'File upload failed';
      if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setUploadStatus({
        success: false,
        error: errorMessage
      });
      
      onUploadComplete?.(false, error.response?.data);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4" />
            Revenue Master View Upload
          </h3>
          <div className="flex justify-stretch">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Tooltip
              content={
                <div className="text-xs">
                  <div className="font-semibold mb-1">📁 Upload CSV File</div>
                  <div className="space-y-1">
                    <div>• Manually upload CSV files (primarily for revenue_master_view)</div>
                    <div>• Use when API sync fails or is unavailable</div>
                    <div>• Supports large files with automatic chunking</div>
                    <div>• Processes files in 1000-row chunks to avoid size limits</div>
                    <div>• <strong>Use this only when API sync doesn't work</strong></div>
                  </div>
                </div>
              }
              position="top"
              delay={300}
            >
              <Button
                onClick={handleButtonClick}
                disabled={isUploading}
                size="sm"
                variant="secondary"
                className="flex items-center gap-2 w-full justify-center"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Uploading...' : '⬆️ Upload CSV'}
              </Button>
            </Tooltip>
          </div>
        </div>

        <div className="space-y-3">
          {/* Progress Bar */}
          {isUploading && uploadStatus.progress && (
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Processing Chunk {uploadStatus.progress.currentChunk} of {uploadStatus.progress.totalChunks}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {uploadStatus.progress.totalRecordsProcessed} records processed
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(uploadStatus.progress.currentChunk / uploadStatus.progress.totalChunks) * 100}%` 
                  }}
                ></div>
              </div>
              
              <div className="text-xs text-gray-600">
                Current chunk: {uploadStatus.progress.currentChunkRecords} records
              </div>
            </div>
          )}

          {/* Success with Detailed Results */}
          {uploadStatus.success && uploadStatus.syncResults && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-800">Upload Completed Successfully!</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-green-700">✅ Sync completed:</span>
                  <span className="font-medium text-green-800">
                    {uploadStatus.syncResults.totalInserted + uploadStatus.syncResults.totalUpdated} records processed in {uploadStatus.syncResults.duration}s
                  </span>
                </div>
                
                {uploadStatus.syncResults.totalInserted > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-green-700">➕ New Records:</span>
                    <span className="font-medium text-green-800">
                      {uploadStatus.syncResults.totalInserted} new records were inserted
                    </span>
                  </div>
                )}
                
                {uploadStatus.syncResults.duplicatePrevention && (
                  <div className="flex items-center justify-between">
                    <span className="text-green-700">🔄 Duplicate Prevention:</span>
                    <span className="font-medium text-green-800">
                      {uploadStatus.syncResults.totalUpdated} existing records were updated instead of creating duplicates
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Simple Success Message (fallback) */}
          {uploadStatus.success && !uploadStatus.syncResults && (
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-green-600 dark:text-green-400">
                {uploadStatus.message}
              </span>
            </div>
          )}

          {/* Error Message */}
          {uploadStatus.error && (
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle className="h-3 w-3 text-red-500" />
              <span className="text-red-600 dark:text-red-400">
                {uploadStatus.error}
              </span>
            </div>
          )}

          {/* Uploading Status (no progress bar) */}
          {isUploading && !uploadStatus.progress && (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Uploading and processing CSV file in chunks... This may take several minutes for large files.</span>
            </div>
          )}

          <div className="text-xs text-gray-600 dark:text-gray-400">
            <p>Upload a CSV file downloaded from Zoho Analytics to populate the revenue_master_view table.</p>
            <p className="mt-1">Supported format: CSV files with headers matching the revenue_master_view structure.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
