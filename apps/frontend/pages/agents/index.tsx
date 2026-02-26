'use client';

/**
 * Agents Page
 * 
 * Complete list with search and filtering.
 * Clean, scannable layout.
 */

import { useState } from 'react';
import Head from 'next/head';
import { Plus, Search } from 'lucide-react';
import {
  Sidebar,
  Header,
  CreateAgentModal,
  AgentCard,
} from '@/components';
import { useAgents } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import type { Agent } from '@/lib/types';

export default function AgentsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { agents, refetch } = useAgents();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredAgents = agents.filter((agent) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && agent.status !== 'stopped') ||
      (filter === 'stopped' && agent.status === 'stopped');

    const matchesSearch =
      search === '' ||
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.walletPublicKey.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <>
      <Head>
        <title>Agents | Agentic Wallet</title>
      </Head>

      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <div className="flex-1 ml-60">
          <Header 
            title="Agents"
            subtitle="Manage autonomous agents"
          />

          <main className="px-8 lg:px-12 pb-12 space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search agents..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input pl-10 input-sm"
                  />
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-1 bg-background-secondary rounded-lg p-1">
                  {['all', 'active', 'stopped'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-caption font-medium transition-colors capitalize',
                        filter === f
                          ? 'bg-surface text-text-primary shadow-xs'
                          : 'text-text-tertiary hover:text-text-secondary'
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus className="w-4 h-4" />
                New Agent
              </button>
            </div>

            {/* Count */}
            <p className="text-caption text-text-muted">
              {filteredAgents.length === agents.length
                ? `${agents.length} agents`
                : `${filteredAgents.length} of ${agents.length} agents`}
            </p>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} onUpdate={refetch} />
              ))}
            </div>

            {/* No results */}
            {filteredAgents.length === 0 && agents.length > 0 && (
              <div className="card p-8 text-center">
                <p className="text-body text-text-tertiary">
                  No agents match your filters
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      <CreateAgentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={refetch}
      />
    </>
  );
}

