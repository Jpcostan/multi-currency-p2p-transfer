// API Types - matching backend responses

export interface User {
  id: number;
  email: string;
  username: string;
  createdAt: string;
}

export interface Balance {
  currency: string;
  amount: number;
  formatted: string;
  amountInBaseUnits: string;
}

export interface BalancesResponse {
  userId: number;
  balances: Balance[];
  totalBalances: number;
}

export interface Transaction {
  id: number;
  senderId: number;
  receiverId: number;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'conversion';
  status: 'pending' | 'completed' | 'failed';
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  conversionRate: number;
  counterpartyUsername?: string;
  createdAt: string;
}

export interface ConversionRate {
  from: string;
  to: string;
  rate: number;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    transactions: T[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

export interface TransactionStats {
  stats: {
    deposit: number;
    transfer: number;
    payment: number;
  };
}
