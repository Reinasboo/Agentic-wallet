'use client';

/**
 * Agent Detail Page
 * 
 * Detailed view of a single agent with transactions and activity.
 */

import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  Play,
  Square,
  Copy,
  Check,
  ExternalLink,
  Wallet,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { Sidebar, Header, TransactionList, ActivityFeed } from '@/components';
import { useAgent } from '@/lib/hooks';
import * as api from '@/lib/api';
import {
  cn,
  formatSol,
  truncateAddress,
  formatTimestamp,
  getStatusBadgeClass,
  getStrategyDisplayName,
  getStrategyDescription,
  copyToClipboard,
} from '@/lib/utils';

export default function AgentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data, loading, error, refetch } = useAgent(id as string | null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleStart = async () => {
    if (!data?.agent.id) return;
    setActionLoading(true);
    await api.startAgent(data.agent.id);
    setActionLoading(false);
    refetch();
  };

  const handleStop = async () => {
    if (!data?.agent.id) return;
    setActionLoading(true);
    await api.stopAgent(data.agent.id);
    setActionLoading(false);
    refetch();
  };

  const handleCopy = async () => {
    if (!data?.agent.walletPublicKey) return;
    const success = await copyToClipboard(data.agent.walletPublicKey);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="ml-60">
          <Header title="Agent Details" />
          <main className="px-8 lg:px-12 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-6 w-24 bg-background-secondary rounded-lg" />
              <div className="card p-6">
                <div className="h-20 bg-background-secondary rounded-lg" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="ml-60">
          <Header title="Agent Details" />
          <main className="px-8 lg:px-12 py-8">
            <div className="card p-8 text-center">
              <p className="text-status-error mb-4">{error || 'Agent not found'}</p>
              <Link href="/agents" className="btn">
                Back to Agents
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const { agent, balance, tokenBalances, transactions, events } = data;
  const isRunning = agent.status !== 'stopped';

  return (
    <>
      <Head>
        <title>{agent.name} | Agentic Wallet System</title>
      </Head>

      <div className="min-h-screen bg-background">
        <Sidebar />

        <div className="ml-60">
          <Header title={agent.name} subtitle={getStrategyDisplayName(agent.strategy)} />

          <main className="px-8 lg:px-12 py-8 space-y-8">
            {/* Back link */}
            <Link
              href="/agents"
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Agents
            </Link>

            {/* Agent Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="card p-6"
            >
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="icon-container w-14 h-14">
                    <Bot className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-text-primary">
                      {agent.name}
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">
                      {getStrategyDisplayName(agent.strategy)} · {getStrategyDescription(agent.strategy)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={cn('badge', getStatusBadgeClass(agent.status))}>
                    <span className={cn('status-dot', `status-dot-${agent.status === 'executing' ? 'active' : agent.status}`)} />
                    {agent.status}
                  </span>

                  {isRunning ? (
                    <button
                      onClick={handleStop}
                      disabled={actionLoading}
                      className="btn btn-sm inline-flex items-center gap-2 text-status-error hover:bg-status-error/10"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={handleStart}
                      disabled={actionLoading}
                      className="btn-primary btn-sm inline-flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start
                    </button>
                  )}

                  <button
                    onClick={refetch}
                    className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-background-secondary transition-colors duration-200"
                    title="Refresh"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Error message */}
              {agent.errorMessage && (
                <div className="mt-4 p-3 bg-status-error/10 border border-status-error/20 rounded-lg">
                  <p className="text-sm text-status-error">
                    {agent.errorMessage}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Wallet Card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="card p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="icon-container">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-text-secondary">Wallet</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-text-primary">
                    {truncateAddress(agent.walletPublicKey, 8, 6)}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-md hover:bg-background-secondary transition-colors duration-200"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-status-success" />
                    ) : (
                      <Copy className="w-4 h-4 text-text-tertiary" />
                    )}
                  </button>
                  <a
                    href={`https://explorer.solana.com/address/${agent.walletPublicKey}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md hover:bg-background-secondary transition-colors duration-200"
                  >
                    <ExternalLink className="w-4 h-4 text-text-tertiary" />
                  </a>
                </div>
              </motion.div>

              {/* Balance Card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="card p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="icon-container">
                    <span className="text-primary font-semibold">◎</span>
                  </div>
                  <span className="text-sm text-text-secondary">Balance</span>
                </div>
                <div className="text-2xl font-semibold text-text-primary">{formatSol(balance)} SOL</div>
              </motion.div>

              {/* Activity Card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="card p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="icon-container">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-text-secondary">Transactions</span>
                </div>
                <div className="text-2xl font-semibold text-text-primary">{transactions.length}</div>
                {agent.lastActionAt && (
                  <p className="text-xs text-text-tertiary mt-1">
                    Last action: {formatTimestamp(agent.lastActionAt)}
                  </p>
                )}
              </motion.div>
            </div>

            {/* Token Balances */}
            {tokenBalances.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="card p-5"
              >
                <h3 className="text-base font-medium text-text-primary mb-4">
                  Token Balances
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {tokenBalances.map((token) => (
                    <div key={token.mint} className="p-4 bg-background-secondary rounded-lg">
                      <div className="text-xs text-text-tertiary mb-1">
                        {truncateAddress(token.mint, 4, 4)}
                      </div>
                      <div className="font-mono text-text-primary">
                        {token.uiAmount}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Transactions */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="xl:col-span-2"
              >
                <h3 className="text-base font-medium text-text-primary mb-4">
                  Transaction History
                </h3>
                <TransactionList transactions={transactions} />
              </motion.div>

              {/* Activity */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="xl:col-span-1"
              >
                <ActivityFeed events={events} maxItems={10} />
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
