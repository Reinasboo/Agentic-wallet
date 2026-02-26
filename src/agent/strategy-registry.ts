/**
 * Strategy Registry
 *
 * Central registry for all agent strategies.
 * Each strategy declares its name, description, parameter schema,
 * supported intents, and default configuration.
 *
 * Strategies produce intents only — they never sign or send transactions.
 * This registry enables dynamic strategy discovery for both the backend
 * and frontend (via API).
 */

import { z, ZodObject, ZodRawShape } from 'zod';

// ============================================
// Strategy Definition Types
// ============================================

/**
 * Execution settings that apply to every strategy.
 */
export interface ExecutionSettings {
  readonly cycleIntervalMs: number;
  readonly maxActionsPerDay: number;
  readonly enabled: boolean;
}

export const DEFAULT_EXECUTION_SETTINGS: ExecutionSettings = {
  cycleIntervalMs: 30_000,
  maxActionsPerDay: 100,
  enabled: true,
};

export const ExecutionSettingsSchema = z.object({
  cycleIntervalMs: z.number().int().min(5000).max(3_600_000).default(30_000),
  maxActionsPerDay: z.number().int().min(1).max(10_000).default(100),
  enabled: z.boolean().default(true),
});

/**
 * A strategy definition — registered once, used many times.
 */
export interface StrategyDefinition<TParams extends ZodRawShape = ZodRawShape> {
  /** Unique key, e.g. 'accumulator', 'copy_trader' */
  readonly name: string;
  /** Human-readable label */
  readonly label: string;
  /** Short description */
  readonly description: string;
  /** Intent types this strategy may produce */
  readonly supportedIntents: readonly string[];
  /** Zod schema for strategy-specific parameters */
  readonly paramSchema: ZodObject<TParams>;
  /** Default parameter values */
  readonly defaultParams: Record<string, unknown>;
  /** Whether this is a built-in or user/custom strategy */
  readonly builtIn: boolean;
  /** Icon hint for the frontend (lucide icon name) */
  readonly icon: string;
  /** Category for grouping in the UI */
  readonly category: 'income' | 'distribution' | 'trading' | 'utility' | 'custom';
}

/**
 * Serializable version of StrategyDefinition for API responses.
 * Replaces the Zod schema with a JSON-friendly field descriptor array.
 */
export interface StrategyDefinitionDTO {
  name: string;
  label: string;
  description: string;
  supportedIntents: string[];
  defaultParams: Record<string, unknown>;
  builtIn: boolean;
  icon: string;
  category: string;
  fields: StrategyFieldDescriptor[];
}

export interface StrategyFieldDescriptor {
  key: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'string[]';
  description?: string;
  required: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  placeholder?: string;
}

// ============================================
// Built-in Strategy Definitions
// ============================================

export const AccumulatorStrategyDef: StrategyDefinition = {
  name: 'accumulator',
  label: 'Accumulator',
  description: 'Maintains wallet balance through periodic devnet airdrops',
  supportedIntents: ['airdrop', 'check_balance'],
  paramSchema: z.object({
    targetBalance: z.number().min(0.1).max(100).default(2.0),
    minBalance: z.number().min(0.01).max(50).default(0.5),
    airdropAmount: z.number().min(0.1).max(2).default(1.0),
    maxAirdropsPerDay: z.number().int().min(1).max(50).default(5),
  }),
  defaultParams: {
    targetBalance: 2.0,
    minBalance: 0.5,
    airdropAmount: 1.0,
    maxAirdropsPerDay: 5,
  },
  builtIn: true,
  icon: 'TrendingUp',
  category: 'income',
};

export const DistributorStrategyDef: StrategyDefinition = {
  name: 'distributor',
  label: 'Distributor',
  description: 'Distributes SOL to a list of configured recipients',
  supportedIntents: ['transfer_sol', 'transfer_token', 'check_balance'],
  paramSchema: z.object({
    recipients: z.array(z.string()).default([]),
    amountPerTransfer: z.number().min(0.001).max(1.0).default(0.01),
    minBalanceToDistribute: z.number().min(0.01).max(10).default(0.1),
    maxTransfersPerDay: z.number().int().min(1).max(1000).default(10),
    distributionProbability: z.number().min(0).max(1).default(0.5),
  }),
  defaultParams: {
    recipients: [],
    amountPerTransfer: 0.01,
    minBalanceToDistribute: 0.1,
    maxTransfersPerDay: 10,
    distributionProbability: 0.5,
  },
  builtIn: true,
  icon: 'Send',
  category: 'distribution',
};

export const BalanceGuardStrategyDef: StrategyDefinition = {
  name: 'balance_guard',
  label: 'Balance Guard',
  description: 'Monitors balance and requests airdrops only when critically low',
  supportedIntents: ['airdrop', 'check_balance'],
  paramSchema: z.object({
    criticalBalance: z.number().min(0.001).max(10).default(0.05),
    airdropAmount: z.number().min(0.1).max(2).default(0.5),
    maxAirdropsPerDay: z.number().int().min(1).max(10).default(3),
  }),
  defaultParams: {
    criticalBalance: 0.05,
    airdropAmount: 0.5,
    maxAirdropsPerDay: 3,
  },
  builtIn: true,
  icon: 'Shield',
  category: 'utility',
};

export const ScheduledPayerStrategyDef: StrategyDefinition = {
  name: 'scheduled_payer',
  label: 'Scheduled Payer',
  description: 'Sends fixed SOL amounts to a single recipient on a regular schedule',
  supportedIntents: ['transfer_sol', 'transfer_token', 'check_balance'],
  paramSchema: z.object({
    recipient: z.string().min(1).default(''),
    amount: z.number().min(0.001).max(1.0).default(0.01),
    maxPaymentsPerDay: z.number().int().min(1).max(100).default(5),
    minBalanceToSend: z.number().min(0.01).max(10).default(0.1),
  }),
  defaultParams: {
    recipient: '',
    amount: 0.01,
    maxPaymentsPerDay: 5,
    minBalanceToSend: 0.1,
  },
  builtIn: true,
  icon: 'CalendarClock',
  category: 'distribution',
};

// ============================================
// Strategy Field Descriptors (for API serialization)
// ============================================

const strategyFieldDescriptors: Record<string, StrategyFieldDescriptor[]> = {
  accumulator: [
    { key: 'targetBalance', label: 'Target Balance', type: 'number', description: 'SOL balance to maintain', required: false, default: 2.0, min: 0.1, max: 100 },
    { key: 'minBalance', label: 'Min Balance', type: 'number', description: 'Request airdrop below this', required: false, default: 0.5, min: 0.01, max: 50 },
    { key: 'airdropAmount', label: 'Airdrop Amount', type: 'number', description: 'SOL per airdrop request', required: false, default: 1.0, min: 0.1, max: 2 },
    { key: 'maxAirdropsPerDay', label: 'Max Airdrops / Day', type: 'number', description: 'Daily airdrop limit', required: false, default: 5, min: 1, max: 50 },
  ],
  distributor: [
    { key: 'recipients', label: 'Recipients', type: 'string[]', description: 'Wallet addresses to distribute to', required: false, default: [] },
    { key: 'amountPerTransfer', label: 'Amount per Transfer', type: 'number', description: 'SOL per transfer', required: false, default: 0.01, min: 0.001, max: 1.0 },
    { key: 'minBalanceToDistribute', label: 'Min Balance to Distribute', type: 'number', description: 'Don\'t distribute below this balance', required: false, default: 0.1, min: 0.01, max: 10 },
    { key: 'maxTransfersPerDay', label: 'Max Transfers / Day', type: 'number', description: 'Daily transfer limit', required: false, default: 10, min: 1, max: 1000 },
    { key: 'distributionProbability', label: 'Distribution Probability', type: 'number', description: 'Chance to distribute each cycle (0-1)', required: false, default: 0.5, min: 0, max: 1 },
  ],
  balance_guard: [
    { key: 'criticalBalance', label: 'Critical Balance', type: 'number', description: 'Airdrop when balance drops below this', required: false, default: 0.05, min: 0.001, max: 10 },
    { key: 'airdropAmount', label: 'Airdrop Amount', type: 'number', description: 'SOL per airdrop request', required: false, default: 0.5, min: 0.1, max: 2 },
    { key: 'maxAirdropsPerDay', label: 'Max Airdrops / Day', type: 'number', description: 'Daily airdrop limit', required: false, default: 3, min: 1, max: 10 },
  ],
  scheduled_payer: [
    { key: 'recipient', label: 'Recipient Address', type: 'string', description: 'Wallet address to pay', required: true, default: '', placeholder: 'Solana address...' },
    { key: 'amount', label: 'Payment Amount', type: 'number', description: 'SOL per payment', required: false, default: 0.01, min: 0.001, max: 1.0 },
    { key: 'maxPaymentsPerDay', label: 'Max Payments / Day', type: 'number', description: 'Daily payment limit', required: false, default: 5, min: 1, max: 100 },
    { key: 'minBalanceToSend', label: 'Min Balance to Send', type: 'number', description: 'Don\'t send if balance is below this', required: false, default: 0.1, min: 0.01, max: 10 },
  ],
};

// ============================================
// Registry Class
// ============================================

class StrategyRegistry {
  private strategies: Map<string, StrategyDefinition> = new Map();

  constructor() {
    // Register built-in strategies
    this.register(AccumulatorStrategyDef);
    this.register(DistributorStrategyDef);
    this.register(BalanceGuardStrategyDef);
    this.register(ScheduledPayerStrategyDef);
  }

  /**
   * Register a new strategy definition.
   */
  register(definition: StrategyDefinition): void {
    this.strategies.set(definition.name, definition);
  }

  /**
   * Get a strategy definition by name.
   */
  get(name: string): StrategyDefinition | undefined {
    return this.strategies.get(name);
  }

  /**
   * Check if a strategy name is registered.
   */
  has(name: string): boolean {
    return this.strategies.has(name);
  }

  /**
   * List all registered strategy names.
   */
  list(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Validate strategy params against the registered schema.
   * Returns the parsed (with defaults applied) params if valid.
   */
  validateParams(strategyName: string, params: Record<string, unknown>): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
    const def = this.strategies.get(strategyName);
    if (!def) {
      return { ok: false, error: `Unknown strategy: ${strategyName}` };
    }
    const result = def.paramSchema.safeParse(params);
    if (!result.success) {
      return { ok: false, error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') };
    }
    return { ok: true, value: result.data as Record<string, unknown> };
  }

  /**
   * Get all strategies as serializable DTOs for API responses.
   */
  getAllDTOs(): StrategyDefinitionDTO[] {
    return Array.from(this.strategies.values()).map(def => ({
      name: def.name,
      label: def.label,
      description: def.description,
      supportedIntents: [...def.supportedIntents],
      defaultParams: { ...def.defaultParams },
      builtIn: def.builtIn,
      icon: def.icon,
      category: def.category,
      fields: strategyFieldDescriptors[def.name] ?? [],
    }));
  }

  /**
   * Get a single strategy DTO.
   */
  getDTO(name: string): StrategyDefinitionDTO | undefined {
    const def = this.strategies.get(name);
    if (!def) return undefined;
    return {
      name: def.name,
      label: def.label,
      description: def.description,
      supportedIntents: [...def.supportedIntents],
      defaultParams: { ...def.defaultParams },
      builtIn: def.builtIn,
      icon: def.icon,
      category: def.category,
      fields: strategyFieldDescriptors[def.name] ?? [],
    };
  }
}

// Singleton
let registryInstance: StrategyRegistry | null = null;

export function getStrategyRegistry(): StrategyRegistry {
  if (!registryInstance) {
    registryInstance = new StrategyRegistry();
  }
  return registryInstance;
}
