import { test, expect } from '@playwright/test';

// Performance test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PERFORMANCE_THRESHOLDS = {
  PAGE_LOAD_TIME: 3000, // 3 seconds
  FIRST_CONTENTFUL_PAINT: 1500, // 1.5 seconds
  LARGEST_CONTENTFUL_PAINT: 2500, // 2.5 seconds
  CUMULATIVE_LAYOUT_SHIFT: 0.1, // 0.1
  FIRST_INPUT_DELAY: 100, // 100ms
  TIME_TO_INTERACTIVE: 3500, // 3.5 seconds
  MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
  API_RESPONSE_TIME: 1000, // 1 second
};

test.describe('Dashboard Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    await page.addInitScript(() => {
      window.performance.mark = window.performance.mark || (() => {});
      window.performance.measure = window.performance.measure || (() => {});
    });
  });

  test.describe('Page Load Performance', () => {
    test('should load dashboard within performance threshold', async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Wait for critical elements to load
      await page.waitForSelector('[data-testid="revenue-dashboard"]', { timeout: 10000 });
      await page.waitForSelector('[data-testid="revenue-summary"]', { timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      
      // Assert page load time
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD_TIME);
      
      // Log performance metrics
      console.log(`Dashboard load time: ${loadTime}ms`);
    });

    test('should meet Core Web Vitals thresholds', async ({ page }) => {
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      // Get performance metrics
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          // Wait for performance observer to collect metrics
          setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            const paint = performance.getEntriesByType('paint');
            
            const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
            const lcp = paint.find(entry => entry.name === 'largest-contentful-paint');
            
            resolve({
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
              loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
              firstContentfulPaint: fcp ? fcp.startTime : 0,
              largestContentfulPaint: lcp ? lcp.startTime : 0,
            });
          }, 1000);
        });
      });
      
      // Assert Core Web Vitals
      expect(metrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.FIRST_CONTENTFUL_PAINT);
      expect(metrics.largestContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGEST_CONTENTFUL_PAINT);
      
      console.log('Core Web Vitals:', metrics);
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      // Mock large dataset
      await page.route('**/api/revenue', async route => {
        const largeDataset = {
          success: true,
          data: {
            totalRevenue: 10000000,
            totalCommission: 1500000,
            totalPayments: 8500000,
            monthlyData: Array.from({ length: 1000 }, (_, i) => ({
              month: `2024-${String(i % 12 + 1).padStart(2, '0')}`,
              revenue: Math.random() * 100000,
              commission: Math.random() * 15000,
              payments: Math.random() * 85000,
            })),
            companyData: Array.from({ length: 500 }, (_, i) => ({
              companyId: i + 1,
              name: `Company ${i + 1}`,
              revenue: Math.random() * 1000000,
              commission: Math.random() * 150000,
            })),
            commissionData: Array.from({ length: 200 }, (_, i) => ({
              agentId: i + 1,
              name: `Agent ${i + 1}`,
              commission: Math.random() * 50000,
              sales: Math.random() * 500000,
            })),
          },
        };
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeDataset),
        });
      });

      const startTime = Date.now();
      
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Wait for data to load and render
      await page.waitForSelector('[data-testid="revenue-summary"]', { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should still load within reasonable time even with large dataset
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD_TIME * 2);
      
      console.log(`Large dataset load time: ${loadTime}ms`);
    });
  });

  test.describe('API Performance', () => {
    test('should handle API requests efficiently', async ({ page }) => {
      const responseTimes: number[] = [];
      
      // Monitor API response times
      page.on('response', async (response) => {
        if (response.url().includes('/api/')) {
          const timing = response.timing();
          if (timing) {
            responseTimes.push(timing.responseEnd - timing.requestStart);
          }
        }
      });

      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Wait for all API calls to complete
      await page.waitForLoadState('networkidle');
      
      // Calculate average response time
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      
      // Assert API performance
      expect(averageResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME);
      expect(responseTimes.length).toBeGreaterThan(0);
      
      console.log(`Average API response time: ${averageResponseTime}ms`);
      console.log(`Total API calls: ${responseTimes.length}`);
    });

    test('should handle concurrent API requests', async ({ page }) => {
      const concurrentRequests = 10;
      const requestPromises: Promise<any>[] = [];
      
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Make concurrent API requests
      for (let i = 0; i < concurrentRequests; i++) {
        requestPromises.push(
          page.evaluate(async () => {
            const start = performance.now();
            await fetch('/api/revenue');
            return performance.now() - start;
          })
        );
      }
      
      const responseTimes = await Promise.all(requestPromises);
      const averageTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      
      // Should handle concurrent requests efficiently
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME * 2);
      
      console.log(`Concurrent requests average time: ${averageTime}ms`);
    });
  });

  test.describe('Memory Usage', () => {
    test('should maintain reasonable memory usage', async ({ page }) => {
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Get memory usage
      const memoryInfo = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory;
        }
        return null;
      });
      
      if (memoryInfo) {
        // Check heap size
        expect(memoryInfo.usedJSHeapSize).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE);
        
        console.log('Memory usage:', {
          used: `${Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)}MB`,
          total: `${Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024)}MB`,
          limit: `${Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024)}MB`,
        });
      }
    });

    test('should not have memory leaks during navigation', async ({ page }) => {
      const memorySnapshots: number[] = [];
      
      // Navigate to dashboard multiple times
      for (let i = 0; i < 5; i++) {
        await page.goto(`${BASE_URL}/dashboard`);
        await page.waitForLoadState('networkidle');
        
        // Get memory usage
        const memoryInfo = await page.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize;
          }
          return null;
        });
        
        if (memoryInfo) {
          memorySnapshots.push(memoryInfo);
        }
        
        // Wait before next navigation
        await page.waitForTimeout(1000);
      }
      
      // Check for memory growth
      if (memorySnapshots.length > 1) {
        const firstSnapshot = memorySnapshots[0];
        const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
        const memoryGrowth = lastSnapshot - firstSnapshot;
        
        // Memory growth should be minimal (less than 10MB)
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
        
        console.log('Memory growth:', `${Math.round(memoryGrowth / 1024 / 1024)}MB`);
      }
    });
  });

  test.describe('Rendering Performance', () => {
    test('should render charts efficiently', async ({ page }) => {
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Wait for initial load
      await page.waitForLoadState('networkidle');
      
      // Navigate to revenue tab to trigger chart rendering
      await page.click('[data-testid="tab-revenue"]');
      
      const renderStart = Date.now();
      
      // Wait for charts to render
      await page.waitForSelector('[data-testid="revenue-chart"]', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      const renderTime = Date.now() - renderStart;
      
      // Chart rendering should be fast
      expect(renderTime).toBeLessThan(2000);
      
      console.log(`Chart render time: ${renderTime}ms`);
    });

    test('should handle rapid filter changes', async ({ page }) => {
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      
      const filterChanges = 10;
      const responseTimes: number[] = [];
      
      // Rapidly change filters
      for (let i = 0; i < filterChanges; i++) {
        const startTime = Date.now();
        
        // Change date filter
        await page.click('[data-testid="date-range-picker"]');
        await page.fill('[data-testid="date-start"]', `2024-${String(i % 12 + 1).padStart(2, '0')}-01`);
        await page.click('[data-testid="apply-filters"]');
        
        // Wait for data to update
        await page.waitForSelector('[data-testid="filtered-data-indicator"]', { timeout: 5000 });
        
        responseTimes.push(Date.now() - startTime);
        
        // Small delay between changes
        await page.waitForTimeout(100);
      }
      
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      
      // Filter changes should be responsive
      expect(averageResponseTime).toBeLessThan(1000);
      
      console.log(`Average filter change time: ${averageResponseTime}ms`);
    });
  });

  test.describe('Export Performance', () => {
    test('should handle export requests efficiently', async ({ page }) => {
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      
      // Start export
      await page.click('[data-testid="export-button"]');
      await page.click('[data-testid="export-pdf"]');
      
      const exportStart = Date.now();
      
      // Wait for export to complete
      await page.waitForSelector('[data-testid="export-complete"]', { timeout: 30000 });
      
      const exportTime = Date.now() - exportStart;
      
      // Export should complete within reasonable time
      expect(exportTime).toBeLessThan(30000);
      
      console.log(`Export completion time: ${exportTime}ms`);
    });

    test('should handle large data exports', async ({ page }) => {
      // Mock large dataset for export
      await page.route('**/api/revenue', async route => {
        const largeDataset = {
          success: true,
          data: {
            totalRevenue: 10000000,
            monthlyData: Array.from({ length: 5000 }, (_, i) => ({
              month: `2024-${String(i % 12 + 1).padStart(2, '0')}`,
              revenue: Math.random() * 100000,
              commission: Math.random() * 15000,
              payments: Math.random() * 85000,
            })),
          },
        };
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeDataset),
        });
      });

      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      
      // Start export
      await page.click('[data-testid="export-button"]');
      await page.click('[data-testid="export-excel"]');
      
      const exportStart = Date.now();
      
      // Wait for export to complete
      await page.waitForSelector('[data-testid="export-complete"]', { timeout: 60000 });
      
      const exportTime = Date.now() - exportStart;
      
      // Large exports should complete within extended time
      expect(exportTime).toBeLessThan(60000);
      
      console.log(`Large export completion time: ${exportTime}ms`);
    });
  });

  test.describe('Network Performance', () => {
    test('should handle slow network conditions', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        await route.continue();
      });

      const startTime = Date.now();
      
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Wait for critical elements
      await page.waitForSelector('[data-testid="revenue-dashboard"]', { timeout: 30000 });
      
      const loadTime = Date.now() - startTime;
      
      // Should still load within extended threshold
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD_TIME * 3);
      
      console.log(`Slow network load time: ${loadTime}ms`);
    });

    test('should handle network failures gracefully', async ({ page }) => {
      // Simulate network failures
      await page.route('**/api/revenue', route => {
        route.abort('failed');
      });

      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should show error state
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      
      // Should provide retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });
  });
});
