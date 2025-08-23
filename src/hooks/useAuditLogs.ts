import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditLogger, AuditLogQuery } from '../services/auditLogger';
import { useToast } from '../contexts/ToastContext';

// React Query keys for audit logs
const auditLogKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (filters: string) => [...auditLogKeys.lists(), { filters }] as const,
  details: () => [...auditLogKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditLogKeys.details(), id] as const,
};

// Hook for fetching audit logs with filtering
export const useAuditLogs = (query: AuditLogQuery = {}) => {
  return useQuery({
    queryKey: auditLogKeys.list(JSON.stringify(query)),
    queryFn: () => auditLogger.getAuditLogs(query),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for fetching audit logs for a specific record
export const useRecordAuditLogs = (tableName: string, recordId: string) => {
  return useQuery({
    queryKey: auditLogKeys.detail(`${tableName}-${recordId}`),
    queryFn: () => auditLogger.getRecordAuditLogs(tableName, recordId),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for exporting audit logs
export const useExportAuditLogs = () => {
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ query, format }: { query: AuditLogQuery; format: 'csv' | 'json' }) =>
      auditLogger.exportAuditLogs(query, format),
    onSuccess: (blob, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${variables.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess('Export Successful', 'Audit logs have been exported successfully.');
    },
    onError: (error: Error) => {
      showError('Export Failed', error.message || 'Failed to export audit logs. Please try again.');
    },
  });
};

// Hook for refreshing audit logs
export const useRefreshAuditLogs = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Invalidate all audit log queries to force refetch
      await queryClient.invalidateQueries({ queryKey: auditLogKeys.all });
      return true;
    },
    onSuccess: () => {
      showSuccess('Refreshed', 'Audit logs have been refreshed successfully.');
    },
    onError: (error: Error) => {
      showError('Refresh Failed', error.message || 'Failed to refresh audit logs. Please try again.');
    },
  });
};

// Utility function to build query from filters
export const buildAuditLogQuery = (filters: {
  search?: string;
  operation?: string;
  user?: string;
  table?: string;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}): AuditLogQuery => {
  const query: AuditLogQuery = {};

  if (filters.operation && filters.operation !== 'all') {
    query.operation = filters.operation as any;
  }

  if (filters.user) {
    query.userName = filters.user;
  }

  if (filters.table) {
    query.tableName = filters.table;
  }

  if (filters.startDate) {
    query.startDate = new Date(filters.startDate);
  }

  if (filters.endDate) {
    query.endDate = new Date(filters.endDate + 'T23:59:59Z');
  }

  if (filters.success !== undefined) {
    query.success = filters.success;
  }

  if (filters.limit) {
    query.limit = filters.limit;
  }

  if (filters.offset) {
    query.offset = filters.offset;
  }

  return query;
};

// Hook for getting audit log statistics
export const useAuditLogStats = () => {
  return useQuery({
    queryKey: ['audit-logs', 'stats'],
    queryFn: async () => {
      // Get basic stats from recent logs
      const recentLogs = await auditLogger.getAuditLogs({
        limit: 1000,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      });

      const stats = {
        totalLogs: recentLogs.total,
        operations: {
          CREATE: 0,
          UPDATE: 0,
          DELETE: 0,
          SEARCH: 0,
          EXPORT: 0,
          LOGIN: 0,
          LOGOUT: 0
        },
        topUsers: {} as Record<string, number>,
        topTables: {} as Record<string, number>,
        recentActivity: recentLogs.logs.slice(0, 10)
      };

      recentLogs.logs.forEach(log => {
        // Count operations
        if (log.operation in stats.operations) {
          stats.operations[log.operation as keyof typeof stats.operations]++;
        }

        // Count user activity
        stats.topUsers[log.userName] = (stats.topUsers[log.userName] || 0) + 1;

        // Count table activity
        stats.topTables[log.tableName] = (stats.topTables[log.tableName] || 0) + 1;
      });

      return stats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
