'use client';

/**
 * Agent List Component
 * 
 * Clean grid of agent cards with empty state.
 */

import { motion } from 'framer-motion';
import { Bot, Plus } from 'lucide-react';
import { useAgents } from '@/lib/hooks';
import { AgentCard } from './AgentCard';

interface AgentListProps {
  onCreateClick?: () => void;
}

export function AgentList({ onCreateClick }: AgentListProps) {
  const { agents, loading, error, refetch } = useAgents();

  if (loading && agents.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-background-secondary" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-background-secondary rounded mb-2" />
                <div className="h-3 w-16 bg-background-secondary rounded" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-3 w-full bg-background-secondary rounded" />
              <div className="h-3 w-2/3 bg-background-secondary rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-status-error mb-4">{error}</p>
        <button onClick={refetch} className="btn btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="card"
      >
        <div className="empty-state py-16">
          <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-background-secondary flex items-center justify-center">
            <Bot className="w-7 h-7 text-text-muted" />
          </div>
          <h3 className="text-heading-sm text-text-primary mb-2">
            No agents yet
          </h3>
          <p className="text-body text-text-tertiary mb-6 max-w-sm mx-auto">
            Create your first agent to start autonomous wallet management.
          </p>
          {onCreateClick && (
            <button onClick={onCreateClick} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Create Agent
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {agents.map((agent, index) => (
        <motion.div
          key={agent.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: index * 0.04,
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1]
          }}
        >
          <AgentCard agent={agent} onUpdate={refetch} />
        </motion.div>
      ))}
    </div>
  );
}

