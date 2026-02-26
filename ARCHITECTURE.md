# System Architecture

This document provides a deep dive into the Agentic Wallet System architecture, explaining the design decisions, layer responsibilities, and data flow patterns.

## Design Principles

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Defense in Depth**: Multiple layers of security controls
3. **Fail-Safe Defaults**: Restrictive policies by default
4. **Minimal Attack Surface**: Agents never touch keys
5. **Auditability**: Comprehensive logging and event emission

## Layer Architecture

### 1. Agent Layer (`/src/agent`)

**Responsibility**: Decision making only

The Agent Layer contains the autonomous logic that determines what actions to take. Agents observe their environment through read-only context and emit high-level intents.

```typescript
interface AgentContext {
  walletPublicKey: string;    // Public only
  balance: BalanceInfo;        // Read-only
  tokenBalances: TokenBalance[];
  recentTransactions: string[];
}

interface AgentDecision {
  shouldAct: boolean;
  intent?: Intent;
  reasoning: string;
}
```

**Key Properties**:
- No cryptographic capabilities
- No direct network access
- Cannot construct transactions
- Receives sanitized, read-only context
- Strategy parameters validated by the Strategy Registry (Zod schemas)

**Built-in Strategy Implementations**:

| Strategy | Class | Purpose |
|----------|-------|---------|
| `accumulator` | `AccumulatorAgent` | Maintain balance via airdrops |
| `distributor` | `DistributorAgent` | Distribute SOL to recipients |
| `balance_guard` | `BalanceGuardAgent` | Emergency-only airdrop when critically low |
| `scheduled_payer` | `ScheduledPayerAgent` | Recurring single-recipient payments |

Custom strategies can be registered at runtime via the Strategy Registry.

**Agent Lifecycle**:
```
IDLE → THINKING → (decision) → EXECUTING → IDLE
                      ↓
                   WAITING
```

### 2. Wallet Layer (`/src/wallet`)

**Responsibility**: Secure key management and transaction signing

The Wallet Layer is the security boundary for all cryptographic operations. Private keys are:
- Generated using Solana's secure Keypair
- Encrypted immediately with AES-256-GCM
- Stored only in encrypted form
- Decrypted momentarily for signing

```typescript
// Public interface (exposed)
interface WalletManager {
  createWallet(): WalletInfo;           // Returns public info only
  getPublicKey(id: string): PublicKey;
  signTransaction(id: string, tx: Transaction): Transaction;
  validateIntent(id: string, intent: Intent): boolean;
}

// Internal (never exposed)
interface InternalWallet {
  encryptedSecretKey: string;  // Never leaves this layer
}
```

**Key Management**:
```
Generate → Encrypt → Store → (signing request) → Decrypt → Sign → Discard
                                                            ↓
                                                    Key in memory
                                                    for <10ms
```

### 3. RPC Layer (`/src/rpc`)

**Responsibility**: Solana blockchain interaction

The RPC Layer handles all communication with Solana:
- Connection management
- Transaction building (unsigned)
- Transaction submission
- Retry logic with exponential backoff
- Confirmation tracking
- **Memo Program integration**: All SOL and SPL token transfers include an on-chain memo via Solana's Memo Program v2 (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`). The `buildMemoInstruction()` and `buildMemoTransaction()` helpers in `transaction-builder.ts` attach human-readable memos to every transfer.
- **SPL Token Program interaction**: Token transfers are built using `@solana/spl-token` and the Token Program via `buildTokenTransfer()` in `transaction-builder.ts`.

```typescript
interface SolanaClient {
  getBalance(pubkey: PublicKey): Promise<BalanceInfo>;
  getTokenBalances(owner: PublicKey): Promise<TokenBalance[]>;
  requestAirdrop(pubkey: PublicKey, amount: number): Promise<TransactionResult>;
  sendTransaction(tx: Transaction): Promise<TransactionResult>;
}
```

**Transaction Flow**:
```
Build Transaction → Sign (Wallet Layer) → Submit → Confirm
       ↓                    ↓                ↓
  RPC Layer            Wallet Layer     RPC Layer
```

### 4. Orchestration Layer (`/src/orchestrator`)

**Responsibility**: Coordination and lifecycle management

The Orchestrator binds agents to wallets and manages the execution loop:

```typescript
async function runAgentCycle(agentId: string) {
  // 1. Build read-only context
  const context = await buildAgentContext(agent);
  
  // 2. Let agent think
  const decision = await agent.think(context);
  
  // 3. Validate intent against policy
  if (decision.shouldAct && decision.intent) {
    const valid = walletManager.validateIntent(
      agent.walletId,
      decision.intent,
      context.balance.sol
    );
    
    // 4. Execute if valid
    if (valid) {
      await executeIntent(agent, decision.intent);
    }
  }
  
  // 5. Record intent to global history (IntentRouter)
  recordIntentHistory(agent, decision);
  
  // 6. Emit events for frontend
  eventBus.emit(actionEvent);
}
```

**Multi-Agent Support**:
```
Orchestrator
    ├── Agent 1 (Accumulator)      ──► Wallet 1  (cycle: 30s)
    ├── Agent 2 (Distributor)      ──► Wallet 2  (cycle: 15s)
    ├── Agent 3 (Balance Guard)    ──► Wallet 3  (cycle: 60s)
    ├── Agent 4 (Scheduled Payer)  ──► Wallet 4  (cycle: 30s)
    └── Agent N (Custom)           ──► Wallet N  (cycle: configurable)
```

Each agent has independent **Execution Settings** (cycle interval, max actions
per day, enabled/disabled) that can be updated at runtime via
`PATCH /api/agents/:id/config`.

**Intent History Recording**:

All intent executions — from both built-in agents and BYOA agents — are recorded
via the IntentRouter's public `recordIntent()` method. The Orchestrator calls
this after every cycle so that built-in agent activity appears alongside BYOA
activity in the global intent history. The combined history is available via
`GET /api/intents`.

### 5. Frontend Layer (`/apps/frontend`)

**Responsibility**: Observation and visualization only

The Frontend is the operator's dashboard — primarily observational, with
controlled management actions that never expose key material:

```
Frontend Capabilities:
✓ View agent status, balances, transactions, activity feed
✓ Browse available strategies (Strategy Browser page)
✓ Create agents via multi-step wizard (5 steps: name → strategy → params → execution → review)
✓ Edit agent configuration (strategy params, execution settings, pause/resume)
✓ View connected external agents (BYOA)
✓ Register new external agents (BYOA Registration page)
✓ View global intent history
✗ Access private keys
✗ Sign transactions
✗ Override policy engine
```

**Pages**:

| Route | Purpose |
|-------|---------|
| `/` | Dashboard overview with stats |
| `/agents` | Fleet list with create button |
| `/agents/:id` | Agent detail + settings panel |
| `/strategies` | Strategy browser (marketplace feel) |
| `/connected-agents` | BYOA agent list |
| `/connected-agents/:id` | BYOA agent detail + management |
| `/byoa-register` | Register a new external agent |
| `/intent-history` | Global intent history |
| `/transactions` | Transaction list |

**Data Flow**:
```
Backend → REST API → Frontend (polling)
       → WebSocket → Frontend (real-time)
```

### 6. Integration Layer (`/src/integration`) — BYOA

**Responsibility**: External agent registration, wallet binding, intent routing

The Integration Layer enables Bring-Your-Own-Agent (BYOA) — allowing external
developers to connect their own AI agents without touching private keys.

```
External Agent                              Platform
     │                                         │
     │  POST /api/byoa/register                │
     │  { agentName, type, intents }           │
     │────────────────────────────────────────►│
     │                                         │ Creates wallet
     │  { agentId, controlToken, walletPubkey }│ Binds agent → wallet
     │◄────────────────────────────────────────│
     │                                         │
     │  POST /api/byoa/intents                 │
     │  Bearer <token>                         │
     │  { type: "TRANSFER_SOL", params: {...} }│
     │────────────────────────────────────────►│
     │                                         │ Auth token
     │                                         │ Validate intent
     │                                         │ Policy check
     │                                         │ Sign & execute via wallet layer
     │  { status: "executed", result: {...} }  │
     │◄────────────────────────────────────────│
```

**Components**:

| File | Purpose |
|------|---------|
| `agentRegistry.ts` | Registration, auth tokens, agent lifecycle |
| `walletBinder.ts` | 1:1 wallet creation and binding |
| `intentRouter.ts` | Intent validation, rate limiting, execution dispatch, intent history |
| `agentAdapter.ts` | Communication with local/remote agents |

**Key Properties**:
- External agents never receive private keys
- Standard intents are validated against the policy engine
- `AUTONOMOUS` intents bypass policy validation (operator-accepted risk)
- Rate limiting prevents abuse (30 intents/min per agent)
- Control tokens are stored as SHA-256 hashes
- 1 agent = 1 wallet (enforced at the binder level)
- Intent history is centralized — the IntentRouter's `recordIntent()` method accepts records from both BYOA submissions and Orchestrator-forwarded built-in agent activity

## Strategy Registry (`/src/agent/strategy-registry.ts`)

The Strategy Registry is the single source of truth for all agent strategies.
It holds Zod-based parameter schemas, human-readable field descriptors, and
metadata used by both backend validation and frontend UI rendering.

```typescript
interface StrategyDefinition {
  name: string;                    // e.g. 'accumulator'
  label: string;                   // e.g. 'Accumulator'
  description: string;
  supportedIntents: string[];      // e.g. ['airdrop', 'check_balance']
  paramSchema: ZodObject<any>;     // Zod schema for validation
  defaultParams: Record<string, unknown>;
  fields: StrategyFieldDescriptor[];
  builtIn: boolean;
  icon: string;                    // Lucide icon name
  category: 'income' | 'distribution' | 'trading' | 'utility' | 'custom';
}
```

**Key Properties**:
- Strategies self-register via `registry.register(definition)`
- The `AgentFactory` validates params through the registry before creating agents
- The orchestrator's `updateAgentConfig()` re-validates params through the registry
- The `GET /api/strategies` endpoint serialises `StrategyDefinitionDTO[]` for the frontend
- `AgentStrategy` is now a plain `string` (not a union), enabling runtime extensibility

**Serialisation for the Frontend**:

Zod schemas cannot be sent over the wire, so field descriptors are derived:

```typescript
interface StrategyFieldDescriptor {
  key: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'string[]';
  default?: unknown;
  description?: string;
}
```

## dApp / Protocol Interactions

The system interacts with three deployed Solana programs, demonstrating real dApp/protocol interaction beyond basic account operations:

| Program | ID | Usage |
|---------|----|-------|
| **SystemProgram** | `11111111111111111111111111111111` | Native SOL transfers (`transfer_sol` intents) |
| **Token Program (SPL)** | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` | SPL token transfers (`transfer_token` intents) via `@solana/spl-token` |
| **Memo Program v2** | `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` | On-chain memos attached to every SOL and SPL token transfer |

All three programs are invoked through the RPC Layer's `transaction-builder.ts`, which constructs multi-instruction transactions (e.g., a token transfer + memo instruction in a single atomic transaction). The Wallet Layer signs the composed transaction, and the RPC Layer submits it.

## Intent System

Intents are the bridge between agents (decision makers) and wallets (executors):

```typescript
type Intent = 
  | { type: 'airdrop'; amount: number }
  | { type: 'transfer_sol'; recipient: string; amount: number }
  | { type: 'transfer_token'; mint: string; recipient: string; amount: number }
  | { type: 'check_balance' }
  | { type: 'autonomous'; action: 'airdrop' | 'transfer_sol' | 'transfer_token' | 'query_balance'; params: Record<string, unknown> };
```

**Intent Types**:

| Intent | Description | Policy Validated |
|--------|-------------|------------------|
| `airdrop` | Request devnet SOL | Yes |
| `transfer_sol` | Send SOL | Yes |
| `transfer_token` | Send SPL tokens | Yes |
| `check_balance` | Query balance | N/A |
| `autonomous` | Unrestricted agent action | **No** — bypasses policy engine |

The `autonomous` intent type allows agents to execute any supported action
without policy constraints (no max-amount, no daily-limit, no min-balance
checks). This is designed for advanced use cases where the agent operator
accepts full responsibility. The wallet-manager returns an immediate
`success(true)` for autonomous intents. All autonomous actions are still
fully logged to the intent history for auditability.

**Intent Validation** (standard intents):
1. Policy check (max amounts, daily limits)
2. Balance sufficiency
3. Recipient validation
4. Rate limiting

## Data Flow Diagram

```
┌──────────────┐
│    Agent     │
│   thinks()   │
└──────┬───────┘
       │ Intent
       ▼
┌──────────────┐
│   Policy     │
│  Validator   │
└──────┬───────┘
       │ Validated Intent
       ▼
┌──────────────┐     ┌──────────────┐
│   Wallet     │────►│     RPC      │
│  signTx()    │     │  buildTx()   │
└──────────────┘     └──────┬───────┘
                            │ Signed Tx
                            ▼
                     ┌──────────────┐
                     │   Solana     │
                     │   Devnet     │
                     └──────┬───────┘
                            │ Confirmation
                            ▼
┌──────────────┐     ┌──────────────┐
│   Frontend   │◄────│    Event     │
│ (observer)   │     │     Bus      │
└──────────────┘     └──────────────┘
```

## Event System

Events flow through a central EventBus for real-time updates:

```typescript
type SystemEvent = 
  | AgentCreatedEvent
  | AgentStatusChangedEvent
  | AgentActionEvent
  | TransactionEvent
  | BalanceChangedEvent
  | SystemErrorEvent;
```

Events are:
- Stored in memory (last 1000)
- Broadcast via WebSocket
- Available via REST API

## Configuration

The system is configured via environment variables with validation:

```typescript
const ConfigSchema = z.object({
  SOLANA_RPC_URL: z.string().url(),
  SOLANA_NETWORK: z.enum(['devnet', 'testnet']),  // mainnet blocked
  KEY_ENCRYPTION_SECRET: z.string().min(16),
  MAX_AGENTS: z.number().positive(),
  AGENT_LOOP_INTERVAL_MS: z.number().positive(),
});
```

## Scaling Considerations

**Current Design**:
- Single-process, in-memory state
- Suitable for development and small deployments

**Production Path**:
1. Add persistent storage (encrypted key vault)
2. Implement agent state persistence
3. Add horizontal scaling with message queues
4. Implement distributed locking
5. Add monitoring and alerting

## Error Handling

Each layer handles errors appropriately:

```typescript
type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };
```

- **Agent Layer**: Errors → agent status = 'error'
- **Wallet Layer**: Errors → transaction fails, no retry
- **RPC Layer**: Errors → retry with backoff
- **Frontend**: Errors → display, allow retry
