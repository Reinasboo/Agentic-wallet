/**
 * Frontend Types
 * 
 * These mirror the backend types for type safety.
 * The frontend only receives public, safe data.
 */

export type AgentStatus = 
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'waiting'
  | 'error'
  | 'stopped';

export type AgentStrategy = string;

export interface ExecutionSettings {
  cycleIntervalMs: number;
  maxActionsPerDay: number;
  enabled: boolean;
}

export type TransactionStatus = 
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'finalized'
  | 'failed';

export type TransactionType = 
  | 'airdrop'
  | 'transfer_sol'
  | 'transfer_spl'
  | 'create_token_account';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  walletId: string;
  walletPublicKey: string;
  strategy: AgentStrategy;
  strategyParams?: Record<string, unknown>;
  executionSettings?: ExecutionSettings;
  createdAt: string;
  lastActionAt?: string;
  errorMessage?: string;
  balance?: number;
}

export interface Transaction {
  id: string;
  signature?: string;
  walletId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount?: number;
  recipient?: string;
  mint?: string;
  error?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface TokenBalance {
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  symbol?: string;
}

export interface SystemStats {
  totalAgents: number;
  activeAgents: number;
  totalSolManaged: number;
  totalTransactions: number;
  networkStatus: 'healthy' | 'degraded' | 'down';
  network: string;
  uptime: number;
}

export interface SystemEvent {
  id: string;
  type: string;
  timestamp: string;
  agentId?: string;
  action?: string;
  details?: Record<string, unknown>;
  transaction?: Transaction;
  agent?: Agent;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface AgentDetail {
  agent: Agent;
  balance: number;
  tokenBalances: TokenBalance[];
  transactions: Transaction[];
  events: SystemEvent[];
}

// ============================================
// BYOA Types (Bring-Your-Own-Agent)
// ============================================

export type ExternalAgentType = 'local' | 'remote';
export type ExternalAgentStatus = 'registered' | 'active' | 'inactive' | 'revoked';
export type SupportedIntentType = 'REQUEST_AIRDROP' | 'TRANSFER_SOL' | 'TRANSFER_TOKEN' | 'QUERY_BALANCE' | 'AUTONOMOUS';

export interface ExternalAgent {
  id: string;
  name: string;
  type: ExternalAgentType;
  endpoint?: string;
  supportedIntents: SupportedIntentType[];
  status: ExternalAgentStatus;
  walletId?: string;
  walletPublicKey?: string;
  createdAt: string;
  lastActiveAt?: string;
  metadata?: Record<string, unknown>;
  balance?: number;
}

export interface IntentHistoryRecord {
  intentId: string;
  agentId: string;
  type: SupportedIntentType;
  params: Record<string, unknown>;
  status: 'executed' | 'rejected';
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
}

export interface ExternalAgentDetail {
  agent: ExternalAgent;
  balance: number;
  tokenBalances: TokenBalance[];
  intents: IntentHistoryRecord[];
}

// ============================================
// Strategy Types
// ============================================

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

export interface StrategyDefinition {
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

// ============================================
// BYOA Registration
// ============================================

export interface BYOARegistrationResult {
  agentId: string;
  controlToken: string;
  walletId: string;
  walletPublicKey: string;
  supportedIntents: string[];
  message: string;
}
