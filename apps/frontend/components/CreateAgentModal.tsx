'use client';

/**
 * Create Agent Modal Component
 * 
 * Clean, focused modal for agent creation.
 * Feels intentional and premium.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, TrendingUp, Send } from 'lucide-react';
import * as api from '@/lib/api';
import { cn } from '@/lib/utils';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const strategies = [
  {
    id: 'accumulator',
    name: 'Accumulator',
    description: 'Maintains balance through airdrops',
    icon: TrendingUp,
  },
  {
    id: 'distributor',
    name: 'Distributor',
    description: 'Distributes SOL to recipients',
    icon: Send,
  },
];

export function CreateAgentModal({ isOpen, onClose, onCreated }: CreateAgentModalProps) {
  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState<string>('accumulator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter an agent name');
      return;
    }

    setLoading(true);
    setError(null);

    const response = await api.createAgent({
      name: name.trim(),
      strategy,
    });

    if (response.success && response.data) {
      await api.startAgent(response.data.id);
      onCreated?.();
      onClose();
      setName('');
      setStrategy('accumulator');
    } else {
      setError(response.error || 'Failed to create agent');
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleCreate();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-text-primary/20 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-surface rounded-2xl shadow-lg border border-border mx-4">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border-light">
                <div>
                  <h2 className="text-heading-sm text-text-primary">
                    Create Agent
                  </h2>
                  <p className="text-caption text-text-tertiary mt-0.5">
                    Deploy a new autonomous agent
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-lg hover:bg-background-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-text-tertiary" />
                </button>
              </div>

              {/* Form */}
              <div className="px-6 py-5 space-y-5">
                {/* Name Input */}
                <div>
                  <label className="label">Agent Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., Treasury Manager"
                    className="input"
                    autoFocus
                  />
                </div>

                {/* Strategy Selection */}
                <div>
                  <label className="label">Strategy</label>
                  <div className="grid grid-cols-2 gap-3">
                    {strategies.map((s) => {
                      const Icon = s.icon;
                      const isSelected = strategy === s.id;

                      return (
                        <button
                          key={s.id}
                          onClick={() => setStrategy(s.id)}
                          className={cn(
                            'p-4 rounded-xl border-2 transition-all duration-200 text-left',
                            isSelected
                              ? 'border-primary-400 bg-primary-50'
                              : 'border-border hover:border-border-medium bg-background'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center mb-3',
                            isSelected ? 'bg-primary-100' : 'bg-background-tertiary'
                          )}>
                            <Icon className={cn(
                              'w-4 h-4',
                              isSelected ? 'text-primary-600' : 'text-text-tertiary'
                            )} />
                          </div>
                          <h3 className={cn(
                            'text-body-sm font-medium mb-0.5',
                            isSelected ? 'text-primary-700' : 'text-text-primary'
                          )}>
                            {s.name}
                          </h3>
                          <p className="text-micro text-text-muted">
                            {s.description}
                          </p>
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
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 px-6 py-4 border-t border-border-light bg-background-secondary/30 rounded-b-2xl">
                <button
                  onClick={onClose}
                  className="btn btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="btn btn-primary flex-1"
                  disabled={loading || !name.trim()}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-text-inverse/30 border-t-text-inverse rounded-full animate-spin" />
                  ) : (
                    <>
                      <Bot className="w-4 h-4" />
                      Create
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

