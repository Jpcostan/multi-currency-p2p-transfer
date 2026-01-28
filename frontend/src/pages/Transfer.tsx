import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Balance } from '../types/api';
import './Transfer.css';

export function Transfer() {
  const navigate = useNavigate();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [recipient, setRecipient] = useState('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [conversionPreview, setConversionPreview] = useState<{ toAmount: string; rate: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const response = await api.getBalances();
        if (response.success) {
          setBalances(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch balances:', err);
      }
    };
    fetchBalances();
  }, []);

  // Fetch live conversion rate when currencies differ and amount is set
  useEffect(() => {
    const fetchLiveRate = async () => {
      if (fromCurrency === toCurrency || !amount || parseFloat(amount) <= 0) {
        setConversionPreview(null);
        return;
      }

      setLoadingPreview(true);
      try {
        const response = await api.getLiveRate(fromCurrency, toCurrency);
        if (response.success) {
          const amountNum = parseFloat(amount);
          const toAmount = (amountNum * response.data.rate).toFixed(8);
          setConversionPreview({
            toAmount,
            rate: response.data.rate,
          });
        }
      } catch (err) {
        console.error('Failed to fetch live rate:', err);
        setConversionPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    };

    const debounce = setTimeout(fetchLiveRate, 300);
    return () => clearTimeout(debounce);
  }, [fromCurrency, toCurrency, amount]);

  const selectedBalance = balances.find((b) => b.currency === fromCurrency);
  const maxAmount = selectedBalance ? selectedBalance.amount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!recipient.trim()) {
      setError('Please enter a recipient username or email');
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum > maxAmount) {
      setError(`Insufficient balance. Maximum: ${maxAmount.toFixed(2)} ${fromCurrency}`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.transfer(recipient, fromCurrency, toCurrency, amount);
      if (response.success) {
        const receivedAmount = conversionPreview ? conversionPreview.toAmount : amount;
        setSuccess(`Successfully sent ${amount} ${fromCurrency}${fromCurrency !== toCurrency ? ` (${receivedAmount} ${toCurrency})` : ''} to ${recipient}`);
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Transfer failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="transfer-page">
      <div className="container">
        <div className="transfer-container">
          <div className="transfer-header">
            <h1>Send Money</h1>
            <p>Transfer funds to another user instantly</p>
          </div>

          <form onSubmit={handleSubmit} className="transfer-form card">
            <div className="card-body">
              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <div className="form-group">
                <label className="form-label">Recipient Username or Email</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter username or email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">You Send</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    max={maxAmount}
                    required
                  />
                  {selectedBalance && (
                    <div className="balance-hint">
                      Available: {selectedBalance.amount.toFixed(2)} {fromCurrency}
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ width: '140px' }}>
                  <label className="form-label">From</label>
                  <select
                    className="form-input form-select"
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="BTC">BTC</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">They Receive</label>
                  <div className="conversion-display">
                    {loadingPreview ? (
                      <span className="conversion-loading">Calculating...</span>
                    ) : conversionPreview ? (
                      <span className="conversion-amount">{conversionPreview.toAmount} {toCurrency}</span>
                    ) : (
                      <span className="conversion-amount">{amount || '0'} {toCurrency}</span>
                    )}
                  </div>
                  {conversionPreview && (
                    <div className="rate-hint">
                      Rate: 1 {fromCurrency} = {conversionPreview.rate.toFixed(6)} {toCurrency}
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ width: '140px' }}>
                  <label className="form-label">To</label>
                  <select
                    className="form-input form-select"
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="BTC">BTC</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Description <span className="optional">(optional)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="What's this for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={255}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-block"
                disabled={isLoading || !recipient.trim() || !amount}
              >
                {isLoading ? <span className="spinner" /> : `Send ${amount || '0'} ${fromCurrency}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
