import { SetStateAction } from 'react';

/**
 * Creates a toggle function that optimistically updates a boolean field on an item
 * in a state array, then calls an API. Rolls back on error.
 *
 * Uses the callback form of setState (prev => ...) to avoid stale closure bugs
 * when multiple toggles fire before React re-renders.
 */
export function useFieldToggle<T extends { id: number }>(
  setState: (value: SetStateAction<T[]>) => void,
  apiCall: (item: T, newValue: boolean) => Promise<unknown>,
  field: keyof T & string,
) {
  return async (item: T) => {
    const oldValue = item[field] as boolean;
    const newValue = !oldValue;

    // Optimistic update using callback form (no stale closure)
    setState(prev => prev.map(x => x.id === item.id ? { ...x, [field]: newValue } : x));

    try {
      await apiCall(item, newValue);
    } catch {
      // Rollback using callback form
      setState(prev => prev.map(x => x.id === item.id ? { ...x, [field]: oldValue } : x));
    }
  };
}

/**
 * Creates a function that sets a boolean field to a specific value (not toggle).
 * Used by AlertsTab remove handlers that always set show_on_card to false.
 */
export function useFieldSet<T extends { id: number }>(
  setState: (value: SetStateAction<T[]>) => void,
  apiCall: (item: T, newValue: boolean) => Promise<unknown>,
  field: keyof T & string,
  value: boolean,
) {
  return async (item: T) => {
    const oldValue = item[field] as boolean;

    setState(prev => prev.map(x => x.id === item.id ? { ...x, [field]: value } : x));

    try {
      await apiCall(item, value);
    } catch {
      setState(prev => prev.map(x => x.id === item.id ? { ...x, [field]: oldValue } : x));
    }
  };
}
