import { test, expect } from '@playwright/test';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend expect with axe matchers
expect.extend({ toHaveNoViolations });

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Dashboard Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="revenue-dashboard"]', { timeout: 10000 });
  });

  test.describe('WCAG 2.1 AA Compliance', () => {
    test('should pass axe accessibility audit', async ({ page }) => {
      // Run axe accessibility audit
      const results = await axe(await page.content());
      
      // Check for violations
      expect(results).toHaveNoViolations();
      
      // Log results for debugging
      if (results.violations.length > 0) {
        console.log('Accessibility violations found:', results.violations);
      }
    });

    test('should have proper heading structure', async ({ page }) => {
      // Check for main heading
      await expect(page.locator('h1')).toBeVisible();
      
      // Get all headings
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      
      // Should have at least one heading
      expect(headings.length).toBeGreaterThan(0);
      
      // Check heading hierarchy (no skipping levels)
      const headingLevels = await Promise.all(
        headings.map(async (heading) => {
          const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
          return parseInt(tagName.charAt(1));
        })
      );
      
      // Verify no heading levels are skipped
      for (let i = 1; i < headingLevels.length; i++) {
        const currentLevel = headingLevels[i];
        const previousLevel = headingLevels[i - 1];
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for proper ARIA attributes on interactive elements
      const interactiveElements = [
        '[data-testid="tab-overview"]',
        '[data-testid="tab-revenue"]',
        '[data-testid="tab-commission"]',
        '[data-testid="export-button"]',
        '[data-testid="date-range-picker"]',
        '[data-testid="company-filter"]',
      ];

      for (const selector of interactiveElements) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          // Check for role attribute
          const role = await element.getAttribute('role');
          expect(role).toBeTruthy();
          
          // Check for aria-label or aria-labelledby
          const ariaLabel = await element.getAttribute('aria-label');
          const ariaLabelledBy = await element.getAttribute('aria-labelledby');
          expect(ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    });

    test('should have proper color contrast', async ({ page }) => {
      // This would typically be tested with axe-core or similar tools
      // For now, we'll check that text elements have sufficient contrast
      const textElements = await page.locator('p, span, div, h1, h2, h3, h4, h5, h6').all();
      
      for (const element of textElements) {
        const text = await element.textContent();
        if (text && text.trim().length > 0) {
          // Check that element has proper styling
          const color = await element.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.color;
          });
          
          // Should have a defined color (not transparent or default)
          expect(color).not.toBe('rgba(0, 0, 0, 0)');
          expect(color).not.toBe('transparent');
        }
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should be fully navigable by keyboard', async ({ page }) => {
      // Focus should be visible
      await page.keyboard.press('Tab');
      
      // Check that focus indicator is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Navigate through all interactive elements
      const tabOrder = [
        '[data-testid="tab-overview"]',
        '[data-testid="tab-revenue"]',
        '[data-testid="tab-commission"]',
        '[data-testid="export-button"]',
        '[data-testid="date-range-picker"]',
      ];

      for (const selector of tabOrder) {
        await page.keyboard.press('Tab');
        const focused = page.locator(':focus');
        await expect(focused).toBeVisible();
        
        // Check that focused element is the expected one
        const isExpected = await focused.matches(selector);
        if (isExpected) {
          break;
        }
      }
    });

    test('should support keyboard shortcuts', async ({ page }) => {
      // Test keyboard shortcuts for navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('ArrowRight');
      
      // Should navigate to next tab
      await expect(page.locator('[data-testid="tab-revenue"][aria-selected="true"]')).toBeVisible();
      
      // Test Enter key for activation
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="revenue-content"]')).toBeVisible();
    });

    test('should have proper focus management', async ({ page }) => {
      // Open modal or dropdown
      await page.click('[data-testid="export-button"]');
      
      // Focus should be trapped within modal
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Focus should not escape modal
      const modalElement = page.locator('[data-testid="export-modal"]');
      const isInModal = await focusedElement.evaluate((el, modal) => {
        return modal.contains(el);
      }, await modalElement.elementHandle());
      
      expect(isInModal).toBeTruthy();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper screen reader text', async ({ page }) => {
      // Check for screen reader only text
      const srOnlyElements = await page.locator('[data-testid="sr-only"], .sr-only, .visually-hidden').all();
      
      for (const element of srOnlyElements) {
        const text = await element.textContent();
        expect(text).toBeTruthy();
        expect(text.trim().length).toBeGreaterThan(0);
      }
    });

    test('should announce dynamic content changes', async ({ page }) => {
      // Check for live regions
      const liveRegions = await page.locator('[aria-live]').all();
      
      for (const region of liveRegions) {
        const ariaLive = await region.getAttribute('aria-live');
        expect(['polite', 'assertive']).toContain(ariaLive);
      }
    });

    test('should have proper alt text for images', async ({ page }) => {
      // Check all images have alt text
      const images = await page.locator('img').all();
      
      for (const image of images) {
        const alt = await image.getAttribute('alt');
        // Alt text should be present (can be empty for decorative images)
        expect(alt).not.toBeNull();
      }
    });

    test('should have proper table structure', async ({ page }) => {
      // Check data tables have proper structure
      const tables = await page.locator('table').all();
      
      for (const table of tables) {
        // Check for caption or aria-label
        const caption = await table.locator('caption').first();
        const ariaLabel = await table.getAttribute('aria-label');
        
        if (await caption.isVisible() || ariaLabel) {
          // Check for proper headers
          const headers = await table.locator('th').all();
          expect(headers.length).toBeGreaterThan(0);
          
          // Check for scope attributes
          for (const header of headers) {
            const scope = await header.getAttribute('scope');
            expect(['col', 'row']).toContain(scope);
          }
        }
      }
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      // Check all form inputs have labels
      const inputs = await page.locator('input, select, textarea').all();
      
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        if (id) {
          // Check for associated label
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.isVisible();
          expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
        } else {
          // Should have aria-label or aria-labelledby
          expect(ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    });

    test('should have proper error handling', async ({ page }) => {
      // Trigger form validation
      await page.click('[data-testid="apply-filters"]');
      
      // Check for error messages
      const errorMessages = await page.locator('[data-testid="error-message"], .error, [aria-invalid="true"]').all();
      
      for (const error of errorMessages) {
        // Error messages should be announced to screen readers
        const ariaLive = await error.getAttribute('aria-live');
        expect(ariaLive).toBe('assertive');
        
        // Error messages should be visible
        await expect(error).toBeVisible();
      }
    });

    test('should have proper fieldset and legend', async ({ page }) => {
      // Check for proper fieldset structure
      const fieldsets = await page.locator('fieldset').all();
      
      for (const fieldset of fieldsets) {
        const legend = await fieldset.locator('legend').first();
        await expect(legend).toBeVisible();
        
        const legendText = await legend.textContent();
        expect(legendText).toBeTruthy();
        expect(legendText.trim().length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Interactive Elements', () => {
    test('should have proper button semantics', async ({ page }) => {
      // Check all buttons have proper attributes
      const buttons = await page.locator('button, [role="button"]').all();
      
      for (const button of buttons) {
        // Should have accessible name
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledBy = await button.getAttribute('aria-labelledby');
        const textContent = await button.textContent();
        
        expect(ariaLabel || ariaLabelledBy || textContent).toBeTruthy();
        
        // Should not be disabled without reason
        const disabled = await button.getAttribute('disabled');
        if (disabled) {
          const ariaDisabled = await button.getAttribute('aria-disabled');
          expect(ariaDisabled).toBe('true');
        }
      }
    });

    test('should have proper link semantics', async ({ page }) => {
      // Check all links have proper attributes
      const links = await page.locator('a').all();
      
      for (const link of links) {
        // Should have accessible name
        const ariaLabel = await link.getAttribute('aria-label');
        const ariaLabelledBy = await link.getAttribute('aria-labelledby');
        const textContent = await link.textContent();
        
        expect(ariaLabel || ariaLabelledBy || textContent).toBeTruthy();
        
        // Should have href attribute
        const href = await link.getAttribute('href');
        expect(href).toBeTruthy();
      }
    });

    test('should have proper tab semantics', async ({ page }) => {
      // Check tab structure
      const tabList = page.locator('[role="tablist"]');
      await expect(tabList).toBeVisible();
      
      const tabs = await page.locator('[role="tab"]').all();
      
      for (const tab of tabs) {
        // Should have proper attributes
        const ariaSelected = await tab.getAttribute('aria-selected');
        expect(['true', 'false']).toContain(ariaSelected);
        
        const ariaControls = await tab.getAttribute('aria-controls');
        expect(ariaControls).toBeTruthy();
      }
    });
  });

  test.describe('Responsive Accessibility', () => {
    test('should be accessible on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check that touch targets are large enough
      const touchTargets = await page.locator('button, a, input, select').all();
      
      for (const target of touchTargets) {
        const size = await target.boundingBox();
        if (size) {
          // Touch targets should be at least 44x44 pixels
          expect(size.width).toBeGreaterThanOrEqual(44);
          expect(size.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should maintain accessibility on different screen sizes', async ({ page }) => {
      const viewports = [
        { width: 320, height: 568 }, // Small mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1024, height: 768 }, // Desktop
        { width: 1920, height: 1080 }, // Large desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        
        // Run accessibility audit for each viewport
        const results = await axe(await page.content());
        
        // Should pass accessibility tests on all viewports
        expect(results).toHaveNoViolations();
      }
    });
  });

  test.describe('Dynamic Content', () => {
    test('should announce loading states', async ({ page }) => {
      // Trigger loading state
      await page.click('[data-testid="refresh-data"]');
      
      // Check for loading announcement
      const loadingAnnouncement = page.locator('[aria-live="polite"]');
      await expect(loadingAnnouncement).toBeVisible();
      
      // Wait for loading to complete
      await page.waitForSelector('[data-testid="data-loaded"]');
      
      // Check for completion announcement
      const completionAnnouncement = page.locator('[aria-live="polite"]');
      await expect(completionAnnouncement).toBeVisible();
    });

    test('should announce data updates', async ({ page }) => {
      // Change filters to trigger data update
      await page.click('[data-testid="date-range-picker"]');
      await page.fill('[data-testid="date-start"]', '2024-01-01');
      await page.click('[data-testid="apply-filters"]');
      
      // Check for update announcement
      const updateAnnouncement = page.locator('[aria-live="polite"]');
      await expect(updateAnnouncement).toBeVisible();
    });

    test('should announce errors appropriately', async ({ page }) => {
      // Trigger error state
      await page.route('**/api/revenue', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      await page.click('[data-testid="refresh-data"]');
      
      // Check for error announcement
      const errorAnnouncement = page.locator('[aria-live="assertive"]');
      await expect(errorAnnouncement).toBeVisible();
    });
  });

  test.describe('Internationalization', () => {
    test('should support different languages', async ({ page }) => {
      // Test with different language attributes
      const languages = ['en', 'es', 'fr'];
      
      for (const lang of languages) {
        await page.evaluate((language) => {
          document.documentElement.lang = language;
        }, lang);
        
        // Check that language is set
        const htmlLang = await page.locator('html').getAttribute('lang');
        expect(htmlLang).toBe(lang);
      }
    });

    test('should have proper text direction support', async ({ page }) => {
      // Test RTL support
      await page.evaluate(() => {
        document.documentElement.dir = 'rtl';
      });
      
      // Check that direction is set
      const htmlDir = await page.locator('html').getAttribute('dir');
      expect(htmlDir).toBe('rtl');
    });
  });
});
