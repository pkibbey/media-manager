'use client';

import { analyzeNullColumns } from '@/actions/admin/analyze-null-columns';
import { MetricCard } from '@/components/admin/metric-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, CheckCircle2, Database, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { TableName } from 'shared/types';

interface ColumnStats {
  total: number;
  nullCount: number;
  nullPercentage: number;
}

interface NullColumnAnalysis {
  nullColumns: string[];
  columnStats: Record<string, ColumnStats>;
  error: unknown;
}

interface DatabaseColumnAnalysisProps {
  table: TableName;
  columns: string[];
  title?: string;
  description?: string;
}

/**
 * Reusable component for analyzing null columns in a database table.
 * @param table - The table name to analyze
 * @param columns - The columns to check for nulls
 */
export function DatabaseColumnAnalysis({
  table,
  columns,
  title = 'Table Column Analysis',
  description = 'Analysis of nullable columns to identify unused or fully null columns',
}: DatabaseColumnAnalysisProps) {
  const [analysis, setAnalysis] = useState<NullColumnAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setIsLoading(true);
      try {
        const result = await analyzeNullColumns({ table, columns });
        setAnalysis(result);
      } catch (error) {
        console.error('error: ', error);
        setAnalysis({
          nullColumns: [],
          columnStats: {},
          error: 'Failed to fetch analysis',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalysis();
  }, [table, columns]);

  const hasFullyNullColumns =
    analysis?.nullColumns && analysis.nullColumns.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Analyzing database...
            </span>
          </div>
        ) : analysis?.error ? (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 rounded-md">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700 dark:text-red-300">
              {typeof analysis.error === 'string'
                ? analysis.error
                : 'An error occurred'}
            </span>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard
                icon={hasFullyNullColumns ? AlertCircle : CheckCircle2}
                iconColor={
                  hasFullyNullColumns ? 'text-red-500' : 'text-green-500'
                }
                label="Fully Null Columns"
                value={analysis?.nullColumns?.length?.toString() || '0'}
                className={
                  hasFullyNullColumns ? 'text-red-600' : 'text-green-600'
                }
              />
              <MetricCard
                icon={Database}
                iconColor="text-blue-500"
                label="Analyzed Columns"
                value={Object.keys(
                  analysis?.columnStats || {},
                ).length.toString()}
              />
            </div>

            {/* Fully Null Columns Alert */}
            {hasFullyNullColumns && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <h3 className="font-medium text-red-700 dark:text-red-300">
                    Columns with All Null Values
                  </h3>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                  The following columns contain only null values across all
                  records:
                </p>
                <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                  {analysis.nullColumns.map((column) => (
                    <li key={column} className="font-mono">
                      {column}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                  Consider if these columns are needed or if there's an issue
                  with data population.
                </p>
              </div>
            )}

            {/* Column Statistics Table */}
            {Object.keys(analysis?.columnStats || {}).length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3">Column Statistics</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column Name</TableHead>
                      <TableHead className="text-right">
                        Total Records
                      </TableHead>
                      <TableHead className="text-right">Null Count</TableHead>
                      <TableHead className="text-right">
                        Null Percentage
                      </TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(analysis?.columnStats || {}).map(
                      ([column, stats]) => (
                        <TableRow key={column}>
                          <TableCell className="font-mono">{column}</TableCell>
                          <TableCell className="text-right">
                            {stats.total.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {stats.nullCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {stats.nullPercentage}%
                          </TableCell>
                          <TableCell>
                            {stats.nullPercentage === 100 ? (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                All Null
                              </span>
                            ) : stats.nullPercentage > 90 ? (
                              <span className="inline-flex items-center gap-1 text-yellow-600">
                                <AlertCircle className="h-4 w-4" />
                                Mostly Null
                              </span>
                            ) : stats.nullPercentage > 50 ? (
                              <span className="inline-flex items-center gap-1 text-orange-600">
                                <AlertCircle className="h-4 w-4" />
                                Many Null
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                Good
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* No Data Message */}
            {Object.keys(analysis?.columnStats || {}).length === 0 && (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No column statistics available
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
