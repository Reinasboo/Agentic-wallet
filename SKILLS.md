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

    autonomous:
      description: "Unrestricted agent action — bypasses policy engine"
      parameters:
        - name: "action"
          type: "string"
          enum: ["airdrop", "transfer_sol", "transfer_token", "query_balance"]
          description: "The underlying action to execute"
        - name: "params"
          type: "object"
          description: "Action-specific parameters (same as the target action)"
      policy_checks: []  # No policy validation — autonomous
      notes:
        - "Fully logged to intent history for auditability"
        - "Wallet-manager returns immediate success (no balance/limit checks)"
        - "Designed for advanced operators who accept full responsibility"
```

## dApp / Protocol Interaction Skills

```yaml
protocol_interactions:
  spl_token_transfers:
    description: "Agents can transfer SPL tokens between wallets via the Token Program"
    program: "Token Program (SPL)"
    program_id: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    intent_type: "transfer_token"
    parameters:
      - name: "mint"
        type: "string"
        format: "base58"
        description: "SPL token mint address"
      - name: "recipient"
        type: "string"
        format: "base58"
        description: "Destination wallet address"
      - name: "amount"
        type: "number"
        description: "Token amount (UI units)"
    flow:
      - "Agent creates transfer_token intent"
      - "Orchestrator validates via policy engine"
      - "TransactionBuilder.buildTokenTransfer() constructs instruction"
      - "Memo instruction appended for on-chain audit"
      - "Wallet layer signs; RPC layer submits"
    available_to:
      - "Built-in agents (via createTransferTokenIntent())"
      - "BYOA agents (via TRANSFER_TOKEN intent)"

  onchain_memo_logging:
    description: "Agents attach verifiable on-chain memos to transactions via Memo Program v2"
    program: "Memo Program v2"
    program_id: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
    behavior:
      - "All SOL transfers include a memo instruction"
      - "All SPL token transfers include a memo instruction"
      - "Memos are atomic with the transfer (same transaction)"
      - "Provides on-chain audit trail for agent activity"
    implementation:
      - "buildMemoInstruction(memo) in transaction-builder.ts"
      - "buildMemoTransaction(payer, memo) in transaction-builder.ts"
```

## BYOA Supported Intent Types

```yaml
byoa_intents:
  - REQUEST_AIRDROP
  - TRANSFER_SOL
  - TRANSFER_TOKEN
  - QUERY_BALANCE
  - AUTONOMOUS
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

  balance_guard:
    description: "Emergency-only airdrop when balance is critically low"
    parameters:
      criticalBalance:
        type: "number"
        default: 0.05
        unit: "SOL"
      airdropAmount:
        type: "number"
        default: 1.0
        unit: "SOL"
      maxAirdropsPerDay:
        type: "number"
        default: 3
    behavior:
      - "Check balance against criticalBalance"
      - "If below, request airdrop"
      - "Respect daily airdrop limit"
      - "Otherwise remain idle"

  scheduled_payer:
    description: "Recurring single-recipient SOL payments"
    parameters:
      recipient:
        type: "string"
        format: "base58"
      amount:
        type: "number"
        default: 0.01
        unit: "SOL"
      maxPaymentsPerDay:
        type: "number"
        default: 5
      minBalanceToSend:
        type: "number"
        default: 0.05
        unit: "SOL"
    behavior:
      - "Check if balance > minBalanceToSend + amount"
      - "Transfer amount to recipient"
      - "Respect daily payment limit"
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
        strategy: "string"  # any registered strategy name
        strategyParams: "object?"  # validated by strategy registry
        executionSettings:
          cycleIntervalMs: "number?"  # default 30000
          maxActionsPerDay: "number?"  # default 100
          enabled: "boolean?"          # default true
      response: "Agent"
    
    update_agent_config:
      method: "PATCH"
      path: "/api/agents/:id/config"
      body:
        strategyParams: "object?"
        executionSettings:
          cycleIntervalMs: "number?"
          maxActionsPerDay: "number?"
          enabled: "boolean?"
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
    
    global_intent_history:
      method: "GET"
      path: "/api/intents"
      description: "Returns combined intent history from built-in agents and BYOA agents"
      response: "IntentHistoryRecord[]"
    
    list_strategies:
      method: "GET"
      path: "/api/strategies"
      response: "StrategyDefinitionDTO[]"
    
    get_strategy:
      method: "GET"
      path: "/api/strategies/:name"
      response: "StrategyDefinitionDTO"
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

type AgentStrategy = string;
  // Built-in: 'accumulator' | 'distributor' | 'balance_guard' | 'scheduled_payer'
  // Custom strategies registered via Strategy Registry are also valid

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
