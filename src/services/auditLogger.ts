// Audit logging service for tracking commission table changes
export interface AuditLogEntry {
  id?: string;
  userId: string;
  userName: string;
  tableName: string;
  recordId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  fieldName?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogQuery {
  tableName?: string;
  userId?: string;
  operation?: 'CREATE' | 'UPDATE' | 'DELETE';
  startDate?: Date;
  endDate?: Date;
  recordId?: string;
  limit?: number;
  offset?: number;
}

// Audit logger class
export class AuditLogger {
  private static instance: AuditLogger;
  private apiEndpoint: string;

  private constructor() {
    this.apiEndpoint = process.env.REACT_APP_AUDIT_API_ENDPOINT || '/api/audit';
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

      const response = await fetch(`${this.apiEndpoint}/logs?${queryParams.toString()}`);
      
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

      const response = await fetch(`${this.apiEndpoint}/export?${queryParams.toString()}&format=${format}`);
      
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

      const response = await fetch(`${this.apiEndpoint}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        throw new Error(`Failed to save audit log: ${response.statusText}`);
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
