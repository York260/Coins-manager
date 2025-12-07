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

    // Migration for existing data
    let migratedState = { ...parsed };

    // Add themeMode if missing
    if (!migratedState.themeMode) {
      migratedState.themeMode = 'normal';
    }

    // Migrate automation rules to include frequency
    if (migratedState.automationRules) {
      migratedState.automationRules = migratedState.automationRules.map((rule: any) => {
        if (!rule.frequency) {
          // Old rules default to daily frequency
          return {
            ...rule,
            frequency: 'daily',
            excludeWeekends: rule.excludeWeekends !== undefined ? rule.excludeWeekends : true
          };
        }
        return rule;
      });
    }

    return migratedState;
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