import { useCallback, useEffect, useState } from 'react';
import type { QueueName, QueueStats } from 'shared/types';

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
  };
}
