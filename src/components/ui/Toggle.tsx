import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ToggleProps {
  id: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onBlur?: () => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  id,
  name,
  checked,
  onChange,
  onBlur,
  label,
  error,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="flex items-center">
        <button
          type="button"
          id={id}
          name={name}
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          onBlur={onBlur}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${checked ? 'bg-blue-600' : 'bg-gray-200'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${checked ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
        
        <span className="ml-3 text-sm text-slate-600">
          {checked ? 'Active' : 'Inactive'}
        </span>
        
        {error && (
          <AlertCircle className="ml-2 w-4 h-4 text-red-500" />
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center">
          <AlertCircle className="w-4 h-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

export default Toggle;
