import { useState, useCallback, useEffect, useRef } from 'react';
import { DashboardTab } from './useDashboardState';
import { NavigationHistoryItem } from '../components/dashboard/NavigationHistory';

export interface NavigationEntry {
  id: string;
  label: string;
  path: string;
  tab?: DashboardTab;
  timestamp: Date;
  icon?: React.ReactNode;
  description?: string;
}

export const useNavigationHistory = (maxHistorySize: number = 50) => {
  const [history, setHistory] = useState<NavigationHistoryItem[]>([]);
  const visitCounts = useRef<Map<string, number>>(new Map());

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('navigation-history');
      const savedVisitCounts = localStorage.getItem('navigation-visit-counts');
      
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setHistory(parsedHistory);
      }
      
      if (savedVisitCounts) {
        visitCounts.current = new Map(JSON.parse(savedVisitCounts));
      }
    } catch (error) {
      console.warn('Failed to load navigation history:', error);
    }
  }, []);

  // Save history to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('navigation-history', JSON.stringify(history));
      localStorage.setItem('navigation-visit-counts', JSON.stringify(Array.from(visitCounts.current.entries())));
    } catch (error) {
      console.warn('Failed to save navigation history:', error);
    }
  }, [history]);

  const addToHistory = useCallback((entry: NavigationEntry) => {
    const existingIndex = history.findIndex(item => item.id === entry.id);
    const visitCount = (visitCounts.current.get(entry.id) || 0) + 1;
    visitCounts.current.set(entry.id, visitCount);

    const historyItem: NavigationHistoryItem = {
      ...entry,
      visitCount,
      timestamp: new Date()
    };

    setHistory(prevHistory => {
      let newHistory = prevHistory;
      
      if (existingIndex >= 0) {
        // Update existing entry
        newHistory = [...prevHistory];
        newHistory[existingIndex] = historyItem;
      } else {
        // Add new entry
        newHistory = [historyItem, ...prevHistory];
      }

      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory = newHistory.slice(0, maxHistorySize);
      }

      return newHistory;
    });
  }, [history, maxHistorySize]);

  const removeFromHistory = useCallback((id: string) => {
    setHistory(prevHistory => prevHistory.filter(item => item.id !== id));
    visitCounts.current.delete(id);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    visitCounts.current.clear();
  }, []);

  const getRecentItems = useCallback((count: number = 10) => {
    return history.slice(0, count);
  }, [history]);

  const getMostVisited = useCallback((count: number = 10) => {
    return [...history]
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, count);
  }, [history]);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getRecentItems,
    getMostVisited
  };
};

