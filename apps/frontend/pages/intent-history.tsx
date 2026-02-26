'use client';

/**
 * Intent History Page
 *
 * Global view of all BYOA intent submissions across all external agents.
 * Uses the previously dead useExternalIntents hook and GET /api/byoa/intents.
 */

import Head from 'next/head';
import { motion } from 'framer-motion';
import {
  Sidebar,
  Header,
  IntentHistory,
} from '@/components';
import { useAllIntentHistory } from '@/lib/hooks';

export default function IntentHistoryPage() {
  const { intents, loading, error, refetch } = useAllIntentHistory(5000);

  return (
    <>
      <Head>
        <title>Intent History | Agentic Wallet</title>
      </Head>

      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <div className="flex-1 ml-60">
          <Header
            title="Intent History"
            subtitle="All intent activity from built-in and connected agents"
          />

          <main className="px-8 lg:px-12 pb-12 space-y-6">
            {loading ? (
              <div className="text-center py-12 text-text-muted text-body">
                Loading intent history…
              </div>
            ) : error ? (
              <div className="text-center py-12 text-status-error text-body">
                {error}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-border-light rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-label text-text-secondary">
                    All Intents ({intents.length})
                  </h3>
                  <button
                    onClick={refetch}
                    className="text-caption text-text-muted hover:text-text-secondary transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                <IntentHistory intents={intents} maxItems={500} />
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
