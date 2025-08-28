import { setupServer } from 'msw/node';
import { rest } from 'msw';

// API base URL
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Mock data
const mockRevenueData = {
  totalRevenue: 1000000,
  totalCommission: 150000,
  totalPayments: 850000,
  monthlyData: [
    { month: '2024-01', revenue: 80000, commission: 12000, payments: 68000 },
    { month: '2024-02', revenue: 90000, commission: 13500, payments: 76500 },
    { month: '2024-03', revenue: 95000, commission: 14250, payments: 80750 },
  ],
  companyData: [
    { companyId: 1, name: 'Company A', revenue: 400000, commission: 60000 },
    { companyId: 2, name: 'Company B', revenue: 350000, commission: 52500 },
    { companyId: 3, name: 'Company C', revenue: 250000, commission: 37500 },
  ],
  commissionData: [
    { agentId: 1, name: 'Agent 1', commission: 45000, sales: 300000 },
    { agentId: 2, name: 'Agent 2', commission: 35000, sales: 250000 },
    { agentId: 3, name: 'Agent 3', commission: 25000, sales: 200000 },
  ],
  paymentData: [
    { paymentId: 1, amount: 50000, date: '2024-01-15', status: 'completed' },
    { paymentId: 2, amount: 75000, date: '2024-02-15', status: 'completed' },
    { paymentId: 3, amount: 100000, date: '2024-03-15', status: 'pending' },
  ],
};

const mockFilters = {
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31'),
  },
  companies: [],
  agents: [],
  status: 'all',
};

// API handlers
export const handlers = [
  // Revenue data endpoint
  rest.get(`${API_BASE}/revenue`, (req, res, ctx) => {
    const url = new URL(req.url);
    const filters = Object.fromEntries(url.searchParams.entries());
    
    // Simulate API delay
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockRevenueData,
        filters,
        timestamp: new Date().toISOString(),
      })
    );
  }),

  // Commission data endpoint
  rest.get(`${API_BASE}/commission`, (req, res, ctx) => {
    const url = new URL(req.url);
    const filters = Object.fromEntries(url.searchParams.entries());
    
    return res(
      ctx.delay(150),
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockRevenueData.commissionData,
        filters,
        timestamp: new Date().toISOString(),
      })
    );
  }),

  // Company data endpoint
  rest.get(`${API_BASE}/companies`, (req, res, ctx) => {
    const url = new URL(req.url);
    const filters = Object.fromEntries(url.searchParams.entries());
    
    return res(
      ctx.delay(120),
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockRevenueData.companyData,
        filters,
        timestamp: new Date().toISOString(),
      })
    );
  }),

  // Payment data endpoint
  rest.get(`${API_BASE}/payments`, (req, res, ctx) => {
    const url = new URL(req.url);
    const filters = Object.fromEntries(url.searchParams.entries());
    
    return res(
      ctx.delay(130),
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockRevenueData.paymentData,
        filters,
        timestamp: new Date().toISOString(),
      })
    );
  }),

  // Export endpoints
  rest.post(`${API_BASE}/export/pdf`, (req, res, ctx) => {
    return res(
      ctx.delay(2000), // Simulate longer export time
      ctx.status(200),
      ctx.json({
        success: true,
        exportId: 'export-123',
        status: 'processing',
        message: 'PDF export started',
        timestamp: new Date().toISOString(),
      })
    );
  }),

  rest.post(`${API_BASE}/export/excel`, (req, res, ctx) => {
    return res(
      ctx.delay(1500),
      ctx.status(200),
      ctx.json({
        success: true,
        exportId: 'export-456',
        status: 'processing',
        message: 'Excel export started',
        timestamp: new Date().toISOString(),
      })
    );
  }),

  rest.post(`${API_BASE}/export/csv`, (req, res, ctx) => {
    return res(
      ctx.delay(1000),
      ctx.status(200),
      ctx.json({
        success: true,
        exportId: 'export-789',
        status: 'processing',
        message: 'CSV export started',
        timestamp: new Date().toISOString(),
      })
    );
  }),

  // Export status endpoint
  rest.get(`${API_BASE}/export/:exportId/status`, (req, res, ctx) => {
    const { exportId } = req.params;
    
    // Simulate different export states
    const statuses = {
      'export-123': 'completed',
      'export-456': 'processing',
      'export-789': 'failed',
    };
    
    const status = statuses[exportId as string] || 'processing';
    
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        success: true,
        exportId,
        status,
        progress: status === 'completed' ? 100 : status === 'failed' ? 0 : 75,
        downloadUrl: status === 'completed' ? `/api/export/${exportId}/download` : null,
        error: status === 'failed' ? 'Export failed due to invalid data' : null,
        timestamp: new Date().toISOString(),
      })
    );
  }),

  // Export download endpoint
  rest.get(`${API_BASE}/export/:exportId/download`, (req, res, ctx) => {
    const { exportId } = req.params;
    
    return res(
      ctx.delay(500),
      ctx.status(200),
      ctx.json({
        success: true,
        exportId,
        downloadUrl: `https://example.com/exports/${exportId}.pdf`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timestamp: new Date().toISOString(),
      })
    );
  }),

  // Export history endpoint
  rest.get(`${API_BASE}/export/history`, (req, res, ctx) => {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    const mockHistory = [
      {
        id: 'export-123',
        type: 'pdf',
        status: 'completed',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
        fileSize: 1024000,
        downloadCount: 3,
      },
      {
        id: 'export-456',
        type: 'excel',
        status: 'processing',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        completedAt: null,
        fileSize: null,
        downloadCount: 0,
      },
      {
        id: 'export-789',
        type: 'csv',
        status: 'failed',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        completedAt: null,
        fileSize: null,
        downloadCount: 0,
        error: 'Invalid data format',
      },
    ];
    
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockHistory.slice((page - 1) * limit, page * limit),
        pagination: {
          page,
          limit,
          total: mockHistory.length,
          totalPages: Math.ceil(mockHistory.length / limit),
        },
        timestamp: new Date().toISOString(),
      })
    );
  }),

  // Dashboard performance endpoint
  rest.get(`${API_BASE}/performance`, (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          cacheHitRate: 85.5,
          averageResponseTime: 245,
          slowQueries: 2,
          activeConnections: 15,
          memoryUsage: 67.3,
          cpuUsage: 23.1,
          diskUsage: 45.2,
        },
        timestamp: new Date().toISOString(),
      })
    );
  }),

  // Role-based access control endpoints
  rest.get(`${API_BASE}/auth/profile`, (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'user',
          companyId: 1,
          permissions: ['read:revenue', 'read:commission'],
          lastLogin: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      })
    );
  }),

  rest.get(`${API_BASE}/auth/permissions`, (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          permissions: ['read:revenue', 'read:commission', 'export:reports'],
          role: 'user',
          companyId: 1,
        },
        timestamp: new Date().toISOString(),
      })
    );
  }),

  // Error handlers
  rest.get(`${API_BASE}/error/network`, (req, res, ctx) => {
    return res.networkError('Failed to connect');
  }),

  rest.get(`${API_BASE}/error/server`, (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(500),
      ctx.json({
        success: false,
        error: 'Internal server error',
        message: 'Something went wrong on the server',
        timestamp: new Date().toISOString(),
      })
    );
  }),

  rest.get(`${API_BASE}/error/not-found`, (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(404),
      ctx.json({
        success: false,
        error: 'Not found',
        message: 'The requested resource was not found',
        timestamp: new Date().toISOString(),
      })
    );
  }),

  rest.get(`${API_BASE}/error/unauthorized`, (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(401),
      ctx.json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      })
    );
  }),

  rest.get(`${API_BASE}/error/forbidden`, (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(403),
      ctx.json({
        success: false,
        error: 'Forbidden',
        message: 'Insufficient permissions',
        timestamp: new Date().toISOString(),
      })
    );
  }),

  // Catch-all handler for unmatched requests
  rest.all('*', (req, res, ctx) => {
    console.warn(`Unhandled request: ${req.method} ${req.url}`);
    return res(
      ctx.delay(100),
      ctx.status(404),
      ctx.json({
        success: false,
        error: 'Not found',
        message: `No handler found for ${req.method} ${req.url}`,
        timestamp: new Date().toISOString(),
      })
    );
  }),
];

// Setup server
export const server = setupServer(...handlers);
