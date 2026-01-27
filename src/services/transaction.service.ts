/**
 * Transaction Service
 *
 * Business logic for transaction operations including deposits,
 * transfers, and transaction history queries.
 */

import Database from 'better-sqlite3';
import {
  TransactionRepository,
  getTransactionRepository,
} from '@/repositories/transaction.repository';
import { BalanceRepository, getBalanceRepository } from '@/repositories/balance.repository';
import { UserRepository, getUserRepository } from '@/repositories/user.repository';
import {
  TransactionDTO,
  transactionToDTO,
  DepositInput,
  TransferInput,
  depositSchema,
  transferSchema,
} from '@/models/transaction.model';
import { Currency, SUPPORTED_CURRENCIES } from '@/types/currency.types';
import { TransactionType } from '@/types/transaction.types';
import { getConversionRate } from '@/config/rates';
import { withTransaction } from '@/config/database';
import { toBaseUnits, fromBaseUnits, formatAmount, isValidAmount } from '@/utils/currency';
import { logger, auditLogger } from '@/utils/logger';
import { ValidationError, NotFoundError, BusinessRuleError } from '@/utils/errors';

/**
 * Deposit response with transaction details and new balance.
 */
export interface DepositResponse {
  transaction: TransactionDTO;
  newBalance: {
    currency: Currency;
    amount: number;
    formatted: string;
  };
}

/**
 * Transfer response with transaction details.
 */
export interface TransferResponse {
  transaction: TransactionDTO;
  sender: {
    newBalance: {
      currency: Currency;
      amount: number;
      formatted: string;
    };
  };
  recipient: {
    username: string;
    received: {
      currency: Currency;
      amount: number;
      formatted: string;
    };
  };
}

/**
 * Conversion preview without executing the transaction.
 */
export interface ConversionPreview {
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: number;
  toAmount: number;
  rate: number;
  inverseRate: number;
  fromFormatted: string;
  toFormatted: string;
}

/**
 * Transaction history query options.
 */
export interface TransactionHistoryOptions {
  limit?: number;
  offset?: number;
  type?: TransactionType;
}

/**
 * Transaction history response with pagination.
 */
export interface TransactionHistory {
  transactions: TransactionDTO[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Service for transaction-related business logic.
 */
export class TransactionService {
  private transactionRepository: TransactionRepository;
  private balanceRepository: BalanceRepository;
  private userRepository: UserRepository;
  private db?: Database.Database;

  constructor(
    transactionRepository?: TransactionRepository,
    balanceRepository?: BalanceRepository,
    userRepository?: UserRepository,
    database?: Database.Database
  ) {
    this.transactionRepository = transactionRepository || getTransactionRepository();
    this.balanceRepository = balanceRepository || getBalanceRepository();
    this.userRepository = userRepository || getUserRepository();
    this.db = database;
  }

  /**
   * Deposit funds into user's account.
   *
   * Creates a transaction record and credits the user's balance.
   * This is a self-transaction (sender = receiver).
   *
   * @param userId - User ID making the deposit
   * @param input - Deposit details (currency, amount)
   * @returns Deposit response with transaction and new balance
   * @throws ValidationError if input is invalid
   * @throws NotFoundError if user doesn't exist
   */
  deposit(userId: number, input: DepositInput): DepositResponse {
    // Validate input
    const parseResult = depositSchema.safeParse(input);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      throw new ValidationError(firstError?.message || 'Invalid deposit data', {
        field: firstError?.path.join('.'),
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { currency, amount } = parseResult.data;

    // Validate amount
    if (!isValidAmount(amount)) {
      throw new ValidationError('Invalid amount', {
        field: 'amount',
        message: 'Amount must be a positive number',
      });
    }

    // Verify user exists
    this.userRepository.getById(userId);

    // Convert to base units
    const amountInBaseUnits = toBaseUnits(amount, currency as Currency);

    // Execute within transaction for atomicity
    return withTransaction(() => {
      // Credit the balance
      const newBalance = this.balanceRepository.credit(userId, currency as Currency, amountInBaseUnits);

      // Create transaction record (deposit: sender = receiver)
      const transaction = this.transactionRepository.create({
        senderId: userId,
        receiverId: userId,
        fromCurrency: currency as Currency,
        toCurrency: currency as Currency,
        fromAmount: amountInBaseUnits,
        toAmount: amountInBaseUnits,
        conversionRate: '1',
        type: 'deposit',
      });

      logger.info('Deposit completed', {
        userId,
        currency,
        amount,
        transactionId: transaction.id,
      });

      // Audit log for compliance
      auditLogger.info('DEPOSIT_COMPLETED', {
        transactionId: transaction.id,
        userId,
        currency,
        amount,
        action: 'deposit',
      });

      const newBalanceAmount = fromBaseUnits(newBalance.amount, currency as Currency);

      return {
        transaction: transactionToDTO(transaction),
        newBalance: {
          currency: currency as Currency,
          amount: newBalanceAmount,
          formatted: formatAmount(newBalanceAmount, currency as Currency, true),
        },
      };
    }, this.db);
  }

  /**
   * Transfer funds between users with optional currency conversion.
   *
   * Validates balances, performs conversion, and updates both users'
   * balances atomically within a database transaction.
   *
   * @param senderId - User ID initiating the transfer
   * @param input - Transfer details (recipient, currencies, amount)
   * @returns Transfer response with transaction details
   * @throws ValidationError if input is invalid
   * @throws NotFoundError if sender or recipient doesn't exist
   * @throws InsufficientBalanceError if sender doesn't have enough funds
   * @throws BusinessRuleError if transfer violates business rules
   */
  transfer(senderId: number, input: TransferInput): TransferResponse {
    // Validate input
    const parseResult = transferSchema.safeParse(input);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      throw new ValidationError(firstError?.message || 'Invalid transfer data', {
        field: firstError?.path.join('.'),
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { recipientIdentifier, fromCurrency, toCurrency, amount } = parseResult.data;

    // Validate amount
    if (!isValidAmount(amount)) {
      throw new ValidationError('Invalid amount', {
        field: 'amount',
        message: 'Amount must be a positive number',
      });
    }

    // Verify sender exists
    const sender = this.userRepository.getById(senderId);

    // Find recipient by email or username
    const recipient = this.userRepository.findByEmailOrUsername(recipientIdentifier);
    if (!recipient) {
      throw new NotFoundError('Recipient', recipientIdentifier);
    }

    // Prevent self-transfer
    if (sender.id === recipient.id) {
      throw new BusinessRuleError('Cannot transfer to yourself');
    }

    // Get conversion rate
    const rate = getConversionRate(fromCurrency as Currency, toCurrency as Currency);

    // Calculate amounts in base units
    const fromAmountBaseUnits = toBaseUnits(amount, fromCurrency as Currency);
    const toAmountFloat = amount * rate;
    const toAmountBaseUnits = toBaseUnits(toAmountFloat, toCurrency as Currency);

    // Execute within transaction for atomicity
    return withTransaction(() => {
      // Debit sender (throws InsufficientBalanceError if not enough)
      const senderNewBalance = this.balanceRepository.debit(
        senderId,
        fromCurrency as Currency,
        fromAmountBaseUnits
      );

      // Credit recipient
      this.balanceRepository.credit(recipient.id, toCurrency as Currency, toAmountBaseUnits);

      // Create transaction record
      const transaction = this.transactionRepository.create({
        senderId,
        receiverId: recipient.id,
        fromCurrency: fromCurrency as Currency,
        toCurrency: toCurrency as Currency,
        fromAmount: fromAmountBaseUnits,
        toAmount: toAmountBaseUnits,
        conversionRate: rate.toString(),
        type: 'transfer',
      });

      logger.info('Transfer completed', {
        senderId,
        recipientId: recipient.id,
        fromCurrency,
        toCurrency,
        amount,
        convertedAmount: toAmountFloat,
        transactionId: transaction.id,
      });

      // Audit log for compliance
      auditLogger.info('TRANSFER_COMPLETED', {
        transactionId: transaction.id,
        senderId,
        recipientId: recipient.id,
        fromCurrency,
        toCurrency,
        fromAmount: amount,
        toAmount: toAmountFloat,
        conversionRate: rate,
        action: 'transfer',
      });

      const senderNewBalanceAmount = fromBaseUnits(senderNewBalance.amount, fromCurrency as Currency);

      return {
        transaction: transactionToDTO(transaction),
        sender: {
          newBalance: {
            currency: fromCurrency as Currency,
            amount: senderNewBalanceAmount,
            formatted: formatAmount(senderNewBalanceAmount, fromCurrency as Currency, true),
          },
        },
        recipient: {
          username: recipient.username,
          received: {
            currency: toCurrency as Currency,
            amount: toAmountFloat,
            formatted: formatAmount(toAmountFloat, toCurrency as Currency, true),
          },
        },
      };
    }, this.db);
  }

  /**
   * Preview a currency conversion without executing it.
   *
   * Useful for showing users what they'll receive before confirming.
   *
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @param amount - Amount to convert
   * @returns Conversion preview with rates and formatted amounts
   * @throws ValidationError if currencies or amount are invalid
   */
  previewConversion(
    fromCurrency: Currency,
    toCurrency: Currency,
    amount: number
  ): ConversionPreview {
    // Validate currencies
    if (!SUPPORTED_CURRENCIES.includes(fromCurrency)) {
      throw new ValidationError(`Unsupported currency: ${fromCurrency}`, {
        field: 'fromCurrency',
        supported: SUPPORTED_CURRENCIES,
      });
    }
    if (!SUPPORTED_CURRENCIES.includes(toCurrency)) {
      throw new ValidationError(`Unsupported currency: ${toCurrency}`, {
        field: 'toCurrency',
        supported: SUPPORTED_CURRENCIES,
      });
    }

    // Validate amount
    if (!isValidAmount(amount)) {
      throw new ValidationError('Invalid amount', {
        field: 'amount',
        message: 'Amount must be a positive number',
      });
    }

    const rate = getConversionRate(fromCurrency, toCurrency);
    const toAmount = amount * rate;
    const inverseRate = 1 / rate;

    return {
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      toAmount,
      rate,
      inverseRate,
      fromFormatted: formatAmount(amount, fromCurrency, true),
      toFormatted: formatAmount(toAmount, toCurrency, true),
    };
  }

  /**
   * Get current conversion rate between two currencies.
   *
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @returns Conversion rate
   * @throws ValidationError if currencies are not supported
   */
  getConversionRate(fromCurrency: Currency, toCurrency: Currency): number {
    // Validate currencies
    if (!SUPPORTED_CURRENCIES.includes(fromCurrency)) {
      throw new ValidationError(`Unsupported currency: ${fromCurrency}`, {
        field: 'fromCurrency',
        supported: SUPPORTED_CURRENCIES,
      });
    }
    if (!SUPPORTED_CURRENCIES.includes(toCurrency)) {
      throw new ValidationError(`Unsupported currency: ${toCurrency}`, {
        field: 'toCurrency',
        supported: SUPPORTED_CURRENCIES,
      });
    }

    return getConversionRate(fromCurrency, toCurrency);
  }

  /**
   * Get transaction history for a user.
   *
   * Returns paginated transactions where the user is sender or receiver.
   *
   * @param userId - User ID
   * @param options - Query options (limit, offset, type filter)
   * @returns Transaction history with pagination info
   * @throws NotFoundError if user doesn't exist
   */
  getTransactionHistory(
    userId: number,
    options: TransactionHistoryOptions = {}
  ): TransactionHistory {
    // Verify user exists
    this.userRepository.getById(userId);

    const { limit = 20, offset = 0, type } = options;

    const result = this.transactionRepository.findByUserId(userId, {
      limit,
      offset,
      type,
    });

    return {
      transactions: result.transactions.map((tx) => transactionToDTO(tx)),
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.transactions.length < result.total,
      },
    };
  }

  /**
   * Get a specific transaction by ID.
   *
   * @param transactionId - Transaction ID
   * @param userId - User ID (for authorization check)
   * @returns Transaction DTO
   * @throws NotFoundError if transaction doesn't exist
   * @throws BusinessRuleError if user is not sender or receiver
   */
  getTransaction(transactionId: number, userId: number): TransactionDTO {
    const transaction = this.transactionRepository.getById(transactionId);

    // Authorization: user must be sender or receiver
    if (transaction.senderId !== userId && transaction.receiverId !== userId) {
      throw new BusinessRuleError('You do not have access to this transaction');
    }

    return transactionToDTO(transaction);
  }

  /**
   * Get transaction statistics for a user.
   *
   * @param userId - User ID
   * @returns Count of transactions by type
   */
  getTransactionStats(userId: number): Record<TransactionType, number> {
    // Verify user exists
    this.userRepository.getById(userId);

    return this.transactionRepository.countByTypeForUser(userId);
  }
}

/**
 * Singleton instance for convenience.
 * Use `new TransactionService()` for testing with mock dependencies.
 */
let instance: TransactionService | null = null;

export function getTransactionService(): TransactionService {
  if (!instance) {
    instance = new TransactionService();
  }
  return instance;
}

/**
 * Reset singleton (for testing).
 */
export function resetTransactionService(): void {
  instance = null;
}
