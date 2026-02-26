'use client';

/**
 * Header Component
 * 
 * Minimal, calm top bar with subtle status indicators.
 * Emphasizes content over chrome.
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useStats, useWebSocket } from '@/lib/hooks';
import { formatUptime } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { stats } = useStats();
  const { connected } = useWebSocket();

  return (
    <header className="py-8 px-8 lg:px-12">
      <div className="flex items-start justify-between">
        {/* Title area */}
        <div className="space-y-1">
          {title && (
            <motion.h1 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-display text-text-primary"
            >
              {title}
            </motion.h1>
          )}
          {subtitle && (
            <p className="text-body text-text-tertiary">
              {subtitle}
            </p>
          )}
        </div>

        {/* Status indicators - subtle, right-aligned */}
        <div className="flex items-center gap-6 text-caption text-text-tertiary">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              connected ? 'bg-status-success' : 'bg-status-error'
            )} />
            <span>{connected ? 'Connected' : 'Offline'}</span>
          </div>

          {/* Network */}
          {stats && (
            <>
              <span className="text-border-medium">·</span>
              <span className="capitalize">{stats.network}</span>
            </>
          )}

          {/* Uptime - very subtle */}
          {stats && (
            <>
              <span className="text-border-medium">·</span>
              <span>Up {formatUptime(stats.uptime)}</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
