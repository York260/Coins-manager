import React from 'react';
import { Transaction, TransactionType } from '../types';
import { ArrowDownLeft, ArrowUpRight, Repeat } from 'lucide-react';

interface TransactionItemProps {
  transaction: Transaction;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const isDeposit = transaction.type === TransactionType.DEPOSIT;
  const dateObj = new Date(transaction.date);
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDeposit ? 'bg-green-100' : 'bg-red-100'}`}>
          {isDeposit ? (
            <ArrowDownLeft className="w-5 h-5 text-green-600" />
          ) : (
            <ArrowUpRight className="w-5 h-5 text-red-600" />
          )}
        </div>
        <div>
          <p className="font-medium text-slate-800 flex items-center gap-1">
            {transaction.note}
            {transaction.isAuto && <Repeat className="w-3 h-3 text-blue-500" />}
          </p>
          <p className="text-xs text-slate-400">
            {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
      <span className={`font-bold ${isDeposit ? 'text-green-600' : 'text-slate-900'}`}>
        {isDeposit ? '+' : '-'}${transaction.amount.toLocaleString()}
      </span>
    </div>
  );
};