
import { useState, useEffect } from 'react';

function getValueFromLocalStorage<T,>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') {
    return initialValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.error(error);
    return initialValue;
  }
}

export function useLocalStorage<T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    return getValueFromLocalStorage(key, initialValue);
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (e: any) {
          if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22) {
            console.error("Storage quota exceeded. Attempting to free space...");
            
            // Priority 1: Clear old notifications
            const notifications = window.localStorage.getItem('notifications');
            if (notifications && key !== 'notifications') {
                window.localStorage.removeItem('notifications');
                try {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                    return;
                } catch (retryErr) {}
            }

            // Priority 2: Clear old enquiries if we're trying to save a lesson/quiz
            if (key !== 'enquiries') {
                const enquiries = window.localStorage.getItem('enquiries');
                if (enquiries) {
                    window.localStorage.removeItem('enquiries');
                    try {
                        window.localStorage.setItem(key, JSON.stringify(valueToStore));
                        return;
                    } catch (retryErr) {}
                }
            }

            alert("Browser Storage is Full! \n\nWe couldn't save this item because your browser's local storage limit (approx. 5MB) has been reached. Please delete old recordings or enquiries to make room.");
          }
          throw e;
        }
      }
    } catch (error) {
      console.error("LocalStorage Error:", error);
    }
  };
  
  useEffect(() => {
    setStoredValue(getValueFromLocalStorage(key, initialValue));
  }, [key, initialValue]);


  return [storedValue, setValue];
}
