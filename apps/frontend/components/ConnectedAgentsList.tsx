'use client';

/**
 * Connected Agents List Component
 *
 * Displays all externally-connected (BYOA) agents.
 * Purely observational — no secrets or control actions for intents.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Plug,
  Wifi,
  WifiOff,
  ShieldAlert,
  Globe,
  Monitor,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExternalAgent, ExternalAgentStatus } from '@/lib/types';

interface ConnectedAgentCardProps {
  agent: ExternalAgent;
}

const statusConfig: Record<
  ExternalAgentStatus,
  { label: string; color: string; icon: typeof Wifi }
> = {
  registered: {
    label: 'Registered',
    color: 'text-blue-500 bg-blue-500/10',
    icon: Plug,
  },
  active: {
    label: 'Connected',
    color: 'text-status-success bg-status-success/10',
    icon: Wifi,
  },
  inactive: {
    label: 'Inactive',
    color: 'text-text-muted bg-surface-hover',
    icon: WifiOff,
  },
  revoked: {
    label: 'Revoked',
    color: 'text-status-error bg-status-error/10',
    icon: ShieldAlert,
  },
};

function ConnectedAgentCard({ agent }: ConnectedAgentCardProps) {
  const status = statusConfig[agent.status] ?? statusConfig.inactive;
  const StatusIcon = status.icon;
  const TypeIcon = agent.type === 'remote' ? Globe : Monitor;

  return (
    <Link href={`/connected-agents/${agent.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="group bg-surface border border-border-light rounded-2xl p-5 hover:border-primary-200 transition-all cursor-pointer"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <Plug className="w-[18px] h-[18px] text-primary-500" />
            </div>
            <div>
              <h3 className="text-body font-medium text-text-primary group-hover:text-primary-600 transition-colors">
                {agent.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <TypeIcon className="w-3 h-3 text-text-muted" />
                <span className="text-caption text-text-muted capitalize">
                  {agent.type}
                </span>
              </div>
            </div>
          </div>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium',
              status.color,
            )}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          {agent.walletPublicKey && (
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Wallet</span>
              <span className="text-text-secondary font-mono text-caption">
                {agent.walletPublicKey.slice(0, 4)}...{agent.walletPublicKey.slice(-4)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Balance</span>
            <span className="text-text-primary font-medium">
              {(agent.balance ?? 0).toFixed(4)} SOL
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Intents</span>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {agent.supportedIntents.map((intent) => (
                <span
                  key={intent}
                  className="text-micro px-1.5 py-0.5 rounded bg-surface-hover text-text-muted"
                >
                  {intent}
                </span>
              ))}
            </div>
          </div>
          {agent.lastActiveAt && (
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Last active</span>
              <span className="text-caption text-text-secondary">
                {new Date(agent.lastActiveAt).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* Footer arrow */}
        <div className="mt-4 flex justify-end">
          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary-500 transition-colors" />
        </div>
      </motion.div>
    </Link>
  );
}

interface ConnectedAgentsListProps {
  agents: ExternalAgent[];
}

export function ConnectedAgentsList({ agents }: ConnectedAgentsListProps) {
  if (agents.length === 0) {
    return (
      <div className="bg-surface border border-border-light rounded-2xl p-12 text-center">
        <Plug className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-body text-text-secondary mb-1">
          No connected agents yet
        </p>
        <p className="text-caption text-text-muted">
          External agents will appear here after registering via the BYOA API.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {agents.map((agent) => (
        <ConnectedAgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
