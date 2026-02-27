/**
 * API Server
 * 
 * REST API for the frontend to observe system state.
 * The frontend is READ-ONLY - it cannot execute transactions or access keys.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import { getOrchestrator, eventBus } from './orchestrator/index.js';
import { getWalletManager } from './wallet/index.js';
import { getSolanaClient } from './rpc/index.js';
import { getConfig, getExplorerUrl } from './utils/config.js';
import { createLogger } from './utils/logger.js';
import { ApiResponse, SystemEvent, AgentConfig } from './utils/types.js';
import {
  getAgentRegistry,
  getWalletBinder,
  getIntentRouter,
  ExternalIntent,
  SupportedIntentType,
} from './integration/index.js';
import { getStrategyRegistry } from './agent/strategy-registry.js';

const logger = createLogger('API');

const app = express();

// Restrict CORS to expected origins
const config = getConfig();
app.use(cors({
  origin: [
    `http://localhost:${config.PORT}`,
    `http://localhost:3000`,         // Next.js dev
    'http://127.0.0.1:3000',
  ],
  methods: ['GET', 'POST', 'PATCH'],
}));

// Limit request body size to prevent DoS (512kb for raw transactions)
app.use(express.json({ limit: '512kb' }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.debug('API request', {
    method: req.method,
    path: req.path,
    query: req.query,
  });
  next();
});

// Root route — API index
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Agentic Wallet System',
    version: '1.0.0',
    network: config.SOLANA_NETWORK,
    endpoints: {
      health: '/api/health',
      stats: '/api/stats',
      agents: '/api/agents',
      transactions: '/api/transactions',
      strategies: '/api/strategies',
      byoa: '/api/byoa/register',
      docs: 'https://github.com/Reinasboo/Agentic-wallet',
    },
    dashboard: 'http://localhost:3000',
    timestamp: new Date(),
  });
});

// Validation schemas
const CreateAgentSchema = z.object({
  name: z.string().min(1).max(50),
  strategy: z.string().min(1).max(50),
  strategyParams: z.record(z.unknown()).optional(),
  executionSettings: z.object({
    cycleIntervalMs: z.number().int().min(5000).max(3600000).optional(),
    maxActionsPerDay: z.number().int().min(1).max(10000).optional(),
    enabled: z.boolean().optional(),
  }).optional(),
});

const UpdateAgentConfigSchema = z.object({
  strategyParams: z.record(z.unknown()).optional(),
  executionSettings: z.object({
    cycleIntervalMs: z.number().int().min(5000).max(3600000).optional(),
    maxActionsPerDay: z.number().int().min(1).max(10000).optional(),
    enabled: z.boolean().optional(),
  }).optional(),
});

/**
 * Authenticate a BYOA agent by bearer token and verify the token
 * belongs to the agent identified in the route :id parameter.
 * Returns the authenticated agent record, or sends an error response.
 */
function authenticateBYOAAgent(req: Request, res: Response): { agentId: string } | null {
  const authHeader = req.headers['authorization'] ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Missing or invalid Authorization header. Expected: Bearer <controlToken>',
      timestamp: new Date(),
    });
    return null;
  }
  const token = authHeader.slice(7);
  const registry = getAgentRegistry();
  const authResult = registry.authenticateToken(token);
  if (!authResult.ok) {
    res.status(401).json({
      success: false,
      error: 'Invalid control token',
      timestamp: new Date(),
    });
    return null;
  }
  // Verify the token belongs to the agent in the route
  const routeId = req.params['id'] ?? '';
  if (authResult.value.id !== routeId) {
    res.status(403).json({
      success: false,
      error: 'Token does not authorize actions on this agent',
      timestamp: new Date(),
    });
    return null;
  }
  return { agentId: authResult.value.id };
}

// ============================================
// HEALTH ENDPOINTS
// ============================================

app.get('/api/health', async (_req: Request, res: Response) => {
  const client = getSolanaClient();
  const healthResult = await client.checkHealth();

  const response: ApiResponse<{ status: string }> = {
    success: healthResult.ok,
    data: { status: healthResult.ok ? 'healthy' : 'degraded' },
    timestamp: new Date(),
  };

  res.json(response);
});

// ============================================
// STATS ENDPOINTS
// ============================================

app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const orchestrator = getOrchestrator();
    const stats = await orchestrator.getStats();

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

// ============================================
// AGENT ENDPOINTS
// ============================================

app.get('/api/agents', async (_req: Request, res: Response) => {
  try {
    const orchestrator = getOrchestrator();
    const walletManager = getWalletManager();
    const client = getSolanaClient();

    const agents = orchestrator.getAllAgents();

    // Enrich with balance information
    const enrichedAgents = await Promise.all(
      agents.map(async (agent) => {
        const walletResult = walletManager.getWallet(agent.walletId);
        let balance = 0;

        if (walletResult.ok) {
          const balanceResult = await client.getBalance(
            new (await import('@solana/web3.js')).PublicKey(walletResult.value.publicKey)
          );
          if (balanceResult.ok) {
            balance = balanceResult.value.sol;
          }
        }

        return {
          ...agent,
          balance,
        };
      })
    );

    const response: ApiResponse<typeof enrichedAgents> = {
      success: true,
      data: enrichedAgents,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

app.get('/api/agents/:id', async (req: Request, res: Response) => {
  try {
    const orchestrator = getOrchestrator();
    const walletManager = getWalletManager();
    const client = getSolanaClient();

    const agentResult = orchestrator.getAgent(req.params['id'] ?? '');
    if (!agentResult.ok) {
      res.status(404).json({
        success: false,
        error: agentResult.error.message,
        timestamp: new Date(),
      });
      return;
    }

    const agent = agentResult.value;
    let balance = 0;
    let tokenBalances: unknown[] = [];

    const walletResult = walletManager.getWallet(agent.walletId);
    if (walletResult.ok) {
      const pubkey = new (await import('@solana/web3.js')).PublicKey(
        walletResult.value.publicKey
      );
      const balanceResult = await client.getBalance(pubkey);
      if (balanceResult.ok) {
        balance = balanceResult.value.sol;
      }
      const tokensResult = await client.getTokenBalances(pubkey);
      if (tokensResult.ok) {
        tokenBalances = tokensResult.value;
      }
    }

    const transactions = orchestrator.getAgentTransactions(agent.id);
    const events = eventBus.getAgentEvents(agent.id, 50);

    const response: ApiResponse<{
      agent: typeof agent;
      balance: number;
      tokenBalances: unknown[];
      transactions: typeof transactions;
      events: typeof events;
    }> = {
      success: true,
      data: {
        agent,
        balance,
        tokenBalances,
        transactions,
        events,
      },
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

app.post('/api/agents', async (req: Request, res: Response) => {
  try {
    const validation = CreateAgentSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.message,
        timestamp: new Date(),
      });
      return;
    }

    const orchestrator = getOrchestrator();
    const result = await orchestrator.createAgent(validation.data as AgentConfig);

    if (!result.ok) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        timestamp: new Date(),
      });
      return;
    }

    const response: ApiResponse<typeof result.value> = {
      success: true,
      data: result.value,
      timestamp: new Date(),
    };

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

app.post('/api/agents/:id/start', async (req: Request, res: Response) => {
  try {
    const orchestrator = getOrchestrator();
    const result = orchestrator.startAgent(req.params['id'] ?? '');

    if (!result.ok) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        timestamp: new Date(),
      });
      return;
    }

    res.json({
      success: true,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

app.post('/api/agents/:id/stop', async (req: Request, res: Response) => {
  try {
    const orchestrator = getOrchestrator();
    const result = orchestrator.stopAgent(req.params['id'] ?? '');

    if (!result.ok) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        timestamp: new Date(),
      });
      return;
    }

    res.json({
      success: true,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

app.patch('/api/agents/:id/config', async (req: Request, res: Response) => {
  try {
    const validation = UpdateAgentConfigSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.message,
        timestamp: new Date(),
      });
      return;
    }

    const orchestrator = getOrchestrator();
    const result = orchestrator.updateAgentConfig(
      req.params['id'] ?? '',
      validation.data,
    );

    if (!result.ok) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        timestamp: new Date(),
      });
      return;
    }

    res.json({
      success: true,
      data: result.value,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

// ============================================
// STRATEGY ENDPOINTS
// ============================================

app.get('/api/strategies', (_req: Request, res: Response) => {
  try {
    const registry = getStrategyRegistry();
    const strategies = registry.getAllDTOs();

    res.json({
      success: true,
      data: strategies,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

app.get('/api/strategies/:name', (req: Request, res: Response) => {
  try {
    const registry = getStrategyRegistry();
    const strategy = registry.getDTO(req.params['name'] ?? '');

    if (!strategy) {
      res.status(404).json({
        success: false,
        error: 'Strategy not found',
        timestamp: new Date(),
      });
      return;
    }

    res.json({
      success: true,
      data: strategy,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

// ============================================
// TRANSACTION ENDPOINTS
// ============================================

app.get('/api/transactions', (_req: Request, res: Response) => {
  try {
    const orchestrator = getOrchestrator();
    const transactions = orchestrator.getAllTransactions();

    const response: ApiResponse<typeof transactions> = {
      success: true,
      data: transactions,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

// ============================================
// EVENTS ENDPOINT
// ============================================

app.get('/api/events', (req: Request, res: Response) => {
  try {
    const count = Math.min(parseInt(req.query['count'] as string) || 100, 500);
    const events = eventBus.getRecentEvents(count);

    const response: ApiResponse<typeof events> = {
      success: true,
      data: events,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

app.get('/api/explorer/:signature', (req: Request, res: Response) => {
  const url = getExplorerUrl(req.params['signature'] ?? '');
  res.json({
    success: true,
    data: { url },
    timestamp: new Date(),
  });
});

// ============================================
// BYOA (Bring Your Own Agent) ENDPOINTS
// ============================================

// Validation schemas for BYOA
const RegisterAgentSchema = z.object({
  agentName: z.string().min(1).max(100),
  agentType: z.enum(['local', 'remote']),
  agentEndpoint: z.string().url().optional(),
  supportedIntents: z.array(
    z.enum(['REQUEST_AIRDROP', 'TRANSFER_SOL', 'TRANSFER_TOKEN', 'QUERY_BALANCE', 'AUTONOMOUS'])
  ).min(1),
  metadata: z.record(z.unknown()).optional(),
});

const SubmitIntentSchema = z.object({
  type: z.enum(['REQUEST_AIRDROP', 'TRANSFER_SOL', 'TRANSFER_TOKEN', 'QUERY_BALANCE', 'AUTONOMOUS']),
  params: z.record(z.unknown()).default({}),
}).refine((data) => {
  // For AUTONOMOUS intents, ensure `action` is present
  if (data.type === 'AUTONOMOUS' && typeof data.params['action'] !== 'string') {
    return false;
  }
  return true;
}, { message: 'AUTONOMOUS intents require params.action (string)' });

/**
 * Register an external agent and receive a wallet + control token.
 * The control token is returned ONCE; the caller must store it securely.
 */
app.post('/api/byoa/register', async (req: Request, res: Response) => {
  try {
    const validation = RegisterAgentSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.message,
        timestamp: new Date(),
      });
      return;
    }

    const data = validation.data;
    const registry = getAgentRegistry();
    const binder = getWalletBinder();

    // 1. Register agent
    const regResult = registry.register({
      agentName: data.agentName,
      agentType: data.agentType,
      agentEndpoint: data.agentEndpoint,
      supportedIntents: data.supportedIntents as SupportedIntentType[],
      metadata: data.metadata,
    });

    if (!regResult.ok) {
      res.status(400).json({
        success: false,
        error: regResult.error.message,
        timestamp: new Date(),
      });
      return;
    }

    const { agentId, controlToken } = regResult.value;

    // 2. Create and bind a wallet
    const bindResult = binder.bindNewWallet(agentId);
    if (!bindResult.ok) {
      // Clean up the registration
      registry.revokeAgent(agentId);
      res.status(500).json({
        success: false,
        error: bindResult.error.message,
        timestamp: new Date(),
      });
      return;
    }

    const { walletId, walletPublicKey } = bindResult.value;

    logger.info('BYOA agent registered', {
      agentId,
      agentName: data.agentName,
      walletPublicKey,
    });

    // 3. Return credentials (control token shown ONCE)
    res.status(201).json({
      success: true,
      data: {
        agentId,
        controlToken,
        walletId,
        walletPublicKey,
        supportedIntents: data.supportedIntents,
        message: 'Store the controlToken securely. It will NOT be shown again.',
      },
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

/**
 * Submit an intent as an external agent.
 * Requires Authorization: Bearer <controlToken>
 */
app.post('/api/byoa/intents', async (req: Request, res: Response) => {
  try {
    // Extract bearer token
    const authHeader = req.headers['authorization'] ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid Authorization header. Expected: Bearer <controlToken>',
        timestamp: new Date(),
      });
      return;
    }
    const token = authHeader.slice(7);

    const validation = SubmitIntentSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.message,
        timestamp: new Date(),
      });
      return;
    }

    const router = getIntentRouter();
    const result = await router.submitIntent(token, validation.data as ExternalIntent);

    if (!result.ok) {
      res.status(403).json({
        success: false,
        error: result.error.message,
        timestamp: new Date(),
      });
      return;
    }

    const intentResult = result.value;
    const statusCode = intentResult.status === 'executed' ? 200 : 422;

    res.status(statusCode).json({
      success: intentResult.status === 'executed',
      data: intentResult,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

/**
 * List all connected external agents (for frontend observation).
 */
app.get('/api/byoa/agents', async (_req: Request, res: Response) => {
  try {
    const registry = getAgentRegistry();
    const client = getSolanaClient();
    const walletManager = getWalletManager();

    const agents = registry.getAllAgents();

    // Enrich with balance information
    const enriched = await Promise.all(
      agents.map(async (agent) => {
        let balance = 0;
        if (agent.walletId) {
          const walletResult = walletManager.getWallet(agent.walletId);
          if (walletResult.ok) {
            const balanceResult = await client.getBalance(
              new (await import('@solana/web3.js')).PublicKey(walletResult.value.publicKey)
            );
            if (balanceResult.ok) {
              balance = balanceResult.value.sol;
            }
          }
        }
        return { ...agent, balance };
      })
    );

    res.json({
      success: true,
      data: enriched,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

/**
 * Get a single external agent detail.
 */
app.get('/api/byoa/agents/:id', async (req: Request, res: Response) => {
  try {
    const registry = getAgentRegistry();
    const router = getIntentRouter();
    const client = getSolanaClient();
    const walletManager = getWalletManager();

    const agentResult = registry.getAgent(req.params['id'] ?? '');
    if (!agentResult.ok) {
      res.status(404).json({
        success: false,
        error: agentResult.error.message,
        timestamp: new Date(),
      });
      return;
    }

    const agent = agentResult.value;
    let balance = 0;
    let tokenBalances: unknown[] = [];

    if (agent.walletId) {
      const walletResult = walletManager.getWallet(agent.walletId);
      if (walletResult.ok) {
        const pubkey = new (await import('@solana/web3.js')).PublicKey(
          walletResult.value.publicKey
        );
        const balanceResult = await client.getBalance(pubkey);
        if (balanceResult.ok) {
          balance = balanceResult.value.sol;
        }
        const tokensResult = await client.getTokenBalances(pubkey);
        if (tokensResult.ok) {
          tokenBalances = tokensResult.value;
        }
      }
    }

    const intents = router.getIntentHistory(agent.id, 100);

    res.json({
      success: true,
      data: {
        agent,
        balance,
        tokenBalances,
        intents,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

/**
 * Get intent history for a specific external agent.
 */
app.get('/api/byoa/agents/:id/intents', (req: Request, res: Response) => {
  try {
    const router = getIntentRouter();
    const limit = Math.min(parseInt(req.query['limit'] as string) || 100, 500);
    const intents = router.getIntentHistory(req.params['id'] ?? '', limit);

    res.json({
      success: true,
      data: intents,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

/**
 * Deactivate an external agent.
 * Admin action — no bearer token required (dashboard use).
 */
app.post('/api/byoa/agents/:id/deactivate', (req: Request, res: Response) => {
  try {
    const registry = getAgentRegistry();
    const result = registry.deactivateAgent(req.params['id'] ?? '');

    if (!result.ok) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        timestamp: new Date(),
      });
      return;
    }

    res.json({ success: true, timestamp: new Date() });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

/**
 * Activate an external agent.
 * Admin action — no bearer token required (dashboard use).
 */
app.post('/api/byoa/agents/:id/activate', (req: Request, res: Response) => {
  try {
    const registry = getAgentRegistry();
    const result = registry.activateAgent(req.params['id'] ?? '');

    if (!result.ok) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        timestamp: new Date(),
      });
      return;
    }

    res.json({ success: true, timestamp: new Date() });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

/**
 * Revoke an external agent (permanent).
 * Admin action — no bearer token required (dashboard use).
 */
app.post('/api/byoa/agents/:id/revoke', (req: Request, res: Response) => {
  try {
    const registry = getAgentRegistry();
    const result = registry.revokeAgent(req.params['id'] ?? '');

    if (!result.ok) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        timestamp: new Date(),
      });
      return;
    }

    res.json({ success: true, timestamp: new Date() });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

/**
 * Get all intent history (for dashboard).
 * Includes intents from both BYOA external agents and built-in orchestrated agents.
 */
app.get('/api/byoa/intents', (req: Request, res: Response) => {
  try {
    const router = getIntentRouter();
    const limit = Math.min(parseInt(req.query['limit'] as string) || 100, 500);
    const intents = router.getIntentHistory(undefined, limit);

    res.json({
      success: true,
      data: intents,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

/**
 * Global intent history endpoint — returns ALL intents (built-in + BYOA).
 * The frontend intent-history page uses this.
 */
app.get('/api/intents', (req: Request, res: Response) => {
  try {
    const router = getIntentRouter();
    const limit = Math.min(parseInt(req.query['limit'] as string) || 200, 1000);
    const intents = router.getIntentHistory(undefined, limit);

    res.json({
      success: true,
      data: intents,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    });
  }
});

// ============================================
// WEBSOCKET SERVER
// ============================================

let wss: WebSocketServer | null = null;

function setupWebSocket(port: number): void {
  wss = new WebSocketServer({ port });

  wss.on('connection', (ws: WebSocket) => {
    logger.info('WebSocket client connected');

    // Send initial state
    const orchestrator = getOrchestrator();
    const agents = orchestrator.getAllAgents();
    ws.send(
      JSON.stringify({
        type: 'initial_state',
        data: { agents },
      })
    );

    // Subscribe to events
    const unsubscribe = eventBus.subscribe((event: SystemEvent) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event));
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket client disconnected');
      unsubscribe();
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', { error: String(error) });
    });
  });

  logger.info('WebSocket server started', { port });
}

// ============================================
// SERVER STARTUP
// ============================================

export function startServer(): void {
  const config = getConfig();

  app.listen(config.PORT, () => {
    logger.info('API server started', { port: config.PORT });
  });

  setupWebSocket(config.WS_PORT);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down...');
  const orchestrator = getOrchestrator();
  orchestrator.shutdown();
  if (wss) {
    wss.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down...');
  const orchestrator = getOrchestrator();
  orchestrator.shutdown();
  if (wss) {
    wss.close();
  }
  process.exit(0);
});

export { app };
