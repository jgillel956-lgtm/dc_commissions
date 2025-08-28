import { renderHook, act } from '@testing-library/react';
import { useFilterPersistence } from './useFilterPersistence';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    length: Object.keys(store).length
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('useFilterPersistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default settings when no saved settings exist', () => {
      const { result } = renderHook(() => useFilterPersistence());

      expect(result.current.settings).toEqual({
        isEnabled: true,
        persistenceKey: 'dashboard-filters',
        autoSave: true,
        saveOnChange: true
      });
    });

    it('should load saved settings from localStorage', () => {
      const savedSettings = {
        isEnabled: false,
        persistenceKey: 'custom-key',
        autoSave: false,
        saveOnChange: false
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedSettings));

      const { result } = renderHook(() => useFilterPersistence());

      expect(result.current.settings).toEqual(savedSettings);
    });

    it('should merge default settings with custom defaultSettings', () => {
      const customDefaults = {
        isEnabled: false,
        persistenceKey: 'custom-default'
      };

      const { result } = renderHook(() => useFilterPersistence({
        defaultSettings: customDefaults
      }));

      expect(result.current.settings).toEqual({
        isEnabled: false,
        persistenceKey: 'custom-default',
        autoSave: true,
        saveOnChange: true
      });
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() => useFilterPersistence());

      expect(result.current.settings).toEqual({
        isEnabled: true,
        persistenceKey: 'dashboard-filters',
        autoSave: true,
        saveOnChange: true
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load persistence settings:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Settings Management', () => {
    it('should update settings and save to localStorage', () => {
      const { result } = renderHook(() => useFilterPersistence());

      act(() => {
        result.current.updateSettings({
          isEnabled: false,
          persistenceKey: 'new-key'
        });
      });

      expect(result.current.settings).toEqual({
        isEnabled: false,
        persistenceKey: 'new-key',
        autoSave: true,
        saveOnChange: true
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'filter-persistence-settings',
        JSON.stringify(result.current.settings)
      );
    });

    it('should call onSettingsChange callback when settings change', () => {
      const onSettingsChange = jest.fn();
      const { result } = renderHook(() => useFilterPersistence({
        onSettingsChange
      }));

      act(() => {
        result.current.updateSettings({ isEnabled: false });
      });

      expect(onSettingsChange).toHaveBeenCalledWith(result.current.settings);
    });

    it('should toggle persistence enabled state', () => {
      const { result } = renderHook(() => useFilterPersistence());

      act(() => {
        result.current.togglePersistence();
      });

      expect(result.current.settings.isEnabled).toBe(false);

      act(() => {
        result.current.togglePersistence();
      });

      expect(result.current.settings.isEnabled).toBe(true);
    });

    it('should handle localStorage errors when saving settings', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const onSettingsChange = jest.fn();

      const { result } = renderHook(() => useFilterPersistence({
        onSettingsChange
      }));

      act(() => {
        result.current.updateSettings({ isEnabled: false });
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save persistence settings:', expect.any(Error));
      // onSettingsChange should still be called even if localStorage fails
      expect(onSettingsChange).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Filter Detection', () => {
    it('should detect saved filters when they exist', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'dashboard-filters') {
          return JSON.stringify({ some: 'data' });
        }
        return null;
      });

      const { result } = renderHook(() => useFilterPersistence());

      expect(result.current.hasSavedFilters()).toBe(true);
    });

    it('should detect no saved filters when they do not exist', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useFilterPersistence());

      expect(result.current.hasSavedFilters()).toBe(false);
    });

    it('should detect saved filters with custom key', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'custom-key') {
          return JSON.stringify({ some: 'data' });
        }
        return null;
      });

      const { result } = renderHook(() => useFilterPersistence());

      expect(result.current.hasSavedFilters('custom-key')).toBe(true);
    });

    it('should handle localStorage errors when checking for filters', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() => useFilterPersistence());

      expect(result.current.hasSavedFilters()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to check for saved filters:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Storage Information', () => {
    it('should calculate storage info correctly', () => {
      // Mock localStorage with some data
      localStorageMock.getItem.mockImplementation((key: string) => {
        const mockData = {
          'key1': 'value1',
          'key2': 'value2',
          'dashboard-filters': JSON.stringify({ filters: 'data' })
        };
        return mockData[key] || null;
      });

      Object.defineProperty(localStorageMock, 'length', {
        get: () => 3
      });

      localStorageMock.key.mockImplementation((index: number) => {
        const keys = ['key1', 'key2', 'dashboard-filters'];
        return keys[index] || null;
      });

      const { result } = renderHook(() => useFilterPersistence());

      const storageInfo = result.current.getStorageInfo();

      expect(storageInfo.itemCount).toBe(3);
      expect(storageInfo.totalSize).toBeGreaterThan(0);
      expect(storageInfo.availableSpace).toBeGreaterThan(0);
    });

    it('should handle localStorage errors when getting storage info', () => {
      // Mock localStorage.length to throw error when accessed
      Object.defineProperty(localStorageMock, 'length', {
        get: () => {
          throw new Error('Storage error');
        }
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() => useFilterPersistence());

      const storageInfo = result.current.getStorageInfo();

      expect(storageInfo).toEqual({
        totalSize: 0,
        itemCount: 0,
        availableSpace: 0
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to get storage info:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Persistence Clearing', () => {
    it('should clear all filter-related persistence items', () => {
      // Mock localStorage with filter-related items
      localStorageMock.getItem.mockImplementation((key: string) => {
        const mockData = {
          'dashboard-filters': 'data1',
          'filter-settings': 'data2',
          'other-data': 'data3'
        };
        return mockData[key] || null;
      });

      Object.defineProperty(localStorageMock, 'length', {
        get: () => 3
      });

      localStorageMock.key.mockImplementation((index: number) => {
        const keys = ['dashboard-filters', 'filter-settings', 'other-data'];
        return keys[index] || null;
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const { result } = renderHook(() => useFilterPersistence());

      act(() => {
        result.current.clearAllPersistence();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('dashboard-filters');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('filter-settings');
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('other-data');
      expect(consoleSpy).toHaveBeenCalledWith('Cleared 2 persistence items');
      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors when clearing persistence', () => {
      // Mock localStorage.key to throw error
      localStorageMock.key.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() => useFilterPersistence());

      act(() => {
        result.current.clearAllPersistence();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear persistence:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Settings Export/Import', () => {
    it('should export settings as JSON string', () => {
      const { result } = renderHook(() => useFilterPersistence());

      const exported = result.current.exportSettings();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('settings');
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('version');
      expect(parsed.version).toBe('1.0');
      expect(parsed.settings).toEqual(result.current.settings);
    });

    it('should import valid settings successfully', () => {
      const { result } = renderHook(() => useFilterPersistence());

      const testSettings = {
        isEnabled: false,
        persistenceKey: 'imported-key',
        autoSave: false,
        saveOnChange: false
      };

      const importData = {
        settings: testSettings,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      act(() => {
        const success = result.current.importSettings(JSON.stringify(importData));
        expect(success).toBe(true);
      });

      expect(result.current.settings).toEqual(testSettings);
      expect(consoleSpy).toHaveBeenCalledWith('Settings imported successfully');
      consoleSpy.mockRestore();
    });

    it('should handle invalid import data', () => {
      const { result } = renderHook(() => useFilterPersistence());

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      act(() => {
        const success = result.current.importSettings('invalid json');
        expect(success).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to import settings:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle import data without settings property', () => {
      const { result } = renderHook(() => useFilterPersistence());

      const importData = {
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      act(() => {
        const success = result.current.importSettings(JSON.stringify(importData));
        expect(success).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to import settings:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors when exporting settings', () => {
      const { result } = renderHook(() => useFilterPersistence());

      // Mock JSON.stringify to throw error
      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn().mockImplementation(() => {
        throw new Error('Stringify error');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const exported = result.current.exportSettings();

      expect(exported).toBe('');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to export settings:', expect.any(Error));

      JSON.stringify = originalStringify;
      consoleSpy.mockRestore();
    });
  });
});
