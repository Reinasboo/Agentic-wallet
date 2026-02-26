'use client';

/**
 * Connected Agent Detail Page
 *
 * Shows detail for a single BYOA agent: wallet, balance, intent history.
 * Includes management actions: activate, deactivate, revoke.
 */

import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plug,
  Globe,
  Monitor,
  Wifi,
  WifiOff,
  ShieldAlert,
  Copy,
  CheckCircle2,
  Power,
  PowerOff,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import {
  Sidebar,
  Header,
  IntentHistory,
} from '@/components';
import { useExternalAgent } from '@/lib/hooks';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ExternalAgentStatus } from '@/lib/types';

const statusConfig: Record<
  ExternalAgentStatus,
  { label: string; color: string }
> = {
  registered: { label: 'Registered', color: 'text-blue-500 bg-blue-500/10' },
  active: { label: 'Connected', color: 'text-status-success bg-status-success/10' },
  inactive: { label: 'Inactive', color: 'text-text-muted bg-surface-hover' },
  revoked: { label: 'Revoked', color: 'text-status-error bg-status-error/10' },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button onClick={copy} className="p-1 hover:bg-surface-hover rounded transition-colors">
      {copied ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-text-muted" />
      )}
    </button>
  );
}

export default function ConnectedAgentDetailPage() {
  const router = useRouter();
  const agentId = typeof router.query.id === 'string' ? router.query.id : null;
  const { data, loading, error, refetch } = useExternalAgent(agentId);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const handleActivate = async () => {
    if (!agentId) return;
    setActionLoading(true);
    await api.activateExternalAgent(agentId);
    await refetch();
    setActionLoading(false);
  };

  const handleDeactivate = async () => {
    if (!agentId) return;
    setActionLoading(true);
    await api.deactivateExternalAgent(agentId);
    await refetch();
    setActionLoading(false);
  };

  const handleRevoke = async () => {
    if (!agentId) return;
    setActionLoading(true);
    await api.revokeExternalAgent(agentId);
    await refetch();
    setActionLoading(false);
    setConfirmRevoke(false);
  };

  const agent = data?.agent;
  const statusCfg = agent ? statusConfig[agent.status] ?? statusConfig.inactive : null;
  const TypeIcon = agent?.type === 'remote' ? Globe : Monitor;

  return (
    <>
      <Head>
        <title>
          {agent ? `${agent.name} | Connected Agent` : 'Connected Agent'} | Agentic Wallet
        </title>
      </Head>

      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <div className="flex-1 ml-60">
          <Header
            title={agent?.name ?? 'Loading…'}
            subtitle="Connected agent detail"
          />

          <main className="px-8 lg:px-12 pb-12 space-y-8">
            {/* Back nav */}
            <Link
              href="/connected-agents"
              className="inline-flex items-center gap-1.5 text-caption text-text-muted hover:text-text-secondary transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to connected agents
            </Link>

            {loading && (
              <div className="text-center py-12 text-text-muted">Loading…</div>
            )}

            {error && (
              <div className="text-center py-12 text-status-error">{error}</div>
            )}

            {agent && statusCfg && (
              <>
                {/* Top card */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface border border-border-light rounded-2xl p-6 space-y-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center">
                      <Plug className="w-6 h-6 text-primary-500" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-heading-md text-text-primary">{agent.name}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <TypeIcon className="w-3.5 h-3.5 text-text-muted" />
                        <span className="text-caption text-text-muted capitalize">{agent.type}</span>
                        {agent.endpoint && (
                          <span className="text-caption text-text-muted font-mono ml-2">
                            {agent.endpoint}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-medium',
                        statusCfg.color,
                      )}
                    >
                      {agent.status === 'active' ? (
                        <Wifi className="w-3.5 h-3.5" />
                      ) : agent.status === 'revoked' ? (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      ) : (
                        <WifiOff className="w-3.5 h-3.5" />
                      )}
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Grid details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Wallet */}
                    <div className="bg-surface-hover rounded-xl p-4">
                      <span className="text-caption text-text-muted block mb-1">Wallet Address</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-body font-mono text-text-primary truncate">
                          {agent.walletPublicKey
                            ? `${agent.walletPublicKey.slice(0, 8)}...${agent.walletPublicKey.slice(-6)}`
                            : '—'}
                        </span>
                        {agent.walletPublicKey && <CopyButton text={agent.walletPublicKey} />}
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="bg-surface-hover rounded-xl p-4">
                      <span className="text-caption text-text-muted block mb-1">Balance</span>
                      <span className="text-body font-semibold text-text-primary">
                        {(data.balance ?? 0).toFixed(4)} SOL
                      </span>
                    </div>

                    {/* Supported intents */}
                    <div className="bg-surface-hover rounded-xl p-4">
                      <span className="text-caption text-text-muted block mb-1">Supported Intents</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {agent.supportedIntents.map((i) => (
                          <span
                            key={i}
                            className="text-micro px-1.5 py-0.5 rounded bg-background text-text-secondary"
                          >
                            {i}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Created */}
                    <div className="bg-surface-hover rounded-xl p-4">
                      <span className="text-caption text-text-muted block mb-1">Registered</span>
                      <span className="text-body text-text-primary">
                        {new Date(agent.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Management Actions */}
                  {agent.status !== 'revoked' && (
                    <div className="flex items-center gap-3 pt-2 border-t border-border-light">
                      {agent.status === 'active' || agent.status === 'registered' ? (
                        <button
                          onClick={handleDeactivate}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-caption font-medium text-status-warning bg-status-warning/10 hover:bg-status-warning/20 transition-colors disabled:opacity-50"
                        >
                          <PowerOff className="w-3.5 h-3.5" />
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={handleActivate}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-caption font-medium text-status-success bg-status-success/10 hover:bg-status-success/20 transition-colors disabled:opacity-50"
                        >
                          <Power className="w-3.5 h-3.5" />
                          Activate
                        </button>
                      )}

                      {!confirmRevoke ? (
                        <button
                          onClick={() => setConfirmRevoke(true)}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-caption font-medium text-status-error bg-status-error/10 hover:bg-status-error/20 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Revoke
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-caption text-status-error">Permanently revoke this agent?</span>
                          <button
                            onClick={handleRevoke}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg text-caption font-medium text-white bg-status-error hover:bg-status-error/90 transition-colors disabled:opacity-50"
                          >
                            Yes, revoke
                          </button>
                          <button
                            onClick={() => setConfirmRevoke(false)}
                            className="px-3 py-1.5 rounded-lg text-caption font-medium text-text-muted hover:text-text-primary transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {agent.status === 'revoked' && (
                    <div className="pt-2 border-t border-border-light">
                      <span className="inline-flex items-center gap-2 text-caption text-status-error">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        This agent has been permanently revoked and cannot be reactivated.
                      </span>
                    </div>
                  )}
                </motion.div>

                {/* Intent history */}
                <section>
                  <h3 className="text-label text-text-secondary mb-4">Intent History</h3>
                  <div className="bg-surface border border-border-light rounded-2xl p-5">
                    <IntentHistory intents={data.intents ?? []} maxItems={100} />
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
