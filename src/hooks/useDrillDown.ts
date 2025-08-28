import { useState, useCallback, useMemo, useRef } from 'react';

export interface DrillDownNode {
  id: string;
  name: string;
  value: number;
  children?: DrillDownNode[];
  parent?: string;
  metadata?: Record<string, any>;
  level: number;
}

export interface DrillDownPath {
  id: string;
  name: string;
  level: number;
}

export interface DrillDownState {
  currentPath: DrillDownPath[];
  currentData: DrillDownNode[];
  breadcrumbs: DrillDownPath[];
  canDrillDown: boolean;
  canDrillUp: boolean;
  maxDepth: number;
  currentDepth: number;
}

export interface UseDrillDownOptions {
  initialData: DrillDownNode[];
  maxDepth?: number;
  enableBreadcrumbs?: boolean;
  persistState?: boolean;
  storageKey?: string;
}

export interface DrillDownActions {
  drillDown: (nodeId: string) => boolean;
  drillUp: () => boolean;
  drillToLevel: (level: number) => boolean;
  reset: () => void;
  goToPath: (path: string[]) => boolean;
  getNodeById: (id: string) => DrillDownNode | null;
  getNodeByPath: (path: string[]) => DrillDownNode | null;
  getBreadcrumbPath: () => string[];
  exportDrillDownData: () => DrillDownNode[];
}

export const useDrillDown = (options: UseDrillDownOptions): [DrillDownState, DrillDownActions] => {
  const {
    initialData,
    maxDepth = 5,
    enableBreadcrumbs = true,
    persistState = false,
    storageKey = 'chart-drill-down-state'
  } = options;

  // Initialize data with levels
  const processedInitialData = useMemo(() => {
    return addLevelsToData(initialData, 0);
  }, [initialData]);

  // State management
  const [currentPath, setCurrentPath] = useState<DrillDownPath[]>([]);
  const [currentData, setCurrentData] = useState<DrillDownNode[]>(processedInitialData);
  const [breadcrumbs, setBreadcrumbs] = useState<DrillDownPath[]>([]);

  // Refs for performance
  const dataCache = useRef<Map<string, DrillDownNode>>(new Map());
  const pathCache = useRef<Map<string, DrillDownNode[]>>(new Map());

  // Build data cache
  useMemo(() => {
    dataCache.current.clear();
    pathCache.current.clear();
    buildDataCache(processedInitialData, dataCache.current, pathCache.current);
  }, [processedInitialData]);

  // Load persisted state
  useMemo(() => {
    if (persistState && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.currentPath && parsed.currentPath.length <= maxDepth) {
            setCurrentPath(parsed.currentPath);
            setBreadcrumbs(parsed.breadcrumbs || []);
            
            // Reconstruct current data from path
            const reconstructedData = reconstructDataFromPath(parsed.currentPath, processedInitialData);
            setCurrentData(reconstructedData);
          }
        }
      } catch (error) {
        console.warn('Failed to load drill-down state:', error);
      }
    }
  }, [persistState, storageKey, maxDepth, processedInitialData]);

  // Save state to localStorage
  const saveState = useCallback(() => {
    if (persistState && typeof window !== 'undefined') {
      try {
        const stateToSave = {
          currentPath,
          breadcrumbs,
          timestamp: Date.now()
        };
        localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      } catch (error) {
        console.warn('Failed to save drill-down state:', error);
      }
    }
  }, [persistState, storageKey, currentPath, breadcrumbs]);

  // Save state when it changes
  useMemo(() => {
    saveState();
  }, [saveState]);

  // Compute derived state
  const state: DrillDownState = useMemo(() => ({
    currentPath,
    currentData,
    breadcrumbs: enableBreadcrumbs ? breadcrumbs : [],
    canDrillDown: currentPath.length < maxDepth && currentData.some(node => node.children && node.children.length > 0),
    canDrillUp: currentPath.length > 0,
    maxDepth,
    currentDepth: currentPath.length
  }), [currentPath, currentData, breadcrumbs, enableBreadcrumbs, maxDepth]);

  // Drill down to a specific node
  const drillDown = useCallback((nodeId: string): boolean => {
    const node = dataCache.current.get(nodeId);
    if (!node || !node.children || node.children.length === 0 || currentPath.length >= maxDepth) {
      return false;
    }

    const newPath = [...currentPath, { id: node.id, name: node.name, level: node.level }];
    const newBreadcrumbs = enableBreadcrumbs ? [...breadcrumbs, { id: node.id, name: node.name, level: node.level }] : breadcrumbs;

    setCurrentPath(newPath);
    setCurrentData(node.children);
    setBreadcrumbs(newBreadcrumbs);

    return true;
  }, [currentPath, breadcrumbs, maxDepth, enableBreadcrumbs]);

  // Drill up one level
  const drillUp = useCallback((): boolean => {
    if (currentPath.length === 0) {
      return false;
    }

    const newPath = currentPath.slice(0, -1);
    const newBreadcrumbs = enableBreadcrumbs ? breadcrumbs.slice(0, -1) : breadcrumbs;

    setCurrentPath(newPath);
    setBreadcrumbs(newBreadcrumbs);

    // Reconstruct data for the new level
    if (newPath.length === 0) {
      setCurrentData(processedInitialData);
    } else {
      const pathNames = newPath.map(node => node.name);
      const parentNode = getNodeByPath(pathNames);
      if (parentNode && parentNode.children) {
        setCurrentData(parentNode.children);
      } else {
        setCurrentData(processedInitialData);
      }
    }

    return true;
  }, [currentPath, breadcrumbs, enableBreadcrumbs, processedInitialData]);

  // Drill to a specific level
  const drillToLevel = useCallback((level: number): boolean => {
    if (level < 0 || level > maxDepth || level > currentPath.length) {
      return false;
    }

    const newPath = currentPath.slice(0, level);
    const newBreadcrumbs = enableBreadcrumbs ? breadcrumbs.slice(0, level) : breadcrumbs;

    setCurrentPath(newPath);
    setBreadcrumbs(newBreadcrumbs);

    // Reconstruct data for the target level
    if (newPath.length === 0) {
      setCurrentData(processedInitialData);
    } else {
      const pathNames = newPath.map(node => node.name);
      const targetNode = getNodeByPath(pathNames);
      if (targetNode && targetNode.children) {
        setCurrentData(targetNode.children);
      } else {
        setCurrentData(processedInitialData);
      }
    }

    return true;
  }, [currentPath, breadcrumbs, maxDepth, enableBreadcrumbs, processedInitialData]);

  // Reset to initial state
  const reset = useCallback(() => {
    setCurrentPath([]);
    setCurrentData(processedInitialData);
    setBreadcrumbs([]);
  }, [processedInitialData]);

  // Go to a specific path
  const goToPath = useCallback((path: string[]): boolean => {
    if (path.length > maxDepth) {
      return false;
    }

    const newPath: DrillDownPath[] = [];
    const newBreadcrumbs: DrillDownPath[] = [];
    let currentLevelData = processedInitialData;

    for (let i = 0; i < path.length; i++) {
      const nodeName = path[i];
      const node = currentLevelData.find(n => n.name === nodeName);
      
      if (!node || !node.children) {
        return false;
      }

      newPath.push({ id: node.id, name: node.name, level: node.level });
      if (enableBreadcrumbs) {
        newBreadcrumbs.push({ id: node.id, name: node.name, level: node.level });
      }

      currentLevelData = node.children;
    }

    setCurrentPath(newPath);
    setCurrentData(currentLevelData);
    setBreadcrumbs(newBreadcrumbs);

    return true;
  }, [maxDepth, processedInitialData, enableBreadcrumbs]);

  // Get node by ID
  const getNodeById = useCallback((id: string): DrillDownNode | null => {
    return dataCache.current.get(id) || null;
  }, []);

  // Get node by path
  const getNodeByPath = useCallback((path: string[]): DrillDownNode | null => {
    const pathKey = path.join('.');
    const cached = pathCache.current.get(pathKey);
    if (cached) {
      return cached[0] || null;
    }

    let currentLevelData = processedInitialData;
    let targetNode: DrillDownNode | null = null;

    for (const nodeName of path) {
      const node = currentLevelData.find(n => n.name === nodeName);
      if (!node) {
        return null;
      }
      targetNode = node;
      currentLevelData = node.children || [];
    }

    return targetNode;
  }, [processedInitialData]);

  // Get breadcrumb path as string array
  const getBreadcrumbPath = useCallback((): string[] => {
    return breadcrumbs.map(bc => bc.name);
  }, [breadcrumbs]);

  // Export current drill-down data
  const exportDrillDownData = useCallback((): DrillDownNode[] => {
    return currentData;
  }, [currentData]);

  const actions: DrillDownActions = {
    drillDown,
    drillUp,
    drillToLevel,
    reset,
    goToPath,
    getNodeById,
    getNodeByPath,
    getBreadcrumbPath,
    exportDrillDownData
  };

  return [state, actions];
};

// Helper functions
function addLevelsToData(data: DrillDownNode[], level: number): DrillDownNode[] {
  return data.map(node => ({
    ...node,
    level,
    children: node.children ? addLevelsToData(node.children, level + 1) : undefined
  }));
}

function buildDataCache(
  data: DrillDownNode[], 
  dataCache: Map<string, DrillDownNode>,
  pathCache: Map<string, DrillDownNode[]>
) {
  function traverse(nodes: DrillDownNode[], path: string[] = []) {
    nodes.forEach(node => {
      dataCache.set(node.id, node);
      
      const pathKey = path.join('.');
      if (!pathCache.has(pathKey)) {
        pathCache.set(pathKey, []);
      }
      pathCache.get(pathKey)!.push(node);

      if (node.children) {
        traverse(node.children, [...path, node.name]);
      }
    });
  }
  
  traverse(data);
}

function reconstructDataFromPath(path: DrillDownPath[], initialData: DrillDownNode[]): DrillDownNode[] {
  if (path.length === 0) {
    return initialData;
  }

  let currentLevelData = initialData;
  
  for (const pathItem of path) {
    const node = currentLevelData.find(n => n.id === pathItem.id);
    if (!node || !node.children) {
      return initialData;
    }
    currentLevelData = node.children;
  }

  return currentLevelData;
}

export default useDrillDown;
