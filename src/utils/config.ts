/**
 * Configuration management
 * Loads and validates environment configuration
 */

import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

const ConfigSchema = z.object({
  // Solana
  SOLANA_RPC_URL: z.string().url().default('https://api.devnet.solana.com'),
  SOLANA_NETWORK: z.enum(['devnet', 'testnet', 'mainnet-beta']).default('devnet'),
  
  // Server
  PORT: z.coerce.number().int().positive().default(3001),
  WS_PORT: z.coerce.number().int().positive().default(3002),
  
  // Security
  KEY_ENCRYPTION_SECRET: z.string().min(16).default('dev-secret-change-in-production'),
  
  // Agent
  MAX_AGENTS: z.coerce.number().int().positive().default(10),
  AGENT_LOOP_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  
  // Transaction
  MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  CONFIRMATION_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

let cachedConfig: Config | null = null;

/**
 * Get validated configuration
 * Throws if configuration is invalid
 */
export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  const result = ConfigSchema.safeParse(process.env);
  
  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    );
    throw new Error(`Invalid configuration:\n${errors.join('\n')}`);
  }
  
  // Validate network constraints
  if (result.data.SOLANA_NETWORK === 'mainnet-beta') {
    throw new Error('This system is designed for devnet only. Mainnet is not supported for safety.');
  }
  
  cachedConfig = result.data;
  return cachedConfig;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env['NODE_ENV'] !== 'production';
}

/**
 * Get the Solana explorer URL for a transaction
 */
export function getExplorerUrl(signature: string): string {
  const config = getConfig();
  const cluster = config.SOLANA_NETWORK === 'mainnet-beta' ? '' : `?cluster=${config.SOLANA_NETWORK}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}
