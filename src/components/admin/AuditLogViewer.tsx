import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, Activity, Eye, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
// import { useToast } from '../../contexts/ToastContext'; // Unused import - commented out
import { useAuditLogs, useExportAuditLogs, useRefreshAuditLogs, buildAuditLogQuery } from '../../hooks/useAuditLogs';
import { AuditLogEntry } from '../../services/auditLogger';

const AuditLogViewer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [operationFilter, setOperationFilter] = useState<'all' | 'CREATE' | 'UPDATE' | 'DELETE' | 'SEARCH' | 'EXPORT' | 'LOGIN' | 'LOGOUT'>('all');
  const [userFilter, setUserFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [successFilter, setSuccessFilter] = useState<'all' | 'true' | 'false'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  // const { showSuccess, showError } = useToast(); // Unused variables - commented out

  const itemsPerPage = 20;

  // Build query from filters
  const query = useMemo(() => {
    return buildAuditLogQuery({
      search: searchTerm,
      operation: operationFilter,
      user: userFilter,
      table: tableFilter,
      startDate,
      endDate,
      success: successFilter === 'all' ? undefined : successFilter === 'true',
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage
    });
  }, [searchTerm, operationFilter, userFilter, tableFilter, startDate, endDate, successFilter, currentPage, itemsPerPage]);

  // Fetch audit logs using the hook
  const { data: auditLogsData, isLoading, error } = useAuditLogs(query);
  const logs = auditLogsData?.logs || [];
  const totalLogs = auditLogsData?.total || 0;
  const totalPages = Math.ceil(totalLogs / itemsPerPage);

  // Export and refresh mutations
  const exportMutation = useExportAuditLogs();
  const refreshMutation = useRefreshAuditLogs();

  // Handle export
  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync({ query, format: 'csv' });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleViewDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const getOperationBadge = (operation: string) => {
    const colors = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      SEARCH: 'bg-purple-100 text-purple-800',
      EXPORT: 'bg-orange-100 text-orange-800',
      LOGIN: 'bg-indigo-100 text-indigo-800',
      LOGOUT: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[operation as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {operation}
      </span>
    );
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setOperationFilter('all');
    setUserFilter('');
    setTableFilter('');
    setStartDate('');
    setEndDate('');
    setSuccessFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
          <p className="text-gray-600">View and export system activity logs</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRefresh}
            loading={refreshMutation.isPending}
          >
            Refresh
          </Button>
          <Button
            icon={<Download className="w-4 h-4" />}
            onClick={handleExport}
            loading={exportMutation.isPending}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Operation</label>
            <Select
              value={operationFilter}
              onChange={(value) => setOperationFilter(value as any)}
              options={[
                { value: 'all', label: 'All Operations' },
                { value: 'CREATE', label: 'Create' },
                { value: 'UPDATE', label: 'Update' },
                { value: 'DELETE', label: 'Delete' },
                { value: 'SEARCH', label: 'Search' },
                { value: 'EXPORT', label: 'Export' },
                { value: 'LOGIN', label: 'Login' },
                { value: 'LOGOUT', label: 'Logout' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
            <Input
              type="text"
              placeholder="Filter by user..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Table</label>
            <Input
              type="text"
              placeholder="Filter by table..."
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Success</label>
            <Select
              value={successFilter}
              onChange={(value) => setSuccessFilter(value as any)}
              options={[
                { value: 'all', label: 'All Results' },
                { value: 'true', label: 'Successful' },
                { value: 'false', label: 'Failed' }
              ]}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="secondary"
            icon={<Filter className="w-4 h-4" />}
            onClick={clearFilters}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Activity Logs</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Activity className="w-4 h-4" />
              <span>{totalLogs} logs</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-gray-600">Loading audit logs...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <XCircle className="w-5 h-5 text-red-400 mr-2" />
                  <p className="text-red-800">Error loading audit logs: {error.message}</p>
                </div>
              </div>
            )}
            
            {logs.length > 0 && (
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
                        Operation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Table
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Record ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center">
                                <span className="text-xs font-medium text-white">
                                  {log.userName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                              <div className="text-sm text-gray-500">ID: {log.userId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getOperationBadge(log.operation)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.tableName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.recordId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.ipAddress || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.success !== undefined ? (
                            <div className="flex items-center">
                              {log.success ? (
                                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500 mr-1" />
                              )}
                              <span className={`text-xs font-medium ${
                                log.success ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {log.success ? 'Success' : 'Failed'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewDetails(log)}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {logs.length === 0 && !isLoading && (
              <div className="p-8 text-center">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalLogs)} of {totalLogs} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Audit Log Details"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">User</label>
                <p className="text-sm text-gray-900">{selectedLog.userName} (ID: {selectedLog.userId})</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Operation</label>
                <div className="mt-1">{getOperationBadge(selectedLog.operation)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Table</label>
                <p className="text-sm text-gray-900">{selectedLog.tableName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Record ID</label>
                <p className="text-sm text-gray-900">{selectedLog.recordId}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                <p className="text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">IP Address</label>
                <p className="text-sm text-gray-900">{selectedLog.ipAddress || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="flex items-center mt-1">
                  {selectedLog.success !== undefined ? (
                    <>
                      {selectedLog.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${
                        selectedLog.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {selectedLog.success ? 'Success' : 'Failed'}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500">N/A</span>
                  )}
                </div>
              </div>
              {selectedLog.duration !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration</label>
                  <p className="text-sm text-gray-900">{selectedLog.duration}ms</p>
                </div>
              )}
            </div>
            
            {selectedLog.fieldName && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Field Changed</label>
                <p className="text-sm text-gray-900">{selectedLog.fieldName}</p>
              </div>
            )}
            
            {(selectedLog.oldValue || selectedLog.newValue) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Old Value</label>
                  <pre className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Value</label>
                  <pre className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            {selectedLog.errorMessage && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Error Message</label>
                <pre className="text-sm text-red-900 bg-red-50 p-2 rounded mt-1 overflow-auto">
                  {selectedLog.errorMessage}
                </pre>
              </div>
            )}
            
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Metadata</label>
                <pre className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1 overflow-auto">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogViewer;
