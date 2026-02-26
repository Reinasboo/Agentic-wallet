'use client';

/**
 * Create Agent Modal Component — Multi-Step Flow
 *
 * Step 1: Agent name
 * Step 2: Strategy selection (from registry)
 * Step 3: Strategy-specific parameter configuration (dynamic form)
 * Step 4: Execution settings
 * Step 5: Review & create
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bot,
  TrendingUp,
  Send,
  Shield,
  CalendarClock,
  Zap,
  Layers,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react';
import * as api from '@/lib/api';
import { useStrategies } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import type { StrategyDefinition, StrategyFieldDescriptor } from '@/lib/types';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const TOTAL_STEPS = 5;

const iconMap: Record<string, React.ElementType> = {
  TrendingUp,
  Send,
  Shield,
  CalendarClock,
  Zap,
  Layers,
};

/* ---------- Step indicator ---------- */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            i + 1 === current
              ? 'w-6 bg-primary-500'
              : i + 1 < current
              ? 'w-1.5 bg-primary-300'
              : 'w-1.5 bg-border-medium'
          )}
        />
      ))}
    </div>
  );
}

/* ---------- Dynamic field renderer ---------- */
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: StrategyFieldDescriptor;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case 'boolean':
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-border-medium text-primary-500 focus:ring-primary-300"
          />
          <div>
            <span className="text-body-sm text-text-primary">{field.label}</span>
            {field.description && (
              <p className="text-micro text-text-muted">{field.description}</p>
            )}
          </div>
        </label>
      );
    case 'string':
      return (
        <div>
          <label className="label">{field.label}</label>
          {field.description && (
            <p className="text-micro text-text-muted mb-1">{field.description}</p>
          )}
          <input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.default !== undefined ? String(field.default) : ''}
            className="input"
          />
        </div>
      );
    case 'string[]':
      return (
        <div>
          <label className="label">{field.label}</label>
          {field.description && (
            <p className="text-micro text-text-muted mb-1">{field.description}</p>
          )}
          <input
            type="text"
            value={Array.isArray(value) ? (value as string[]).join(', ') : String(value ?? '')}
            onChange={(e) =>
              onChange(
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder="Comma-separated values"
            className="input"
          />
        </div>
      );
    default:
      // number (default)
      return (
        <div>
          <label className="label">{field.label}</label>
          {field.description && (
            <p className="text-micro text-text-muted mb-1">{field.description}</p>
          )}
          <input
            type="number"
            value={value !== undefined && value !== '' ? Number(value) : ''}
            onChange={(e) =>
              onChange(e.target.value === '' ? undefined : Number(e.target.value))
            }
            placeholder={field.default !== undefined ? String(field.default) : ''}
            className="input"
            step="any"
          />
        </div>
      );
  }
}

/* ---------- Main modal ---------- */
export function CreateAgentModal({ isOpen, onClose, onCreated }: CreateAgentModalProps) {
  const { strategies, loading: strategiesLoading } = useStrategies();

  // Form state
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [strategyParams, setStrategyParams] = useState<Record<string, unknown>>({});
  const [execEnabled, setExecEnabled] = useState(true);
  const [cycleInterval, setCycleInterval] = useState(30000);
  const [maxActions, setMaxActions] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived
  const currentStrategyDef = useMemo(
    () => strategies.find((s) => s.name === selectedStrategy),
    [strategies, selectedStrategy]
  );

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName('');
      setSelectedStrategy('');
      setStrategyParams({});
      setExecEnabled(true);
      setCycleInterval(30000);
      setMaxActions(100);
      setError(null);
    }
  }, [isOpen]);

  // When strategy changes, seed default params
  useEffect(() => {
    if (!currentStrategyDef) return;
    const defaults: Record<string, unknown> = {};
    for (const f of currentStrategyDef.fields) {
      if (f.default !== undefined) defaults[f.key] = f.default;
    }
    setStrategyParams(defaults);
  }, [currentStrategyDef]);

  const canAdvance = useCallback((): boolean => {
    switch (step) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return selectedStrategy.length > 0;
      case 3:
        return true; // params have defaults
      case 4:
        return cycleInterval > 0 && maxActions > 0;
      case 5:
        return true;
      default:
        return false;
    }
  }, [step, name, selectedStrategy, cycleInterval, maxActions]);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    const response = await api.createAgent({
      name: name.trim(),
      strategy: selectedStrategy,
      strategyParams,
      executionSettings: {
        enabled: execEnabled,
        cycleIntervalMs: cycleInterval,
        maxActionsPerDay: maxActions,
      },
    });

    if (response.success && response.data) {
      if (execEnabled) {
        await api.startAgent(response.data.id);
      }
      onCreated?.();
      onClose();
    } else {
      setError(response.error || 'Failed to create agent');
    }

    setLoading(false);
  };

  const next = () => {
    if (step === TOTAL_STEPS) {
      handleCreate();
    } else {
      setError(null);
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const stepTitles = ['Name', 'Strategy', 'Parameters', 'Execution', 'Review'];

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
            className="fixed left-1/2 top-[3vh] -translate-x-1/2 z-50 w-full max-w-lg px-4"
          >
            <div className="bg-surface rounded-2xl shadow-lg border border-border flex flex-col max-h-[94vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border-light shrink-0">
                <div>
                  <h2 className="text-heading-sm text-text-primary">
                    Create Agent &mdash; {stepTitles[step - 1]}
                  </h2>
                  <div className="mt-2">
                    <StepIndicator current={step} total={TOTAL_STEPS} />
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 rounded-lg hover:bg-background-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-text-tertiary" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 min-h-0 flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {/* Step 1 — Name */}
                  {step === 1 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      <label className="label">Agent Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && canAdvance() && next()}
                        placeholder="e.g., Treasury Manager"
                        className="input"
                        autoFocus
                      />
                      <p className="text-caption text-text-muted">
                        Choose a memorable name for your agent. You can change it later.
                      </p>
                    </motion.div>
                  )}

                  {/* Step 2 — Strategy */}
                  {step === 2 && (
                    <motion.div
                      key="step-2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                    >
                      {strategiesLoading ? (
                        <p className="text-text-muted text-center py-8">Loading strategies…</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {strategies.map((s) => {
                            const Icon = iconMap[s.icon] ?? Zap;
                            const isSelected = selectedStrategy === s.name;
                            return (
                              <button
                                key={s.name}
                                onClick={() => setSelectedStrategy(s.name)}
                                onDoubleClick={() => {
                                  setSelectedStrategy(s.name);
                                  next();
                                }}
                                className={cn(
                                  'p-4 rounded-xl border-2 transition-all duration-200 text-left',
                                  isSelected
                                    ? 'border-primary-400 bg-primary-50'
                                    : 'border-border hover:border-border-medium bg-background'
                                )}
                              >
                                <div
                                  className={cn(
                                    'w-8 h-8 rounded-lg flex items-center justify-center mb-3',
                                    isSelected ? 'bg-primary-100' : 'bg-background-tertiary'
                                  )}
                                >
                                  <Icon
                                    className={cn(
                                      'w-4 h-4',
                                      isSelected ? 'text-primary-600' : 'text-text-tertiary'
                                    )}
                                  />
                                </div>
                                <h3
                                  className={cn(
                                    'text-body-sm font-medium mb-0.5',
                                    isSelected ? 'text-primary-700' : 'text-text-primary'
                                  )}
                                >
                                  {s.label}
                                </h3>
                                <p className="text-micro text-text-muted line-clamp-2">
                                  {s.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Step 3 — Strategy parameters */}
                  {step === 3 && (
                    <motion.div
                      key="step-3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      {currentStrategyDef && currentStrategyDef.fields.length > 0 ? (
                        currentStrategyDef.fields.map((field) => (
                          <FieldInput
                            key={field.key}
                            field={field}
                            value={strategyParams[field.key]}
                            onChange={(v) =>
                              setStrategyParams((prev) => ({ ...prev, [field.key]: v }))
                            }
                          />
                        ))
                      ) : (
                        <p className="text-text-muted text-center py-8">
                          This strategy has no configurable parameters.
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* Step 4 — Execution settings */}
                  {step === 4 && (
                    <motion.div
                      key="step-4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-5"
                    >
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={execEnabled}
                          onChange={(e) => setExecEnabled(e.target.checked)}
                          className="w-4 h-4 rounded border-border-medium text-primary-500 focus:ring-primary-300"
                        />
                        <div>
                          <span className="text-body-sm font-medium text-text-primary">
                            Start agent immediately
                          </span>
                          <p className="text-micro text-text-muted">
                            If unchecked the agent is created in a paused state.
                          </p>
                        </div>
                      </label>

                      <div>
                        <label className="label">Cycle Interval (ms)</label>
                        <input
                          type="number"
                          value={cycleInterval}
                          onChange={(e) => setCycleInterval(Number(e.target.value) || 0)}
                          className="input"
                          min={1000}
                          step={1000}
                        />
                        <p className="text-micro text-text-muted mt-1">
                          How often the agent executes its strategy cycle.
                        </p>
                      </div>

                      <div>
                        <label className="label">Max Actions Per Day</label>
                        <input
                          type="number"
                          value={maxActions}
                          onChange={(e) => setMaxActions(Number(e.target.value) || 0)}
                          className="input"
                          min={1}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Step 5 — Review */}
                  {step === 5 && (
                    <motion.div
                      key="step-5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      <div className="rounded-xl border border-border-light bg-background p-4 space-y-3">
                        <Row label="Name" value={name} />
                        <Row label="Strategy" value={currentStrategyDef?.label ?? selectedStrategy} />
                        <Row label="Auto-start" value={execEnabled ? 'Yes' : 'No'} />
                        <Row label="Cycle" value={`${cycleInterval.toLocaleString()} ms`} />
                        <Row label="Max actions/day" value={String(maxActions)} />
                        {currentStrategyDef &&
                          currentStrategyDef.fields.length > 0 && (
                            <>
                              <div className="border-t border-border-light pt-2">
                                <span className="text-micro text-text-tertiary">Parameters</span>
                              </div>
                              {currentStrategyDef.fields.map((f) => (
                                <Row
                                  key={f.key}
                                  label={f.label}
                                  value={
                                    strategyParams[f.key] !== undefined
                                      ? JSON.stringify(strategyParams[f.key])
                                      : '—'
                                  }
                                />
                              ))}
                            </>
                          )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error */}
                {error && (
                  <div className="mt-4 p-3 bg-status-error-bg rounded-lg border border-status-error/20">
                    <p className="text-body-sm text-status-error">{error}</p>
                  </div>
                )}
              </div>

              {/* Actions — always pinned at bottom */}
              <div className="flex items-center gap-3 px-6 py-4 border-t border-border-light bg-background-secondary/30 rounded-b-2xl shrink-0">
                {step > 1 ? (
                  <button onClick={back} className="btn btn-secondary" disabled={loading}>
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <button onClick={onClose} className="btn btn-secondary" disabled={loading}>
                    Cancel
                  </button>
                )}

                <div className="flex-1" />

                <button
                  onClick={next}
                  className="btn btn-primary"
                  disabled={!canAdvance() || loading}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-text-inverse/30 border-t-text-inverse rounded-full animate-spin" />
                  ) : step === TOTAL_STEPS ? (
                    <>
                      <Bot className="w-4 h-4" />
                      Create Agent
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
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

/* ---------- tiny review row ---------- */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-caption text-text-muted">{label}</span>
      <span className="text-body-sm text-text-primary font-medium">{value}</span>
    </div>
  );
}

