import { useCallback, useEffect, useState } from 'react';
import type { QueueName, QueueState, QueueStats } from 'shared/types';

interface UseQueueOptions {
  queueName: QueueName;
  fetchStats: () => Promise<QueueStats>;
  pollInterval?: number;
}

/**
 * Combined hook for managing queue statistics and operations
 */
export function useQueue({
  queueName,
  fetchStats,
  pollInterval = 3000,
}: UseQueueOptions) {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatsData = useCallback(async () => {
    try {
      const queueStats = await fetchStats();
      setStats(queueStats);
    } catch (error) {
      console.error(`Error fetching ${queueName} stats:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchStats, queueName]);

  const refreshStats = useCallback(async () => {
    const queueStats = await fetchStats();
    setStats(queueStats);
  }, [fetchStats]);

  const resetQueueState = useCallback(
    async (state: QueueState) => {
      try {
        const response = await fetch(
          `/api/admin/queue-reset?queueName=${queueName}&state=${state}`,
          {
            method: 'POST',
          },
        );

        const result = await response.json();

        if (response.ok) {
          console.log(result.message);
          // Refresh stats after successful operation
          await refreshStats();
        } else {
          console.error('Error resetting queue state:', result.error);
        }
      } catch (error) {
        console.error('Failed to reset queue state:', error);
      }
    },
    [queueName, refreshStats],
  );

  useEffect(() => {
    // Initial fetch
    fetchStatsData();

    // Poll for real-time updates
    const interval = setInterval(fetchStatsData, pollInterval);

    return () => clearInterval(interval);
  }, [fetchStatsData, pollInterval]);

  return {
    stats,
    isLoading,
    refreshStats,
    resetQueueState,
  };
}
