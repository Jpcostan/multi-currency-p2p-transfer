/**
 * Balance Service
 *
 * Business logic for balance operations including retrieval,
 * deposits, and balance queries.
 */

import { BalanceRepository, getBalanceRepository } from '@/repositories/balance.repository';
import { UserRepository, getUserRepository } from '@/repositories/user.repository';
import { Balance, BalanceDTO, balanceToDTO } from '@/models/balance.model';
import { Currency, SUPPORTED_CURRENCIES } from '@/types/currency.types';
import { fromBaseUnits, formatAmount } from '@/utils/currency';
import { logger } from '@/utils/logger';
import { ValidationError } from '@/utils/errors';

/**
 * Balance summary for display purposes.
 * Note: amountInBaseUnits is a string to support JSON serialization of BigInt.
 */
export interface BalanceSummary {
  currency: Currency;
  amount: number;
  formatted: string;
  amountInBaseUnits: string;
}

/**
 * All balances response for a user.
 */
export interface UserBalances {
  userId: number;
  balances: BalanceSummary[];
  totalBalances: number;
}

/**
 * Service for balance-related business logic.
 */
export class BalanceService {
  private balanceRepository: BalanceRepository;
  private userRepository: UserRepository;

  constructor(balanceRepository?: BalanceRepository, userRepository?: UserRepository) {
    this.balanceRepository = balanceRepository || getBalanceRepository();
    this.userRepository = userRepository || getUserRepository();
  }

  /**
   * Get all balances for a user.
   *
   * Returns balances for all supported currencies, including those
   * with zero balance.
   *
   * @param userId - User ID
   * @returns User balances summary
   * @throws NotFoundError if user doesn't exist
   */
  getAllBalances(userId: number): UserBalances {
    // Verify user exists
    this.userRepository.getById(userId);

    const balances = this.balanceRepository.findAllByUserId(userId);

    // Convert to summary format
    const balanceSummaries: BalanceSummary[] = balances.map((balance: Balance) => ({
      currency: balance.currency,
      amount: fromBaseUnits(balance.amount, balance.currency),
      formatted: formatAmount(
        fromBaseUnits(balance.amount, balance.currency),
        balance.currency,
        true
      ),
      amountInBaseUnits: balance.amount.toString(),
    }));

    return {
      userId,
      balances: balanceSummaries,
      totalBalances: balanceSummaries.length,
    };
  }

  /**
   * Get balance for a specific currency.
   *
   * @param userId - User ID
   * @param currency - Currency code
   * @returns Balance summary for the currency
   * @throws NotFoundError if user doesn't exist
   * @throws ValidationError if currency is not supported
   */
  getBalance(userId: number, currency: Currency): BalanceSummary {
    // Verify user exists
    this.userRepository.getById(userId);

    // Validate currency
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      throw new ValidationError(`Unsupported currency: ${currency}`, {
        field: 'currency',
        supported: SUPPORTED_CURRENCIES,
      });
    }

    const balance = this.balanceRepository.findByUserAndCurrency(userId, currency);

    if (!balance) {
      // Initialize if doesn't exist (shouldn't happen if user was created properly)
      this.balanceRepository.upsert(userId, currency, 0n);
      return {
        currency,
        amount: 0,
        formatted: formatAmount(0, currency, true),
        amountInBaseUnits: '0',
      };
    }

    return {
      currency: balance.currency,
      amount: fromBaseUnits(balance.amount, balance.currency),
      formatted: formatAmount(
        fromBaseUnits(balance.amount, balance.currency),
        balance.currency,
        true
      ),
      amountInBaseUnits: balance.amount.toString(),
    };
  }

  /**
   * Get the raw balance entity (for internal use).
   *
   * @param userId - User ID
   * @param currency - Currency code
   * @returns Balance entity or null
   */
  getBalanceEntity(userId: number, currency: Currency): Balance | null {
    return this.balanceRepository.findByUserAndCurrency(userId, currency);
  }

  /**
   * Get balance DTO for API responses.
   *
   * @param userId - User ID
   * @param currency - Currency code
   * @returns Balance DTO
   * @throws NotFoundError if balance doesn't exist
   */
  getBalanceDTO(userId: number, currency: Currency): BalanceDTO {
    const balance = this.balanceRepository.getByUserAndCurrency(userId, currency);
    return balanceToDTO(balance);
  }

  /**
   * Check if user has sufficient balance for an amount.
   *
   * @param userId - User ID
   * @param currency - Currency code
   * @param requiredAmount - Amount needed (in base units)
   * @returns True if balance is sufficient
   */
  hasSufficientBalance(userId: number, currency: Currency, requiredAmount: bigint): boolean {
    const balance = this.balanceRepository.findByUserAndCurrency(userId, currency);
    if (!balance) {
      return false;
    }
    return balance.amount >= requiredAmount;
  }

  /**
   * Initialize balances for a new user.
   *
   * Creates zero-balance records for all supported currencies.
   * This is typically called by UserService during registration.
   *
   * @param userId - User ID
   */
  initializeBalances(userId: number): void {
    this.balanceRepository.initializeForUser(userId);
    logger.debug('Initialized balances for user', { userId });
  }

  /**
   * Credit an amount to a user's balance.
   *
   * This is a low-level operation. For deposits, use TransactionService.deposit()
   * which also creates a transaction record.
   *
   * @param userId - User ID
   * @param currency - Currency code
   * @param amount - Amount to credit (in base units)
   * @returns Updated balance
   */
  credit(userId: number, currency: Currency, amount: bigint): Balance {
    return this.balanceRepository.credit(userId, currency, amount);
  }

  /**
   * Debit an amount from a user's balance.
   *
   * This is a low-level operation. For transfers, use TransactionService.transfer()
   * which handles validation and creates transaction records.
   *
   * @param userId - User ID
   * @param currency - Currency code
   * @param amount - Amount to debit (in base units)
   * @returns Updated balance
   * @throws InsufficientBalanceError if balance is too low
   */
  debit(userId: number, currency: Currency, amount: bigint): Balance {
    return this.balanceRepository.debit(userId, currency, amount);
  }

  /**
   * Get total value of all balances in a target currency.
   *
   * Note: This is a simplified calculation using hardcoded rates.
   * In production, you'd want real-time rates.
   *
   * @param userId - User ID
   * @param targetCurrency - Currency to calculate total in
   * @returns Total value in target currency
   */
  getTotalValueIn(userId: number, targetCurrency: Currency): number {
    // This would require conversion logic - implementing as placeholder
    // The actual implementation would use the conversion rates
    const balances = this.getAllBalances(userId);

    // For now, just return the target currency balance
    // A full implementation would convert all balances
    const targetBalance = balances.balances.find((b) => b.currency === targetCurrency);
    return targetBalance?.amount ?? 0;
  }
}

/**
 * Singleton instance for convenience.
 * Use `new BalanceService()` for testing with mock dependencies.
 */
let instance: BalanceService | null = null;

export function getBalanceService(): BalanceService {
  if (!instance) {
    instance = new BalanceService();
  }
  return instance;
}

/**
 * Reset singleton (for testing).
 */
export function resetBalanceService(): void {
  instance = null;
}
