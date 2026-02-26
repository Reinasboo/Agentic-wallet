/**
 * Orchestrator
 * 
 * The central coordination layer that:
 * - Binds agents to wallets
 * - Manages agent lifecycle
 * - Executes agent intents
 * - Emits system events
 * 
 * This is the bridge between agents (decision makers) and wallets (executors).
 */

import { PublicKey } from '@solana/web3.js';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentInfo,
  AgentConfig,
  SystemStats,
  TransactionRecord,
  TransactionType,
  Intent,
  Result,
  success,
  failure,
} from '../utils/types.js';
import { getConfig } from '../utils/config.js';
import { createLogger } from '../utils/logger.js';
import { getWalletManager, WalletManager } from '../wallet/index.js';
import { getSolanaClient, buildSolTransfer, SolanaClient } from '../rpc/index.js';
import { BaseAgent, AgentContext, createAgent } from '../agent/index.js';
import { AccumulatorAgent } from '../agent/accumulator-agent.js';
import { DistributorAgent } from '../agent/distributor-agent.js';
import { eventBus } from './event-emitter.js';

const logger = createLogger('ORCHESTRATOR');

interface ManagedAgent {
  agent: BaseAgent;
  intervalId?: NodeJS.Timeout;
  cycleInProgress?: boolean; // Guard against overlapping async cycles
}

/**
 * Orchestrator - Central coordination
 */
export class Orchestrator {
  private agents: Map<string, ManagedAgent> = new Map();
  private walletManager: WalletManager;
  private solanaClient: SolanaClient;
  private transactions: TransactionRecord[] = [];
  private readonly maxTransactions: number = 10000;
  private startTime: Date;
  private loopInterval: number;
  private maxAgents: number;

  constructor() {
    const config = getConfig();
    this.walletManager = getWalletManager();
    this.solanaClient = getSolanaClient();
    this.startTime = new Date();
    this.loopInterval = config.AGENT_LOOP_INTERVAL_MS;
    this.maxAgents = config.MAX_AGENTS;
    this.scheduleAgentDailyReset();
  }

  /**
   * Reset daily counters on all agents at midnight.
   * Without this, agent-level limits (airdropsToday, transfersToday)
   * become permanent after one day.
   */
  private scheduleAgentDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      for (const managed of this.agents.values()) {
        const agent = managed.agent;
        if (agent instanceof AccumulatorAgent) {
          agent.resetDailyCounters();
        } else if (agent instanceof DistributorAgent) {
          agent.resetDailyCounters();
        }
      }
      logger.info('Agent daily counters reset');
      this.scheduleAgentDailyReset();
    }, msUntilMidnight);
  }

  /**
   * Create a new agent with an associated wallet
   */
  async createAgent(config: AgentConfig): Promise<Result<AgentInfo, Error>> {
    // Check agent limit
    if (this.agents.size >= this.maxAgents) {
      return failure(new Error(`Maximum agent limit reached (${this.maxAgents})`));
    }

    // Create wallet for agent
    const walletResult = this.walletManager.createWallet(config.name);
    if (!walletResult.ok) {
      return failure(walletResult.error);
    }

    const wallet = walletResult.value;

    // Create agent
    const agentResult = createAgent({
      config,
      walletId: wallet.id,
      walletPublicKey: wallet.publicKey,
    });

    if (!agentResult.ok) {
      // Clean up wallet if agent creation fails
      this.walletManager.deleteWallet(wallet.id);
      return failure(agentResult.error);
    }

    const agent = agentResult.value;

    // Store managed agent
    this.agents.set(agent.id, { agent });

    // Emit event
    eventBus.emit({
      id: uuidv4(),
      type: 'agent_created',
      timestamp: new Date(),
      agent: agent.getInfo(),
    });

    logger.info('Agent created and bound to wallet', {
      agentId: agent.id,
      walletId: wallet.id,
      strategy: config.strategy,
    });

    return success(agent.getInfo());
  }

  /**
   * Start an agent's autonomous loop
   */
  startAgent(agentId: string): Result<true, Error> {
    const managed = this.agents.get(agentId);
    if (!managed) {
      return failure(new Error(`Agent not found: ${agentId}`));
    }

    if (managed.intervalId) {
      return failure(new Error('Agent is already running'));
    }

    managed.agent.setStatus('idle');

    // Start the agent loop
    managed.intervalId = setInterval(async () => {
      await this.runAgentCycle(agentId);
    }, this.loopInterval);

    // Run first cycle immediately
    this.runAgentCycle(agentId);

    logger.info('Agent started', { agentId });

    return success(true);
  }

  /**
   * Stop an agent's autonomous loop
   */
  stopAgent(agentId: string): Result<true, Error> {
    const managed = this.agents.get(agentId);
    if (!managed) {
      return failure(new Error(`Agent not found: ${agentId}`));
    }

    if (managed.intervalId) {
      clearInterval(managed.intervalId);
      managed.intervalId = undefined;
    }

    managed.agent.stop();

    logger.info('Agent stopped', { agentId });

    return success(true);
  }

  /**
   * Run a single agent cycle
   */
  private async runAgentCycle(agentId: string): Promise<void> {
    const managed = this.agents.get(agentId);
    if (!managed) return;

    // Prevent overlapping cycles if previous cycle is still running
    if (managed.cycleInProgress) {
      logger.debug('Skipping cycle, previous still running', { agentId });
      return;
    }

    const { agent } = managed;

    if (agent.getStatus() === 'stopped') {
      return;
    }

    managed.cycleInProgress = true;

    try {
      // Update status
      agent.setStatus('thinking');

      // Build agent context
      const context = await this.buildAgentContext(agent);
      if (!context.ok) {
        agent.setStatus('error', context.error.message);
        return;
      }

      // Let agent think
      const decision = await agent.think(context.value);

      // Emit action event
      eventBus.emit({
        id: uuidv4(),
        type: 'agent_action',
        timestamp: new Date(),
        agentId: agent.id,
        action: decision.shouldAct ? 'decided_to_act' : 'decided_to_wait',
        details: { reasoning: decision.reasoning },
      });

      if (decision.shouldAct && decision.intent) {
        agent.setStatus('executing');
        await this.executeIntent(agent, decision.intent, context.value.balance.sol);
      }

      agent.recordAction();
      agent.setStatus('idle');
    } catch (error) {
      logger.error('Agent cycle failed', {
        agentId,
        error: String(error),
      });
      agent.setStatus('error', String(error));
    } finally {
      managed.cycleInProgress = false;
    }
  }

  /**
   * Build context for agent decision making
   */
  private async buildAgentContext(agent: BaseAgent): Promise<Result<AgentContext, Error>> {
    const walletId = agent.getWalletId();

    // Get public key
    const publicKeyResult = this.walletManager.getPublicKey(walletId);
    if (!publicKeyResult.ok) {
      return failure(publicKeyResult.error);
    }

    // Get balance
    const balanceResult = await this.solanaClient.getBalance(publicKeyResult.value);
    if (!balanceResult.ok) {
      return failure(balanceResult.error);
    }

    // Get token balances
    const tokenBalancesResult = await this.solanaClient.getTokenBalances(publicKeyResult.value);
    const tokenBalances = tokenBalancesResult.ok ? tokenBalancesResult.value : [];

    // Get recent transactions for this agent
    const recentTxs = this.transactions
      .filter((tx) => tx.walletId === walletId)
      .slice(-10)
      .map((tx) => tx.signature ?? tx.id);

    return success({
      walletPublicKey: publicKeyResult.value.toBase58(),
      balance: balanceResult.value,
      tokenBalances,
      recentTransactions: recentTxs,
    });
  }

  /**
   * Execute an agent's intent
   */
  private async executeIntent(
    agent: BaseAgent,
    intent: Intent,
    currentBalance: number
  ): Promise<void> {
    const walletId = agent.getWalletId();

    logger.info('Executing intent', {
      agentId: agent.id,
      intentType: intent.type,
    });

    // Validate intent against policy
    const validationResult = this.walletManager.validateIntent(
      walletId,
      intent,
      currentBalance
    );

    if (!validationResult.ok) {
      logger.warn('Intent rejected by policy', {
        agentId: agent.id,
        reason: validationResult.error.message,
      });
      return;
    }

    // Execute based on intent type
    switch (intent.type) {
      case 'airdrop':
        await this.executeAirdrop(agent, intent.amount);
        break;

      case 'transfer_sol':
        await this.executeTransfer(agent, intent.recipient, intent.amount);
        break;

      case 'check_balance':
        // Balance is already in context, nothing to do
        break;

      default:
        logger.warn('Unknown intent type', { intent });
    }
  }

  /**
   * Execute an airdrop
   */
  private async executeAirdrop(agent: BaseAgent, amount: number): Promise<void> {
    const walletId = agent.getWalletId();
    const publicKeyResult = this.walletManager.getPublicKey(walletId);

    if (!publicKeyResult.ok) {
      logger.error('Failed to get public key for airdrop', {
        walletId,
        error: publicKeyResult.error.message,
      });
      return;
    }

    const txRecord: TransactionRecord = {
      id: uuidv4(),
      walletId,
      type: 'airdrop',
      status: 'pending',
      amount,
      createdAt: new Date(),
    };

    this.transactions.push(txRecord);
    this.trimTransactions();

    const result = await this.solanaClient.requestAirdrop(publicKeyResult.value, amount);

    if (result.ok) {
      // Update transaction record
      const idx = this.transactions.findIndex((t) => t.id === txRecord.id);
      if (idx >= 0) {
        this.transactions[idx] = {
          ...txRecord,
          signature: result.value.signature,
          status: 'confirmed',
          confirmedAt: new Date(),
        };
      }

      eventBus.emit({
        id: uuidv4(),
        type: 'transaction',
        timestamp: new Date(),
        transaction: this.transactions[idx] ?? txRecord,
      });

      logger.info('Airdrop successful', {
        agentId: agent.id,
        amount,
        signature: result.value.signature,
      });
    } else {
      const idx = this.transactions.findIndex((t) => t.id === txRecord.id);
      if (idx >= 0) {
        this.transactions[idx] = {
          ...txRecord,
          status: 'failed',
          error: result.error.message,
        };
      }

      logger.error('Airdrop failed', {
        agentId: agent.id,
        error: result.error.message,
      });
    }
  }

  /**
   * Execute a SOL transfer
   */
  private async executeTransfer(
    agent: BaseAgent,
    recipient: string,
    amount: number
  ): Promise<void> {
    const walletId = agent.getWalletId();

    const publicKeyResult = this.walletManager.getPublicKey(walletId);
    if (!publicKeyResult.ok) {
      logger.error('Failed to get public key for transfer', { walletId });
      return;
    }

    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipient);
    } catch {
      logger.error('Invalid recipient address', { recipient });
      return;
    }

    const txRecord: TransactionRecord = {
      id: uuidv4(),
      walletId,
      type: 'transfer_sol',
      status: 'pending',
      amount,
      recipient,
      createdAt: new Date(),
    };

    this.transactions.push(txRecord);
    this.trimTransactions();

    // Build transaction
    const txResult = await buildSolTransfer(
      publicKeyResult.value,
      recipientPubkey,
      amount
    );

    if (!txResult.ok) {
      this.updateTransactionFailed(txRecord.id, txResult.error.message);
      return;
    }

    // Sign transaction
    const signResult = this.walletManager.signTransaction(walletId, txResult.value);
    if (!signResult.ok) {
      this.updateTransactionFailed(txRecord.id, signResult.error.message);
      return;
    }

    // Send transaction
    const sendResult = await this.solanaClient.sendTransaction(signResult.value);

    if (sendResult.ok) {
      this.walletManager.recordTransfer(walletId);

      const idx = this.transactions.findIndex((t) => t.id === txRecord.id);
      if (idx >= 0) {
        this.transactions[idx] = {
          ...txRecord,
          signature: sendResult.value.signature,
          status: 'confirmed',
          confirmedAt: new Date(),
        };

        eventBus.emit({
          id: uuidv4(),
          type: 'transaction',
          timestamp: new Date(),
          transaction: this.transactions[idx]!,
        });
      }

      logger.info('Transfer successful', {
        agentId: agent.id,
        recipient,
        amount,
        signature: sendResult.value.signature,
      });
    } else {
      this.updateTransactionFailed(txRecord.id, sendResult.error.message);
    }
  }

  /**
   * Update a transaction as failed
   */
  private updateTransactionFailed(txId: string, error: string): void {
    const idx = this.transactions.findIndex((t) => t.id === txId);
    if (idx >= 0) {
      const tx = this.transactions[idx];
      if (tx) {
        this.transactions[idx] = {
          ...tx,
          status: 'failed',
          error,
        };
      }
    }
  }

  /**
   * Prevent unbounded growth of the transactions array
   */
  private trimTransactions(): void {
    if (this.transactions.length > this.maxTransactions) {
      this.transactions = this.transactions.slice(-this.maxTransactions);
    }
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentInfo[] {
    return Array.from(this.agents.values()).map((m) => m.agent.getInfo());
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Result<AgentInfo, Error> {
    const managed = this.agents.get(agentId);
    if (!managed) {
      return failure(new Error(`Agent not found: ${agentId}`));
    }
    return success(managed.agent.getInfo());
  }

  /**
   * Get agent transactions
   */
  getAgentTransactions(agentId: string): TransactionRecord[] {
    const managed = this.agents.get(agentId);
    if (!managed) return [];

    const walletId = managed.agent.getWalletId();
    return this.transactions.filter((tx) => tx.walletId === walletId);
  }

  /**
   * Get all transactions
   */
  getAllTransactions(): TransactionRecord[] {
    return [...this.transactions];
  }

  /**
   * Get system stats
   */
  async getStats(): Promise<SystemStats> {
    const agents = this.getAllAgents();
    const activeAgents = agents.filter((a) => a.status !== 'stopped').length;

    // Calculate total SOL under management
    let totalSol = 0;
    for (const managed of this.agents.values()) {
      const publicKeyResult = this.walletManager.getPublicKey(
        managed.agent.getWalletId()
      );
      if (publicKeyResult.ok) {
        const balanceResult = await this.solanaClient.getBalance(publicKeyResult.value);
        if (balanceResult.ok) {
          totalSol += balanceResult.value.sol;
        }
      }
    }

    // Check network health
    const healthResult = await this.solanaClient.checkHealth();
    const networkStatus = healthResult.ok ? 'healthy' : 'degraded';

    const config = getConfig();

    return {
      totalAgents: agents.length,
      activeAgents,
      totalSolManaged: totalSol,
      totalTransactions: this.transactions.length,
      networkStatus,
      network: config.SOLANA_NETWORK,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  /**
   * Shutdown orchestrator
   */
  shutdown(): void {
    logger.info('Shutting down orchestrator');

    for (const [agentId, managed] of this.agents) {
      if (managed.intervalId) {
        clearInterval(managed.intervalId);
      }
      managed.agent.stop();
    }

    this.agents.clear();
  }
}

// Singleton instance
let orchestratorInstance: Orchestrator | null = null;

export function getOrchestrator(): Orchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new Orchestrator();
  }
  return orchestratorInstance;
}
