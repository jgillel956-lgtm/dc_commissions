import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Moon, Sun, Monitor } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'button' | 'select';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'button', 
  size = 'md',
  className = '' 
}) => {
  const { theme, setThemeMode, toggleTheme, isDark } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  if (variant === 'select') {
    return (
      <div className={`relative ${className}`}>
        <select
          value={theme.mode}
          onChange={(e) => setThemeMode(e.target.value as any)}
          className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`${sizeClasses[size]} flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Current: ${theme.mode} mode`}
    >
      {theme.mode === 'auto' ? (
        <Monitor size={iconSizes[size]} className="text-gray-600 dark:text-gray-400" />
      ) : isDark ? (
        <Sun size={iconSizes[size]} className="text-yellow-500" />
      ) : (
        <Moon size={iconSizes[size]} className="text-gray-600" />
      )}
    </button>
  );
};

export default ThemeToggle;


