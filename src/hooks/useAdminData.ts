import { useCallback, useEffect, useState } from 'react';

// This type definition matches the common pattern in the server actions
interface AdminDataResponse<T> {
  stats: T;
  error?: string;
}

interface UseAdminDataProps<T> {
  fetchFunction: () => Promise<AdminDataResponse<T>>;
  defaultValue?: T;
}

export function useAdminData<T>({
  fetchFunction,
  defaultValue,
}: UseAdminDataProps<T>) {
  const [data, setData] = useState<T | null>(defaultValue || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchFunction();

      if (response.stats) {
        setData(response.stats);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFunction]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Action for refreshing data with result format for ActionButton
  const refreshWithResult = useCallback(async () => {
    try {
      const response = await fetchFunction();

      if (response.stats) {
        setData(response.stats);
        return { success: true };
      }

      return { success: false, error: response.error || 'Unknown error' };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
  }, [fetchFunction]);

  // Simple refresh function for internal use
  const refresh = useCallback(async () => {
    try {
      const response = await fetchFunction();

      if (response.stats) {
        setData(response.stats);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh data');
      console.error(e);
    }
  }, [fetchFunction]);

  return {
    data,
    setData,
    isLoading,
    error,
    setError,
    refresh,
    refreshWithResult,
  };
}
