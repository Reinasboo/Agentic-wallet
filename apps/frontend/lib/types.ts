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

export type AgentStrategy = 
  | 'accumulator'
  | 'distributor'
  | 'trader'
  | 'custom';

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
