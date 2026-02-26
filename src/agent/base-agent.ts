/**
 * Base Agent
 * 
 * Defines the interface and base implementation for all agents.
 * Agents are autonomous decision-makers that emit intents.
 * 
 * IMPORTANT: Agents have NO access to private keys.
 * They can only emit intents which are validated and executed by the wallet layer.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AgentInfo,
  AgentStatus,
  AgentStrategy,
  Intent,
  AirdropIntent,
  TransferSolIntent,
  CheckBalanceIntent,
  BalanceInfo,
  TokenBalance,
} from '../utils/types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AGENT');

/**
 * Agent context - read-only information available to agents
 */
export interface AgentContext {
  readonly walletPublicKey: string;
  readonly balance: BalanceInfo;
  readonly tokenBalances: TokenBalance[];
  readonly recentTransactions: readonly string[];
}

/**
 * Agent decision - the result of agent thinking
 */
export interface AgentDecision {
  readonly shouldAct: boolean;
  readonly intent?: Intent;
  readonly reasoning: string;
}

/**
 * Abstract base agent class
 */
export abstract class BaseAgent {
  readonly id: string;
  readonly name: string;
  readonly strategy: AgentStrategy;
  readonly createdAt: Date;
  
  protected status: AgentStatus = 'idle';
  protected walletId: string;
  protected walletPublicKey: string;
  protected lastActionAt?: Date;
  protected errorMessage?: string;
  protected loopCount: number = 0;

  constructor(
    name: string,
    strategy: AgentStrategy,
    walletId: string,
    walletPublicKey: string
  ) {
    this.id = uuidv4();
    this.name = name;
    this.strategy = strategy;
    this.walletId = walletId;
    this.walletPublicKey = walletPublicKey;
    this.createdAt = new Date();
  }

  /**
   * Get agent info (public, safe to expose)
   */
  getInfo(): AgentInfo {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      walletId: this.walletId,
      walletPublicKey: this.walletPublicKey,
      strategy: this.strategy,
      createdAt: this.createdAt,
      lastActionAt: this.lastActionAt,
      errorMessage: this.errorMessage,
    };
  }

  /**
   * Get current status
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Set agent status
   */
  setStatus(status: AgentStatus, errorMessage?: string): void {
    const previousStatus = this.status;
    this.status = status;
    this.errorMessage = errorMessage;
    
    logger.info('Agent status changed', {
      agentId: this.id,
      previousStatus,
      newStatus: status,
      errorMessage,
    });
  }

  /**
   * Get wallet ID
   */
  getWalletId(): string {
    return this.walletId;
  }

  /**
   * Think about what to do next
   * This is the core decision-making method that subclasses implement
   */
  abstract think(context: AgentContext): Promise<AgentDecision>;

  /**
   * Create an airdrop intent
   */
  protected createAirdropIntent(amount: number): AirdropIntent {
    return {
      id: uuidv4(),
      agentId: this.id,
      timestamp: new Date(),
      type: 'airdrop',
      amount,
    };
  }

  /**
   * Create a SOL transfer intent
   */
  protected createTransferSolIntent(recipient: string, amount: number): TransferSolIntent {
    return {
      id: uuidv4(),
      agentId: this.id,
      timestamp: new Date(),
      type: 'transfer_sol',
      recipient,
      amount,
    };
  }

  /**
   * Create a balance check intent
   */
  protected createCheckBalanceIntent(): CheckBalanceIntent {
    return {
      id: uuidv4(),
      agentId: this.id,
      timestamp: new Date(),
      type: 'check_balance',
    };
  }

  /**
   * Record that an action was taken
   */
  recordAction(): void {
    this.lastActionAt = new Date();
    this.loopCount++;
  }

  /**
   * Stop the agent
   */
  stop(): void {
    this.setStatus('stopped');
  }
}
