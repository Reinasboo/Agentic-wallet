'use client';

/**
 * Activity Feed Component
 * 
 * Calm, readable timeline of system activity.
 * Designed for monitoring at a glance.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  ArrowUpRight, 
  ArrowDownLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Circle,
} from 'lucide-react';
import { useWebSocket, useEvents } from '@/lib/hooks';
import type { SystemEvent } from '@/lib/types';
import {
  cn,
  formatRelativeTime,
  formatSol,
} from '@/lib/utils';

interface ActivityFeedProps {
  events?: SystemEvent[];
  maxItems?: number;
  title?: string;
}

function getEventIcon(event: SystemEvent) {
  switch (event.type) {
    case 'agent_created':
      return <Bot className="w-3.5 h-3.5" />;
    case 'agent_status_changed':
      return <Sparkles className="w-3.5 h-3.5" />;
    case 'agent_action':
      return <Circle className="w-3.5 h-3.5" />;
    case 'transaction':
      if (event.transaction?.type === 'airdrop') {
        return <ArrowDownLeft className="w-3.5 h-3.5" />;
      }
      return <ArrowUpRight className="w-3.5 h-3.5" />;
    default:
      return <Circle className="w-3.5 h-3.5" />;
  }
}

function getEventTitle(event: SystemEvent): string {
  switch (event.type) {
    case 'agent_created':
      return `${event.agent?.name} created`;
    case 'agent_status_changed':
      return `Status changed to ${(event.details?.newStatus as string) ?? 'unknown'}`;
    case 'agent_action':
      return event.action === 'decided_to_act' 
        ? 'Agent executing intent'
        : 'Agent waiting';
    case 'transaction':
      if (event.transaction?.type === 'airdrop') {
        return `Airdrop received`;
      }
      return `Transfer sent`;
    default:
      return event.type.replace(/_/g, ' ');
  }
}

function getEventDetail(event: SystemEvent): string | null {
  switch (event.type) {
    case 'agent_action':
      return (event.details?.reasoning as string)?.slice(0, 60) ?? null;
    case 'transaction':
      if (event.transaction?.amount) {
        return `${formatSol(event.transaction.amount)} SOL`;
      }
      return null;
    default:
      return null;
  }
}

function getEventStatusIcon(event: SystemEvent) {
  if (event.type === 'transaction' && event.transaction) {
    switch (event.transaction.status) {
      case 'confirmed':
      case 'finalized':
        return <CheckCircle2 className="w-3 h-3 text-status-success" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-status-error" />;
      case 'pending':
      case 'submitted':
        return <Clock className="w-3 h-3 text-status-warning animate-pulse-subtle" />;
    }
  }
  return null;
}

export function ActivityFeed({ events: propEvents, maxItems = 15, title = 'Recent Activity' }: ActivityFeedProps) {
  const { events: wsEvents, connected } = useWebSocket();
  const { events: restEvents } = useEvents(50, 10000);

  // Use prop events first, then WebSocket events, fall back to REST polling
  const events = propEvents ?? (wsEvents.length > 0 ? wsEvents : restEvents);
  const displayEvents = events.slice(0, maxItems);

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-label text-text-secondary">{title}</h3>
        <div className="flex items-center gap-2">
          <span className={cn(
            'w-1.5 h-1.5 rounded-full',
            connected ? 'bg-status-success' : 'bg-status-error'
          )} />
          <span className="text-micro text-text-muted">
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-0.5 max-h-[360px] overflow-y-auto scrollbar-hide">
        <AnimatePresence initial={false}>
          {displayEvents.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-background-secondary flex items-center justify-center">
                <Clock className="w-5 h-5 text-text-muted" />
              </div>
              <p className="text-body-sm text-text-tertiary">
                No activity yet
              </p>
            </div>
          ) : (
            displayEvents.map((event) => {
              const detail = getEventDetail(event);
              const statusIcon = getEventStatusIcon(event);

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="list-item py-3 -mx-2 px-2"
                >
                  {/* Icon */}
                  <div className="w-7 h-7 rounded-md bg-background-secondary flex items-center justify-center text-text-tertiary flex-shrink-0">
                    {getEventIcon(event)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-body-sm text-text-primary">
                        {getEventTitle(event)}
                      </span>
                      {statusIcon}
                    </div>
                    {detail && (
                      <p className="text-caption text-text-muted truncate mt-0.5">
                        {detail}
                      </p>
                    )}
                  </div>

                  {/* Time */}
                  <span className="text-micro text-text-muted flex-shrink-0">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

