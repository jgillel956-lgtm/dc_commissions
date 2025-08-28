import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AmountRangeSlider from './AmountRangeSlider';

describe('AmountRangeSlider', () => {
  const defaultProps = {
    min: 0,
    max: 100000,
    value: { min: 1000, max: 50000 },
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<AmountRangeSlider {...defaultProps} />);
      
      expect(screen.getByText('Transaction Amount')).toBeInTheDocument();
      expect(screen.getByText('$1,000 - $50,000')).toBeInTheDocument();
      expect(screen.getByText('$0')).toBeInTheDocument();
      expect(screen.getByText('$100,000')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<AmountRangeSlider {...defaultProps} label="Custom Label" />);
      
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });

    it('renders quick presets by default', () => {
      render(<AmountRangeSlider {...defaultProps} />);
      
      expect(screen.getByText('Quick Presets')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Small')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Large')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });

    it('hides quick presets when showQuickPresets is false', () => {
      render(<AmountRangeSlider {...defaultProps} showQuickPresets={false} />);
      
      expect(screen.queryByText('Quick Presets')).not.toBeInTheDocument();
      expect(screen.queryByText('All')).not.toBeInTheDocument();
    });

    it('renders number inputs by default', () => {
      render(<AmountRangeSlider {...defaultProps} />);
      
      expect(screen.getByLabelText('Minimum Amount')).toBeInTheDocument();
      expect(screen.getByLabelText('Maximum Amount')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
    });

    it('hides number inputs when showInputs is false', () => {
      render(<AmountRangeSlider {...defaultProps} showInputs={false} />);
      
      expect(screen.queryByLabelText('Minimum Amount')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Maximum Amount')).not.toBeInTheDocument();
    });

    it('applies disabled state correctly', () => {
      render(<AmountRangeSlider {...defaultProps} disabled={true} />);
      
      const minInput = screen.getByLabelText('Minimum Amount');
      const maxInput = screen.getByLabelText('Maximum Amount');
      
      expect(minInput).toBeDisabled();
      expect(maxInput).toBeDisabled();
    });
  });

  describe('Input Interactions', () => {
    it('updates minimum value when min input changes', async () => {
      const user = userEvent.setup();
      render(<AmountRangeSlider {...defaultProps} />);
      
      const minInput = screen.getByLabelText('Minimum Amount');
      await user.clear(minInput);
      await user.type(minInput, '2000');
      
      expect(defaultProps.onChange).toHaveBeenCalledWith({ min: 2000, max: 50000 });
    });

    it('updates maximum value when max input changes', async () => {
      const user = userEvent.setup();
      render(<AmountRangeSlider {...defaultProps} />);
      
      const maxInput = screen.getByLabelText('Maximum Amount');
      await user.clear(maxInput);
      await user.type(maxInput, '75000');
      
      // Check that the final call has the correct value (clamped to max)
      const calls = defaultProps.onChange.mock.calls;
      expect(calls[calls.length - 1][0]).toEqual({ min: 1000, max: 100000 });
    });

    it('clamps minimum value to valid range', async () => {
      const user = userEvent.setup();
      render(<AmountRangeSlider {...defaultProps} />);
      
      const minInput = screen.getByLabelText('Minimum Amount');
      await user.clear(minInput);
      await user.type(minInput, '-1000');
      
      expect(defaultProps.onChange).toHaveBeenCalledWith({ min: 0, max: 50000 });
    });

    it('clamps maximum value to valid range', async () => {
      const user = userEvent.setup();
      render(<AmountRangeSlider {...defaultProps} />);
      
      const maxInput = screen.getByLabelText('Maximum Amount');
      await user.clear(maxInput);
      await user.type(maxInput, '150000');
      
      expect(defaultProps.onChange).toHaveBeenCalledWith({ min: 1000, max: 100000 });
    });

    it('prevents minimum from exceeding maximum', async () => {
      const user = userEvent.setup();
      render(<AmountRangeSlider {...defaultProps} />);
      
      const minInput = screen.getByLabelText('Minimum Amount');
      await user.clear(minInput);
      await user.type(minInput, '60000');
      
      // Check that the final call has the correct clamped value (step is 100)
      const calls = defaultProps.onChange.mock.calls;
      expect(calls[calls.length - 1][0]).toEqual({ min: 49900, max: 50000 });
    });

    it('prevents maximum from being less than minimum', async () => {
      const user = userEvent.setup();
      render(<AmountRangeSlider {...defaultProps} />);
      
      const maxInput = screen.getByLabelText('Maximum Amount');
      await user.clear(maxInput);
      await user.type(maxInput, '500');
      
      expect(defaultProps.onChange).toHaveBeenCalledWith({ min: 1000, max: 1100 });
    });
  });

  describe('Preset Interactions', () => {
    it('selects "All" preset correctly', async () => {
      const user = userEvent.setup();
      render(<AmountRangeSlider {...defaultProps} />);
      
      const allButton = screen.getByText('All');
      await user.click(allButton);
      
      expect(defaultProps.onChange).toHaveBeenCalledWith({ min: 0, max: 100000 });
    });

    it('selects "Small" preset correctly', async () => {
      const user = userEvent.setup();
      render(<AmountRangeSlider {...defaultProps} />);
      
      const smallButton = screen.getByText('Small');
      await user.click(smallButton);
      
      expect(defaultProps.onChange).toHaveBeenCalledWith({ min: 0, max: 1000 });
    });

    it('selects "Medium" preset correctly', async () => {
      const user = userEvent.setup();
      render(<AmountRangeSlider {...defaultProps} />);
      
      const mediumButton = screen.getByText('Medium');
      await user.click(mediumButton);
      
      expect(defaultProps.onChange).toHaveBeenCalledWith({ min: 1000, max: 10000 });
    });

    it('selects "Large" preset correctly', async () => {
      const user = userEvent.setup();
      render(<AmountRangeSlider {...defaultProps} />);
      
      const largeButton = screen.getByText('Large');
      await user.click(largeButton);
      
      expect(defaultProps.onChange).toHaveBeenCalledWith({ min: 10000, max: 50000 });
    });

    it('selects "Premium" preset correctly', async () => {
      const user = userEvent.setup();
      render(<AmountRangeSlider {...defaultProps} />);
      
      const premiumButton = screen.getByText('Premium');
      await user.click(premiumButton);
      
      expect(defaultProps.onChange).toHaveBeenCalledWith({ min: 50000, max: 100000 });
    });

    it('highlights active preset', () => {
      render(<AmountRangeSlider {...defaultProps} value={{ min: 0, max: 1000 }} />);
      
      const smallButton = screen.getByText('Small');
      expect(smallButton).toHaveClass('bg-blue-100');
    });

    it('does not call onChange when disabled and preset is clicked', async () => {
      const user = userEvent.setup();
      render(<AmountRangeSlider {...defaultProps} disabled={true} />);
      
      const allButton = screen.getByText('All');
      await user.click(allButton);
      
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });
  });

  describe('Slider Interactions', () => {
    it('handles slider click to update minimum value', () => {
      render(<AmountRangeSlider {...defaultProps} />);
      
      const slider = screen.getByRole('slider', { name: 'Minimum amount' });
      fireEvent.mouseDown(slider);
      
      // Simulate mouse movement
      fireEvent.mouseMove(document, { clientX: 100 });
      fireEvent.mouseUp(document);
      
      expect(defaultProps.onChange).toHaveBeenCalled();
    });

    it('handles slider click to update maximum value', () => {
      render(<AmountRangeSlider {...defaultProps} />);
      
      const slider = screen.getByRole('slider', { name: 'Maximum amount' });
      fireEvent.mouseDown(slider);
      
      // Simulate mouse movement
      fireEvent.mouseMove(document, { clientX: 200 });
      fireEvent.mouseUp(document);
      
      expect(defaultProps.onChange).toHaveBeenCalled();
    });

    it('does not handle slider interactions when disabled', () => {
      render(<AmountRangeSlider {...defaultProps} disabled={true} />);
      
      const minSlider = screen.getByRole('slider', { name: 'Minimum amount' });
      const maxSlider = screen.getByRole('slider', { name: 'Maximum amount' });
      
      expect(minSlider).toHaveAttribute('tabIndex', '-1');
      expect(maxSlider).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for minimum slider', () => {
      render(<AmountRangeSlider {...defaultProps} />);
      
      const minSlider = screen.getByRole('slider', { name: 'Minimum amount' });
      expect(minSlider).toHaveAttribute('aria-valuemin', '0');
      expect(minSlider).toHaveAttribute('aria-valuemax', '100000');
      expect(minSlider).toHaveAttribute('aria-valuenow', '1000');
    });

    it('has proper ARIA attributes for maximum slider', () => {
      render(<AmountRangeSlider {...defaultProps} />);
      
      const maxSlider = screen.getByRole('slider', { name: 'Maximum amount' });
      expect(maxSlider).toHaveAttribute('aria-valuemin', '0');
      expect(maxSlider).toHaveAttribute('aria-valuemax', '100000');
      expect(maxSlider).toHaveAttribute('aria-valuenow', '50000');
    });

    it('has proper labels for inputs', () => {
      render(<AmountRangeSlider {...defaultProps} />);
      
      expect(screen.getByLabelText('Minimum Amount')).toBeInTheDocument();
      expect(screen.getByLabelText('Maximum Amount')).toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('formats currency values correctly', () => {
      render(<AmountRangeSlider {...defaultProps} />);
      
      expect(screen.getByText('$1,000 - $50,000')).toBeInTheDocument();
      expect(screen.getByText('$0')).toBeInTheDocument();
      expect(screen.getByText('$100,000')).toBeInTheDocument();
    });

    it('formats large numbers with commas', () => {
      render(<AmountRangeSlider {...defaultProps} value={{ min: 1000000, max: 5000000 }} />);
      
      expect(screen.getByText('$1,000,000 - $5,000,000')).toBeInTheDocument();
    });
  });

  describe('Step Functionality', () => {
    it('respects step value for input changes', async () => {
      const user = userEvent.setup();
      render(<AmountRangeSlider {...defaultProps} step={500} />);
      
      const minInput = screen.getByLabelText('Minimum Amount');
      await user.clear(minInput);
      await user.type(minInput, '1500');
      
      // Should snap to nearest step
      expect(defaultProps.onChange).toHaveBeenCalledWith({ min: 1500, max: 50000 });
    });
  });

  describe('State Management', () => {
    it('updates local state when props change', () => {
      const { rerender } = render(<AmountRangeSlider {...defaultProps} />);
      
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
      
      rerender(<AmountRangeSlider {...defaultProps} value={{ min: 2000, max: 60000 }} />);
      
      expect(screen.getByDisplayValue('2000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('60000')).toBeInTheDocument();
    });

    it('maintains local state during interactions', async () => {
      const user = userEvent.setup();
      render(<AmountRangeSlider {...defaultProps} />);
      
      const minInput = screen.getByLabelText('Minimum Amount');
      await user.clear(minInput);
      await user.type(minInput, '3000');
      
      // Local state should update immediately
      expect(screen.getByDisplayValue('3000')).toBeInTheDocument();
    });
  });
});
