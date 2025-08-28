import { useState, useEffect, useCallback } from 'react';

export interface PersistenceSettings {
  isEnabled: boolean;
  persistenceKey: string;
  autoSave: boolean;
  saveOnChange: boolean;
}

export interface UseFilterPersistenceOptions {
  defaultSettings?: Partial<PersistenceSettings>;
  onSettingsChange?: (settings: PersistenceSettings) => void;
}

export interface UseFilterPersistenceReturn {
  settings: PersistenceSettings;
  updateSettings: (newSettings: Partial<PersistenceSettings>) => void;
  togglePersistence: () => void;
  hasSavedFilters: (key?: string) => boolean;
  getStorageInfo: () => {
    totalSize: number;
    itemCount: number;
    availableSpace: number;
  };
  clearAllPersistence: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
}

const DEFAULT_SETTINGS: PersistenceSettings = {
  isEnabled: true,
  persistenceKey: 'dashboard-filters',
  autoSave: true,
  saveOnChange: true
};

const SETTINGS_STORAGE_KEY = 'filter-persistence-settings';

export const useFilterPersistence = (options: UseFilterPersistenceOptions = {}): UseFilterPersistenceReturn => {
  const [settings, setSettings] = useState<PersistenceSettings>(() => {
    // Try to load settings from localStorage
    try {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load persistence settings:', error);
    }
    
    return { ...DEFAULT_SETTINGS, ...options.defaultSettings };
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save persistence settings:', error);
    }
    // Always call onSettingsChange, even if localStorage fails
    options.onSettingsChange?.(settings);
  }, [settings, options.onSettingsChange]);

  const updateSettings = useCallback((newSettings: Partial<PersistenceSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const togglePersistence = useCallback(() => {
    setSettings(prev => ({ ...prev, isEnabled: !prev.isEnabled }));
  }, []);

  const hasSavedFilters = useCallback((key?: string) => {
    try {
      const storageKey = key || settings.persistenceKey;
      const saved = localStorage.getItem(storageKey);
      return saved !== null && saved !== 'null' && saved !== 'undefined';
    } catch (error) {
      console.warn('Failed to check for saved filters:', error);
      return false;
    }
  }, [settings.persistenceKey]);

  const getStorageInfo = useCallback(() => {
    try {
      let totalSize = 0;
      let itemCount = 0;
      
      // Calculate size of all localStorage items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
            itemCount++;
          }
        }
      }

      // Estimate available space (localStorage typically has 5-10MB limit)
      const estimatedLimit = 5 * 1024 * 1024; // 5MB conservative estimate
      const availableSpace = Math.max(0, estimatedLimit - totalSize);

      return {
        totalSize,
        itemCount,
        availableSpace
      };
    } catch (error) {
      console.warn('Failed to get storage info:', error);
      return {
        totalSize: 0,
        itemCount: 0,
        availableSpace: 0
      };
    }
  }, []);

  const clearAllPersistence = useCallback(() => {
    try {
      // Clear all filter-related items
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('dashboard-filters') || key.startsWith('filter-'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log(`Cleared ${keysToRemove.length} persistence items`);
    } catch (error) {
      console.warn('Failed to clear persistence:', error);
    }
  }, []);

  const exportSettings = useCallback(() => {
    try {
      const exportData = {
        settings,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.warn('Failed to export settings:', error);
      return '';
    }
  }, [settings]);

  const importSettings = useCallback((settingsJson: string): boolean => {
    try {
      const importData = JSON.parse(settingsJson);
      
      // Validate the imported data
      if (!importData.settings || typeof importData.settings !== 'object') {
        throw new Error('Invalid settings format');
      }
      
      // Update settings with imported data
      setSettings(prev => ({ ...prev, ...importData.settings }));
      
      console.log('Settings imported successfully');
      return true;
    } catch (error) {
      console.warn('Failed to import settings:', error);
      return false;
    }
  }, []);

  return {
    settings,
    updateSettings,
    togglePersistence,
    hasSavedFilters,
    getStorageInfo,
    clearAllPersistence,
    exportSettings,
    importSettings
  };
};
