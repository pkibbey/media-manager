/**
 * Worker Manager
 *
 * Manages communication with Web Workers for background processing tasks.
 * Ensures workers are only created in browser environments and handles
 * communication gracefully.
 */

import type { WorkerMessage } from './workers/processing-worker';

// Singleton worker instance
let worker: Worker | null = null;

// Event listeners for worker messages
const listeners: Map<string, Set<(data: any) => void>> = new Map();

// Track active processes
const activeProcesses: Set<string> = new Set();

/**
 * Initialize the processing worker
 */
export function initWorker(): Worker | null {
  if (typeof window === 'undefined') {
    // Server-side - workers not supported
    return null;
  }

  if (worker) return worker;

  try {
    // Create a new worker
    worker = new Worker(
      new URL('./workers/processing-worker.ts', import.meta.url),
    );

    // Set up global message handler
    worker.onmessage = (event) => {
      const { type, payload } = event.data;

      // Find and call all registered listeners for this message type
      const typeListeners = listeners.get(type);
      if (typeListeners) {
        typeListeners.forEach((callback) => {
          try {
            callback(payload);
          } catch (error) {
            console.error(`Error in worker listener for ${type}:`, error);
          }
        });
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);

      // Notify error listeners
      const errorListeners = listeners.get('ERROR');
      if (errorListeners) {
        errorListeners.forEach((callback) => {
          try {
            callback(error);
          } catch (e) {
            console.error('Error in error handler:', e);
          }
        });
      }
    };

    // Initialize by requesting current status of all processes
    worker.postMessage({ type: 'GET_ALL_PROCESSES' });

    return worker;
  } catch (error) {
    console.error('Failed to create worker:', error);
    return null;
  }
}

/**
 * Send a message to the worker
 * @param type Message type
 * @param payload Message payload
 */
export function sendToWorker(type: string, payload: any): void {
  const workerInstance = initWorker();
  if (!workerInstance) {
    console.warn('Cannot send message - worker not available');
    return;
  }

  const message: WorkerMessage = { type, payload };
  workerInstance.postMessage(message);
}

/**
 * Register a listener for specific worker message types
 * @param type Message type to listen for
 * @param callback Function to call when message is received
 * @returns Function to remove the listener
 */
export function addWorkerListener(
  type: string,
  callback: (data: any) => void,
): () => void {
  // Initialize the worker if not already done
  initWorker();

  // Add listener to the appropriate set
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }

  const typeListeners = listeners.get(type)!;
  typeListeners.add(callback);

  // Return function to remove the listener
  return () => {
    const listenerSet = listeners.get(type);
    if (listenerSet) {
      listenerSet.delete(callback);
    }
  };
}

/**
 * Store process status in the worker's persistent storage
 * This allows status to be retrieved even after page navigation
 */
export function storeProcessStatus(processType: string, status: any): void {
  if (status.active) {
    activeProcesses.add(processType);
  } else {
    activeProcesses.delete(processType);
  }

  sendToWorker('PROCESS_STATUS_UPDATE', {
    id: processType,
    ...status,
    lastUpdated: Date.now(),
  });

  // Broadcast status update to all components
  const listeners = getAllProcessListeners();
  if (listeners) {
    listeners.forEach((callback) => {
      try {
        callback({
          processType,
          status: { ...status, lastUpdated: Date.now() },
        });
      } catch (error) {
        console.error('Error in process update listener:', error);
      }
    });
  }
}

/**
 * Get the current status of a process from worker storage
 * @returns Promise that resolves with the status or null if not found
 */
export async function getProcessStatus(processType: string): Promise<any> {
  return new Promise((resolve) => {
    const cleanup = addWorkerListener('PROCESS_STATUS', (data) => {
      if (data.id === processType) {
        cleanup(); // Remove listener
        resolve(data);
      }
    });

    sendToWorker('GET_PROCESS_STATUS', { id: processType });

    // Set timeout in case worker doesn't respond
    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 2000);
  });
}

/**
 * Check if processing is active for a specific process type
 */
export async function isProcessActive(processType: string): Promise<boolean> {
  // First check our local cache for immediate feedback
  if (activeProcesses.has(processType)) {
    return true;
  }

  // Then verify with the worker
  const status = await getProcessStatus(processType);
  if (!status) return false;

  // Consider stale if last update was more than 30 seconds ago
  const isStale = Date.now() - status.lastUpdated > 30000;

  const isActive = status.active === true && !isStale;

  // Update our local cache
  if (isActive) {
    activeProcesses.add(processType);
  } else {
    activeProcesses.delete(processType);
  }

  return isActive;
}

/**
 * Get status of all active processes
 */
export async function getAllProcesses(): Promise<{ [key: string]: any }> {
  return new Promise((resolve) => {
    const cleanup = addWorkerListener('ALL_PROCESSES', (data) => {
      cleanup(); // Remove listener

      // Update our local cache
      activeProcesses.clear();
      Object.entries(data).forEach(([id, status]: [string, any]) => {
        if (status.active) {
          activeProcesses.add(id);
        }
      });

      resolve(data);
    });

    sendToWorker('GET_ALL_PROCESSES', {});

    // Set timeout in case worker doesn't respond
    setTimeout(() => {
      cleanup();
      resolve({});
    }, 2000);
  });
}

/**
 * Register a listener for any process status update
 */
export function addProcessUpdateListener(
  callback: (data: { processType: string; status: any }) => void,
): () => void {
  return addWorkerListener('PROCESS_UPDATE', callback);
}

/**
 * Get all listeners for process updates
 */
function getAllProcessListeners(): Set<(data: any) => void> | undefined {
  return listeners.get('PROCESS_UPDATE');
}

// Initialize the worker immediately in client environments
if (typeof window !== 'undefined') {
  initWorker();
}
