import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TransactionItem } from '../components/TransactionItem';
import api from '../services/api';
import type { Transaction, TransactionStats } from '../types/api';
import './History.css';

const TRANSACTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'deposit', label: 'Deposits' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'transfer', label: 'Transfers' },
  { value: 'conversion', label: 'Conversions' },
];


export function History() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTransactions = async (pageNum: number, reset: boolean = false) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await api.getTransactions(
        pageNum,
        20,
        filterType || undefined
      );

      if (response.success) {
        if (reset) {
          setTransactions(response.data);
        } else {
          setTransactions((prev) => [...prev, ...response.data]);
        }
        setHasMore(response.pagination.hasMore);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.getTransactionStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchTransactions(1, true);
  }, [filterType]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions(nextPage);
  };

  const getTotalTransactions = () => {
    if (!stats) return 0;
    return stats.stats.deposit + stats.stats.transfer + stats.stats.payment;
  };

  return (
    <div className="history-page">
      <div className="container">
        <div className="history-header">
          <h1>Transaction History</h1>
          <p>View all your past transactions</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{getTotalTransactions()}</div>
              <div className="stat-label">Total Transactions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.stats.deposit}</div>
              <div className="stat-label">Deposits</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.stats.transfer}</div>
              <div className="stat-label">Transfers</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.stats.payment}</div>
              <div className="stat-label">Payments</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filters-bar">
          <select
            className="form-input form-select filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {TRANSACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Transactions List */}
        <div className="card">
          <div className="card-body">
            {isLoading ? (
              <div className="loading-state">
                <div className="spinner" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">
                <p>No transactions found</p>
                {filterType && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setFilterType('')}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {transactions.map((tx) => (
                  <TransactionItem key={tx.id} transaction={tx} currentUserId={user?.id || 0} />
                ))}

                {hasMore && (
                  <div className="load-more">
                    <button
                      className="btn btn-secondary"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? <span className="spinner" /> : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
