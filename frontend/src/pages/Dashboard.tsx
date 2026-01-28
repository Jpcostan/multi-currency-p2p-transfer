import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BalanceCard } from '../components/BalanceCard';
import { TransactionItem } from '../components/TransactionItem';
import api from '../services/api';
import type { Balance, Transaction } from '../types/api';
import './Dashboard.css';

export function Dashboard() {
  const { user } = useAuth();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositCurrency, setDepositCurrency] = useState('USD');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [depositSuccess, setDepositSuccess] = useState('');

  const fetchData = async () => {
    try {
      const [balancesRes, transactionsRes] = await Promise.all([
        api.getBalances(),
        api.getTransactions(1, 5),
      ]);

      if (balancesRes.success) {
        setBalances(balancesRes.data);
      }
      if (transactionsRes.success) {
        setTransactions(transactionsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositLoading(true);
    setDepositError('');
    setDepositSuccess('');

    try {
      const response = await api.deposit(depositCurrency, depositAmount);
      if (response.success) {
        setDepositSuccess(`Successfully deposited ${depositAmount} ${depositCurrency}`);
        setDepositAmount('');
        fetchData(); // Refresh balances
        setTimeout(() => {
          setShowDepositModal(false);
          setDepositSuccess('');
        }, 1500);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setDepositError(error.response?.data?.error?.message || 'Deposit failed');
    } finally {
      setDepositLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>Welcome back, {user?.username}</h1>
            <p>Here's your account overview</p>
          </div>
          <div className="dashboard-actions">
            <button
              className="btn btn-primary"
              onClick={() => setShowDepositModal(true)}
            >
              + Deposit
            </button>
            <Link to="/transfer" className="btn btn-secondary">
              Send Money
            </Link>
          </div>
        </div>

        <section className="dashboard-section">
          <h2>Your Balances</h2>
          <div className="balances-grid">
            {balances.map((balance) => (
              <BalanceCard key={balance.currency} balance={balance} />
            ))}
          </div>
        </section>

        <div className="dashboard-row">
          <section className="dashboard-section flex-1">
            <div className="section-header">
              <h2>Recent Transactions</h2>
              <Link to="/history" className="btn btn-ghost btn-sm">
                View All
              </Link>
            </div>
            <div className="card">
              <div className="card-body">
                {transactions.length === 0 ? (
                  <div className="empty-state">
                    <p>No transactions yet</p>
                    <Link to="/transfer" className="btn btn-primary btn-sm">
                      Make your first transfer
                    </Link>
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <TransactionItem key={tx.id} transaction={tx} />
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="dashboard-section quick-actions">
            <h2>Quick Actions</h2>
            <div className="card">
              <div className="card-body">
                <Link to="/transfer" className="quick-action-item">
                  <span className="quick-action-icon">→</span>
                  <div>
                    <strong>Send Money</strong>
                    <p>Transfer to another user</p>
                  </div>
                </Link>
                <Link to="/convert" className="quick-action-item">
                  <span className="quick-action-icon">⇄</span>
                  <div>
                    <strong>Convert Currency</strong>
                    <p>Exchange between currencies</p>
                  </div>
                </Link>
                <button
                  className="quick-action-item"
                  onClick={() => setShowDepositModal(true)}
                >
                  <span className="quick-action-icon">↓</span>
                  <div>
                    <strong>Deposit Funds</strong>
                    <p>Add money to your account</p>
                  </div>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Deposit Funds</h3>
              <button
                className="modal-close"
                onClick={() => setShowDepositModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleDeposit}>
              <div className="modal-body">
                {depositError && <div className="alert alert-error">{depositError}</div>}
                {depositSuccess && <div className="alert alert-success">{depositSuccess}</div>}

                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select
                    className="form-input form-select"
                    value={depositCurrency}
                    onChange={(e) => setDepositCurrency(e.target.value)}
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="BTC">BTC - Bitcoin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDepositModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={depositLoading}
                >
                  {depositLoading ? <span className="spinner" /> : 'Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
