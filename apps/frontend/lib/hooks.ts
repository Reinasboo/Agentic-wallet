/**
 * Custom React Hooks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api';
import type { Agent, AgentDetail, SystemStats, SystemEvent, Transaction } from './types';

// Hook for fetching agents
export function useAgents(pollInterval: number = 5000) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    const response = await api.getAgents();
    if (response.success && response.data) {
      setAgents(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch agents');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, pollInterval);
    return () => clearInterval(interval);
  }, [fetchAgents, pollInterval]);

  return { agents, loading, error, refetch: fetchAgents };
}

// Hook for fetching single agent
export function useAgent(id: string | null, pollInterval: number = 3000) {
  const [data, setData] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }

    const response = await api.getAgent(id);
    if (response.success && response.data) {
      setData(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch agent');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchAgent();
    const interval = setInterval(fetchAgent, pollInterval);
    return () => clearInterval(interval);
  }, [fetchAgent, pollInterval]);

  return { data, loading, error, refetch: fetchAgent };
}

// Hook for fetching system stats
export function useStats(pollInterval: number = 5000) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    const response = await api.getStats();
    if (response.success && response.data) {
      setStats(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch stats');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, pollInterval);
    return () => clearInterval(interval);
  }, [fetchStats, pollInterval]);

  return { stats, loading, error, refetch: fetchStats };
}

// Hook for WebSocket events
export function useWebSocket(onEvent?: (event: SystemEvent) => void) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = api.createWebSocket(
      (event) => {
        setEvents((prev) => {
          // Handle initial state
          if (event.type === 'initial_state') {
            return prev;
          }
          // Add new event, keep last 100
          const updated = [event, ...prev].slice(0, 100);
          return updated;
        });
        onEvent?.(event);
      },
      () => setConnected(true),
      () => setConnected(false)
    );

    wsRef.current = ws;

    return () => {
      ws?.close();
    };
  }, [onEvent]);

  return { connected, events };
}

// Hook for fetching transactions
export function useTransactions(pollInterval: number = 5000) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    const response = await api.getTransactions();
    if (response.success && response.data) {
      setTransactions(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch transactions');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, pollInterval);
    return () => clearInterval(interval);
  }, [fetchTransactions, pollInterval]);

  return { transactions, loading, error, refetch: fetchTransactions };
}
