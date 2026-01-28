import type { Transaction } from '../types/api';
import './TransactionItem.css';

interface TransactionItemProps {
  transaction: Transaction;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  deposit: { icon: '↓', label: 'Deposit', color: 'success' },
  withdrawal: { icon: '↑', label: 'Withdrawal', color: 'warning' },
  transfer: { icon: '→', label: 'Transfer', color: 'info' },
  conversion: { icon: '⇄', label: 'Conversion', color: 'primary' },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'badge-pending' },
  completed: { label: 'Completed', className: 'badge-success' },
  failed: { label: 'Failed', className: 'badge-error' },
};

function formatAmount(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (currency === 'BTC') {
    return `${num.toFixed(8)} BTC`;
  }
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
  return `${symbols[currency] || ''}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (diffHours < 48) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const typeConfig = TYPE_CONFIG[transaction.type] || { icon: '•', label: transaction.type, color: 'gray' };
  const statusConfig = STATUS_CONFIG[transaction.status] || { label: transaction.status, className: '' };

  const getDescription = () => {
    switch (transaction.type) {
      case 'deposit':
        return `Deposited ${formatAmount(transaction.toAmount, transaction.toCurrency)}`;
      case 'withdrawal':
        return `Withdrew ${formatAmount(transaction.fromAmount, transaction.fromCurrency)}`;
      case 'transfer':
        if (transaction.counterpartyUsername) {
          return transaction.fromAmount !== '0'
            ? `Sent to ${transaction.counterpartyUsername}`
            : `Received from ${transaction.counterpartyUsername}`;
        }
        return 'Transfer';
      case 'conversion':
        return `${formatAmount(transaction.fromAmount, transaction.fromCurrency)} → ${formatAmount(transaction.toAmount, transaction.toCurrency)}`;
      default:
        return transaction.description || 'Transaction';
    }
  };

  const getAmount = () => {
    const isNegative = transaction.type === 'withdrawal' ||
      (transaction.type === 'transfer' && parseFloat(transaction.fromAmount) > 0);

    if (transaction.type === 'conversion') {
      return null; // Show in description instead
    }

    const amount = transaction.type === 'deposit' || (transaction.type === 'transfer' && parseFloat(transaction.fromAmount) === 0)
      ? transaction.toAmount
      : transaction.fromAmount;

    const currency = transaction.type === 'deposit' || (transaction.type === 'transfer' && parseFloat(transaction.fromAmount) === 0)
      ? transaction.toCurrency
      : transaction.fromCurrency;

    return {
      value: formatAmount(amount, currency),
      isNegative,
    };
  };

  const amountInfo = getAmount();

  return (
    <div className="transaction-item">
      <div className={`transaction-icon transaction-icon-${typeConfig.color}`}>
        {typeConfig.icon}
      </div>
      <div className="transaction-details">
        <div className="transaction-primary">
          <span className="transaction-description">{getDescription()}</span>
          {amountInfo && (
            <span className={`transaction-amount ${amountInfo.isNegative ? 'negative' : 'positive'}`}>
              {amountInfo.isNegative ? '-' : '+'}{amountInfo.value}
            </span>
          )}
        </div>
        <div className="transaction-secondary">
          <span className="transaction-type">{typeConfig.label}</span>
          <span className="transaction-dot">•</span>
          <span className="transaction-date">{formatDate(transaction.createdAt)}</span>
          <span className={`badge ${statusConfig.className}`}>{statusConfig.label}</span>
        </div>
      </div>
    </div>
  );
}
