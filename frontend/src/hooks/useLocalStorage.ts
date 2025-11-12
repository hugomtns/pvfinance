import { useState, useEffect } from 'react';

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
      console.log(error);
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
      console.log(error);
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
      console.log(error);
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
