/**
 * Custom React Hooks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api';
import type { Agent, AgentDetail, SystemStats, SystemEvent, Transaction, ExternalAgent, ExternalAgentDetail, IntentHistoryRecord } from './types';

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

// ============================================
// BYOA Hooks
// ============================================

// Hook for fetching external (BYOA) agents
export function useExternalAgents(pollInterval: number = 5000) {
  const [agents, setAgents] = useState<ExternalAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExternalAgents = useCallback(async () => {
    const response = await api.getExternalAgents();
    if (response.success && response.data) {
      setAgents(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch external agents');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExternalAgents();
    const interval = setInterval(fetchExternalAgents, pollInterval);
    return () => clearInterval(interval);
  }, [fetchExternalAgents, pollInterval]);

  return { agents, loading, error, refetch: fetchExternalAgents };
}

// Hook for fetching a single external agent
export function useExternalAgent(id: string | null, pollInterval: number = 3000) {
  const [data, setData] = useState<ExternalAgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExternalAgent = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }

    const response = await api.getExternalAgent(id);
    if (response.success && response.data) {
      setData(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch external agent');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchExternalAgent();
    const interval = setInterval(fetchExternalAgent, pollInterval);
    return () => clearInterval(interval);
  }, [fetchExternalAgent, pollInterval]);

  return { data, loading, error, refetch: fetchExternalAgent };
}

// Hook for fetching BYOA intent history
export function useExternalIntents(agentId?: string, pollInterval: number = 5000) {
  const [intents, setIntents] = useState<IntentHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntents = useCallback(async () => {
    const response = await api.getExternalIntents(agentId);
    if (response.success && response.data) {
      setIntents(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch intents');
    }
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    fetchIntents();
    const interval = setInterval(fetchIntents, pollInterval);
    return () => clearInterval(interval);
  }, [fetchIntents, pollInterval]);

  return { intents, loading, error, refetch: fetchIntents };
}
