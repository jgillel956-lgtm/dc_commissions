import '@testing-library/jest-dom';

// Conditionally import MSW server for API mocking
let server: any;
try {
  const { server: mswServer } = require('./mocks/server');
  server = mswServer;
  
  // Establish API mocking before all tests
  beforeAll(() => server.listen());
  
  // Reset any request handlers that we may add during the tests,
  // so they don't affect other tests
  afterEach(() => server.resetHandlers());
  
  // Clean up after the tests are finished
  afterAll(() => server.close());
} catch (error) {
  // MSW not available, skip API mocking setup
  console.warn('MSW server not available, skipping API mocking setup');
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: componentWillReceiveProps') ||
       args[0].includes('Warning: componentWillUpdate'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}

// Custom matchers for accessibility testing
expect.extend({
  toHaveNoViolations(received) {
    const pass = received.violations.length === 0;
    if (pass) {
      return {
        message: () => `expected accessibility violations but found none`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected no accessibility violations but found ${received.violations.length}`,
        pass: false,
      };
    }
  },
});

// Test data factories
export const createMockRevenueData = (overrides = {}) => ({
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
  ...overrides,
});

export const createMockFilters = (overrides = {}) => ({
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31'),
  },
  companies: [],
  agents: [],
  status: 'all',
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  companyId: 1,
  permissions: ['read:revenue', 'read:commission'],
  ...overrides,
});

// Test helpers
export const waitForLoadingToFinish = () =>
  new Promise(resolve => setTimeout(resolve, 0));

export const mockApiResponse = (data: any, delay = 100) =>
  new Promise(resolve => setTimeout(() => resolve(data), delay));

export const mockApiError = (error: any, delay = 100) =>
  new Promise((_, reject) => setTimeout(() => reject(error), delay));

// Custom render function with providers
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
