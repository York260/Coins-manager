export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW'
}

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO String
  note: string;
  isAuto: boolean;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  color: string;
}

export type FrequencyType = 'daily' | 'weekly';

export interface AutomationRule {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  frequency: FrequencyType; // 'daily' or 'weekly'
  excludeWeekends?: boolean; // For daily frequency only
  weekdays?: number[]; // For weekly frequency: 0=Sunday, 1=Monday, ..., 6=Saturday
  lastRunDate: string; // ISO String of the last successful run (YYYY-MM-DD)
  active: boolean;
  description: string;
}

export type ThemeMode = 'normal' | 'cyberpunk';

export interface AppState {
  accounts: Account[];
  transactions: Transaction[];
  automationRules: AutomationRule[];
  themeMode: ThemeMode;
}

export type ViewState = 'ACCOUNTS' | 'ACCOUNT_DETAIL' | 'AUTOMATION' | 'AI_ANALYSIS' | 'SETTINGS';