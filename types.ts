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

export interface AutomationRule {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  excludeWeekends: boolean;
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

export type ViewState = 'ACCOUNTS' | 'ACCOUNT_DETAIL' | 'AUTOMATION' | 'AI_ANALYSIS';