import React from 'react';
import { Account } from '../types';
import { Wallet, ChevronRight } from 'lucide-react';

interface AccountCardProps {
  account: Account;
  onClick: () => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform cursor-pointer relative overflow-hidden"
    >
      <div className={`absolute top-0 left-0 w-1.5 h-full ${account.color}`}></div>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-50`}>
            <Wallet className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{account.name}</h3>
            <p className="text-xs text-slate-500">點擊查看詳情</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold text-slate-900">
            ${account.balance.toLocaleString()}
          </span>
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </div>
      </div>
    </div>
  );
};