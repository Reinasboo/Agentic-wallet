'use client';

/**
 * Navigation Sidebar Component
 * 
 * Quiet, minimal sidebar that doesn't compete with content.
 * Navigation is present but unobtrusive.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Bot,
  ArrowRightLeft,
  Plug,
  ScrollText,
  Layers,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    name: 'Overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Agents',
    href: '/agents',
    icon: Bot,
  },
  {
    name: 'Connected Agents',
    href: '/connected-agents',
    icon: Plug,
  },
  {
    name: 'Register BYOA',
    href: '/byoa-register',
    icon: UserPlus,
  },
  {
    name: 'Strategies',
    href: '/strategies',
    icon: Layers,
  },
  {
    name: 'Intent History',
    href: '/intent-history',
    icon: ScrollText,
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: ArrowRightLeft,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-surface border-r border-border-light flex flex-col">
      {/* Logo */}
      <div className="h-18 flex items-center px-6 pt-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center transition-colors group-hover:bg-primary-200">
            <span className="text-primary-600 font-semibold text-lg">A</span>
          </div>
          <div>
            <span className="font-semibold text-body-lg text-text-primary">
              Agentic
            </span>
            <span className="block text-micro text-text-muted">Wallet System</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-8 px-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'nav-link relative',
                    isActive && 'nav-link-active'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-500 rounded-full"
                      initial={false}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <Icon
                    className={cn(
                      'w-[18px] h-[18px]',
                      isActive ? 'text-primary-600' : 'text-text-tertiary'
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer - Network indicator, very subtle */}
      <div className="p-4 mx-4 mb-4">
        <div className="flex items-center gap-2 text-caption text-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
          <span>Solana Devnet</span>
        </div>
      </div>
    </aside>
  );
}
