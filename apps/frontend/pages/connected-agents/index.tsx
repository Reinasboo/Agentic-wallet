'use client';

/**
 * Connected Agents Page
 *
 * Lists all externally-registered (BYOA) agents.
 * Purely observational — the frontend cannot register or control agents.
 */

import Head from 'next/head';
import {
  Sidebar,
  Header,
  ConnectedAgentsList,
} from '@/components';
import { useExternalAgents } from '@/lib/hooks';

export default function ConnectedAgentsPage() {
  const { agents, loading } = useExternalAgents();

  return (
    <>
      <Head>
        <title>Connected Agents | Agentic Wallet</title>
      </Head>

      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <div className="flex-1 ml-60">
          <Header
            title="Connected Agents"
            subtitle="External agents registered via the BYOA API"
          />

          <main className="px-8 lg:px-12 pb-12 space-y-6">
            {loading ? (
              <div className="text-center py-12 text-text-muted text-body">
                Loading connected agents…
              </div>
            ) : (
              <ConnectedAgentsList agents={agents} />
            )}
          </main>
        </div>
      </div>
    </>
  );
}
