import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardLayout from '../../src/components/DashboardLayout';

// Mock child components
jest.mock('../../src/components/dashboard/FilterPanel', () => {
  return function MockFilterPanel() {
    return <div data-testid="filter-panel">Filter Panel</div>;
  };
});

jest.mock('../../src/components/dashboard/RevenueAnalysisTab', () => {
  return function MockRevenueAnalysisTab() {
    return <div data-testid="revenue-analysis-tab">Revenue Analysis Tab</div>;
  };
});

jest.mock('../../src/components/dashboard/CommissionAnalysisTab', () => {
  return function MockCommissionAnalysisTab() {
    return <div data-testid="commission-analysis-tab">Commission Analysis Tab</div>;
  };
});

describe('DashboardLayout', () => {
  const defaultProps = {
    children: <div>Dashboard Content</div>,
    title: 'Test Dashboard',
    subtitle: 'Test Subtitle'
  };

  describe('Component Rendering', () => {
    it('should render the layout with correct title and subtitle', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    });

    it('should render the main content area', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    it('should render the header with navigation', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render the main content wrapper', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Navigation Structure', () => {
    it('should render breadcrumb navigation', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('breadcrumb-navigation')).toBeInTheDocument();
    });

    it('should render user menu in header', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });

    it('should render notification bell', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render mobile menu button on small screens', () => {
      // Mock window.innerWidth for mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('mobile-menu-button')).toBeInTheDocument();
    });

    it('should hide mobile menu button on large screens', () => {
      // Mock window.innerWidth for desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      expect(screen.queryByTestId('mobile-menu-button')).not.toBeInTheDocument();
    });

    it('should toggle mobile menu when button is clicked', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const mobileMenuButton = screen.getByTestId('mobile-menu-button');
      const mobileMenu = screen.getByTestId('mobile-menu');

      expect(mobileMenu).not.toHaveClass('open');

      fireEvent.click(mobileMenuButton);

      expect(mobileMenu).toHaveClass('open');
    });

    it('should close mobile menu when clicking outside', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const mobileMenuButton = screen.getByTestId('mobile-menu-button');
      const mobileMenu = screen.getByTestId('mobile-menu');

      fireEvent.click(mobileMenuButton);
      expect(mobileMenu).toHaveClass('open');

      fireEvent.click(document.body);
      expect(mobileMenu).not.toHaveClass('open');
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      expect(screen.getByLabelText('Main navigation')).toBeInTheDocument();
      expect(screen.getByLabelText('User menu')).toBeInTheDocument();
      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const userMenu = screen.getByTestId('user-menu');
      userMenu.focus();
      
      fireEvent.keyDown(userMenu, { key: 'Enter' });
      
      expect(screen.getByTestId('user-dropdown')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Test Dashboard');

      const subtitle = screen.getByRole('heading', { level: 2 });
      expect(subtitle).toHaveTextContent('Test Subtitle');
    });

    it('should have skip to main content link', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('should focus main content when skip link is clicked', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const skipLink = screen.getByText('Skip to main content');
      const mainContent = screen.getByRole('main');

      fireEvent.click(skipLink);

      expect(mainContent).toHaveFocus();
    });
  });

  describe('User Menu Functionality', () => {
    it('should toggle user dropdown when user menu is clicked', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const userMenu = screen.getByTestId('user-menu');
      
      fireEvent.click(userMenu);
      expect(screen.getByTestId('user-dropdown')).toBeInTheDocument();

      fireEvent.click(userMenu);
      expect(screen.queryByTestId('user-dropdown')).not.toBeInTheDocument();
    });

    it('should close user dropdown when clicking outside', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const userMenu = screen.getByTestId('user-menu');
      
      fireEvent.click(userMenu);
      expect(screen.getByTestId('user-dropdown')).toBeInTheDocument();

      fireEvent.click(document.body);
      expect(screen.queryByTestId('user-dropdown')).not.toBeInTheDocument();
    });

    it('should render user profile information', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const userMenu = screen.getByTestId('user-menu');
      fireEvent.click(userMenu);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    it('should render user menu options', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const userMenu = screen.getByTestId('user-menu');
      fireEvent.click(userMenu);

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  describe('Notification System', () => {
    it('should show notification count when notifications exist', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const notificationBell = screen.getByTestId('notification-bell');
      expect(notificationBell).toHaveAttribute('data-count', '3');
    });

    it('should toggle notification panel when bell is clicked', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const notificationBell = screen.getByTestId('notification-bell');
      
      fireEvent.click(notificationBell);
      expect(screen.getByTestId('notification-panel')).toBeInTheDocument();

      fireEvent.click(notificationBell);
      expect(screen.queryByTestId('notification-panel')).not.toBeInTheDocument();
    });

    it('should render notification items', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const notificationBell = screen.getByTestId('notification-bell');
      fireEvent.click(notificationBell);

      expect(screen.getByText('New revenue data available')).toBeInTheDocument();
      expect(screen.getByText('Export completed successfully')).toBeInTheDocument();
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('should render breadcrumb items', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Revenue Analytics')).toBeInTheDocument();
    });

    it('should make breadcrumb items clickable', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const dashboardLink = screen.getByText('Dashboard');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    it('should show current page as non-clickable', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const currentPage = screen.getByText('Revenue Analytics');
      expect(currentPage).not.toHaveAttribute('href');
    });
  });

  describe('Layout Structure', () => {
    it('should have proper CSS classes for layout', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const layout = screen.getByTestId('dashboard-layout');
      expect(layout).toHaveClass('dashboard-layout');
    });

    it('should have header with proper styling', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('dashboard-header');
    });

    it('should have main content with proper styling', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveClass('dashboard-main');
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component errors gracefully', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps}>
            <ErrorComponent />
          </DashboardLayout>
        </MemoryRouter>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Please try refreshing the page')).toBeInTheDocument();
    });

    it('should provide error recovery options', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps}>
            <ErrorComponent />
          </DashboardLayout>
        </MemoryRouter>
      );

      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when content is loading', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} isLoading={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId('layout-loading-spinner')).toBeInTheDocument();
    });

    it('should hide loading spinner when content is loaded', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} isLoading={false} />
        </MemoryRouter>
      );

      expect(screen.queryByTestId('layout-loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('Theme Support', () => {
    it('should apply light theme by default', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} />
        </MemoryRouter>
      );

      const layout = screen.getByTestId('dashboard-layout');
      expect(layout).toHaveClass('theme-light');
    });

    it('should apply dark theme when specified', () => {
      render(
        <MemoryRouter>
          <DashboardLayout {...defaultProps} theme="dark" />
        </MemoryRouter>
      );

      const layout = screen.getByTestId('dashboard-layout');
      expect(layout).toHaveClass('theme-dark');
    });
  });
});
