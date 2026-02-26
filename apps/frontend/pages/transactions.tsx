'use client';

/**
 * Transactions Page
 * 
 * Full transaction history across all agents.
 */

import Head from 'next/head';
import { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Sidebar, Header, TransactionList } from '@/components';
import { useTransactions } from '@/lib/hooks';
import { cn } from '@/lib/utils';

export default function TransactionsPage() {
  const { transactions, loading, refetch } = useTransactions();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredTransactions = transactions.filter((tx) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'success' && (tx.status === 'confirmed' || tx.status === 'finalized')) ||
      (filter === 'pending' && (tx.status === 'pending' || tx.status === 'submitted')) ||
      (filter === 'failed' && tx.status === 'failed') ||
      (filter === 'airdrop' && tx.type === 'airdrop') ||
      (filter === 'transfer' && tx.type.includes('transfer'));

    const matchesSearch =
      search === '' ||
      tx.signature?.toLowerCase().includes(search.toLowerCase()) ||
      tx.recipient?.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <>
      <Head>
        <title>Transactions | Agentic Wallet System</title>
      </Head>

      <div className="min-h-screen bg-background">
        <Sidebar />

        <div className="ml-60">
          <Header title="Transactions" subtitle="View all wallet activity" />

          <main className="px-8 lg:px-12 py-8 space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 flex-1 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 max-w-md min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search by signature or recipient..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input input-sm pl-10 w-full"
                  />
                </div>

                {/* Filter */}
                <div className="flex items-center gap-1 bg-background-secondary rounded-lg p-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'success', label: 'Success' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'failed', label: 'Failed' },
                    { id: 'airdrop', label: 'Airdrops' },
                    { id: 'transfer', label: 'Transfers' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200',
                        filter === f.id
                          ? 'bg-surface text-text-primary shadow-sm'
                          : 'text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={refetch}
                className="btn btn-sm inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {/* Count */}
            <p className="text-sm text-text-tertiary">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </p>

            {/* Transaction List */}
            <TransactionList transactions={filteredTransactions} loading={loading} />
          </main>
        </div>
      </div>
    </>
  );
}
