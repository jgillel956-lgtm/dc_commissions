import { NextApiRequest, NextApiResponse } from 'next';
import { AuditLogEntry } from '../../../src/services/auditLogger';

// In-memory store (same as logs.ts - in production, use a shared database)
let auditLogs: AuditLogEntry[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const {
      tableName,
      userId,
      operation,
      startDate,
      endDate,
      recordId,
      format = 'csv'
    } = req.query;

    // Apply the same filters as the logs endpoint
    let filteredLogs = [...auditLogs];

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

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`);
      res.status(200).json(filteredLogs);
    } else if (format === 'csv') {
      const csvContent = generateCSV(filteredLogs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csvContent);
    } else {
      res.status(400).json({ error: 'Invalid format. Use "csv" or "json"' });
    }
  } catch (error) {
    console.error('Audit export API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function generateCSV(logs: AuditLogEntry[]): string {
  const headers = [
    'ID',
    'Timestamp',
    'User ID',
    'User Name',
    'Table Name',
    'Record ID',
    'Operation',
    'Field Name',
    'Old Value',
    'New Value',
    'IP Address',
    'User Agent',
    'Session ID'
  ];

  const rows = logs.map(log => [
    log.id || '',
    new Date(log.timestamp).toISOString(),
    log.userId,
    log.userName,
    log.tableName,
    log.recordId,
    log.operation,
    log.fieldName || '',
    formatValueForCSV(log.oldValue),
    formatValueForCSV(log.newValue),
    log.ipAddress || '',
    log.userAgent || '',
    log.sessionId || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

function formatValueForCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value).replace(/"/g, '""');
  }
  
  return String(value).replace(/"/g, '""');
}
