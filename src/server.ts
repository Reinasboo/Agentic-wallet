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

const logger = createLogger('API');

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.debug('API request', {
    method: req.method,
    path: req.path,
    query: req.query,
  });
  next();
});

// Validation schemas
const CreateAgentSchema = z.object({
  name: z.string().min(1).max(50),
  strategy: z.enum(['accumulator', 'distributor']),
  strategyParams: z.record(z.unknown()).optional(),
});

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

// Auto-start when run directly
startServer();
