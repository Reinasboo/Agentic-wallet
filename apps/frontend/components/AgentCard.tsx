'use client';

/**
 * Agent Card Component
 * 
 * Clean, calm agent card with subtle interactions.
 * Focused on clarity and status visibility.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Play, 
  Square, 
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import type { Agent } from '@/lib/types';
import * as api from '@/lib/api';
import {
  cn,
  formatSol,
  truncateAddress,
  formatRelativeTime,
  getStatusBadgeClass,
  getStrategyDisplayName,
  copyToClipboard,
} from '@/lib/utils';

interface AgentCardProps {
  agent: Agent;
  onUpdate?: () => void;
}

export function AgentCard({ agent, onUpdate }: AgentCardProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleStart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    await api.startAgent(agent.id);
    setLoading(false);
    onUpdate?.();
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    await api.stopAgent(agent.id);
    setLoading(false);
    onUpdate?.();
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await copyToClipboard(agent.walletPublicKey);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isRunning = agent.status !== 'stopped';

  return (
    <Link href={`/agents/${agent.id}`}>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="card p-5 cursor-pointer group"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={cn(
              'icon-container',
              agent.strategy === 'accumulator' 
                ? 'bg-primary-100' 
                : 'bg-secondary-100'
            )}>
              <Bot className={cn(
                'w-5 h-5',
                agent.strategy === 'accumulator' 
                  ? 'text-primary-600' 
                  : 'text-secondary-600'
              )} />
            </div>
            <div>
              <h3 className="text-body font-medium text-text-primary">
                {agent.name}
              </h3>
              <span className="text-caption text-text-tertiary">
                {getStrategyDisplayName(agent.strategy)}
              </span>
            </div>
          </div>

          {/* Status badge */}
          <span className={cn('badge', getStatusBadgeClass(agent.status))}>
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              agent.status === 'executing' ? 'animate-pulse-subtle' : '',
              agent.status === 'idle' ? 'bg-status-idle' :
              agent.status === 'executing' ? 'bg-status-warning' :
              agent.status === 'error' ? 'bg-status-error' :
              agent.status === 'stopped' ? 'bg-text-muted' :
              'bg-status-info'
            )} />
            {agent.status}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-3">
          {/* Wallet Address */}
          <div className="flex items-center justify-between">
            <span className="text-caption text-text-muted">Wallet</span>
            <div className="flex items-center gap-2">
              <span className="mono text-text-secondary">
                {truncateAddress(agent.walletPublicKey, 6, 4)}
              </span>
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-background-secondary transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-status-success" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-text-muted hover:text-text-tertiary" />
                )}
              </button>
            </div>
          </div>

          {/* Balance */}
          <div className="flex items-center justify-between">
            <span className="text-caption text-text-muted">Balance</span>
            <span className="mono font-medium text-text-primary">
              {formatSol(agent.balance ?? 0)} <span className="text-text-tertiary">SOL</span>
            </span>
          </div>

          {/* Last Action */}
          {agent.lastActionAt && (
            <div className="flex items-center justify-between">
              <span className="text-caption text-text-muted">Last Activity</span>
              <span className="text-caption text-text-tertiary">
                {formatRelativeTime(agent.lastActionAt)}
              </span>
            </div>
          )}
        </div>

        {/* Error message */}
        {agent.errorMessage && (
          <div className="mt-4 p-3 bg-status-error-bg rounded-lg border border-status-error/20">
            <p className="text-caption text-status-error truncate">
              {agent.errorMessage}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-border-light flex items-center justify-between">
          {/* Action button */}
          {isRunning ? (
            <button
              onClick={handleStop}
              disabled={loading}
              className="btn btn-ghost btn-sm text-status-error"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={loading}
              className="btn btn-ghost btn-sm text-status-success"
            >
              <Play className="w-3.5 h-3.5" />
              Start
            </button>
          )}

          {/* View details indicator */}
          <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary-500 transition-colors" />
        </div>
      </motion.div>
    </Link>
  );
}

