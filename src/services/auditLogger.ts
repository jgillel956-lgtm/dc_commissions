// Audit logging service for tracking commission table changes
export interface AuditLogEntry {
  id?: string;
  userId: string;
  userName: string;
  tableName: string;
  recordId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'SEARCH' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
  fieldName?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  duration?: number; // For operations that take time
  success?: boolean; // Whether the operation was successful
  errorMessage?: string; // Error message if operation failed
}

export interface AuditLogQuery {
  tableName?: string;
  userId?: string;
  operation?: 'CREATE' | 'UPDATE' | 'DELETE' | 'SEARCH' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
  startDate?: Date;
  endDate?: Date;
  recordId?: string;
  limit?: number;
  offset?: number;
  success?: boolean; // Filter by success status
  userName?: string; // Filter by username
}

// Audit logger class
export class AuditLogger {
  private static instance: AuditLogger;
  private apiEndpoint: string;

  private constructor() {
    this.apiEndpoint = process.env.REACT_APP_AUDIT_API_ENDPOINT || '/api/audit.mjs';
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  // Log a create operation
  async logCreate(
    userId: string,
    userName: string,
    tableName: string,
    recordId: string,
    newData: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry: AuditLogEntry = {
      userId,
      userName,
      tableName,
      recordId,
      operation: 'CREATE',
      newValue: newData,
      timestamp: new Date(),
      metadata
    };

    await this.saveLogEntry(entry);
  }

  // Log an update operation
  async logUpdate(
    userId: string,
    userName: string,
    tableName: string,
    recordId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    changedFields?: string[],
    metadata?: Record<string, any>
  ): Promise<void> {
    const changes = changedFields || this.getChangedFields(oldData, newData);
    
    for (const field of changes) {
      const entry: AuditLogEntry = {
        userId,
        userName,
        tableName,
        recordId,
        operation: 'UPDATE',
        fieldName: field,
        oldValue: oldData[field],
        newValue: newData[field],
        timestamp: new Date(),
        metadata
      };

      await this.saveLogEntry(entry);
    }
  }

  // Log a delete operation
  async logDelete(
    userId: string,
    userName: string,
    tableName: string,
    recordId: string,
    deletedData: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry: AuditLogEntry = {
      userId,
      userName,
      tableName,
      recordId,
      operation: 'DELETE',
      oldValue: deletedData,
      timestamp: new Date(),
      metadata
    };

    await this.saveLogEntry(entry);
  }

  // Log a logout operation
  async logLogout(
    userId: string,
    userName: string,
    logoutReason: 'user_initiated' | 'session_expired' | 'token_refresh_failed',
    sessionDuration?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry: AuditLogEntry = {
      userId,
      userName,
      tableName: 'auth_system',
      recordId: 'logout_' + Date.now(),
      operation: 'LOGOUT',
      oldValue: {
        action: 'LOGOUT',
        logoutReason,
        sessionDuration,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      success: true,
      metadata: {
        logoutReason,
        sessionDuration,
        ...metadata
      }
    };

    await this.saveLogEntry(entry);
  }

  // Log a login operation
  async logLogin(
    userId: string,
    userName: string,
    success: boolean = true,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry: AuditLogEntry = {
      userId,
      userName,
      tableName: 'auth_system',
      recordId: 'login_' + Date.now(),
      operation: 'LOGIN',
      newValue: {
        action: 'LOGIN',
        success,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      success,
      errorMessage,
      metadata
    };

    await this.saveLogEntry(entry);
  }

  // Log a search operation
  async logSearch(
    userId: string,
    userName: string,
    tableName: string,
    query: string,
    resultCount: number,
    success: boolean = true,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry: AuditLogEntry = {
      userId,
      userName,
      tableName,
      recordId: 'search_' + Date.now(),
      operation: 'SEARCH',
      newValue: {
        query,
        resultCount,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      success,
      errorMessage,
      metadata: {
        query,
        resultCount,
        ...metadata
      }
    };

    await this.saveLogEntry(entry);
  }

  // Log an export operation
  async logExport(
    userId: string,
    userName: string,
    tableName: string,
    format: string,
    recordCount: number,
    success: boolean = true,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry: AuditLogEntry = {
      userId,
      userName,
      tableName,
      recordId: 'export_' + Date.now(),
      operation: 'EXPORT',
      newValue: {
        format,
        recordCount,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      success,
      errorMessage,
      metadata: {
        format,
        recordCount,
        ...metadata
      }
    };

    await this.saveLogEntry(entry);
  }

  // Log a generic operation with timing
  async logOperation(
    userId: string,
    userName: string,
    tableName: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'SEARCH' | 'EXPORT' | 'LOGIN' | 'LOGOUT',
    recordId: string,
    startTime: number,
    success: boolean = true,
    errorMessage?: string,
    oldValue?: any,
    newValue?: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    const duration = Date.now() - startTime;
    
    const entry: AuditLogEntry = {
      userId,
      userName,
      tableName,
      recordId,
      operation,
      oldValue,
      newValue,
      timestamp: new Date(),
      duration,
      success,
      errorMessage,
      metadata
    };

    await this.saveLogEntry(entry);
  }

  // Get audit logs with filtering
  async getAuditLogs(query: AuditLogQuery): Promise<{ logs: AuditLogEntry[]; total: number }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (query.tableName) queryParams.append('tableName', query.tableName);
      if (query.userId) queryParams.append('userId', query.userId);
      if (query.operation) queryParams.append('operation', query.operation);
      if (query.startDate) queryParams.append('startDate', query.startDate.toISOString());
      if (query.endDate) queryParams.append('endDate', query.endDate.toISOString());
      if (query.recordId) queryParams.append('recordId', query.recordId);
      if (query.limit) queryParams.append('limit', query.limit.toString());
      if (query.offset) queryParams.append('offset', query.offset.toString());

      // Get authentication token from session storage
      const token = sessionStorage.getItem('auth_token');
      
      const headers: Record<string, string> = {};

      // Add authentication header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.apiEndpoint}/logs?${queryParams.toString()}`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  // Get audit logs for a specific record
  async getRecordAuditLogs(tableName: string, recordId: string): Promise<AuditLogEntry[]> {
    const result = await this.getAuditLogs({ tableName, recordId });
    return result.logs;
  }

  // Export audit logs
  async exportAuditLogs(query: AuditLogQuery, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    try {
      const queryParams = new URLSearchParams();
      
      if (query.tableName) queryParams.append('tableName', query.tableName);
      if (query.userId) queryParams.append('userId', query.userId);
      if (query.operation) queryParams.append('operation', query.operation);
      if (query.startDate) queryParams.append('startDate', query.startDate.toISOString());
      if (query.endDate) queryParams.append('endDate', query.endDate.toISOString());
      if (query.recordId) queryParams.append('recordId', query.recordId);

      // Get authentication token from session storage
      const token = sessionStorage.getItem('auth_token');
      
      const headers: Record<string, string> = {};

      // Add authentication header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.apiEndpoint}/export?${queryParams.toString()}&format=${format}`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Failed to export audit logs: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw error;
    }
  }

  // Private methods
  private async saveLogEntry(entry: AuditLogEntry): Promise<void> {
    try {
      // Add client-side information
      entry.ipAddress = await this.getClientIP();
      entry.userAgent = navigator.userAgent;
      entry.sessionId = this.getSessionId();

      // Get authentication token from localStorage (SessionManager)
      const token = localStorage.getItem('authToken');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // For login operations, we might not have a token yet, so skip authentication
      const isLoginOperation = entry.operation === 'LOGIN';
      
      const response = await fetch(`${this.apiEndpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action_type: entry.operation,
          table_name: entry.tableName,
          record_id: entry.recordId,
          old_values: entry.oldValue,
          new_values: entry.newValue,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          // For login operations, include user_id directly
          ...(isLoginOperation && { user_id: entry.userId })
        }),
      });

      if (!response.ok) {
        // For login operations, don't throw errors as they might be expected
        if (!isLoginOperation) {
          throw new Error(`Failed to save audit log: ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error saving audit log:', error);
      // Don't throw - we don't want audit logging to break the main functionality
    }
  }

  private getChangedFields(oldData: Record<string, any>, newData: Record<string, any>): string[] {
    const changedFields: string[] = [];
    
    // Check for changed fields
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changedFields.push(key);
      }
    }

    // Check for deleted fields
    for (const key in oldData) {
      if (!(key in newData)) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('audit_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('audit_session_id', sessionId);
    }
    return sessionId;
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();
