import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DollarSign, Minus, Plus } from 'lucide-react';

export interface AmountRangeSliderProps {
  min: number;
  max: number;
  value: { min: number; max: number };
  onChange: (value: { min: number; max: number }) => void;
  step?: number;
  label?: string;
  showInputs?: boolean;
  showQuickPresets?: boolean;
  className?: string;
  disabled?: boolean;
}

const AmountRangeSlider: React.FC<AmountRangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
  step = 100,
  label = 'Transaction Amount',
  showInputs = true,
  showQuickPresets = true,
  className = '',
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const [localValue, setLocalValue] = useState(value);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Quick preset ranges
  const quickPresets = [
    { label: 'All', min: min, max: max },
    { label: 'Small', min: min, max: 1000 },
    { label: 'Medium', min: 1000, max: 10000 },
    { label: 'Large', min: 10000, max: 50000 },
    { label: 'Premium', min: 50000, max: max }
  ];

  // Calculate percentage positions
  const getPercentage = (val: number) => ((val - min) / (max - min)) * 100;
  const minPercentage = getPercentage(localValue.min);
  const maxPercentage = getPercentage(localValue.max);

  // Handle slider click
  const handleSliderClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const newValue = Math.round((percentage / 100) * (max - min) + min);

    // Determine which handle to move based on proximity
    const minDistance = Math.abs(newValue - localValue.min);
    const maxDistance = Math.abs(newValue - localValue.max);

    if (minDistance < maxDistance) {
      const newMin = Math.min(newValue, localValue.max - step);
      setLocalValue(prev => ({ ...prev, min: newMin }));
      onChange({ ...localValue, min: newMin });
    } else {
      const newMax = Math.max(newValue, localValue.min + step);
      setLocalValue(prev => ({ ...prev, max: newMax }));
      onChange({ ...localValue, max: newMax });
    }
  }, [disabled, max, min, step, localValue, onChange]);

  // Handle mouse down on handles
  const handleMouseDown = useCallback((handle: 'min' | 'max') => {
    if (disabled) return;
    setIsDragging(handle);
  }, [disabled]);

  // Handle mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (mouseX / rect.width) * 100));
      const newValue = Math.round((percentage / 100) * (max - min) + min);

      if (isDragging === 'min') {
        const newMin = Math.max(min, Math.min(newValue, localValue.max - step));
        setLocalValue(prev => ({ ...prev, min: newMin }));
        onChange({ ...localValue, min: newMin });
      } else {
        const newMax = Math.min(max, Math.max(newValue, localValue.min + step));
        setLocalValue(prev => ({ ...prev, max: newMax }));
        onChange({ ...localValue, max: newMax });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, max, min, step, localValue, onChange]);

  // Handle input changes
  const handleInputChange = useCallback((type: 'min' | 'max', newValue: number) => {
    const clampedValue = Math.max(min, Math.min(max, newValue));
    
    if (type === 'min') {
      const newMin = Math.min(clampedValue, localValue.max - step);
      setLocalValue(prev => ({ ...prev, min: newMin }));
      onChange({ ...localValue, min: newMin });
    } else {
      const newMax = Math.max(clampedValue, localValue.min + step);
      setLocalValue(prev => ({ ...prev, max: newMax }));
      onChange({ ...localValue, max: newMax });
    }
  }, [min, max, step, localValue, onChange]);

  // Handle preset selection
  const handlePresetClick = useCallback((preset: { min: number; max: number }) => {
    if (disabled) return;
    setLocalValue(preset);
    onChange({ min: preset.min, max: preset.max });
  }, [disabled, onChange]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Label and current range display */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatCurrency(localValue.min)} - {formatCurrency(localValue.max)}
        </div>
      </div>

      {/* Quick presets */}
      {showQuickPresets && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Quick Presets
          </div>
          <div className="flex flex-wrap gap-2">
            {quickPresets.map((preset, index) => (
              <button
                key={index}
                onClick={() => handlePresetClick(preset)}
                disabled={disabled}
                className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                  localValue.min === preset.min && localValue.max === preset.max
                    ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Visual slider */}
      <div className="space-y-3">
        <div
          ref={sliderRef}
          onClick={handleSliderClick}
          className={`relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {/* Track fill */}
          <div
            className="absolute h-full bg-blue-500 rounded-full"
            style={{
              left: `${minPercentage}%`,
              width: `${maxPercentage - minPercentage}%`
            }}
          />
          
          {/* Min handle */}
          <div
            className={`absolute top-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-md transform -translate-y-1/2 cursor-grab active:cursor-grabbing ${
              disabled ? 'cursor-not-allowed' : ''
            }`}
            style={{ left: `${minPercentage}%` }}
            onMouseDown={() => handleMouseDown('min')}
            role="slider"
            aria-label="Minimum amount"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={localValue.min}
            tabIndex={disabled ? -1 : 0}
          />
          
          {/* Max handle */}
          <div
            className={`absolute top-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-md transform -translate-y-1/2 cursor-grab active:cursor-grabbing ${
              disabled ? 'cursor-not-allowed' : ''
            }`}
            style={{ left: `${maxPercentage}%` }}
            onMouseDown={() => handleMouseDown('max')}
            role="slider"
            aria-label="Maximum amount"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={localValue.max}
            tabIndex={disabled ? -1 : 0}
          />
        </div>

        {/* Min/Max labels */}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatCurrency(min)}</span>
          <span>{formatCurrency(max)}</span>
        </div>
      </div>

      {/* Number inputs */}
      {showInputs && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="min-amount" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Minimum Amount
            </label>
            <div className="relative">
              <input
                id="min-amount"
                type="number"
                min={min}
                max={max}
                step={step}
                value={localValue.min}
                onChange={(e) => handleInputChange('min', Number(e.target.value))}
                disabled={disabled}
                className={`w-full px-3 py-2 pl-8 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                placeholder="Min"
              />
              <Minus className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="space-y-1">
            <label htmlFor="max-amount" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Maximum Amount
            </label>
            <div className="relative">
              <input
                id="max-amount"
                type="number"
                min={min}
                max={max}
                step={step}
                value={localValue.max}
                onChange={(e) => handleInputChange('max', Number(e.target.value))}
                disabled={disabled}
                className={`w-full px-3 py-2 pl-8 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                placeholder="Max"
              />
              <Plus className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmountRangeSlider;
