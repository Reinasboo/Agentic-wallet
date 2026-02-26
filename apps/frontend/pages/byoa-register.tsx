'use client';

/**
 * BYOA Registration Page
 *
 * Register an external (Bring Your Own Agent) agent.
 * Shows a form, submits to the backend, and displays
 * the one-time control token with copy UX and security warnings.
 */

import { useState } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plug,
  ShieldAlert,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Sidebar, Header } from '@/components';
import * as api from '@/lib/api';
import { copyToClipboard, cn, truncateAddress } from '@/lib/utils';
import type { BYOARegistrationResult } from '@/lib/types';

const INTENT_OPTIONS = [
  { id: 'REQUEST_AIRDROP', label: 'Request Airdrop' },
  { id: 'TRANSFER_SOL', label: 'Transfer SOL' },
  { id: 'TRANSFER_TOKEN', label: 'Transfer SPL Token' },
  { id: 'QUERY_BALANCE', label: 'Query Balance' },
  { id: 'AUTONOMOUS', label: 'Autonomous (unrestricted)' },
];

export default function BYOARegisterPage() {
  // Form state
  const [agentName, setAgentName] = useState('');
  const [agentType, setAgentType] = useState<'local' | 'remote'>('local');
  const [endpoint, setEndpoint] = useState('');
  const [intents, setIntents] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BYOARegistrationResult | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [walletCopied, setWalletCopied] = useState(false);

  const toggleIntent = (id: string) => {
    setIntents((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleRegister = async () => {
    if (!agentName.trim()) {
      setError('Agent name is required.');
      return;
    }
    if (intents.length === 0) {
      setError('Select at least one supported intent.');
      return;
    }
    if (agentType === 'remote' && !endpoint.trim()) {
      setError('Remote agents require an endpoint URL.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await api.registerExternalAgent({
      agentName: agentName.trim(),
      agentType,
      agentEndpoint: agentType === 'remote' ? endpoint.trim() : undefined,
      supportedIntents: intents,
    });

    if (res.success && res.data) {
      setResult(res.data);
    } else {
      setError(res.error || 'Registration failed.');
    }

    setLoading(false);
  };

  const handleCopyToken = async () => {
    if (!result) return;
    const ok = await copyToClipboard(result.controlToken);
    if (ok) {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2500);
    }
  };

  const handleCopyWallet = async () => {
    if (!result) return;
    const ok = await copyToClipboard(result.walletPublicKey);
    if (ok) {
      setWalletCopied(true);
      setTimeout(() => setWalletCopied(false), 2500);
    }
  };

  const handleResetForm = () => {
    setResult(null);
    setAgentName('');
    setAgentType('local');
    setEndpoint('');
    setIntents([]);
    setError(null);
  };

  return (
    <>
      <Head>
        <title>Register External Agent | Agentic Wallet</title>
      </Head>

      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <div className="flex-1 ml-60">
          <Header
            title="Register External Agent"
            subtitle="Connect a Bring-Your-Own-Agent (BYOA) to the wallet system"
          />

          <main className="px-8 lg:px-12 pb-12">
            <div className="max-w-xl mx-auto">
              <AnimatePresence mode="wait">
                {/* --- Registration form --- */}
                {!result && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="card p-6 space-y-5"
                  >
                    {/* Warning */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-status-warning/10 border border-status-warning/20">
                      <AlertTriangle className="w-5 h-5 text-status-warning flex-shrink-0 mt-0.5" />
                      <p className="text-body-sm text-text-secondary">
                        Registered agents receive a one-time <strong>control token</strong>.
                        This token is shown only once — treat it like a password.
                        Never share it or store it in source code.
                      </p>
                    </div>

                    {/* Agent Name */}
                    <div>
                      <label className="label">Agent Name</label>
                      <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="e.g., My Trading Bot"
                        className="input"
                        autoFocus
                      />
                    </div>

                    {/* Agent Type */}
                    <div>
                      <label className="label">Agent Type</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['local', 'remote'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setAgentType(t)}
                            className={cn(
                              'p-3 rounded-xl border-2 text-left transition-all duration-200',
                              agentType === t
                                ? 'border-primary-400 bg-primary-50'
                                : 'border-border hover:border-border-medium bg-background'
                            )}
                          >
                            <span
                              className={cn(
                                'text-body-sm font-medium',
                                agentType === t ? 'text-primary-700' : 'text-text-primary'
                              )}
                            >
                              {t === 'local' ? 'Local' : 'Remote'}
                            </span>
                            <p className="text-micro text-text-muted mt-0.5">
                              {t === 'local'
                                ? 'Runs on same machine'
                                : 'Accessible via HTTP endpoint'}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Endpoint (remote only) */}
                    {agentType === 'remote' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <label className="label">Agent Endpoint URL</label>
                        <input
                          type="url"
                          value={endpoint}
                          onChange={(e) => setEndpoint(e.target.value)}
                          placeholder="https://my-agent.example.com/api"
                          className="input"
                        />
                      </motion.div>
                    )}

                    {/* Supported Intents */}
                    <div>
                      <label className="label">Supported Intents</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {INTENT_OPTIONS.map((opt) => {
                          const active = intents.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              onClick={() => toggleIntent(opt.id)}
                              className={cn(
                                'px-3 py-1.5 rounded-lg border text-body-sm transition-all duration-200',
                                active
                                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                                  : 'border-border bg-background text-text-secondary hover:border-border-medium'
                              )}
                            >
                              {active && <Check className="inline w-3.5 h-3.5 mr-1.5 -ml-0.5" />}
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="p-3 bg-status-error-bg rounded-lg border border-status-error/20">
                        <p className="text-body-sm text-status-error">{error}</p>
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      onClick={handleRegister}
                      disabled={loading}
                      className="btn btn-primary w-full"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-text-inverse/30 border-t-text-inverse rounded-full animate-spin" />
                      ) : (
                        <>
                          <Plug className="w-4 h-4" />
                          Register Agent
                        </>
                      )}
                    </button>
                  </motion.div>
                )}

                {/* --- Success result --- */}
                {result && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    {/* Token card (critical) */}
                    <div className="card border-status-warning/40 p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-status-warning/10 flex items-center justify-center">
                          <ShieldAlert className="w-5 h-5 text-status-warning" />
                        </div>
                        <div>
                          <h3 className="text-heading-sm text-text-primary">Control Token</h3>
                          <p className="text-caption text-status-warning font-medium">
                            This will NOT be shown again
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-background rounded-lg p-3 border border-border-light font-mono text-sm text-text-primary break-all select-all">
                        {result.controlToken}
                        <button
                          onClick={handleCopyToken}
                          className="flex-shrink-0 p-1.5 rounded-md hover:bg-background-secondary transition-colors"
                          title="Copy token"
                        >
                          {tokenCopied ? (
                            <Check className="w-4 h-4 text-status-success" />
                          ) : (
                            <Copy className="w-4 h-4 text-text-tertiary" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-start gap-2 text-micro text-text-muted">
                        <AlertTriangle className="w-3.5 h-3.5 text-status-warning flex-shrink-0 mt-0.5" />
                        <span>
                          Store this token in a secure credential store (e.g. environment variable, vault).
                          If lost, revoke the agent and re-register.
                        </span>
                      </div>
                    </div>

                    {/* Agent details card */}
                    <div className="card p-6 space-y-3">
                      <h3 className="text-heading-sm text-text-primary mb-2">Agent Details</h3>

                      <Row label="Agent ID" value={result.agentId} mono />
                      <Row label="Wallet ID" value={result.walletId} mono />
                      <Row label="Wallet Public Key">
                        <span className="font-mono text-sm text-text-primary">
                          {truncateAddress(result.walletPublicKey, 10, 8)}
                        </span>
                        <button
                          onClick={handleCopyWallet}
                          className="p-1 rounded hover:bg-background-secondary transition-colors ml-1"
                        >
                          {walletCopied ? (
                            <Check className="w-3.5 h-3.5 text-status-success" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-text-tertiary" />
                          )}
                        </button>
                        <a
                          href={`https://explorer.solana.com/address/${result.walletPublicKey}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-background-secondary transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-text-tertiary" />
                        </a>
                      </Row>
                      <Row label="Supported Intents" value={result.supportedIntents.join(', ')} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button onClick={handleResetForm} className="btn btn-secondary flex-1">
                        Register Another
                      </button>
                      <a href="/connected-agents" className="btn btn-primary flex-1 text-center">
                        View Connected Agents
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/* ---------- tiny row helper ---------- */
function Row({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-light last:border-b-0">
      <span className="text-caption text-text-muted">{label}</span>
      {children ? (
        <div className="flex items-center gap-1">{children}</div>
      ) : (
        <span className={cn('text-body-sm text-text-primary', mono && 'font-mono')}>
          {value}
        </span>
      )}
    </div>
  );
}
