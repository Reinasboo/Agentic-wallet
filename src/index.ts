/**
 * Agentic Wallet System - Main Entry Point
 * 
 * Starts the API server and initializes the system.
 */

import { startServer } from './server.js';
import { createLogger } from './utils/logger.js';
import { getConfig } from './utils/config.js';

const logger = createLogger('MAIN');

async function main(): Promise<void> {
  try {
    const config = getConfig();
    
    logger.info('Starting Agentic Wallet System', {
      network: config.SOLANA_NETWORK,
      rpcUrl: config.SOLANA_RPC_URL,
    });
    
    startServer();
    
    logger.info('System started successfully');
    logger.info(`API available at http://localhost:${config.PORT}`);
    logger.info(`WebSocket available at ws://localhost:${config.WS_PORT}`);
  } catch (error) {
    logger.error('Failed to start system', { error: String(error) });
    process.exit(1);
  }
}

main();
