import { NextApiRequest, NextApiResponse } from 'next';
import { AuditLogEntry, AuditLogQuery } from '../../../src/services/auditLogger';

// In a real implementation, you'd use Vercel's database options:
// - Vercel Postgres
// - Vercel KV (Redis)
// - Vercel Blob Storage
// - Or external databases like Supabase, PlanetScale, etc.

// For now, we'll use a simple in-memory store (not persistent in production)
let auditLogs: AuditLogEntry[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'POST') {
      // Create new audit log entry
      const logEntry: AuditLogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...req.body,
        timestamp: new Date(req.body.timestamp || Date.now())
      };

      auditLogs.push(logEntry);

      // In production, save to database
      // await saveToDatabase(logEntry);

      res.status(201).json({ success: true, id: logEntry.id });
    } else if (req.method === 'GET') {
      // Query audit logs with filters
      const {
        tableName,
        userId,
        operation,
        startDate,
        endDate,
        recordId,
        limit = 20,
        offset = 0
      } = req.query;

      let filteredLogs = [...auditLogs];

      // Apply filters
      if (tableName) {
        filteredLogs = filteredLogs.filter(log => log.tableName === tableName);
      }

      if (userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === userId);
      }

      if (operation) {
        filteredLogs = filteredLogs.filter(log => log.operation === operation);
      }

      if (recordId) {
        filteredLogs = filteredLogs.filter(log => log.recordId === recordId);
      }

      if (startDate) {
        const start = new Date(startDate as string);
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= start);
      }

      if (endDate) {
        const end = new Date(endDate as string);
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= end);
      }

      // Sort by timestamp (newest first)
      filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const total = filteredLogs.length;
      const paginatedLogs = filteredLogs.slice(Number(offset), Number(offset) + Number(limit));

      res.status(200).json({
        logs: paginatedLogs,
        total,
        page: Math.floor(Number(offset) / Number(limit)) + 1,
        totalPages: Math.ceil(total / Number(limit))
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Audit log API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper function to save to database (implement based on your chosen database)
async function saveToDatabase(logEntry: AuditLogEntry) {
  // Example with Vercel Postgres:
  /*
  import { sql } from '@vercel/postgres';
  
  await sql`
    INSERT INTO audit_logs (
      user_id, user_name, table_name, record_id, operation, 
      field_name, old_value, new_value, timestamp, 
      ip_address, user_agent, session_id, metadata
    ) VALUES (
      ${logEntry.userId}, ${logEntry.userName}, ${logEntry.tableName}, 
      ${logEntry.recordId}, ${logEntry.operation}, ${logEntry.fieldName}, 
      ${JSON.stringify(logEntry.oldValue)}, ${JSON.stringify(logEntry.newValue)}, 
      ${logEntry.timestamp}, ${logEntry.ipAddress}, ${logEntry.userAgent}, 
      ${logEntry.sessionId}, ${JSON.stringify(logEntry.metadata)}
    )
  `;
  */
}
