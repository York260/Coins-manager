import React, { useState, useEffect, useCallback } from 'react';
import { 
  AppState, 
  ViewState, 
  Account, 
  Transaction, 
  TransactionType, 
  AutomationRule 
} from './types';
import { loadState, saveState, generateId } from './services/storageService';
import { analyzeFinances } from './services/geminiService';
import { Button } from './components/Button';
import { AccountCard } from './components/AccountCard';
import { TransactionItem } from './components/TransactionItem';
import { 
  Plus, 
  LayoutDashboard, 
  Workflow, 
  Sparkles, 
  ArrowLeft, 
  Trash2, 
  PlusCircle, 
  MinusCircle, 
  Save, 
  X,
  Cpu,
  Activity,
  Zap,
  Palette,
  Moon,
  Sun
} from 'lucide-react';

const COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];

// Cyberpunk Theme Mapping
const CYBER_THEMES: Record<string, any> = {
  'bg-blue-500': {
    text: 'text-cyan-400',
    border: 'border-cyan-500',
    shadow: 'shadow-cyan-500/50',
    bg: 'bg-cyan-500',
    bg_soft: 'bg-cyan-950/50',
    gradient_text: 'bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500',
    button_hover: 'hover:bg-cyan-500 hover:text-black',
  },
  'bg-green-500': {
    text: 'text-emerald-400',
    border: 'border-emerald-500',
    shadow: 'shadow-emerald-500/50',
    bg: 'bg-emerald-500',
    bg_soft: 'bg-emerald-950/50',
    gradient_text: 'bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-500',
    button_hover: 'hover:bg-emerald-500 hover:text-black',
  },
  'bg-purple-500': {
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-500',
    shadow: 'shadow-fuchsia-500/50',
    bg: 'bg-fuchsia-500',
    bg_soft: 'bg-fuchsia-950/50',
    gradient_text: 'bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-purple-500',
    button_hover: 'hover:bg-fuchsia-500 hover:text-black',
  },
  'bg-orange-500': {
    text: 'text-orange-400',
    border: 'border-orange-500',
    shadow: 'shadow-orange-500/50',
    bg: 'bg-orange-500',
    bg_soft: 'bg-orange-950/50',
    gradient_text: 'bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-500',
    button_hover: 'hover:bg-orange-500 hover:text-black',
  },
  'bg-pink-500': {
    text: 'text-pink-400',
    border: 'border-pink-500',
    shadow: 'shadow-pink-500/50',
    bg: 'bg-pink-500',
    bg_soft: 'bg-pink-950/50',
    gradient_text: 'bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-rose-500',
    button_hover: 'hover:bg-pink-500 hover:text-black',
  }
};

const App: React.FC = () => {
  // --- State ---
  const [state, setState] = useState<AppState>(loadState());
  const [view, setView] = useState<ViewState>('ACCOUNTS');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  
  // Forms state
  const [newAccountName, setNewAccountName] = useState('');
  const [transactionForm, setTransactionForm] = useState({ type: TransactionType.DEPOSIT, amount: '', note: '' });
  const [ruleForm, setRuleForm] = useState({ 
    accountId: '', 
    type: TransactionType.DEPOSIT, 
    amount: '', 
    excludeWeekends: true, 
    description: '' 
  });
  
  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Helpers ---
  const getAccount = (id: string) => state.accounts.find(a => a.id === id);
  const getAccountTransactions = (id: string) => state.transactions.filter(t => t.accountId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- Core Logic: Automation Processor ---
  const processAutomations = useCallback((currentState: AppState): AppState => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let newState = { ...currentState };
    let hasChanges = false;

    const newTransactions: Transaction[] = [];
    
    // We iterate through rules to see if they need to run
    const updatedRules = newState.automationRules.map(rule => {
      if (!rule.active) return rule;

      const lastRun = new Date(rule.lastRunDate);
      lastRun.setHours(0, 0, 0, 0);

      // Calculate days difference
      const diffTime = Math.abs(today.getTime() - lastRun.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) return rule; // Already ran today or future date

      let processedDate = new Date(lastRun);
      let executedCount = 0;

      // Iterate day by day from last run + 1 day up to today
      for (let i = 0; i < diffDays; i++) {
        processedDate.setDate(processedDate.getDate() + 1);
        
        // Check exclusion
        const dayOfWeek = processedDate.getDay(); // 0 = Sun, 6 = Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (rule.excludeWeekends && isWeekend) {
          continue; // Skip weekend
        }

        // Apply transaction
        executedCount++;
        const txDate = new Date(processedDate);
        txDate.setHours(9, 0, 0); // Set a generic time like 9 AM

        newTransactions.push({
          id: generateId(),
          accountId: rule.accountId,
          type: rule.type,
          amount: rule.amount,
          date: txDate.toISOString(),
          note: `自動${rule.type === 'DEPOSIT' ? '匯入' : '扣款'}: ${rule.description}`,
          isAuto: true
        });
      }

      if (executedCount > 0) {
        hasChanges = true;
        // Update last run to today so we don't process again
        return {
          ...rule,
          lastRunDate: today.toISOString().split('T')[0]
        };
      }
      
      // Even if skipped due to weekends, we update lastRunDate so we don't check those days again
      return {
          ...rule,
          lastRunDate: today.toISOString().split('T')[0]
      };
    });

    if (updatedRules.some((r, i) => r.lastRunDate !== newState.automationRules[i].lastRunDate)) {
        hasChanges = true;
    }

    if (hasChanges) {
      // Update Balances
      const updatedAccounts = newState.accounts.map(acc => {
        const accTx = newTransactions.filter(t => t.accountId === acc.id);
        if (accTx.length === 0) return acc;
        
        const balanceChange = accTx.reduce((sum, t) => {
          return sum + (t.type === TransactionType.DEPOSIT ? t.amount : -t.amount);
        }, 0);
        
        return { ...acc, balance: acc.balance + balanceChange };
      });

      return {
        accounts: updatedAccounts,
        transactions: [...currentState.transactions, ...newTransactions],
        automationRules: updatedRules,
        themeMode: currentState.themeMode
      };
    }

    return currentState;
  }, []);

  // Initialize and run automation on mount
  useEffect(() => {
    const freshState = processAutomations(state);
    if (freshState !== state) {
      setState(freshState);
      saveState(freshState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // --- Actions ---

  const handleAddAccount = () => {
    if (!newAccountName.trim()) return;
    const newAccount: Account = {
      id: generateId(),
      name: newAccountName,
      balance: 0,
      color: COLORS[state.accounts.length % COLORS.length]
    };
    const nextState = { ...state, accounts: [...state.accounts, newAccount] };
    setState(nextState);
    saveState(nextState);
    setNewAccountName('');
    setShowAddAccountModal(false);
  };

  const handleDeleteAccount = (id: string) => {
    if (!window.confirm("確定要刪除此帳戶嗎？所有交易紀錄將被刪除。")) return;
    const nextState = {
      accounts: state.accounts.filter(a => a.id !== id),
      transactions: state.transactions.filter(t => t.accountId !== id),
      automationRules: state.automationRules.filter(r => r.accountId !== id),
      themeMode: state.themeMode
    };
    setState(nextState);
    saveState(nextState);
    if (selectedAccountId === id) {
      setSelectedAccountId(null);
      setView('ACCOUNTS');
    }
  };

  const handleTransaction = () => {
    if (!selectedAccountId || !transactionForm.amount) return;
    const amount = parseFloat(transactionForm.amount);
    if (isNaN(amount) || amount <= 0) return;

    const newTx: Transaction = {
      id: generateId(),
      accountId: selectedAccountId,
      type: transactionForm.type,
      amount: amount,
      date: new Date().toISOString(),
      note: transactionForm.note || (transactionForm.type === TransactionType.DEPOSIT ? '手動匯入' : '手動扣款'),
      isAuto: false
    };

    const updatedAccounts = state.accounts.map(acc => {
      if (acc.id === selectedAccountId) {
        return {
          ...acc,
          balance: transactionForm.type === TransactionType.DEPOSIT 
            ? acc.balance + amount 
            : acc.balance - amount
        };
      }
      return acc;
    });

    const nextState = {
      ...state,
      accounts: updatedAccounts,
      transactions: [newTx, ...state.transactions]
    };

    setState(nextState);
    saveState(nextState);
    setShowTransactionModal(false);
    setTransactionForm({ type: TransactionType.DEPOSIT, amount: '', note: '' });
  };

  const handleAddRule = () => {
    const amount = parseFloat(ruleForm.amount);
    if (!ruleForm.accountId || isNaN(amount) || amount <= 0 || !ruleForm.description) {
        alert("請填寫完整規則資訊");
        return;
    }

    const newRule: AutomationRule = {
      id: generateId(),
      accountId: ruleForm.accountId,
      type: ruleForm.type,
      amount: amount,
      excludeWeekends: ruleForm.excludeWeekends,
      active: true,
      description: ruleForm.description,
      lastRunDate: new Date().toISOString().split('T')[0] // Starts from today
    };

    const nextState = {
      ...state,
      automationRules: [...state.automationRules, newRule]
    };
    setState(nextState);
    saveState(nextState);
    setShowAddRuleModal(false);
    setRuleForm({ ...ruleForm, amount: '', description: '' });
  };

  const toggleRule = (id: string) => {
    const nextState = {
      ...state,
      automationRules: state.automationRules.map(r => r.id === id ? { ...r, active: !r.active } : r)
    };
    setState(nextState);
    saveState(nextState);
  };

  const deleteRule = (id: string) => {
    const nextState = {
        ...state,
        automationRules: state.automationRules.filter(r => r.id !== id)
    };
    setState(nextState);
    saveState(nextState);
  };

  const toggleTheme = () => {
    const nextTheme = state.themeMode === 'cyberpunk' ? 'normal' : 'cyberpunk';
    const nextState = { ...state, themeMode: nextTheme };
    setState(nextState);
    saveState(nextState);
  };

  const triggerAIAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeFinances(state.accounts, state.transactions, state.automationRules);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  // --- Views ---

  const renderAccountsView = () => (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">我的帳戶</h1>
          <p className="text-slate-500">總資產: ${state.accounts.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}</p>
        </div>
        <Button onClick={() => setShowAddAccountModal(true)} size="sm">
          <Plus className="w-5 h-5" />
        </Button>
      </header>

      {state.accounts.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-dashed border-slate-300">
          <p className="text-slate-500 mb-4">目前沒有帳戶</p>
          <Button variant="secondary" onClick={() => setShowAddAccountModal(true)}>新增第一個帳戶</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {state.accounts.map(acc => (
            <AccountCard 
              key={acc.id} 
              account={acc} 
              onClick={() => {
                setSelectedAccountId(acc.id);
                setView('ACCOUNT_DETAIL');
              }} 
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderAccountDetailView = () => {
    if (!selectedAccountId) return null;
    const account = getAccount(selectedAccountId);
    if (!account) return null;
    const history = getAccountTransactions(selectedAccountId);
    
    // --- CYBERPUNK VIEW ---
    if (state.themeMode === 'cyberpunk') {
      const theme = CYBER_THEMES[account.color] || CYBER_THEMES['bg-blue-500'];
      
      return (
        <div className={`fixed inset-0 z-10 overflow-y-auto no-scrollbar bg-slate-950 font-mono text-slate-200 transition-colors duration-300`}>
           {/* Background Grid Effect */}
           <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
                style={{ 
                    backgroundImage: `linear-gradient(${theme.bg} 1px, transparent 1px), linear-gradient(90deg, ${theme.bg} 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
           ></div>
           
           <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col p-6">
              <header className="flex items-center justify-between mb-8 pt-2">
                  <button 
                      onClick={() => setView('ACCOUNTS')} 
                      className={`p-2 border ${theme.border} text-white hover:bg-white/10 transition-colors`}
                      style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                  >
                      <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div className="flex gap-4 items-center">
                      <button onClick={toggleTheme} className={`p-2 hover:text-white transition-colors ${theme.text}`}>
                        <Sun className="w-6 h-6" />
                      </button>
                      <button 
                          onClick={() => handleDeleteAccount(account.id)} 
                          className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                      >
                          <Trash2 className="w-5 h-5" />
                      </button>
                  </div>
              </header>

              <div className="mb-8">
                 <h1 className={`text-xl font-bold uppercase tracking-widest ${theme.text} drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] mb-1`}>
                      {account.name}
                  </h1>
                  <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">System Online</p>
              </div>

              {/* Main Balance Card */}
              <div className={`relative mb-8 p-6 border-2 ${theme.border} ${theme.bg_soft} backdrop-blur-md shadow-[0_0_30px_-5px_rgba(0,0,0,0.5)]`}
                   style={{ 
                       boxShadow: `0 0 20px -5px ${theme.bg.replace('bg-', '')}`,
                       clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)'
                   }}
              >
                  <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 ${theme.border}`}></div>
                  <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 ${theme.border}`}></div>
                  
                  <div className="flex items-center gap-2 mb-2 opacity-80">
                      <Cpu className={`w-4 h-4 ${theme.text}`} />
                      <span className={`text-xs uppercase tracking-widest ${theme.text}`}>Total Balance</span>
                  </div>
                  
                  <p className="text-4xl font-black text-white tracking-tighter mb-6 drop-shadow-md">
                      ${account.balance.toLocaleString()}
                  </p>

                  <div className="flex gap-4">
                      <button 
                           onClick={() => {
                              setTransactionForm({ ...transactionForm, type: TransactionType.DEPOSIT });
                              setShowTransactionModal(true);
                            }}
                          className={`flex-1 border ${theme.border} ${theme.text} py-3 px-4 text-sm font-bold uppercase tracking-wider transition-all ${theme.button_hover} active:scale-95 flex items-center justify-center gap-2`}
                          style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                      >
                          <PlusCircle className="w-4 h-4" /> Deposit
                      </button>
                      <button 
                           onClick={() => {
                              setTransactionForm({ ...transactionForm, type: TransactionType.WITHDRAW });
                              setShowTransactionModal(true);
                            }}
                          className={`flex-1 border ${theme.border} ${theme.text} py-3 px-4 text-sm font-bold uppercase tracking-wider transition-all ${theme.button_hover} active:scale-95 flex items-center justify-center gap-2`}
                          style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                      >
                          <MinusCircle className="w-4 h-4" /> Withdraw
                      </button>
                  </div>
              </div>

              {/* Transaction Log */}
              <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                      <Activity className={`w-4 h-4 ${theme.text}`} />
                      <h2 className={`text-sm font-bold uppercase tracking-widest ${theme.text}`}>Transaction Logs</h2>
                  </div>
                  
                  <div className="space-y-3">
                      {history.length === 0 ? (
                           <div className="text-center py-12 border border-dashed border-slate-800 rounded">
                              <p className="text-xs text-slate-600 uppercase tracking-widest">No Data Stream</p>
                           </div>
                      ) : (
                          history.map((t) => {
                              const isDep = t.type === TransactionType.DEPOSIT;
                              return (
                                  <div key={t.id} className="group flex items-start justify-between p-3 border-l-2 border-slate-800 hover:border-white hover:bg-slate-900 transition-all">
                                      <div>
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className={`text-[10px] px-1.5 py-0.5 border ${isDep ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
                                                  {isDep ? 'IN' : 'OUT'}
                                              </span>
                                              <span className="text-slate-300 font-bold text-sm">{t.note}</span>
                                              {t.isAuto && <Zap className="w-3 h-3 text-yellow-500" />}
                                          </div>
                                          <p className="text-[10px] text-slate-600 font-mono">
                                              {new Date(t.date).toLocaleString()}
                                          </p>
                                      </div>
                                      <span className={`font-bold text-lg ${isDep ? 'text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]'}`}>
                                          {isDep ? '+' : '-'}${t.amount.toLocaleString()}
                                      </span>
                                  </div>
                              );
                          })
                      )}
                  </div>
              </div>
           </div>
        </div>
      );
    } 
    
    // --- NORMAL VIEW ---
    else {
      return (
        <div className="pb-24 max-w-md mx-auto min-h-screen bg-slate-50 transition-colors duration-300">
          <div className="p-6">
            <header className="flex items-center mb-6">
              <button onClick={() => setView('ACCOUNTS')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 mr-2">
                <ArrowLeft className="w-6 h-6 text-slate-700" />
              </button>
              <h1 className="text-xl font-bold text-slate-900 flex-1">{account.name}</h1>
              <div className="flex gap-2">
                <button onClick={toggleTheme} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full">
                  <Moon className="w-5 h-5" />
                </button>
                <button onClick={() => handleDeleteAccount(account.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </header>

            <div className={`${account.color} rounded-2xl p-6 text-white shadow-lg mb-8 relative overflow-hidden transition-all`}>
              <div className="relative z-10">
                <p className="text-white/80 text-sm mb-1">當前餘額</p>
                <p className="text-4xl font-bold mb-6">${account.balance.toLocaleString()}</p>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => {
                      setTransactionForm({ ...transactionForm, type: TransactionType.DEPOSIT });
                      setShowTransactionModal(true);
                    }}
                    className="flex-1 bg-white/10 hover:bg-white/20 border-0 backdrop-blur-sm text-white"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" /> 匯入
                  </Button>
                  <Button 
                    onClick={() => {
                      setTransactionForm({ ...transactionForm, type: TransactionType.WITHDRAW });
                      setShowTransactionModal(true);
                    }}
                    className="flex-1 bg-white/10 hover:bg-white/20 border-0 backdrop-blur-sm text-white"
                  >
                    <MinusCircle className="w-4 h-4 mr-2" /> 扣款
                  </Button>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4">交易日誌</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 min-h-[200px]">
                {history.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">尚無交易紀錄</p>
                ) : (
                  <div className="space-y-1">
                    {history.map(t => <TransactionItem key={t.id} transaction={t} />)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  const renderAutomationView = () => (
    <div className="pb-24">
       <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">自動化設定</h1>
          <p className="text-slate-500">每日自動執行</p>
        </div>
        <Button onClick={() => {
            setRuleForm(prev => ({ ...prev, accountId: state.accounts[0]?.id || '' }));
            setShowAddRuleModal(true);
        }} size="sm">
          <Plus className="w-5 h-5" />
        </Button>
      </header>

      {state.automationRules.length === 0 ? (
         <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-dashed border-slate-300">
           <p className="text-slate-500 mb-4">尚未設定自動化規則</p>
           <Button variant="secondary" onClick={() => {
                if (state.accounts.length === 0) {
                    alert("請先建立帳戶");
                    setView('ACCOUNTS');
                    return;
                }
                setRuleForm(prev => ({ ...prev, accountId: state.accounts[0]?.id || '' }));
                setShowAddRuleModal(true);
           }}>新增規則</Button>
         </div>
      ) : (
        <div className="space-y-4">
          {state.automationRules.map(rule => {
            const acc = getAccount(rule.accountId);
            return (
              <div key={rule.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800">{rule.description}</h3>
                    <p className="text-xs text-slate-500">帳戶: {acc?.name || '未知帳戶'}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold ${rule.type === TransactionType.DEPOSIT ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {rule.type === TransactionType.DEPOSIT ? '匯入' : '扣款'}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-slate-900">${rule.amount.toLocaleString()} <span className="text-sm font-normal text-slate-400">/ 日</span></span>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-600 border-t border-slate-50 pt-3">
                  <span className="flex items-center gap-2">
                    {rule.excludeWeekends && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs">排除假日</span>}
                    {!rule.active && <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs">已暫停</span>}
                  </span>
                  
                  <div className="flex gap-2">
                    <button onClick={() => deleteRule(rule.id)} className="p-2 text-slate-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => toggleRule(rule.id)}
                        className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${rule.active ? 'bg-slate-100 text-slate-600' : 'bg-primary text-white'}`}
                    >
                        {rule.active ? '暫停' : '啟用'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderAIView = () => (
    <div className="pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            智慧分析
        </h1>
        <p className="text-slate-500">由 Google Gemini 提供支援</p>
      </header>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <p className="text-slate-600 mb-6 leading-relaxed">
            AI 財務顧問可以根據您的交易紀錄與自動化設定，分析資金流動狀況並提供理財建議。
        </p>
        <Button 
            onClick={triggerAIAnalysis} 
            disabled={isAnalyzing} 
            fullWidth 
            className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
        >
            {isAnalyzing ? '分析中...' : '開始分析'}
        </Button>
      </div>

      {aiAnalysis && (
        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 animate-fade-in">
            <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> 分析報告
            </h3>
            <div className="text-slate-700 text-sm leading-7 whitespace-pre-wrap">
                {aiAnalysis}
            </div>
        </div>
      )}
    </div>
  );

  // --- Main Render ---

  // Determine main background based on view and theme
  const mainBgClass = (view === 'ACCOUNT_DETAIL' && state.themeMode === 'cyberpunk') 
    ? 'bg-slate-950' 
    : 'bg-slate-50';

  return (
    <div className={`min-h-screen font-sans flex flex-col items-center ${mainBgClass} transition-colors duration-500`}>
      <div className={`w-full max-w-md h-full min-h-screen flex flex-col relative shadow-2xl ${mainBgClass}`}>
        
        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto no-scrollbar">
          {view === 'ACCOUNTS' && renderAccountsView()}
          {view === 'ACCOUNT_DETAIL' && renderAccountDetailView()}
          {view === 'AUTOMATION' && renderAutomationView()}
          {view === 'AI_ANALYSIS' && renderAIView()}
        </main>

        {/* Bottom Navigation - Only show if NOT in detail view */}
        {view !== 'ACCOUNT_DETAIL' && (
            <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-40">
                <button 
                    onClick={() => setView('ACCOUNTS')}
                    className={`flex flex-col items-center gap-1 ${view === 'ACCOUNTS' ? 'text-primary' : 'text-slate-400'}`}
                >
                    <LayoutDashboard className="w-6 h-6" />
                    <span className="text-[10px] font-medium">總覽</span>
                </button>
                <button 
                    onClick={() => setView('AUTOMATION')}
                    className={`flex flex-col items-center gap-1 ${view === 'AUTOMATION' ? 'text-primary' : 'text-slate-400'}`}
                >
                    <Workflow className="w-6 h-6" />
                    <span className="text-[10px] font-medium">自動化</span>
                </button>
                <button 
                    onClick={() => setView('AI_ANALYSIS')}
                    className={`flex flex-col items-center gap-1 ${view === 'AI_ANALYSIS' ? 'text-purple-600' : 'text-slate-400'}`}
                >
                    <Sparkles className="w-6 h-6" />
                    <span className="text-[10px] font-medium">智慧分析</span>
                </button>
            </nav>
        )}

        {/* Modals */}
        
        {/* Add Account Modal */}
        {showAddAccountModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                    <h2 className="text-xl font-bold mb-4">新增帳戶</h2>
                    <input 
                        type="text" 
                        placeholder="帳戶名稱 (例如: 生活費)" 
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 focus:ring-2 focus:ring-primary focus:outline-none"
                        value={newAccountName}
                        onChange={e => setNewAccountName(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <Button variant="secondary" fullWidth onClick={() => setShowAddAccountModal(false)}>取消</Button>
                        <Button fullWidth onClick={handleAddAccount}>建立</Button>
                    </div>
                </div>
            </div>
        )}

        {/* Transaction Modal */}
        {showTransactionModal && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{transactionForm.type === TransactionType.DEPOSIT ? '匯入資金' : '扣除款項'}</h2>
                    <button onClick={() => setShowTransactionModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
                 </div>
                 
                 <div className="mb-4">
                     <label className="block text-sm text-slate-500 mb-1">金額</label>
                     <input 
                         type="number" 
                         className="w-full p-3 text-2xl font-bold bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                         placeholder="0"
                         value={transactionForm.amount}
                         onChange={e => setTransactionForm({...transactionForm, amount: e.target.value})}
                     />
                 </div>

                 <div className="mb-6">
                     <label className="block text-sm text-slate-500 mb-1">備註</label>
                     <input 
                         type="text" 
                         className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                         placeholder="輸入備註..."
                         value={transactionForm.note}
                         onChange={e => setTransactionForm({...transactionForm, note: e.target.value})}
                     />
                 </div>

                 <Button fullWidth onClick={handleTransaction} variant={transactionForm.type === TransactionType.DEPOSIT ? 'primary' : 'danger'}>
                    確認{transactionForm.type === TransactionType.DEPOSIT ? '匯入' : '扣款'}
                 </Button>
             </div>
         </div>
        )}

        {/* Add Rule Modal */}
        {showAddRuleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl h-[80vh] overflow-y-auto no-scrollbar">
                <h2 className="text-xl font-bold mb-6">新增自動化規則</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">選擇帳戶</label>
                        <select 
                            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200"
                            value={ruleForm.accountId}
                            onChange={e => setRuleForm({...ruleForm, accountId: e.target.value})}
                        >
                            {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">類型</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button 
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${ruleForm.type === TransactionType.DEPOSIT ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                                onClick={() => setRuleForm({...ruleForm, type: TransactionType.DEPOSIT})}
                            >
                                每日匯入
                            </button>
                            <button 
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${ruleForm.type === TransactionType.WITHDRAW ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                                onClick={() => setRuleForm({...ruleForm, type: TransactionType.WITHDRAW})}
                            >
                                每日扣款
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">每日金額</label>
                        <input 
                            type="number" 
                            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                            placeholder="0"
                            value={ruleForm.amount}
                            onChange={e => setRuleForm({...ruleForm, amount: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">規則名稱 (備註)</label>
                        <input 
                            type="text" 
                            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:outline-none"
                            placeholder="例如: 每日午餐費"
                            value={ruleForm.description}
                            onChange={e => setRuleForm({...ruleForm, description: e.target.value})}
                        />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <input 
                            type="checkbox" 
                            id="weekend" 
                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                            checked={ruleForm.excludeWeekends}
                            onChange={e => setRuleForm({...ruleForm, excludeWeekends: e.target.checked})}
                        />
                        <label htmlFor="weekend" className="text-sm text-slate-700">排除週六、週日</label>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <Button variant="secondary" fullWidth onClick={() => setShowAddRuleModal(false)}>取消</Button>
                    <Button fullWidth onClick={handleAddRule}><Save className="w-4 h-4 mr-2"/> 儲存規則</Button>
                </div>
            </div>
        </div>
        )}

      </div>
    </div>
  );
};

export default App;