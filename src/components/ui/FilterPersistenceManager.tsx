import React, { useState, useEffect } from 'react';
import { Save, Trash2, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export interface FilterPersistenceManagerProps {
  isEnabled: boolean;
  onTogglePersistence: (enabled: boolean) => void;
  onClearPersistence: () => void;
  onSaveFilters: () => void;
  onLoadFilters: () => void;
  hasSavedFilters: boolean;
  persistenceKey?: string;
  className?: string;
  showAdvancedOptions?: boolean;
}

const FilterPersistenceManager: React.FC<FilterPersistenceManagerProps> = ({
  isEnabled,
  onTogglePersistence,
  onClearPersistence,
  onSaveFilters,
  onLoadFilters,
  hasSavedFilters,
  persistenceKey = 'dashboard-filters',
  className = '',
  showAdvancedOptions = false
}) => {
  const { theme } = useTheme();
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Update last saved timestamp when filters are saved
  useEffect(() => {
    if (isEnabled && hasSavedFilters) {
      setLastSaved(new Date());
    }
  }, [isEnabled, hasSavedFilters]);

  const handleTogglePersistence = () => {
    onTogglePersistence(!isEnabled);
  };

  const handleClearPersistence = () => {
    onClearPersistence();
    setShowConfirmClear(false);
    setLastSaved(null);
  };

  const handleSaveFilters = () => {
    onSaveFilters();
    setLastSaved(new Date());
  };

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Filter Persistence
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isEnabled && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Enabled</span>
            </div>
          )}
        </div>
      </div>

      {/* Persistence Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Save filters across browser sessions
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Your filter settings will be automatically saved and restored when you return
          </p>
        </div>
        <button
          onClick={handleTogglePersistence}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTogglePersistence();
            }
          }}
          aria-label="Toggle filter persistence"
          aria-pressed={isEnabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled 
              ? 'bg-blue-600 dark:bg-blue-500' 
              : 'bg-gray-200 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Status Information */}
      {isEnabled && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex items-start gap-2">
            <Save className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Persistence Active
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                Storage key: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{persistenceKey}</code>
              </p>
              {lastSaved && (
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  Last saved: {formatLastSaved(lastSaved)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {isEnabled && (
          <>
            <button
              onClick={handleSaveFilters}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
            >
              <Save className="h-4 w-4" />
              Save Now
            </button>

            {hasSavedFilters && (
              <button
                onClick={onLoadFilters}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md hover:bg-green-100 dark:hover:bg-green-800/50 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Load Saved
              </button>
            )}
          </>
        )}

        {hasSavedFilters && (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-800/50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear Saved
          </button>
        )}
      </div>

      {/* Advanced Options */}
      {showAdvancedOptions && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Advanced Options
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Storage Location
              </span>
              <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                localStorage
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Data Size
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                ~2-5 KB
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Clear Saved Filters?
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete all saved filter settings. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearPersistence}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPersistenceManager;
