/**
 * Web Worker for processing tasks
 * This allows CPU-intensive operations to run in a background thread
 * without blocking the main UI thread.
 */

// Define the message structure for worker communication
export interface WorkerMessage {
  type: string;
  payload: any;
}

// Create a typed worker context
const ctx: Worker = self as any;

// Process status storage
const processStorage: Map<string, any> = new Map();

// Listen for messages from the main thread
ctx.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'PROCESS_STATUS_UPDATE':
        // Store processing status for persistence across page navigations
        if (payload?.id) {
          processStorage.set(payload.id, {
            ...payload,
            lastChecked: Date.now(),
          });

          // Broadcast the update to all listeners
          ctx.postMessage({
            type: 'PROCESS_UPDATE',
            payload: {
              processType: payload.id,
              status: payload,
            },
          });
        }
        break;

      case 'GET_PROCESS_STATUS':
        // Retrieve processing status from storage
        if (payload?.id) {
          const status = processStorage.get(payload.id) || null;
          ctx.postMessage({
            type: 'PROCESS_STATUS',
            payload: {
              ...status,
              id: payload.id,
            },
          });
        }
        break;

      case 'GET_ALL_PROCESSES': {
        // Return all active processes
        const allProcesses: { [key: string]: any } = {};
        processStorage.forEach((value, key) => {
          allProcesses[key] = value;
        });

        ctx.postMessage({
          type: 'ALL_PROCESSES',
          payload: allProcesses,
        });
        break;
      }

      default:
        console.warn(`Unknown message type received by worker: ${type}`);
        ctx.postMessage({
          type: 'ERROR',
          payload: { error: `Unknown message type: ${type}` },
        });
    }
  } catch (error) {
    console.error('Error in worker:', error);
    ctx.postMessage({
      type: 'ERROR',
      payload: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// Periodically check for stale processes and mark them as inactive
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 30000; // 30 seconds

  processStorage.forEach((value, key) => {
    if (value.active && now - value.lastUpdated > staleThreshold) {
      // Mark as inactive due to staleness
      processStorage.set(key, {
        ...value,
        active: false,
        error: 'Process became stale',
        lastChecked: now,
      });

      // Broadcast the update
      ctx.postMessage({
        type: 'PROCESS_UPDATE',
        payload: {
          processType: key,
          status: {
            ...value,
            active: false,
            error: 'Process became stale',
            lastChecked: now,
          },
        },
      });
    }
  });
}, 10000); // Check every 10 seconds

// Log when the worker is loaded
console.log('Processing worker initialized');
