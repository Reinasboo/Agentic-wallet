/**
 * Wallet Manager
 * 
 * SECURITY-CRITICAL: This module handles private key generation and storage.
 * Private keys are:
 * - Generated securely using Solana's Keypair
 * - Encrypted immediately after generation
 * - Never exposed outside this module
 * - Only decrypted momentarily for signing
 */

import { Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { v4 as uuidv4 } from 'uuid';
import {
  WalletInfo,
  InternalWallet,
  Result,
  success,
  failure,
  Policy,
  DEFAULT_POLICY,
  Intent,
} from '../utils/types.js';
import { encrypt, decrypt, generateSecureId } from '../utils/encryption.js';
import { getConfig } from '../utils/config.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('WALLET');

/**
 * WalletManager - Secure wallet operations
 * 
 * This class provides a strict API boundary:
 * - Public methods return only public information
 * - Private keys never leave this class
 * - All signing happens internally
 */
export class WalletManager {
  private wallets: Map<string, InternalWallet> = new Map();
  private policies: Map<string, Policy> = new Map();
  private dailyTransfers: Map<string, number> = new Map();
  private encryptionSecret: string;

  constructor() {
    const config = getConfig();
    this.encryptionSecret = config.KEY_ENCRYPTION_SECRET;
    
    // Reset daily counters at midnight
    this.scheduleDailyReset();
  }

  private scheduleDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.dailyTransfers.clear();
      logger.info('Daily transfer counters reset');
      this.scheduleDailyReset();
    }, msUntilMidnight);
  }

  /**
   * Create a new wallet with encrypted key storage
   */
  createWallet(label?: string): Result<WalletInfo, Error> {
    try {
      const keypair = Keypair.generate();
      const walletId = generateSecureId('wallet');
      
      // Encrypt the secret key immediately
      const encryptedSecretKey = encrypt(
        keypair.secretKey,
        this.encryptionSecret
      );
      
      const wallet: InternalWallet = {
        id: walletId,
        publicKey: keypair.publicKey.toBase58(),
        encryptedSecretKey,
        createdAt: new Date(),
        label,
      };
      
      this.wallets.set(walletId, wallet);
      this.policies.set(walletId, { ...DEFAULT_POLICY });
      this.dailyTransfers.set(walletId, 0);
      
      logger.info('Wallet created', {
        walletId,
        publicKey: wallet.publicKey,
        label,
      });
      
      // Return only public information
      return success(this.toWalletInfo(wallet));
    } catch (error) {
      logger.error('Failed to create wallet', { error: String(error) });
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get wallet info by ID
   */
  getWallet(walletId: string): Result<WalletInfo, Error> {
    const wallet = this.wallets.get(walletId);
    
    if (!wallet) {
      return failure(new Error(`Wallet not found: ${walletId}`));
    }
    
    return success(this.toWalletInfo(wallet));
  }

  /**
   * Get all wallets (public info only)
   */
  getAllWallets(): WalletInfo[] {
    return Array.from(this.wallets.values()).map(w => this.toWalletInfo(w));
  }

  /**
   * Get wallet public key
   */
  getPublicKey(walletId: string): Result<PublicKey, Error> {
    const wallet = this.wallets.get(walletId);
    
    if (!wallet) {
      return failure(new Error(`Wallet not found: ${walletId}`));
    }
    
    try {
      return success(new PublicKey(wallet.publicKey));
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Sign a transaction
   * 
   * SECURITY: This is the only place where private keys are decrypted.
   * The key is decrypted, used to sign, and then discarded.
   */
  signTransaction(
    walletId: string,
    transaction: Transaction | VersionedTransaction
  ): Result<Transaction | VersionedTransaction, Error> {
    const wallet = this.wallets.get(walletId);
    
    if (!wallet) {
      return failure(new Error(`Wallet not found: ${walletId}`));
    }
    
    try {
      // Decrypt the secret key momentarily
      const secretKey = decrypt(wallet.encryptedSecretKey, this.encryptionSecret);
      const keypair = Keypair.fromSecretKey(secretKey);
      
      // Sign the transaction
      if (transaction instanceof Transaction) {
        transaction.partialSign(keypair);
      } else {
        transaction.sign([keypair]);
      }
      
      logger.debug('Transaction signed', { walletId });
      
      // Return the signed transaction
      return success(transaction);
    } catch (error) {
      logger.error('Failed to sign transaction', {
        walletId,
        error: String(error),
      });
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Validate an intent against the wallet's policy
   */
  validateIntent(walletId: string, intent: Intent, currentBalance: number): Result<true, Error> {
    const policy = this.policies.get(walletId);
    
    if (!policy) {
      return failure(new Error(`No policy found for wallet: ${walletId}`));
    }
    
    // Check daily transfer limit
    const dailyCount = this.dailyTransfers.get(walletId) ?? 0;
    if (dailyCount >= policy.maxDailyTransfers) {
      return failure(new Error('Daily transfer limit exceeded'));
    }
    
    // Validate based on intent type
    if (intent.type === 'transfer_sol') {
      // Check max transfer amount
      if (intent.amount > policy.maxTransferAmount) {
        return failure(new Error(`Transfer amount ${intent.amount} exceeds max ${policy.maxTransferAmount}`));
      }
      
      // Check minimum balance requirement
      const balanceAfterTransfer = currentBalance - intent.amount - 0.000005; // Account for fees
      if (balanceAfterTransfer < policy.requireMinBalance) {
        return failure(new Error(`Transfer would leave balance below minimum (${policy.requireMinBalance} SOL)`));
      }
      
      // Check allowed/blocked recipients
      if (policy.allowedRecipients && !policy.allowedRecipients.includes(intent.recipient)) {
        return failure(new Error('Recipient not in allowed list'));
      }
      
      if (policy.blockedRecipients?.includes(intent.recipient)) {
        return failure(new Error('Recipient is blocked'));
      }
    }
    
    return success(true);
  }

  /**
   * Increment daily transfer count for a wallet
   */
  recordTransfer(walletId: string): void {
    const current = this.dailyTransfers.get(walletId) ?? 0;
    this.dailyTransfers.set(walletId, current + 1);
  }

  /**
   * Update wallet policy
   */
  updatePolicy(walletId: string, policy: Partial<Policy>): Result<Policy, Error> {
    const currentPolicy = this.policies.get(walletId);
    
    if (!currentPolicy) {
      return failure(new Error(`Wallet not found: ${walletId}`));
    }
    
    const newPolicy = { ...currentPolicy, ...policy };
    this.policies.set(walletId, newPolicy);
    
    logger.info('Policy updated', { walletId, policy: newPolicy });
    
    return success(newPolicy);
  }

  /**
   * Get wallet policy
   */
  getPolicy(walletId: string): Result<Policy, Error> {
    const policy = this.policies.get(walletId);
    
    if (!policy) {
      return failure(new Error(`Policy not found for wallet: ${walletId}`));
    }
    
    return success(policy);
  }

  /**
   * Delete a wallet (removes from memory)
   */
  deleteWallet(walletId: string): Result<true, Error> {
    if (!this.wallets.has(walletId)) {
      return failure(new Error(`Wallet not found: ${walletId}`));
    }
    
    this.wallets.delete(walletId);
    this.policies.delete(walletId);
    this.dailyTransfers.delete(walletId);
    
    logger.info('Wallet deleted', { walletId });
    
    return success(true);
  }

  /**
   * Convert internal wallet to public wallet info
   */
  private toWalletInfo(wallet: InternalWallet): WalletInfo {
    return {
      id: wallet.id,
      publicKey: wallet.publicKey,
      createdAt: wallet.createdAt,
      label: wallet.label,
    };
  }
}

// Singleton instance
let walletManagerInstance: WalletManager | null = null;

export function getWalletManager(): WalletManager {
  if (!walletManagerInstance) {
    walletManagerInstance = new WalletManager();
  }
  return walletManagerInstance;
}
