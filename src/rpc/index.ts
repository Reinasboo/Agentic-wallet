/**
 * RPC Module Exports
 * 
 * This module handles all Solana blockchain interactions.
 */

export { SolanaClient, getSolanaClient } from './solana-client.js';
export {
  buildSolTransfer,
  buildTokenTransfer,
  buildMemoInstruction,
  buildMemoTransaction,
  buildArbitraryTransaction,
  deserializeTransaction,
  estimateFee,
  MEMO_PROGRAM_ID,
  KNOWN_PROGRAMS,
} from './transaction-builder.js';
export type { InstructionDescriptor } from './transaction-builder.js';
