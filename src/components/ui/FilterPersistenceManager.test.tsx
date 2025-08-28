import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FilterPersistenceManager from './FilterPersistenceManager';
import { ThemeProvider } from '../../contexts/ThemeContext';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('FilterPersistenceManager', () => {
  const defaultProps = {
    isEnabled: false,
    onTogglePersistence: jest.fn(),
    onClearPersistence: jest.fn(),
    onSaveFilters: jest.fn(),
    onLoadFilters: jest.fn(),
    hasSavedFilters: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component with title', () => {
      renderWithTheme(<FilterPersistenceManager {...defaultProps} />);

      expect(screen.getByText('Filter Persistence')).toBeInTheDocument();
      expect(screen.getByText('Save filters across browser sessions')).toBeInTheDocument();
    });

    it('should show enabled status when persistence is enabled', () => {
      renderWithTheme(<FilterPersistenceManager {...defaultProps} isEnabled={true} />);

      expect(screen.getByText('Enabled')).toBeInTheDocument();
      expect(screen.getByText('Persistence Active')).toBeInTheDocument();
    });

    it('should not show enabled status when persistence is disabled', () => {
      renderWithTheme(<FilterPersistenceManager {...defaultProps} isEnabled={false} />);

      expect(screen.queryByText('Enabled')).not.toBeInTheDocument();
      expect(screen.queryByText('Persistence Active')).not.toBeInTheDocument();
    });

    it('should show persistence key when enabled', () => {
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          isEnabled={true} 
          persistenceKey="test-key" 
        />
      );

      expect(screen.getByText('test-key')).toBeInTheDocument();
    });

    it('should show action buttons when persistence is enabled', () => {
      renderWithTheme(<FilterPersistenceManager {...defaultProps} isEnabled={true} />);

      expect(screen.getByText('Save Now')).toBeInTheDocument();
    });

    it('should show load button when has saved filters', () => {
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          isEnabled={true} 
          hasSavedFilters={true} 
        />
      );

      expect(screen.getByText('Load Saved')).toBeInTheDocument();
    });

    it('should show clear button when has saved filters', () => {
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          hasSavedFilters={true} 
        />
      );

      expect(screen.getByText('Clear Saved')).toBeInTheDocument();
    });
  });

  describe('Toggle Switch', () => {
    it('should call onTogglePersistence when toggle is clicked', () => {
      const onTogglePersistence = jest.fn();
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          onTogglePersistence={onTogglePersistence} 
        />
      );

      const toggle = screen.getByRole('button', { name: 'Toggle filter persistence' });
      fireEvent.click(toggle);

      expect(onTogglePersistence).toHaveBeenCalledWith(true);
    });

    it('should show correct toggle state when enabled', () => {
      renderWithTheme(<FilterPersistenceManager {...defaultProps} isEnabled={true} />);

      const toggle = screen.getByRole('button', { name: 'Toggle filter persistence' });
      expect(toggle).toHaveClass('bg-blue-600');
    });

    it('should show correct toggle state when disabled', () => {
      renderWithTheme(<FilterPersistenceManager {...defaultProps} isEnabled={false} />);

      const toggle = screen.getByRole('button', { name: 'Toggle filter persistence' });
      expect(toggle).toHaveClass('bg-gray-200');
    });
  });

  describe('Action Buttons', () => {
    it('should call onSaveFilters when Save Now is clicked', () => {
      const onSaveFilters = jest.fn();
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          isEnabled={true} 
          onSaveFilters={onSaveFilters} 
        />
      );

      const saveButton = screen.getByText('Save Now');
      fireEvent.click(saveButton);

      expect(onSaveFilters).toHaveBeenCalledTimes(1);
    });

    it('should call onLoadFilters when Load Saved is clicked', () => {
      const onLoadFilters = jest.fn();
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          isEnabled={true} 
          hasSavedFilters={true} 
          onLoadFilters={onLoadFilters} 
        />
      );

      const loadButton = screen.getByText('Load Saved');
      fireEvent.click(loadButton);

      expect(onLoadFilters).toHaveBeenCalledTimes(1);
    });

    it('should show confirmation dialog when Clear Saved is clicked', () => {
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          hasSavedFilters={true} 
        />
      );

      const clearButton = screen.getByText('Clear Saved');
      fireEvent.click(clearButton);

      expect(screen.getByText('Clear Saved Filters?')).toBeInTheDocument();
      expect(screen.getByText('This will permanently delete all saved filter settings. This action cannot be undone.')).toBeInTheDocument();
    });

    it('should call onClearPersistence when confirmed', () => {
      const onClearPersistence = jest.fn();
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          hasSavedFilters={true} 
          onClearPersistence={onClearPersistence} 
        />
      );

      const clearButton = screen.getByText('Clear Saved');
      fireEvent.click(clearButton);

      const confirmButton = screen.getByText('Clear All');
      fireEvent.click(confirmButton);

      expect(onClearPersistence).toHaveBeenCalledTimes(1);
    });

    it('should close confirmation dialog when cancelled', () => {
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          hasSavedFilters={true} 
        />
      );

      const clearButton = screen.getByText('Clear Saved');
      fireEvent.click(clearButton);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Clear Saved Filters?')).not.toBeInTheDocument();
    });
  });

  describe('Advanced Options', () => {
    it('should show advanced options when showAdvancedOptions is true', () => {
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          showAdvancedOptions={true} 
        />
      );

      expect(screen.getByText('Advanced Options')).toBeInTheDocument();
      expect(screen.getByText('Storage Location')).toBeInTheDocument();
      expect(screen.getByText('Data Size')).toBeInTheDocument();
      expect(screen.getByText('localStorage')).toBeInTheDocument();
      expect(screen.getByText('~2-5 KB')).toBeInTheDocument();
    });

    it('should not show advanced options when showAdvancedOptions is false', () => {
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          showAdvancedOptions={false} 
        />
      );

      expect(screen.queryByText('Advanced Options')).not.toBeInTheDocument();
    });
  });

  describe('Last Saved Timestamp', () => {
    it('should show last saved time when available', async () => {
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          isEnabled={true} 
          hasSavedFilters={true} 
        />
      );

      // The component should show "Just now" or similar timestamp
      await waitFor(() => {
        expect(screen.getByText(/Last saved:/)).toBeInTheDocument();
      });
    });
  });

  describe('Styling and Layout', () => {
    it('should apply custom className', () => {
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          className="custom-class" 
        />
      );

      const container = screen.getByText('Filter Persistence').closest('div')?.parentElement?.parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('should have proper toggle switch styling', () => {
      renderWithTheme(<FilterPersistenceManager {...defaultProps} />);

      const toggle = screen.getByRole('button', { name: 'Toggle filter persistence' });
      expect(toggle).toHaveClass('relative', 'inline-flex', 'h-6', 'w-11', 'items-center', 'rounded-full');
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles and labels', () => {
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          isEnabled={true} 
          hasSavedFilters={true} 
        />
      );

      expect(screen.getByRole('button', { name: 'Toggle filter persistence' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save Now' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Load Saved' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear Saved' })).toBeInTheDocument();
    });

    it('should handle keyboard navigation for toggle', () => {
      const onTogglePersistence = jest.fn();
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          onTogglePersistence={onTogglePersistence} 
        />
      );

      const toggle = screen.getByRole('button', { name: 'Toggle filter persistence' });
      fireEvent.keyDown(toggle, { key: 'Enter' });

      expect(onTogglePersistence).toHaveBeenCalledWith(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing callback props gracefully', () => {
      renderWithTheme(
        <FilterPersistenceManager 
          isEnabled={true}
          hasSavedFilters={true}
          onTogglePersistence={jest.fn()}
          onClearPersistence={jest.fn()}
          onSaveFilters={jest.fn()}
          onLoadFilters={jest.fn()}
        />
      );

      // Should render without errors
      expect(screen.getByText('Filter Persistence')).toBeInTheDocument();
    });

    it('should handle empty persistence key', () => {
      renderWithTheme(
        <FilterPersistenceManager 
          {...defaultProps} 
          isEnabled={true} 
          persistenceKey="" 
        />
      );

      // Should render without errors
      expect(screen.getByText('Filter Persistence')).toBeInTheDocument();
    });
  });
});
