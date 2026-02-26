'use client';

/**
 * Dashboard Page
 * 
 * Calm overview of system state.
 * Content-focused with generous whitespace.
 */

import { useState } from 'react';
import Head from 'next/head';
import { Plus } from 'lucide-react';
import {
  Sidebar,
  Header,
  StatsCards,
  AgentList,
  ActivityFeed,
  CreateAgentModal,
} from '@/components';
import { useAgents } from '@/lib/hooks';

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { refetch } = useAgents();

  return (
    <>
      <Head>
        <title>Overview | Agentic Wallet</title>
      </Head>

      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <div className="flex-1 ml-60">
          <Header 
            title="Overview"
            subtitle="Monitor your autonomous agents"
          />

          <main className="px-8 lg:px-12 pb-12 space-y-8">
            {/* Stats */}
            <section>
              <StatsCards />
            </section>

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Agents */}
              <section className="xl:col-span-2 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-label text-text-secondary">
                    Agents
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus className="w-4 h-4" />
                    New Agent
                  </button>
                </div>
                <AgentList onCreateClick={() => setShowCreateModal(true)} />
              </section>

              {/* Activity */}
              <section className="xl:col-span-1">
                <ActivityFeed maxItems={12} />
              </section>
            </div>
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

