# Audit Logging System for Commission Management

## Overview

This audit logging system provides comprehensive tracking of all changes made to commission-related tables in the Zoho Analytics Management Interface. It ensures compliance, accountability, and traceability for all data modifications.

## Features

### 🔍 **Comprehensive Tracking**
- **User Identification**: Tracks who made each change
- **Timestamp Recording**: Precise timing of all operations
- **Field-Level Changes**: Detailed before/after values for updates
- **Operation Types**: CREATE, UPDATE, DELETE operations
- **Context Information**: IP address, user agent, session tracking

### 📊 **Advanced Filtering & Search**
- Filter by table name, user, operation type
- Date range filtering
- Record-specific audit trails
- Real-time search capabilities

### 📤 **Export Functionality**
- CSV export for spreadsheet analysis
- JSON export for API integration
- Custom date range exports
- Filtered exports based on criteria

### 🛡️ **Security & Compliance**
- Immutable audit trail
- Session tracking
- IP address logging
- User agent recording

## Architecture

### Frontend Components

#### 1. **AuditLogger Service** (`src/services/auditLogger.ts`)
```typescript
// Singleton service for audit logging
const auditLogger = AuditLogger.getInstance();

// Log operations
await auditLogger.logCreate(userId, userName, tableName, recordId, newData);
await auditLogger.logUpdate(userId, userName, tableName, recordId, oldData, newData);
await auditLogger.logDelete(userId, userName, tableName, recordId, deletedData);
```

#### 2. **User Context** (`src/contexts/UserContext.tsx`)
```typescript
// Manages user authentication and session
const { user } = useUser();
// Provides user ID and name for audit logging
```

#### 3. **Audit Log Viewer** (`src/components/audit/AuditLogViewer.tsx`)
- Comprehensive audit log display
- Advanced filtering interface
- Export functionality
- Pagination support

### Backend API Routes (Vercel)

#### 1. **Audit Log Storage** (`api/audit/logs.ts`)
- POST: Create new audit log entries
- GET: Retrieve filtered audit logs
- Supports pagination and filtering

#### 2. **Audit Log Export** (`api/audit/export.ts`)
- CSV export with proper formatting
- JSON export for API consumption
- Filtered exports based on criteria

## Database Schema

### Audit Logs Table (Recommended for Production)

```sql
CREATE TABLE audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  record_id VARCHAR(255) NOT NULL,
  operation ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
  field_name VARCHAR(255),
  old_value JSON,
  new_value JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255),
  metadata JSON,
  INDEX idx_table_name (table_name),
  INDEX idx_user_id (user_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_operation (operation)
);
```

## Implementation Guide

### 1. **Setup User Authentication**

```typescript
// In your main App component
import { UserProvider } from './contexts/UserContext';

function App() {
  return (
    <UserProvider>
      {/* Your app components */}
    </UserProvider>
  );
}
```

### 2. **Integrate Audit Logging in Mutations**

The system automatically logs all CRUD operations through the enhanced mutation hooks:

```typescript
// Create operation
const create = useCreateRecord('company_upcharge_fees_DC');
await create.mutateAsync(newData); // Automatically logged

// Update operation
const update = useUpdateRecord('company_upcharge_fees_DC');
await update.mutateAsync({ 
  id: recordId, 
  data: newData, 
  oldData: existingRecord // Required for audit logging
});

// Delete operation
const deleteRecord = useDeleteRecord('company_upcharge_fees_DC');
await deleteRecord.mutateAsync({ 
  id: recordId, 
  deletedData: recordToDelete // Required for audit logging
});
```

### 3. **View Audit Logs**

```typescript
// Access audit logs through the header button
// Or programmatically:
const auditLogger = AuditLogger.getInstance();
const logs = await auditLogger.getAuditLogs({
  tableName: 'company_upcharge_fees_DC',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
});
```

## Vercel Deployment

### 1. **Database Setup**

Choose one of Vercel's database options:

#### Option A: Vercel Postgres
```bash
# Install Vercel Postgres
npm install @vercel/postgres

# Add to your vercel.json
{
  "functions": {
    "api/audit/*.ts": {
      "maxDuration": 30
    }
  }
}
```

#### Option B: Vercel KV (Redis)
```bash
# Install Vercel KV
npm install @vercel/kv

# Use for high-performance audit logging
```

#### Option C: External Database
- Supabase
- PlanetScale
- AWS RDS
- Google Cloud SQL

### 2. **Environment Variables**

```env
# Database connection
DATABASE_URL=your_database_connection_string

# Audit logging configuration
AUDIT_LOG_RETENTION_DAYS=365
AUDIT_LOG_ENABLED=true

# API endpoints
REACT_APP_AUDIT_API_ENDPOINT=/api/audit
```

### 3. **Production Considerations**

#### Data Retention
```typescript
// Implement automatic cleanup of old audit logs
const RETENTION_DAYS = 365;
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

// Clean up old logs
await deleteOldAuditLogs(cutoffDate);
```

#### Performance Optimization
- Index critical fields (timestamp, user_id, table_name)
- Implement pagination for large datasets
- Use database-specific optimizations
- Consider archiving old logs

#### Security
- Encrypt sensitive audit data
- Implement role-based access to audit logs
- Regular security audits
- Backup audit logs separately

## Usage Examples

### 1. **Track Commission Changes**

```typescript
// When updating commission rates
const updateCommission = async (commissionId: string, newRate: number) => {
  const oldData = await getCommission(commissionId);
  const newData = { ...oldData, rate: newRate };
  
  await update.mutateAsync({
    id: commissionId,
    data: newData,
    oldData: oldData // This triggers audit logging
  });
};
```

### 2. **Audit Trail for Compliance**

```typescript
// Generate compliance report
const generateComplianceReport = async (startDate: Date, endDate: Date) => {
  const auditLogs = await auditLogger.getAuditLogs({
    startDate,
    endDate,
    tableName: 'employee_commissions_DC'
  });
  
  // Process for compliance reporting
  return processComplianceData(auditLogs);
};
```

### 3. **User Activity Monitoring**

```typescript
// Monitor user activity
const getUserActivity = async (userId: string) => {
  const logs = await auditLogger.getAuditLogs({
    userId,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
  });
  
  return analyzeUserActivity(logs);
};
```

## Compliance Features

### 1. **SOX Compliance**
- Immutable audit trail
- User accountability
- Timestamp accuracy
- Data integrity verification

### 2. **GDPR Compliance**
- Data subject tracking
- Right to be forgotten
- Data processing records
- Consent management

### 3. **Financial Compliance**
- Commission calculation tracking
- Rate change history
- Approval workflows
- Audit trail preservation

## Monitoring & Alerts

### 1. **Suspicious Activity Detection**
```typescript
// Monitor for unusual patterns
const detectSuspiciousActivity = async () => {
  const recentLogs = await auditLogger.getAuditLogs({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
  });
  
  // Check for unusual patterns
  const suspicious = analyzeForSuspiciousActivity(recentLogs);
  
  if (suspicious.length > 0) {
    await sendAlert(suspicious);
  }
};
```

### 2. **Performance Monitoring**
- Audit log storage performance
- Query response times
- Export generation times
- Database connection health

## Troubleshooting

### Common Issues

1. **Audit Logs Not Appearing**
   - Check user authentication
   - Verify API endpoint configuration
   - Check database connectivity

2. **Performance Issues**
   - Optimize database indexes
   - Implement pagination
   - Consider data archiving

3. **Export Failures**
   - Check file size limits
   - Verify CSV formatting
   - Monitor memory usage

### Debug Mode

```typescript
// Enable debug logging
const DEBUG_AUDIT = process.env.NODE_ENV === 'development';

if (DEBUG_AUDIT) {
  console.log('Audit log entry:', logEntry);
}
```

## Future Enhancements

### 1. **Advanced Analytics**
- User behavior analysis
- Change pattern detection
- Predictive analytics
- Risk assessment

### 2. **Integration Features**
- Slack notifications
- Email alerts
- Webhook support
- API integrations

### 3. **Enhanced Security**
- Blockchain audit trail
- Digital signatures
- Encryption at rest
- Multi-factor authentication

## Support

For questions or issues with the audit logging system:

1. Check the troubleshooting section
2. Review the API documentation
3. Contact the development team
4. Submit issues through the project repository

---

**Note**: This audit logging system is designed for commission management compliance and should be configured according to your specific regulatory requirements.
