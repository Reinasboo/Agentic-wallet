# Agentic Wallet System for Solana

A production-grade autonomous AI agent wallet system for Solana Devnet. This system enables AI agents to programmatically manage wallets, sign transactions, and execute on-chain operations without human intervention.

![Architecture](docs/architecture-diagram.png)

## Features

- **Autonomous Agents**: Self-operating agents with rule-based decision making
- **Secure Wallet Management**: AES-256-GCM encrypted key storage
- **Multi-Agent Support**: Run multiple independent agents simultaneously
- **Policy Engine**: Configurable constraints on agent actions
- **Bring Your Own Agent (BYOA)**: Register external AI agents and give them intent-based wallet access
- **Real-time Dashboard**: Beautiful, Figma-quality frontend for monitoring
- **WebSocket Events**: Live updates on agent activities
- **Devnet Ready**: Safe testing on Solana Devnet

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Solana CLI (optional, for manual testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/agentic-wallet-system.git
cd agentic-wallet-system

# Install backend dependencies
npm install

# Install frontend dependencies
cd apps/frontend
npm install
cd ../..

# Copy environment configuration
cp .env.example .env
```

### Running the System

```bash
# Start both backend and frontend
npm run dev
```

This will start:
- **Backend API**: http://localhost:3001
- **WebSocket Server**: ws://localhost:3002
- **Frontend**: http://localhost:3000

### Creating Your First Agent

1. Open the dashboard at http://localhost:3000
2. Click "Create Agent"
3. Name your agent and select a strategy:
   - **Accumulator**: Automatically requests airdrops to maintain balance
   - **Distributor**: Sends SOL to configured recipients
4. Click "Create & Start"
5. Watch your agent operate autonomously!

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
│  (Next.js + React + Tailwind - READ ONLY observation)       │
└─────────────────────────────────────────────────────────────┘
                              │ REST API / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Orchestration Layer                       │
│  (Binds agents to wallets, manages lifecycle, emits events) │
└─────────────────────────────────────────────────────────────┘
          │                    │                     │
          ▼                    ▼                     ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐
│   Agent Layer    │ │  Integration     │ │      Wallet Layer        │
│  (Decision maker │ │  Layer (BYOA)    │ │  (Key management,        │
│   emits intents) │ │  External agents │ │   transaction signing)   │
└──────────────────┘ │  register here   │ └──────────────────────────┘
                     │  and submit      │            │
                     │  intents via API │            ▼
                     └──────────────────┘ ┌──────────────────────────┐
                                          │        RPC Layer         │
                                          │  (Solana connection,     │
                                          │   transaction submission)│
                                          └──────────────────────────┘
                                                     │
                                                     ▼
                                          ┌──────────────────────────┐
                                          │      Solana Devnet       │
                                          └──────────────────────────┘
```

## Project Structure

```
/apps
  /frontend              # Next.js frontend application
    /pages               # Page components
    /components          # Reusable UI components
    /lib                 # API client, hooks, utilities
    /styles              # Global styles and Tailwind config

/src
  /agent                 # Agent implementations
  /wallet                # Secure wallet management
  /rpc                   # Solana RPC interactions
  /orchestrator          # Agent lifecycle management
  /integration           # BYOA integration layer
  /utils                 # Shared utilities and types

/docs                    # Documentation
README.md
ARCHITECTURE.md          # Detailed system architecture
SECURITY.md              # Security model and threat analysis
SKILLS.md                # Machine-readable capabilities
DEEP_DIVE.md             # Design philosophy and rationale
```

## API Endpoints

### Health
- `GET /api/health` - Check system health

### Stats
- `GET /api/stats` - Get system statistics

### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get agent details
- `POST /api/agents` - Create new agent
- `POST /api/agents/:id/start` - Start agent
- `POST /api/agents/:id/stop` - Stop agent

### Transactions
- `GET /api/transactions` - List all transactions

### Events
- `GET /api/events` - Get recent events

### BYOA (Bring Your Own Agent)
- `POST /api/byoa/register` - Register external agent, receive wallet + control token
- `POST /api/byoa/intents` - Submit intent (requires Bearer token)
- `GET /api/byoa/agents` - List all connected external agents
- `GET /api/byoa/agents/:id` - Get external agent details
- `GET /api/byoa/agents/:id/intents` - Get intent history for an agent
- `POST /api/byoa/agents/:id/activate` - Activate external agent
- `POST /api/byoa/agents/:id/deactivate` - Deactivate external agent
- `POST /api/byoa/agents/:id/revoke` - Revoke external agent (permanent)
- `GET /api/byoa/intents` - Get all BYOA intent history

## Agent Strategies

### Accumulator
Maintains a target SOL balance by requesting airdrops when below threshold.

```typescript
{
  targetBalance: 2.0,      // SOL
  minBalance: 0.5,         // SOL
  airdropAmount: 1.0,      // SOL per request
  maxAirdropsPerDay: 5
}
```

### Distributor
Distributes SOL to a list of configured recipients.

```typescript
{
  recipients: ['addr1...', 'addr2...'],
  amountPerTransfer: 0.01,     // SOL
  minBalanceToDistribute: 0.1, // SOL
  maxTransfersPerDay: 10
}
```

## Bring Your Own Agent (BYOA)

The BYOA integration allows external developers to connect their own AI agents
(LLMs, bots, trading systems) to the platform without handling private keys or
signing transactions.

### How It Works

1. **Register** your agent via `POST /api/byoa/register`
2. **Receive** a wallet address and a one-time control token
3. **Submit intents** via `POST /api/byoa/intents` (Bearer token auth)
4. **Observe** execution in the dashboard under "Connected Agents"

### Example Integration

```bash
# 1. Register
curl -X POST http://localhost:3001/api/byoa/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "trading-bot-01",
    "agentType": "remote",
    "agentEndpoint": "http://localhost:8080/agent",
    "supportedIntents": ["TRANSFER_SOL", "REQUEST_AIRDROP", "QUERY_BALANCE"]
  }'

# Response contains: agentId, controlToken, walletPublicKey

# 2. Submit an intent
curl -X POST http://localhost:3001/api/byoa/intents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <controlToken>" \
  -d '{
    "type": "REQUEST_AIRDROP",
    "params": { "amount": 1 }
  }'

# 3. Query balance
curl -X POST http://localhost:3001/api/byoa/intents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <controlToken>" \
  -d '{
    "type": "QUERY_BALANCE",
    "params": {}
  }'
```

### Supported Intent Types

| Intent | Description | Parameters |
|--------|-------------|------------|
| `REQUEST_AIRDROP` | Request devnet SOL | `amount` (0-2 SOL) |
| `TRANSFER_SOL` | Transfer SOL | `recipient`, `amount` |
| `QUERY_BALANCE` | Check wallet balance | (none) |

### Security Guarantees

- External agents **never** receive private keys
- All actions go through the **policy engine**
- Intents are **rate-limited** (30/min per agent)
- Agents can only act on **their own** bound wallet
- Control tokens are **hashed** at rest (SHA-256)

## Security

- Private keys are encrypted with AES-256-GCM
- Keys are only decrypted momentarily for signing
- Agents have NO access to private keys
- Frontend is read-only (no key exposure)
- Policy engine validates all intents
- See [SECURITY.md](SECURITY.md) for full threat model

## Configuration

Environment variables (`.env`):

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
PORT=3001
WS_PORT=3002
KEY_ENCRYPTION_SECRET=your-secret-here
MAX_AGENTS=10
AGENT_LOOP_INTERVAL_MS=5000
```

## Testing on Devnet

1. Create an Accumulator agent
2. Watch it automatically request airdrops
3. Create a Distributor agent
4. Add the Accumulator's wallet as a recipient
5. Observe autonomous transfers between agents

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Built with:
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
