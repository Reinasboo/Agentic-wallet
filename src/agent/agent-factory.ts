/**
 * Agent Factory
 * 
 * Creates agents based on strategy type and configuration.
 */

import { BaseAgent } from './base-agent.js';
import { AccumulatorAgent, AccumulatorParams } from './accumulator-agent.js';
import { DistributorAgent, DistributorParams } from './distributor-agent.js';
import { AgentStrategy, AgentConfig, Result, success, failure } from '../utils/types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AGENT_FACTORY');

export interface CreateAgentOptions {
  config: AgentConfig;
  walletId: string;
  walletPublicKey: string;
}

/**
 * Create an agent based on configuration
 */
export function createAgent(options: CreateAgentOptions): Result<BaseAgent, Error> {
  const { config, walletId, walletPublicKey } = options;

  logger.info('Creating agent', {
    name: config.name,
    strategy: config.strategy,
    walletId,
  });

  try {
    let agent: BaseAgent;

    switch (config.strategy) {
      case 'accumulator':
        agent = new AccumulatorAgent(
          config.name,
          walletId,
          walletPublicKey,
          config.strategyParams as Partial<AccumulatorParams>
        );
        break;

      case 'distributor':
        agent = new DistributorAgent(
          config.name,
          walletId,
          walletPublicKey,
          config.strategyParams as Partial<DistributorParams>
        );
        break;

      case 'trader':
        // Trader agent - future implementation
        return failure(new Error('Trader strategy not yet implemented'));

      case 'custom':
        // Custom agents require special handling
        return failure(new Error('Custom strategy requires direct agent instantiation'));

      default:
        return failure(new Error(`Unknown strategy: ${config.strategy}`));
    }

    logger.info('Agent created successfully', {
      agentId: agent.id,
      name: agent.name,
      strategy: agent.strategy,
    });

    return success(agent);
  } catch (error) {
    logger.error('Failed to create agent', {
      name: config.name,
      error: String(error),
    });
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get available strategies
 */
export function getAvailableStrategies(): AgentStrategy[] {
  return ['accumulator', 'distributor'];
}

/**
 * Get strategy description
 */
export function getStrategyDescription(strategy: AgentStrategy): string {
  switch (strategy) {
    case 'accumulator':
      return 'Automatically requests airdrops to maintain minimum balance';
    case 'distributor':
      return 'Distributes SOL to configured recipients';
    case 'trader':
      return 'Executes trades based on market conditions (not implemented)';
    case 'custom':
      return 'Custom strategy with user-defined logic';
    default:
      return 'Unknown strategy';
  }
}
