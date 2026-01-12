import { useState } from 'react';
import type { CostTemplate } from '../types';

/**
 * Custom hook for managing localStorage with automatic JSON serialization
 * @param key - The localStorage key
 * @param initialValue - Default value if key doesn't exist
 * @returns [value, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
    }
  };

  // Function to remove item from localStorage
  const removeValue = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        setStoredValue(initialValue);
      }
    } catch (error) {
      // Error removing from localStorage
    }
  };

  return [storedValue, setValue, removeValue];
}

/**
 * Save a complete project to localStorage with timestamp
 */
export interface SavedProject {
  name: string;
  timestamp: string;
  data: any;
}

export function useSavedProjects() {
  const [savedProjects, setSavedProjects] = useLocalStorage<SavedProject[]>(
    'pvfinance_saved_projects',
    []
  );

  const saveProject = (name: string, data: any) => {
    const newProject: SavedProject = {
      name,
      timestamp: new Date().toISOString(),
      data,
    };
    setSavedProjects([newProject, ...savedProjects]);
  };

  const loadProject = (index: number): any | null => {
    if (index >= 0 && index < savedProjects.length) {
      return savedProjects[index].data;
    }
    return null;
  };

  const deleteProject = (index: number) => {
    setSavedProjects(savedProjects.filter((_, i) => i !== index));
  };

  const clearAllProjects = () => {
    setSavedProjects([]);
  };

  return {
    savedProjects,
    saveProject,
    loadProject,
    deleteProject,
    clearAllProjects,
  };
}

/**
 * Custom hook for managing cost templates in localStorage
 */
export function useTemplates() {
  const [templates, setTemplates] = useLocalStorage<CostTemplate[]>(
    'pvfinance_cost_templates',
    []
  );

  const saveTemplate = (template: Omit<CostTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newTemplate: CostTemplate = {
      ...template,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      version: template.version || 1
    };

    // Check for duplicate names
    const exists = templates.some(t => t.name.toLowerCase() === template.name.toLowerCase());
    if (exists) {
      throw new Error(`Template "${template.name}" already exists`);
    }

    // Check localStorage quota (warn if >4MB used)
    const newSize = JSON.stringify([...templates, newTemplate]).length;
    if (newSize > 4 * 1024 * 1024) {
      throw new Error('Storage quota exceeded. Delete old templates or export them.');
    }

    setTemplates([...templates, newTemplate]);
    return newTemplate;
  };

  const updateTemplate = (id: string, updates: Partial<CostTemplate>) => {
    const updatedTemplates = templates.map(t =>
      t.id === id
        ? { ...t, ...updates, updated_at: new Date().toISOString() }
        : t
    );
    setTemplates(updatedTemplates);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  const loadTemplate = (id: string): CostTemplate | undefined => {
    return templates.find(t => t.id === id);
  };

  const exportTemplate = (id: string): string => {
    const template = loadTemplate(id);
    if (!template) throw new Error('Template not found');
    return JSON.stringify(template, null, 2);
  };

  const importTemplate = (jsonString: string): void => {
    try {
      const template = JSON.parse(jsonString) as CostTemplate;

      // Validate schema
      if (!template.name || !template.capex_items || !template.opex_items) {
        throw new Error('Invalid template format');
      }

      // Generate new ID to avoid conflicts
      const now = new Date().toISOString();
      const importedTemplate: CostTemplate = {
        ...template,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
        version: template.version || 1
      };

      setTemplates([...templates, importedTemplate]);
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Failed to import template: ${err.message}`);
      }
      throw new Error('Failed to import template');
    }
  };

  const exportAllTemplates = (): string => {
    return JSON.stringify(templates, null, 2);
  };

  const importAllTemplates = (jsonString: string): void => {
    try {
      const importedTemplates = JSON.parse(jsonString) as CostTemplate[];
      if (!Array.isArray(importedTemplates)) {
        throw new Error('Invalid templates file format');
      }

      // Merge with existing, regenerate IDs for imported
      const now = new Date().toISOString();
      const newTemplates = importedTemplates.map(t => ({
        ...t,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
        version: t.version || 1
      }));

      setTemplates([...templates, ...newTemplates]);
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Failed to import templates: ${err.message}`);
      }
      throw new Error('Failed to import templates');
    }
  };

  return {
    templates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    loadTemplate,
    exportTemplate,
    importTemplate,
    exportAllTemplates,
    importAllTemplates
  };
}
