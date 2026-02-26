'use client';

/**
 * Strategy Browser Page
 *
 * Displays all available agent strategies with descriptions,
 * supported intents, and configurable parameters.
 * Feels like a strategy marketplace — calm, browsable.
 */

import Head from 'next/head';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Send,
  Shield,
  CalendarClock,
  Zap,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { Sidebar, Header } from '@/components';
import { useStrategies } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import type { StrategyDefinition, StrategyFieldDescriptor } from '@/lib/types';

const iconMap: Record<string, React.ElementType> = {
  TrendingUp,
  Send,
  Shield,
  CalendarClock,
  Zap,
  Layers,
};

const categoryLabels: Record<string, string> = {
  income: 'Income',
  distribution: 'Distribution',
  trading: 'Trading',
  utility: 'Utility',
  custom: 'Custom',
};

const categoryColors: Record<string, string> = {
  income: 'text-emerald-600 bg-emerald-50',
  distribution: 'text-amber-600 bg-amber-50',
  trading: 'text-blue-600 bg-blue-50',
  utility: 'text-violet-600 bg-violet-50',
  custom: 'text-text-secondary bg-background-tertiary',
};

function FieldRow({ field }: { field: StrategyFieldDescriptor }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border-light last:border-b-0">
      <div className="flex-1 min-w-0">
        <span className="text-body-sm font-medium text-text-primary">{field.label}</span>
        {field.description && (
          <p className="text-caption text-text-muted mt-0.5">{field.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
        <span className="text-caption text-text-tertiary font-mono">{field.type}</span>
        {field.default !== undefined && field.default !== '' && (
          <span className="text-caption text-text-muted">
            default: <span className="font-mono">{JSON.stringify(field.default)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: StrategyDefinition }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = iconMap[strategy.icon] ?? Zap;
  const catColor = categoryColors[strategy.category] ?? categoryColors.custom;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border-light rounded-2xl overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-heading-sm text-text-primary">{strategy.label}</h3>
              {strategy.builtIn && (
                <span className="text-micro px-1.5 py-0.5 rounded bg-primary-50 text-primary-600 font-medium">
                  Built-in
                </span>
              )}
            </div>
            <p className="text-body text-text-secondary mb-3">{strategy.description}</p>

            <div className="flex items-center gap-3 flex-wrap">
              <span className={cn('text-micro px-2 py-0.5 rounded-full font-medium', catColor)}>
                {categoryLabels[strategy.category] ?? strategy.category}
              </span>
              {strategy.supportedIntents.map((intent) => (
                <span
                  key={intent}
                  className="text-micro px-2 py-0.5 rounded bg-background text-text-muted font-mono"
                >
                  {intent}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable params section */}
      {strategy.fields.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-6 py-3 border-t border-border-light bg-background-secondary/30 hover:bg-background-secondary/60 transition-colors"
          >
            <span className="text-caption text-text-muted">
              {strategy.fields.length} configurable parameter{strategy.fields.length === 1 ? '' : 's'}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="px-6 py-4 border-t border-border-light bg-background-secondary/20"
            >
              {strategy.fields.map((field) => (
                <FieldRow key={field.key} field={field} />
              ))}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

export default function StrategiesPage() {
  const { strategies, loading, error } = useStrategies();

  // Group by category
  const grouped = strategies.reduce<Record<string, StrategyDefinition[]>>((acc, s) => {
    const cat = s.category || 'custom';
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(s);
    return acc;
  }, {});

  return (
    <>
      <Head>
        <title>Strategies | Agentic Wallet</title>
      </Head>

      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <div className="flex-1 ml-60">
          <Header
            title="Strategies"
            subtitle="Browse available agent strategies and their parameters"
          />

          <main className="px-8 lg:px-12 pb-12 space-y-8">
            {loading && (
              <div className="text-center py-12 text-text-muted">Loading strategies…</div>
            )}

            {error && (
              <div className="text-center py-12 text-status-error">{error}</div>
            )}

            {!loading && !error && Object.entries(grouped).map(([category, items]) => (
              <section key={category}>
                <h2 className="text-label text-text-secondary mb-4">
                  {categoryLabels[category] ?? category}
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {items.map((strategy) => (
                    <StrategyCard key={strategy.name} strategy={strategy} />
                  ))}
                </div>
              </section>
            ))}

            {!loading && !error && strategies.length === 0 && (
              <div className="text-center py-12 text-text-muted">
                No strategies available.
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
