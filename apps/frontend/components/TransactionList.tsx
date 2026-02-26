'use client';

/**
 * Transaction List Component
 * 
 * Clean, scannable transaction history.
 * Focus on clarity over density.
 */

import { motion } from 'framer-motion';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import type { Transaction } from '@/lib/types';
import {
  cn,
  formatSol,
  truncateAddress,
  formatTimestamp,
  formatRelativeTime,
  getExplorerUrl,
} from '@/lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  compact?: boolean;
}

function getTransactionIcon(type: string) {
  switch (type) {
    case 'airdrop':
      return <ArrowDownLeft className="w-4 h-4" />;
    case 'transfer_sol':
    case 'transfer_spl':
      return <ArrowUpRight className="w-4 h-4" />;
    default:
      return <ArrowUpRight className="w-4 h-4" />;
  }
}

function getStatusIndicator(status: string) {
  switch (status) {
    case 'confirmed':
    case 'finalized':
      return <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />;
    case 'failed':
      return <XCircle className="w-3.5 h-3.5 text-status-error" />;
    case 'pending':
      return <Clock className="w-3.5 h-3.5 text-status-warning" />;
    case 'submitted':
      return <Loader2 className="w-3.5 h-3.5 text-status-info animate-spin" />;
    default:
      return null;
  }
}

function getTransactionLabel(type: string) {
  switch (type) {
    case 'airdrop':
      return 'Airdrop Received';
    case 'transfer_sol':
      return 'SOL Transfer';
    case 'transfer_spl':
      return 'Token Transfer';
    default:
      return type.replace(/_/g, ' ');
  }
}

export function TransactionList({ transactions, loading, compact = false }: TransactionListProps) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-background-secondary" />
              <div className="flex-1">
                <div className="h-4 w-28 bg-background-secondary rounded mb-2" />
                <div className="h-3 w-40 bg-background-secondary rounded" />
              </div>
              <div className="h-4 w-16 bg-background-secondary rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="card">
        <div className="empty-state py-12">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-background-secondary flex items-center justify-center">
            <Clock className="w-5 h-5 text-text-muted" />
          </div>
          <p className="text-body-sm text-text-tertiary">
            No transactions yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-border-light">
      {transactions.map((tx, index) => (
        <motion.div
          key={tx.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: index * 0.02,
            duration: 0.25,
            ease: [0.16, 1, 0.3, 1]
          }}
          className={cn(
            "flex items-center gap-4 hover:bg-background-secondary/50 transition-colors",
            compact ? "px-4 py-3" : "px-5 py-4"
          )}
        >
          {/* Icon */}
          <div className={cn(
            "flex-shrink-0 rounded-lg bg-background-tertiary flex items-center justify-center text-text-tertiary",
            compact ? "w-8 h-8" : "w-10 h-10"
          )}>
            {getTransactionIcon(tx.type)}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-body-sm font-medium text-text-primary">
                {getTransactionLabel(tx.type)}
              </span>
              {getStatusIndicator(tx.status)}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {tx.recipient && (
                <>
                  <span className="text-caption text-text-muted">to</span>
                  <span className="mono text-caption text-text-tertiary">
                    {truncateAddress(tx.recipient, 6, 4)}
                  </span>
                </>
              )}
              {!compact && (
                <>
                  <span className="text-text-muted">·</span>
                  <span className="text-caption text-text-muted">
                    {formatRelativeTime(tx.createdAt)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="text-right flex-shrink-0">
            {tx.amount ? (
              <span className={cn(
                "mono font-medium",
                tx.type === 'airdrop' ? 'text-status-success' : 'text-text-primary'
              )}>
                {tx.type === 'airdrop' ? '+' : '-'}{formatSol(tx.amount, 3)}
                <span className="text-text-tertiary ml-1">SOL</span>
              </span>
            ) : (
              <span className="text-text-muted">—</span>
            )}
          </div>

          {/* Explorer link */}
          {tx.signature && !compact && (
            <a
              href={getExplorerUrl(tx.signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-2 rounded-md hover:bg-background-tertiary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4 text-text-muted hover:text-primary-500" />
            </a>
          )}
        </motion.div>
      ))}
    </div>
  );
}

