import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';

test.describe('Revenue Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="revenue-dashboard"]', { timeout: 10000 });
  });

  test.describe('Dashboard Navigation and Layout', () => {
    test('should display the main dashboard layout', async ({ page }) => {
      // Check main layout elements
      await expect(page.locator('[data-testid="dashboard-layout"]')).toBeVisible();
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="header"]')).toBeVisible();
    });

    test('should navigate between different dashboard sections', async ({ page }) => {
      // Test navigation to different tabs
      const tabs = ['overview', 'revenue', 'commission', 'companies', 'payments'];
      
      for (const tab of tabs) {
        await page.click(`[data-testid="tab-${tab}"]`);
        await expect(page.locator(`[data-testid="tab-${tab}"][aria-selected="true"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${tab}-content"]`)).toBeVisible();
      }
    });

    test('should display responsive layout on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check that sidebar is hidden on mobile
      await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible();
      
      // Open mobile menu
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      
      // Close mobile menu
      await page.click('[data-testid="mobile-menu-close"]');
      await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible();
    });
  });

  test.describe('Data Loading and Display', () => {
    test('should load and display revenue data', async ({ page }) => {
      // Wait for data to load
      await page.waitForSelector('[data-testid="revenue-summary"]', { timeout: 10000 });
      
      // Check that summary cards are displayed
      await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-commission"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-payments"]')).toBeVisible();
      
      // Verify data values are displayed
      const totalRevenue = await page.locator('[data-testid="total-revenue-value"]').textContent();
      expect(totalRevenue).toMatch(/\$[\d,]+/);
    });

    test('should display charts and graphs', async ({ page }) => {
      // Navigate to revenue tab
      await page.click('[data-testid="tab-revenue"]');
      
      // Wait for charts to load
      await page.waitForSelector('[data-testid="revenue-chart"]', { timeout: 10000 });
      
      // Check that charts are rendered
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="monthly-trend-chart"]')).toBeVisible();
    });

    test('should handle data loading states', async ({ page }) => {
      // Mock slow API response
      await page.route(`${API_BASE}/revenue`, async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              totalRevenue: 1000000,
              totalCommission: 150000,
              totalPayments: 850000,
              monthlyData: []
            }
          })
        });
      });

      // Reload page to trigger slow loading
      await page.reload();
      
      // Check loading state
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="revenue-summary"]', { timeout: 15000 });
      
      // Verify loading state is gone
      await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
    });

    test('should handle data error states', async ({ page }) => {
      // Mock API error
      await page.route(`${API_BASE}/revenue`, route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });

      // Reload page to trigger error
      await page.reload();
      
      // Check error state
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });
  });

  test.describe('Filtering and Data Interaction', () => {
    test('should apply date range filters', async ({ page }) => {
      // Open date picker
      await page.click('[data-testid="date-range-picker"]');
      
      // Select date range
      await page.click('[data-testid="date-start"]');
      await page.fill('[data-testid="date-start"]', '2024-01-01');
      
      await page.click('[data-testid="date-end"]');
      await page.fill('[data-testid="date-end"]', '2024-03-31');
      
      // Apply filter
      await page.click('[data-testid="apply-filters"]');
      
      // Wait for data to refresh
      await page.waitForSelector('[data-testid="filtered-data-indicator"]');
      
      // Verify filter is applied
      await expect(page.locator('[data-testid="active-filters"]')).toContainText('Jan 1, 2024 - Mar 31, 2024');
    });

    test('should filter by company', async ({ page }) => {
      // Open company filter
      await page.click('[data-testid="company-filter"]');
      
      // Select a company
      await page.click('[data-testid="company-option-1"]');
      
      // Apply filter
      await page.click('[data-testid="apply-filters"]');
      
      // Wait for data to refresh
      await page.waitForSelector('[data-testid="filtered-data-indicator"]');
      
      // Verify only selected company data is shown
      const companyNames = await page.locator('[data-testid="company-name"]').allTextContents();
      expect(companyNames.every(name => name.includes('Company A'))).toBeTruthy();
    });

    test('should clear all filters', async ({ page }) => {
      // Apply some filters first
      await page.click('[data-testid="company-filter"]');
      await page.click('[data-testid="company-option-1"]');
      await page.click('[data-testid="apply-filters"]');
      
      // Clear filters
      await page.click('[data-testid="clear-filters"]');
      
      // Verify filters are cleared
      await expect(page.locator('[data-testid="active-filters"]')).not.toBeVisible();
    });
  });

  test.describe('Export Functionality', () => {
    test('should export data to PDF', async ({ page }) => {
      // Navigate to export section
      await page.click('[data-testid="export-button"]');
      
      // Select PDF export
      await page.click('[data-testid="export-pdf"]');
      
      // Wait for export to start
      await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
      
      // Wait for export to complete
      await page.waitForSelector('[data-testid="export-complete"]', { timeout: 30000 });
      
      // Verify download link is available
      await expect(page.locator('[data-testid="download-link"]')).toBeVisible();
    });

    test('should export data to Excel', async ({ page }) => {
      // Navigate to export section
      await page.click('[data-testid="export-button"]');
      
      // Select Excel export
      await page.click('[data-testid="export-excel"]');
      
      // Wait for export to start
      await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
      
      // Wait for export to complete
      await page.waitForSelector('[data-testid="export-complete"]', { timeout: 30000 });
      
      // Verify download link is available
      await expect(page.locator('[data-testid="download-link"]')).toBeVisible();
    });

    test('should export data to CSV', async ({ page }) => {
      // Navigate to export section
      await page.click('[data-testid="export-button"]');
      
      // Select CSV export
      await page.click('[data-testid="export-csv"]');
      
      // Wait for export to start
      await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
      
      // Wait for export to complete
      await page.waitForSelector('[data-testid="export-complete"]', { timeout: 30000 });
      
      // Verify download link is available
      await expect(page.locator('[data-testid="download-link"]')).toBeVisible();
    });

    test('should handle export errors', async ({ page }) => {
      // Mock export API error
      await page.route(`${API_BASE}/export/pdf`, route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Export failed'
          })
        });
      });

      // Try to export
      await page.click('[data-testid="export-button"]');
      await page.click('[data-testid="export-pdf"]');
      
      // Check error message
      await expect(page.locator('[data-testid="export-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-error"]')).toContainText('Export failed');
    });
  });

  test.describe('User Authentication and Permissions', () => {
    test('should require authentication to access dashboard', async ({ page }) => {
      // Clear authentication
      await page.evaluate(() => {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('user');
      });

      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*login.*/);
    });

    test('should display user-specific data based on permissions', async ({ page }) => {
      // Mock user with limited permissions
      await page.evaluate(() => {
        localStorage.setItem('authToken', 'mock-token');
        sessionStorage.setItem('user', JSON.stringify({
          id: 1,
          role: 'user',
          companyId: 1,
          permissions: ['read:revenue']
        }));
      });

      // Reload page
      await page.reload();
      
      // Check that commission data is not accessible
      await page.click('[data-testid="tab-commission"]');
      await expect(page.locator('[data-testid="permission-denied"]')).toBeVisible();
    });

    test('should allow admin users to access all features', async ({ page }) => {
      // Mock admin user
      await page.evaluate(() => {
        localStorage.setItem('authToken', 'mock-admin-token');
        sessionStorage.setItem('user', JSON.stringify({
          id: 1,
          role: 'admin',
          companyId: null,
          permissions: ['read:revenue', 'read:commission', 'admin:users', 'admin:settings']
        }));
      });

      // Reload page
      await page.reload();
      
      // Check that admin features are available
      await expect(page.locator('[data-testid="admin-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-management"]')).toBeVisible();
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should meet performance benchmarks', async ({ page }) => {
      // Measure page load time
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForSelector('[data-testid="revenue-dashboard"]');
      const loadTime = Date.now() - startTime;
      
      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should be keyboard accessible', async ({ page }) => {
      // Navigate using keyboard
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="tab-overview"]:focus')).toBeVisible();
      
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[data-testid="tab-revenue"]:focus')).toBeVisible();
      
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="tab-revenue"][aria-selected="true"]')).toBeVisible();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check ARIA attributes
      await expect(page.locator('[data-testid="revenue-chart"]')).toHaveAttribute('role', 'img');
      await expect(page.locator('[data-testid="revenue-chart"]')).toHaveAttribute('aria-label');
      
      await expect(page.locator('[data-testid="tab-overview"]')).toHaveAttribute('role', 'tab');
      await expect(page.locator('[data-testid="tab-overview"]')).toHaveAttribute('aria-selected');
    });

    test('should support screen readers', async ({ page }) => {
      // Check for screen reader text
      await expect(page.locator('[data-testid="sr-only"]')).toBeVisible();
      
      // Check for proper heading structure
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    test('should work in Chrome', async ({ page }) => {
      await expect(page.locator('[data-testid="revenue-dashboard"]')).toBeVisible();
    });

    test('should work in Firefox', async ({ page }) => {
      await expect(page.locator('[data-testid="revenue-dashboard"]')).toBeVisible();
    });

    test('should work in Safari', async ({ page }) => {
      await expect(page.locator('[data-testid="revenue-dashboard"]')).toBeVisible();
    });
  });
});
