'use client';

/**
 * Intent History Component
 *
 * Displays a chronological list of intents submitted by BYOA agents.
 * Purely observational — no action triggers.
 */

import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Cloud,
  Wallet,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntentHistoryRecord, SupportedIntentType } from '@/lib/types';

const intentTypeConfig: Record<
  SupportedIntentType,
  { label: string; icon: typeof Cloud; color: string }
> = {
  REQUEST_AIRDROP: {
    label: 'Airdrop',
    icon: Cloud,
    color: 'text-blue-500',
  },
  TRANSFER_SOL: {
    label: 'Transfer',
    icon: ArrowUpRight,
    color: 'text-amber-500',
  },
  TRANSFER_TOKEN: {
    label: 'Token Transfer',
    icon: ArrowUpRight,
    color: 'text-purple-500',
  },
  QUERY_BALANCE: {
    label: 'Balance',
    icon: Wallet,
    color: 'text-emerald-500',
  },
  AUTONOMOUS: {
    label: 'Autonomous',
    icon: Zap,
    color: 'text-rose-500',
  },
};

interface IntentRowProps {
  record: IntentHistoryRecord;
}

function IntentRow({ record }: IntentRowProps) {
  const config = intentTypeConfig[record.type] ?? intentTypeConfig.QUERY_BALANCE;
  const Icon = config.icon;
  const isExecuted = record.status === 'executed';

  // Build a richer label for autonomous intents
  let label = config.label;
  if (record.type === 'AUTONOMOUS' && record.params?.action) {
    const action = String(record.params.action);
    const actionLabels: Record<string, string> = {
      airdrop: 'Auto Airdrop',
      transfer_sol: 'Auto Transfer',
      transfer_token: 'Auto Token Transfer',
      query_balance: 'Auto Balance Check',
      execute_instructions: 'Arbitrary Execute',
      raw_transaction: 'Raw Transaction',
      swap: `Swap${record.params.dex ? ' (' + record.params.dex + ')' : ''}`,
      create_token: `Create Token${record.params.platform ? ' (' + record.params.platform + ')' : ''}`,
    };
    label = actionLabels[action] ?? `Autonomous: ${action}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 py-3 border-b border-border-light last:border-b-0"
    >
      {/* Intent type icon */}
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-surface-hover', config.color)}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium text-text-primary">
            {label}
          </span>
          {record.type === 'AUTONOMOUS' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold uppercase">
              autonomous
            </span>
          )}
          <span
            className={cn(
              'inline-flex items-center gap-1 text-caption font-medium',
              isExecuted ? 'text-status-success' : 'text-status-error',
            )}
          >
            {isExecuted ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            {isExecuted ? 'Executed' : 'Rejected'}
          </span>
        </div>
        <div className="text-caption text-text-muted truncate mt-0.5">
          {record.error
            ? record.error
            : record.result
              ? Object.entries(record.result)
                  .filter(([k]) => k !== 'autonomous')
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(', ')
              : 'No details'}
        </div>
      </div>

      {/* Timestamp */}
      <span className="text-caption text-text-muted whitespace-nowrap">
        {new Date(record.createdAt).toLocaleTimeString()}
      </span>
    </motion.div>
  );
}

interface IntentHistoryProps {
  intents: IntentHistoryRecord[];
  maxItems?: number;
}

export function IntentHistory({ intents, maxItems = 50 }: IntentHistoryProps) {
  const displayed = intents.slice(-maxItems).reverse();

  if (displayed.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted text-body">
        No intents recorded yet.
      </div>
    );
  }

  return (
    <div className="divide-y-0">
      {displayed.map((record) => (
        <IntentRow key={record.intentId} record={record} />
      ))}
    </div>
  );
}
