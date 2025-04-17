import { createServerSupabaseClient } from '@/lib/supabase';
import type { PerformanceMetrics } from '@/types/db-types';

/**
 * Save a performance metric to the database
 */
export async function savePerformanceMetric(
  metric: Omit<PerformanceMetrics, 'id'>,
): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from('performance_metrics').insert(metric);

  if (error) {
    console.error('Error saving performance metric:', error);
    throw new Error('Failed to save performance metric');
  }
}

/**
 * Retrieve all performance metrics from the database
 */
export async function getPerformanceMetrics(): Promise<PerformanceMetrics[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('performance_metrics')
    .select('*');

  if (error) {
    console.error('Error retrieving performance metrics:', error);
    throw new Error('Failed to retrieve performance metrics');
  }

  return data;
}
