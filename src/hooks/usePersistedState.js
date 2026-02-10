import { useState, useEffect } from 'react';

/**
 * Custom hook for persisting state to localStorage
 * @param {string} key - The localStorage key
 * @param {any} defaultValue - Default value if nothing in storage
 * @returns {[any, Function]} - State value and setter function
 */
export const usePersistedState = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`Failed to persist ${key}:`, err);
    }
  }, [key, value]);

  return [value, setValue];
};

export default usePersistedState;
