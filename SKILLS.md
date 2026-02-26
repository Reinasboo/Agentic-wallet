# Skills Reference

Machine-readable documentation of wallet capabilities and agent-accessible actions.

## Wallet Capabilities

```yaml
wallet:
  version: "1.0.0"
  network: "devnet"
  
  capabilities:
    create_wallet:
      description: "Create a new wallet with encrypted key storage"
      returns:
        - id: "string"
        - publicKey: "string"
        - createdAt: "datetime"
      
    get_balance:
      description: "Retrieve SOL balance for a wallet"
      parameters:
        - name: "walletId"
          type: "string"
          required: true
      returns:
        - sol: "number"
        - lamports: "bigint"
    
    get_token_balances:
      description: "Retrieve SPL token balances"
      parameters:
        - name: "walletId"
          type: "string"
          required: true
      returns:
        - array:
            - mint: "string"
            - amount: "bigint"
            - decimals: "number"
            - uiAmount: "number"
    
    sign_transaction:
      description: "Sign a transaction (internal use only)"
      access: "wallet_layer_only"
      parameters:
        - name: "walletId"
          type: "string"
        - name: "transaction"
          type: "Transaction"
    
    request_airdrop:
      description: "Request SOL airdrop from devnet faucet"
      parameters:
        - name: "publicKey"
          type: "PublicKey"
        - name: "amount"
          type: "number"
          constraints:
            max: 2.0
            unit: "SOL"
    
    transfer_sol:
      description: "Transfer SOL to another wallet"
      parameters:
        - name: "from"
          type: "walletId"
        - name: "to"
          type: "PublicKey"
        - name: "amount"
          type: "number"
      constraints:
        - "Policy validation required"
        - "Balance check required"
        - "Daily limit check"
    
    transfer_token:
      description: "Transfer SPL tokens"
      parameters:
        - name: "from"
          type: "walletId"
        - name: "mint"
          type: "PublicKey"
        - name: "to"
          type: "PublicKey"
        - name: "amount"
          type: "number"
```

## Agent Actions

```yaml
agent:
  version: "1.0.0"
  
  intents:
    airdrop:
      description: "Request SOL airdrop"
      parameters:
        - name: "amount"
          type: "number"
          constraints:
            min: 0.1
            max: 2.0
            unit: "SOL"
      policy_checks:
        - "daily_airdrop_limit"
    
    transfer_sol:
      description: "Transfer SOL to recipient"
      parameters:
        - name: "recipient"
          type: "string"
          format: "base58"
        - name: "amount"
          type: "number"
          constraints:
            min: 0.0
            max_policy: "maxTransferAmount"
            unit: "SOL"
      policy_checks:
        - "max_transfer_amount"
        - "daily_transfer_limit"
        - "min_balance_maintained"
        - "recipient_allowlist"
        - "recipient_blocklist"
    
    transfer_token:
      description: "Transfer SPL tokens"
      parameters:
        - name: "mint"
          type: "string"
          format: "base58"
        - name: "recipient"
          type: "string"
          format: "base58"
        - name: "amount"
          type: "number"
    
    check_balance:
      description: "Request balance update"
      parameters: []
```

## Agent Strategies

```yaml
strategies:
  accumulator:
    description: "Maintains target balance through airdrops"
    parameters:
      targetBalance:
        type: "number"
        default: 2.0
        unit: "SOL"
      minBalance:
        type: "number"
        default: 0.5
        unit: "SOL"
      airdropAmount:
        type: "number"
        default: 1.0
        unit: "SOL"
      maxAirdropsPerDay:
        type: "number"
        default: 5
    behavior:
      - "Check balance against minBalance"
      - "If below, request airdrop"
      - "Respect daily airdrop limit"
  
  distributor:
    description: "Distributes SOL to recipients"
    parameters:
      recipients:
        type: "string[]"
        default: []
      amountPerTransfer:
        type: "number"
        default: 0.01
        unit: "SOL"
      minBalanceToDistribute:
        type: "number"
        default: 0.1
        unit: "SOL"
      maxTransfersPerDay:
        type: "number"
        default: 10
      distributionProbability:
        type: "number"
        default: 0.5
        range: [0, 1]
    behavior:
      - "Check if balance > minBalanceToDistribute"
      - "Select next recipient"
      - "Transfer amountPerTransfer"
      - "Cycle through recipients"
```

## Policy Constraints

```yaml
policy:
  defaults:
    maxTransferAmount:
      value: 1.0
      unit: "SOL"
      description: "Maximum SOL per transfer"
    
    maxDailyTransfers:
      value: 100
      description: "Maximum transfers per wallet per day"
    
    requireMinBalance:
      value: 0.01
      unit: "SOL"
      description: "Minimum balance to maintain for fees"
    
    allowedRecipients:
      value: null
      description: "Optional whitelist of allowed recipients"
    
    blockedRecipients:
      value: null
      description: "Optional blacklist of blocked recipients"
```

## API Schema

```yaml
api:
  base_url: "http://localhost:3001"
  websocket: "ws://localhost:3002"
  
  endpoints:
    health:
      method: "GET"
      path: "/api/health"
      response:
        success: "boolean"
        data:
          status: "string"
    
    stats:
      method: "GET"
      path: "/api/stats"
      response:
        totalAgents: "number"
        activeAgents: "number"
        totalSolManaged: "number"
        totalTransactions: "number"
        networkStatus: "string"
        network: "string"
        uptime: "number"
    
    list_agents:
      method: "GET"
      path: "/api/agents"
      response: "Agent[]"
    
    get_agent:
      method: "GET"
      path: "/api/agents/:id"
      response:
        agent: "Agent"
        balance: "number"
        tokenBalances: "TokenBalance[]"
        transactions: "Transaction[]"
        events: "SystemEvent[]"
    
    create_agent:
      method: "POST"
      path: "/api/agents"
      body:
        name: "string"
        strategy: "accumulator | distributor"
        strategyParams: "object?"
      response: "Agent"
    
    start_agent:
      method: "POST"
      path: "/api/agents/:id/start"
    
    stop_agent:
      method: "POST"
      path: "/api/agents/:id/stop"
    
    list_transactions:
      method: "GET"
      path: "/api/transactions"
      response: "Transaction[]"
    
    list_events:
      method: "GET"
      path: "/api/events"
      query:
        count: "number?"
      response: "SystemEvent[]"
```

## Event Types

```yaml
events:
  agent_created:
    fields:
      agent: "AgentInfo"
  
  agent_status_changed:
    fields:
      agentId: "string"
      previousStatus: "AgentStatus"
      newStatus: "AgentStatus"
  
  agent_action:
    fields:
      agentId: "string"
      action: "string"
      details: "object?"
  
  transaction:
    fields:
      transaction: "TransactionRecord"
  
  balance_changed:
    fields:
      walletId: "string"
      previousBalance: "number"
      newBalance: "number"
  
  system_error:
    fields:
      error: "string"
      context: "object?"
```

## Type Definitions

```typescript
type AgentStatus = 
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'waiting'
  | 'error'
  | 'stopped';

type AgentStrategy = 
  | 'accumulator'
  | 'distributor'
  | 'trader'
  | 'custom';

type TransactionStatus = 
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'finalized'
  | 'failed';

type TransactionType = 
  | 'airdrop'
  | 'transfer_sol'
  | 'transfer_spl'
  | 'create_token_account';
```
