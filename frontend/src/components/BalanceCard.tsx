import type { Balance } from '../types/api';
import './BalanceCard.css';

interface BalanceCardProps {
  balance: Balance;
  onClick?: () => void;
}

const CURRENCY_INFO: Record<string, { symbol: string; name: string; icon: string }> = {
  USD: { symbol: '$', name: 'US Dollar', icon: '🇺🇸' },
  EUR: { symbol: '€', name: 'Euro', icon: '🇪🇺' },
  GBP: { symbol: '£', name: 'British Pound', icon: '🇬🇧' },
  BTC: { symbol: '₿', name: 'Bitcoin', icon: '₿' },
  ETH: { symbol: 'Ξ', name: 'Ethereum', icon: '⟠' },
};

function formatBalanceAmount(amount: number, currency: string): string {
  if (currency === 'BTC') {
    return amount.toFixed(8);
  }
  if (currency === 'ETH') {
    return amount.toFixed(6);
  }
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function BalanceCard({ balance, onClick }: BalanceCardProps) {
  const info = CURRENCY_INFO[balance.currency] || { symbol: '', name: balance.currency, icon: '💰' };
  const formattedBalance = formatBalanceAmount(balance.amount, balance.currency);

  return (
    <div
      className={`balance-card currency-card-${balance.currency.toLowerCase()}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="balance-header">
        <span className="balance-icon">{info.icon}</span>
        <span className="balance-currency">{balance.currency}</span>
      </div>
      <div className="balance-amount">
        <span className="balance-symbol">{info.symbol}</span>
        <span className="balance-value">{formattedBalance}</span>
      </div>
      <div className="balance-name">{info.name}</div>
    </div>
  );
}
