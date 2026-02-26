/**
 * Event Emitter
 * 
 * Simple typed event emitter for system-wide events.
 */

import { SystemEvent } from '../utils/types.js';

type EventHandler = (event: SystemEvent) => void;

/**
 * EventBus - Central event dispatcher
 */
class EventBus {
  private handlers: Set<EventHandler> = new Set();
  private eventHistory: SystemEvent[] = [];
  private maxHistorySize: number = 1000;

  /**
   * Subscribe to all events
   */
  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Emit an event to all subscribers
   */
  emit(event: SystemEvent): void {
    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify all handlers
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    }
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 100): SystemEvent[] {
    return this.eventHistory.slice(-count);
  }

  /**
   * Get events for a specific agent
   */
  getAgentEvents(agentId: string, count: number = 50): SystemEvent[] {
    return this.eventHistory
      .filter((e) => {
        if ('agentId' in e) return e.agentId === agentId;
        if ('agent' in e) return e.agent.id === agentId;
        return false;
      })
      .slice(-count);
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }
}

// Singleton instance
export const eventBus = new EventBus();
