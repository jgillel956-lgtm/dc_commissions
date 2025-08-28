import React from 'react';
import { Filter } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export interface FilterCountBadgeProps {
  count: number;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'secondary';
}

const FilterCountBadge: React.FC<FilterCountBadgeProps> = ({
  count,
  onClick,
  className = '',
  size = 'md',
  variant = 'default'
}) => {
  const { theme } = useTheme();

  // Don't render if no active filters
  if (count === 0) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const variantClasses = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    secondary: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
  };

  const baseClasses = `inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors ${sizeClasses[size]} ${variantClasses[variant]}`;
  const interactiveClasses = onClick ? 'cursor-pointer hover:shadow-sm active:scale-95' : '';
  const combinedClasses = `${baseClasses} ${interactiveClasses} ${className}`;

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div
      className={combinedClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <Filter className={iconSizes[size]} />
      <span>{count}</span>
    </div>
  );
};

export default FilterCountBadge;

