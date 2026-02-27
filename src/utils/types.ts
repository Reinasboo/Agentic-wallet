/**
 * Core Type Definitions for Agentic Wallet System
 * 
 * These types define the strict boundaries between system layers.
 * Private keys are NEVER exposed in these interfaces.
 */

import { PublicKey, TransactionSignature } from '@solana/web3.js';

// ============================================
// WALLET LAYER TYPES
// ============================================

/**
 * Public wallet information - safe to expose
 */
export interface WalletInfo {
  readonly id: string;
  readonly publicKey: string;
  readonly createdAt: Date;
  readonly label?: string;
}

/**
 * Balance information
 */
export interface BalanceInfo {
  readonly sol: number;
  readonly lamports: bigint;
}

/**
 * Token balance information
 */
export interface TokenBalance {
  readonly mint: string;
  readonly amount: bigint;
  readonly decimals: number;
  readonly uiAmount: number;
  readonly symbol?: string;
}

/**
 * Internal wallet representation - NEVER expose secretKey
 */
export interface InternalWallet {
  readonly id: string;
  readonly publicKey: string;
  readonly encryptedSecretKey: string;
  readonly createdAt: Date;
  readonly label?: string;
}

// ============================================
// TRANSACTION TYPES
// ============================================

export type TransactionStatus = 
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'finalized'
  | 'failed';

export interface TransactionRecord {
  readonly id: string;
  readonly signature?: TransactionSignature;
  readonly walletId: string;
  readonly type: TransactionType;
  readonly status: TransactionStatus;
  readonly amount?: number;
  readonly recipient?: string;
  readonly mint?: string;
  readonly error?: string;
  readonly createdAt: Date;
  readonly confirmedAt?: Date;
}

export type TransactionType = 
  | 'airdrop'
  | 'transfer_sol'
  | 'transfer_spl'
  | 'create_token_account'
  | 'raw_execute'
  | 'swap'
  | 'create_token';

// ============================================
// AGENT LAYER TYPES
// ============================================

export type AgentStatus = 
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'waiting'
  | 'error'
  | 'stopped';

export interface AgentInfo {
  readonly id: string;
  readonly name: string;
  readonly status: AgentStatus;
  readonly walletId: string;
  readonly walletPublicKey: string;
  readonly strategy: AgentStrategy;
  readonly strategyParams?: Record<string, unknown>;
  readonly executionSettings?: ExecutionSettings;
  readonly createdAt: Date;
  readonly lastActionAt?: Date;
  readonly errorMessage?: string;
}

export type AgentStrategy = string;

/**
 * Execution settings governing agent cycle behavior.
 */
export interface ExecutionSettings {
  readonly cycleIntervalMs: number;
  readonly maxActionsPerDay: number;
  readonly enabled: boolean;
}

/**
 * Agent configuration for creation and updates.
 */
export interface AgentConfig {
  readonly name: string;
  readonly strategy: AgentStrategy;
  readonly strategyParams?: Record<string, unknown>;
  readonly executionSettings?: Partial<ExecutionSettings>;
}

// ============================================
// INTENT TYPES
// ============================================

/**
 * Intents are high-level actions that agents emit.
 * These are validated and executed by the wallet layer.
 */
export type Intent = 
  | AirdropIntent
  | TransferSolIntent
  | TransferTokenIntent
  | CheckBalanceIntent
  | AutonomousIntent;

export interface BaseIntent {
  readonly id: string;
  readonly agentId: string;
  readonly timestamp: Date;
}

export interface AirdropIntent extends BaseIntent {
  readonly type: 'airdrop';
  readonly amount: number; // SOL
}

export interface TransferSolIntent extends BaseIntent {
  readonly type: 'transfer_sol';
  readonly recipient: string;
  readonly amount: number; // SOL
}

export interface TransferTokenIntent extends BaseIntent {
  readonly type: 'transfer_token';
  readonly mint: string;
  readonly recipient: string;
  readonly amount: number;
}

export interface CheckBalanceIntent extends BaseIntent {
  readonly type: 'check_balance';
}

/**
 * Autonomous intent — the agent decides what action to take.
 * No policy restrictions are enforced; all actions are logged.
 * The `action` field describes what the agent chose to do,
 * and `params` carries the action-specific data.
 *
 * Supported actions:
 * - airdrop, transfer_sol, transfer_token, query_balance  (built-in helpers)
 * - execute_instructions  — submit an array of arbitrary Solana instructions
 * - raw_transaction       — submit a base64-encoded serialized transaction (unsigned)
 * - swap                  — execute a token swap (Jupiter, PumpSwap, Raydium, etc.)
 * - create_token          — create / launch a token (Pump.fun, Bonk.fun, etc.)
 * - any other string      — future-proofed; if the platform doesn't recognise
 *                           the action it will try to execute_instructions
 */
export interface AutonomousIntent extends BaseIntent {
  readonly type: 'autonomous';
  readonly action: string;   // fully open — no enum restriction
  readonly params: Record<string, unknown>;
}

// ============================================
// POLICY TYPES
// ============================================

/**
 * Policies define constraints on agent actions
 */
export interface Policy {
  readonly maxTransferAmount: number; // SOL
  readonly maxDailyTransfers: number;
  readonly allowedRecipients?: string[];
  readonly blockedRecipients?: string[];
  readonly requireMinBalance: number; // SOL
}

export const DEFAULT_POLICY: Policy = {
  maxTransferAmount: 1.0, // 1 SOL max per transfer
  maxDailyTransfers: 100,
  requireMinBalance: 0.01, // Keep 0.01 SOL for fees
};

// ============================================
// EVENT TYPES
// ============================================

export type SystemEvent = 
  | AgentCreatedEvent
  | AgentStatusChangedEvent
  | AgentActionEvent
  | TransactionEvent
  | BalanceChangedEvent
  | SystemErrorEvent;

export interface BaseEvent {
  readonly id: string;
  readonly timestamp: Date;
}

export interface AgentCreatedEvent extends BaseEvent {
  readonly type: 'agent_created';
  readonly agent: AgentInfo;
}

export interface AgentStatusChangedEvent extends BaseEvent {
  readonly type: 'agent_status_changed';
  readonly agentId: string;
  readonly previousStatus: AgentStatus;
  readonly newStatus: AgentStatus;
}

export interface AgentActionEvent extends BaseEvent {
  readonly type: 'agent_action';
  readonly agentId: string;
  readonly action: string;
  readonly details?: Record<string, unknown>;
}

export interface TransactionEvent extends BaseEvent {
  readonly type: 'transaction';
  readonly transaction: TransactionRecord;
}

export interface BalanceChangedEvent extends BaseEvent {
  readonly type: 'balance_changed';
  readonly walletId: string;
  readonly previousBalance: number;
  readonly newBalance: number;
}

export interface SystemErrorEvent extends BaseEvent {
  readonly type: 'system_error';
  readonly error: string;
  readonly context?: Record<string, unknown>;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly timestamp: Date;
}

export interface SystemStats {
  readonly totalAgents: number;
  readonly activeAgents: number;
  readonly totalSolManaged: number;
  readonly totalTransactions: number;
  readonly networkStatus: 'healthy' | 'degraded' | 'down';
  readonly network: string;
  readonly uptime: number;
}

// ============================================
// RESULT TYPES
// ============================================

export type Result<T, E = Error> = 
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function success<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function failure<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
