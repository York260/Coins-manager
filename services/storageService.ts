import { AppState, Account, Transaction, AutomationRule } from '../types';

const STORAGE_KEY = 'moneykeeper_data_v1';

const defaultState: AppState = {
  accounts: [],
  transactions: [],
  automationRules: [],
  themeMode: 'normal'
};

export const loadState = (): AppState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return defaultState;
    
    const parsed = JSON.parse(serialized);
    // Migration for existing data that might not have themeMode
    if (!parsed.themeMode) {
      return { ...parsed, themeMode: 'normal' };
    }
    return parsed;
  } catch (e) {
    console.error("Failed to load state", e);
    return defaultState;
  }
};

export const saveState = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};