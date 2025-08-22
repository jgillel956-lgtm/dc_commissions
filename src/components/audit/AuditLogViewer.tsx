import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Calendar, User, Database, Activity } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { auditLogger, AuditLogEntry, AuditLogQuery } from '../../services/auditLogger';
import { useUser } from '../../contexts/UserContext';

interface AuditLogViewerProps {
  isOpen: boolean;
  onClose: () => void;
  tableName?: string;
  recordId?: string;
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ 
  isOpen, 
  onClose, 
  tableName, 
  recordId 
}) => {
  const { user } = useUser();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogQuery>({
    tableName,
    recordId,
    limit: 20
  });

  // Load audit logs
  const loadLogs = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const result = await auditLogger.getAuditLogs({
        ...filters,
        offset: (currentPage - 1) * (filters.limit || 20)
      });
      setLogs(result.logs);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load logs when component mounts or filters change
  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, filters, currentPage]);

  // Handle filter changes
  const handleFilterChange = (key: keyof AuditLogQuery, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await auditLogger.exportAuditLogs(filters, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Format operation badge
  const getOperationBadge = (operation: string) => {
    const colors = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[operation as keyof typeof colors]}`}>
        {operation}
      </span>
    );
  };

  // Format timestamp
  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format value for display
  const formatValue = (value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Audit Logs" size="lg">
      <div className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Table Name
            </label>
            <Input
              value={filters.tableName || ''}
              onChange={(e) => handleFilterChange('tableName', e.target.value || undefined)}
              placeholder="Filter by table"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User ID
            </label>
            <Input
              value={filters.userId || ''}
              onChange={(e) => handleFilterChange('userId', e.target.value || undefined)}
              placeholder="Filter by user"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operation
            </label>
            <select
              value={filters.operation || ''}
              onChange={(e) => handleFilterChange('operation', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Operations</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={filters.startDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : undefined)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <Input
              type="date"
              value={filters.endDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : undefined)}
            />
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {total} total logs found
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => handleExport('csv')}
              variant="secondary"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() => handleExport('json')}
              variant="secondary"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Field
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Changes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{log.userName}</div>
                        <div className="text-gray-500">{log.userId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{log.tableName}</div>
                        <div className="text-gray-500">ID: {log.recordId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getOperationBadge(log.operation)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.fieldName || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.operation === 'CREATE' ? (
                        <div className="text-green-600">Created new record</div>
                      ) : log.operation === 'DELETE' ? (
                        <div className="text-red-600">Deleted record</div>
                      ) : (
                        <div>
                          <div className="text-gray-500 text-xs">Old: {formatValue(log.oldValue)}</div>
                          <div className="text-gray-900">New: {formatValue(log.newValue)}</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > (filters.limit || 20) && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * (filters.limit || 20)) + 1} to{' '}
              {Math.min(currentPage * (filters.limit || 20), total)} of {total} results
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                variant="secondary"
                size="sm"
              >
                Previous
              </Button>
              <Button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage * (filters.limit || 20) >= total}
                variant="secondary"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AuditLogViewer;
