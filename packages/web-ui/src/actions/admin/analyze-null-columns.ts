'use server';

import { createSupabase } from 'shared';
import type { TableName } from 'shared/types';

interface AnalyzeNullColumnsParams {
  table: TableName;
  columns: string[];
}

/**
 * Analyze null columns for any table and columns.
 * @param table - Table name
 * @param columns - Columns to check
 */
export async function analyzeNullColumns({
  table,
  columns,
}: AnalyzeNullColumnsParams): Promise<{
  nullColumns: string[];
  columnStats: Record<
    string,
    { total: number; nullCount: number; nullPercentage: number }
  >;
  error: unknown;
}> {
  try {
    const supabase = createSupabase();
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from(table as TableName)
      .select('*', { count: 'exact', head: true });
    if (countError) {
      throw new Error(`Failed to get total count: ${countError.message}`);
    }
    if (!totalCount || totalCount === 0) {
      return {
        nullColumns: [],
        columnStats: {},
        error: `No records found in ${table} table`,
      };
    }
    const columnStats: Record<
      string,
      { total: number; nullCount: number; nullPercentage: number }
    > = {};
    const nullColumns: string[] = [];
    for (const column of columns) {
      const { count: nullCount, error: nullError } = await supabase
        .from(table as TableName)
        .select('*', { count: 'exact', head: true })
        .is(column, null);
      if (nullError) {
        continue;
      }
      const nullCountValue = nullCount || 0;
      const nullPercentage = (nullCountValue / totalCount) * 100;
      columnStats[column] = {
        total: totalCount,
        nullCount: nullCountValue,
        nullPercentage: Math.round(nullPercentage * 100) / 100,
      };
      if (nullCountValue === totalCount) {
        nullColumns.push(column);
      }
    }
    return {
      nullColumns,
      columnStats,
      error: null,
    };
  } catch (error) {
    return {
      nullColumns: [],
      columnStats: {},
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
