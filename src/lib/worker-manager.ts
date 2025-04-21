/**
 * Process Manager
 *
 * Manages process statuses for background processing tasks.
 * Uses in-memory storage instead of web workers for simplicity.
 */

import type { WorkerProcessStatus } from '@/types/progress-types';

// Process status storage
const processStorage: Map<
  string,
  WorkerProcessStatus & { lastChecked?: number }
> = new Map();

// Event listeners for status updates
const listeners: Map<string, Set<(data: unknown) => void>> = new Map();

// Track active processes
const activeProcesses: Set<string> = new Set();

/**
 * Register a listener for specific message types
 * @param type Message type to listen for
 * @param callback Function to call when message is received
 * @returns Function to remove the listener
 */
export function addWorkerListener<T = unknown>(
  type: string,
  callback: (data: T) => void,
): () => void {
  // Add listener to the appropriate set
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }

  const typeListeners = listeners.get(type)!;
  typeListeners.add(callback as (data: unknown) => void);

  // Return function to remove the listener
  return () => {
    const listenerSet = listeners.get(type);
    if (listenerSet) {
      listenerSet.delete(callback as (data: unknown) => void);
    }
  };
}

/**
 * Store process status in persistent storage
 * This allows status to be retrieved even after page navigation
 */
export function storeProcessStatus(
  processType: string,
  status: WorkerProcessStatus,
): void {
  // Update active processes tracking
  if (status.active) {
    activeProcesses.add(processType);
  } else {
    activeProcesses.delete(processType);
  }

  // Add a timestamp to track staleness
  const updatedStatus = {
    ...status,
    lastUpdated: Date.now(),
    lastChecked: Date.now(),
  };

  // Store in our Map
  processStorage.set(processType, updatedStatus);

  // Broadcast status update to all components
  const processListeners = getAllProcessListeners();
  if (processListeners) {
    processListeners.forEach((callback) => {
      try {
        callback({
          processType,
          status: updatedStatus,
        });
      } catch (error) {
        console.error('Error in process update listener:', error);
      }
    });
  }
}

/**
 * Get the current status of a process from storage
 */
export async function getProcessStatus(
  processType: string,
): Promise<WorkerProcessStatus | null> {
  // Get directly from memory
  const status = processStorage.get(processType) || null;

  // Update the last checked time
  if (status) {
    processStorage.set(processType, {
      ...status,
      lastChecked: Date.now(),
    });
  }

  return status;
}

/**
 * Check if processing is active for a specific process type
 */
export async function isProcessActive(processType: string): Promise<boolean> {
  // First check our local cache for immediate feedback
  if (activeProcesses.has(processType)) {
    return true;
  }

  // Get status from storage
  const status = await getProcessStatus(processType);
  if (!status) return false;

  // Consider stale if last update was more than 30 seconds ago
  const isStale = Date.now() - (status.lastUpdated ?? 0) > 30000;

  const isActive = status.active === true && !isStale;

  // Update our local cache
  if (isActive) {
    activeProcesses.add(processType);
  } else {
    activeProcesses.delete(processType);
    // Mark stale process as inactive
    if (isStale && status.active) {
      storeProcessStatus(processType, {
        ...status,
        active: false,
        error: 'Process became stale',
      });
    }
  }

  return isActive;
}

/**
 * Get status of all active processes
 */
export async function getAllProcesses(): Promise<
  Record<string, WorkerProcessStatus>
> {
  // Convert Map to Record object
  const allProcesses: Record<string, WorkerProcessStatus> = {};
  processStorage.forEach((value, key) => {
    allProcesses[key] = value;
  });

  // Update active processes cache
  activeProcesses.clear();
  processStorage.forEach((status, id) => {
    if (status.active) {
      activeProcesses.add(id);
    }
  });

  return allProcesses;
}

/**
 * Register a listener for any process status update
 */
export function addProcessUpdateListener(
  callback: (data: {
    processType: string;
    status: WorkerProcessStatus;
  }) => void,
): () => void {
  return addWorkerListener('PROCESS_UPDATE', callback);
}

/**
 * Get all listeners for process updates
 */
function getAllProcessListeners(): Set<(data: unknown) => void> | undefined {
  return listeners.get('PROCESS_UPDATE');
}

/**
 * For backward compatibility - no longer needed but kept for API compatibility
 */
export function sendToWorker<T>(type: string, payload: T): void {
  if (
    type === 'PROCESS_STATUS_UPDATE' &&
    typeof payload === 'object' &&
    payload &&
    'id' in payload
  ) {
    const typedPayload = payload as any;
    storeProcessStatus(typedPayload.id, typedPayload);
  } else if (
    type === 'GET_PROCESS_STATUS' &&
    typeof payload === 'object' &&
    payload &&
    'id' in payload
  ) {
    const typedPayload = payload as any;
    getProcessStatus(typedPayload.id).then((status) => {
      const typeListeners = listeners.get('PROCESS_STATUS');
      if (typeListeners) {
        typeListeners.forEach((callback) => {
          try {
            callback({
              ...status,
              id: typedPayload.id,
            });
          } catch (error) {
            console.error('Error in listener:', error);
          }
        });
      }
    });
  } else if (type === 'GET_ALL_PROCESSES') {
    getAllProcesses().then((processes) => {
      const typeListeners = listeners.get('ALL_PROCESSES');
      if (typeListeners) {
        typeListeners.forEach((callback) => {
          try {
            callback(processes);
          } catch (error) {
            console.error('Error in listener:', error);
          }
        });
      }
    });
  }
}

// Run staleness check periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const staleThreshold = 30000; // 30 seconds

    processStorage.forEach((value, key) => {
      if (value.active && now - (value.lastUpdated ?? 0) > staleThreshold) {
        // Mark as inactive due to staleness
        storeProcessStatus(key, {
          ...value,
          active: false,
          error: 'Process became stale',
        });
      }
    });
  }, 10000); // Check every 10 seconds
}
