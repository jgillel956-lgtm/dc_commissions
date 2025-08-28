import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FilterCountBadge from './FilterCountBadge';
import { ThemeProvider } from '../../contexts/ThemeContext';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('FilterCountBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when count is 0', () => {
      renderWithTheme(
        <FilterCountBadge count={0} />
      );

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should render count correctly', () => {
      renderWithTheme(
        <FilterCountBadge count={5} />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should render filter icon', () => {
      renderWithTheme(
        <FilterCountBadge count={3} />
      );

      // Check for the filter icon (Lucide React icon)
      const icon = screen.getByText('3').previousElementSibling;
      expect(icon).toHaveClass('h-4', 'w-4');
    });
  });

  describe('Sizes', () => {
    it('should apply small size classes', () => {
      renderWithTheme(
        <FilterCountBadge count={2} size="sm" />
      );

      const badge = screen.getByText('2').closest('div');
      expect(badge).toHaveClass('px-2', 'py-1', 'text-xs');
    });

    it('should apply medium size classes (default)', () => {
      renderWithTheme(
        <FilterCountBadge count={2} />
      );

      const badge = screen.getByText('2').closest('div');
      expect(badge).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('should apply large size classes', () => {
      renderWithTheme(
        <FilterCountBadge count={2} size="lg" />
      );

      const badge = screen.getByText('2').closest('div');
      expect(badge).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('should apply correct icon sizes for different badge sizes', () => {
      const { rerender } = renderWithTheme(
        <FilterCountBadge count={2} size="sm" />
      );

      let icon = screen.getByText('2').previousElementSibling;
      expect(icon).toHaveClass('h-3', 'w-3');

      rerender(
        <ThemeProvider>
          <FilterCountBadge count={2} size="md" />
        </ThemeProvider>
      );

      icon = screen.getByText('2').previousElementSibling;
      expect(icon).toHaveClass('h-4', 'w-4');

      rerender(
        <ThemeProvider>
          <FilterCountBadge count={2} size="lg" />
        </ThemeProvider>
      );

      icon = screen.getByText('2').previousElementSibling;
      expect(icon).toHaveClass('h-5', 'w-5');
    });
  });

  describe('Variants', () => {
    it('should apply default variant classes', () => {
      renderWithTheme(
        <FilterCountBadge count={2} variant="default" />
      );

      const badge = screen.getByText('2').closest('div');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-700');
    });

    it('should apply primary variant classes', () => {
      renderWithTheme(
        <FilterCountBadge count={2} variant="primary" />
      );

      const badge = screen.getByText('2').closest('div');
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('should apply secondary variant classes', () => {
      renderWithTheme(
        <FilterCountBadge count={2} variant="secondary" />
      );

      const badge = screen.getByText('2').closest('div');
      expect(badge).toHaveClass('bg-purple-100', 'text-purple-700');
    });
  });

  describe('User Interactions', () => {
    it('should call onClick when clicked', () => {
      const onClick = jest.fn();
      renderWithTheme(
        <FilterCountBadge count={3} onClick={onClick} />
      );

      const badge = screen.getByText('3').closest('div');
      fireEvent.click(badge!);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when not provided', () => {
      renderWithTheme(
        <FilterCountBadge count={3} />
      );

      const badge = screen.getByText('3').closest('div');
      fireEvent.click(badge!);

      // Should not throw error
      expect(badge).toBeInTheDocument();
    });

    it('should handle keyboard navigation', () => {
      const onClick = jest.fn();
      renderWithTheme(
        <FilterCountBadge count={3} onClick={onClick} />
      );

      const badge = screen.getByText('3').closest('div');
      
      // Test Enter key
      fireEvent.keyDown(badge!, { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(1);

      // Test Space key
      fireEvent.keyDown(badge!, { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(2);

      // Test other key (should not trigger)
      fireEvent.keyDown(badge!, { key: 'Tab' });
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('should have proper accessibility attributes when clickable', () => {
      const onClick = jest.fn();
      renderWithTheme(
        <FilterCountBadge count={3} onClick={onClick} />
      );

      const badge = screen.getByText('3').closest('div');
      expect(badge).toHaveAttribute('role', 'button');
      expect(badge).toHaveAttribute('tabIndex', '0');
    });

    it('should not have accessibility attributes when not clickable', () => {
      renderWithTheme(
        <FilterCountBadge count={3} />
      );

      const badge = screen.getByText('3').closest('div');
      expect(badge).not.toHaveAttribute('role');
      expect(badge).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Styling and Layout', () => {
    it('should apply custom className', () => {
      renderWithTheme(
        <FilterCountBadge count={2} className="custom-class" />
      );

      const badge = screen.getByText('2').closest('div');
      expect(badge).toHaveClass('custom-class');
    });

    it('should apply interactive styles when clickable', () => {
      const onClick = jest.fn();
      renderWithTheme(
        <FilterCountBadge count={2} onClick={onClick} />
      );

      const badge = screen.getByText('2').closest('div');
      expect(badge).toHaveClass('cursor-pointer', 'hover:shadow-sm', 'active:scale-95');
    });

    it('should not apply interactive styles when not clickable', () => {
      renderWithTheme(
        <FilterCountBadge count={2} />
      );

      const badge = screen.getByText('2').closest('div');
      expect(badge).not.toHaveClass('cursor-pointer', 'hover:shadow-sm', 'active:scale-95');
    });

    it('should have proper flex layout', () => {
      renderWithTheme(
        <FilterCountBadge count={2} />
      );

      const badge = screen.getByText('2').closest('div');
      expect(badge).toHaveClass('inline-flex', 'items-center', 'gap-1.5');
    });
  });

  describe('Edge Cases', () => {
    it('should handle large numbers', () => {
      renderWithTheme(
        <FilterCountBadge count={999} />
      );

      expect(screen.getByText('999')).toBeInTheDocument();
    });

    it('should handle single digit numbers', () => {
      renderWithTheme(
        <FilterCountBadge count={1} />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should handle negative numbers (though this shouldn\'t happen in practice)', () => {
      renderWithTheme(
        <FilterCountBadge count={-5} />
      );

      expect(screen.getByText('-5')).toBeInTheDocument();
    });
  });
});

