import axios, { type AxiosError, type AxiosInstance } from 'axios';
import type {
  ApiResponse,
  AuthResponse,
  Balance,
  BalancesResponse,
  ConversionRate,
  PaginatedResponse,
  Transaction,
  TransactionStats,
  User,
} from '../types/api';

// In production (Docker), use relative URLs so nginx can proxy
// In development, Vite's proxy handles it
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from storage
    this.token = localStorage.getItem('auth_token');

    // Add auth header interceptor
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Auth endpoints
  async register(email: string, username: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/api/auth/register', {
      email,
      username,
      password,
    });
    if (response.data.success) {
      this.setToken(response.data.data.token);
    }
    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/api/auth/login', {
      email,
      password,
    });
    if (response.data.success) {
      this.setToken(response.data.data.token);
    }
    return response.data;
  }

  async getProfile(): Promise<ApiResponse<User>> {
    const response = await this.client.get<ApiResponse<User>>('/api/auth/profile');
    return response.data;
  }

  // Balance endpoints
  async getBalances(): Promise<{ success: boolean; data: Balance[] }> {
    const response = await this.client.get<ApiResponse<BalancesResponse>>('/api/balances');
    // Extract balances array from nested response
    return {
      success: response.data.success,
      data: response.data.data?.balances || [],
    };
  }

  async getBalance(currency: string): Promise<ApiResponse<Balance>> {
    const response = await this.client.get<ApiResponse<Balance>>(`/api/balances/${currency}`);
    return response.data;
  }

  // Transaction endpoints
  async deposit(currency: string, amount: string): Promise<ApiResponse<unknown>> {
    const response = await this.client.post<ApiResponse<unknown>>('/api/deposit', {
      currency,
      amount: parseFloat(amount),
    });
    return response.data;
  }

  async transfer(
    recipientIdentifier: string,
    fromCurrency: string,
    toCurrency: string,
    amount: string
  ): Promise<ApiResponse<unknown>> {
    const response = await this.client.post<ApiResponse<unknown>>('/api/transfer', {
      recipientIdentifier,
      fromCurrency,
      toCurrency,
      amount: parseFloat(amount),
    });
    return response.data;
  }

  async previewConversion(
    fromCurrency: string,
    toCurrency: string,
    amount: string
  ): Promise<ApiResponse<{ fromAmount: string; toAmount: string; rate: number }>> {
    const response = await this.client.get<ApiResponse<{ fromAmount: string; toAmount: string; rate: number }>>(
      `/api/convert/preview?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`
    );
    return response.data;
  }

  async getLiveRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<ApiResponse<{ from: string; to: string; rate: number; source: string; cached: boolean }>> {
    const response = await this.client.get<ApiResponse<{ from: string; to: string; rate: number; source: string; cached: boolean }>>(
      `/api/rates/live?from=${fromCurrency}&to=${toCurrency}`
    );
    return response.data;
  }

  async getTransactions(
    page = 1,
    limit = 20,
    type?: string
  ): Promise<{ success: boolean; data: Transaction[]; pagination: { hasMore: boolean } }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (type) params.append('type', type);

    const response = await this.client.get<PaginatedResponse<Transaction>>(
      `/api/transactions?${params}`
    );
    // Extract transactions array from nested response
    return {
      success: response.data.success,
      data: response.data.data?.transactions || [],
      pagination: {
        hasMore: response.data.data?.pagination?.hasMore ?? false,
      },
    };
  }

  async getTransactionStats(): Promise<ApiResponse<TransactionStats>> {
    const response = await this.client.get<ApiResponse<TransactionStats>>('/api/transactions/stats');
    return response.data;
  }

  // Rate endpoints (public)
  async getConversionRate(from: string, to: string): Promise<ApiResponse<ConversionRate>> {
    const response = await this.client.get<ApiResponse<ConversionRate>>(
      `/api/rates?from=${from}&to=${to}`
    );
    return response.data;
  }

}

export const api = new ApiService();
export default api;
