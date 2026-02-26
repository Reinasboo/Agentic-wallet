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
  
  // 5. Emit events for frontend
  eventBus.emit(actionEvent);
}
```

**Multi-Agent Support**:
```
Orchestrator
    ├── Agent 1 (Accumulator) ──► Wallet 1
    ├── Agent 2 (Distributor) ──► Wallet 2
    └── Agent 3 (Custom)      ──► Wallet 3
```

### 5. Frontend Layer (`/apps/frontend`)

**Responsibility**: Observation and visualization only

The Frontend is a **read-only observer** of system state:

```
Frontend Capabilities:
✓ View agent status
✓ View balances
✓ View transactions
✓ View activity feed
✗ Access private keys
✗ Sign transactions
✗ Modify agent logic
```

**Data Flow**:
```
Backend → REST API → Frontend (polling)
       → WebSocket → Frontend (real-time)
```

## Intent System

Intents are the bridge between agents (decision makers) and wallets (executors):

```typescript
type Intent = 
  | { type: 'airdrop'; amount: number }
  | { type: 'transfer_sol'; recipient: string; amount: number }
  | { type: 'transfer_token'; mint: string; recipient: string; amount: number }
  | { type: 'check_balance' };
```

**Intent Validation**:
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
