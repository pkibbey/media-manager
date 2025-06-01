'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalysisCounts {
  active: number;
  completed: number;
  delayed: number;
  failed: number;
  paused: number;
  prioritized: number;
  waiting: number;
  'waiting-children': number;
}

interface AnalysisCountsCardProps {
  queueName: string;
}

const countOrder: (keyof AnalysisCounts)[] = [
  'active',
  'waiting',
  'prioritized',
  'waiting-children',
  'completed',
  'failed',
  'delayed',
  'paused',
];

export default function AnalysisCountsCard({
  queueName,
}: AnalysisCountsCardProps) {
  const [analysisCounts, setAnalysisCounts] = useState<AnalysisCounts | null>(
    null,
  );

  useEffect(() => {
    async function fetchAnalysiscounts() {
      try {
        const response = await fetch(`/api/admin/queue-counts/${queueName}`);
        if (!response.ok) {
          throw new Error('Failed to fetch analysis counts');
        }
        const data = await response.json();
        setAnalysisCounts(data.counts);
      } catch (error) {
        console.error('Error fetching analysis counts:', error);
        setAnalysisCounts(null);
      }
    }
    fetchAnalysiscounts();

    const intervalId = setInterval(fetchAnalysiscounts, 5000);

    return () => clearInterval(intervalId); // Cleanup interval on component unmount or when queueName changes
  }, [queueName]);

  const grandTotal = analysisCounts
    ? Object.values(analysisCounts).reduce((sum, count) => sum + count, 0)
    : 0;

  const progressPercentage =
    analysisCounts && grandTotal > 0
      ? (analysisCounts.completed / grandTotal) * 100
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Processing Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysisCounts ? (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-3 lg:grid-cols-4">
              {countOrder.map((key) => (
                <div key={key} className="flex justify-between">
                  <span className="text-sm capitalize text-muted-foreground">
                    {key.replace('-', ' ')}:
                  </span>
                  <span className="text-sm font-medium">
                    {analysisCounts[key]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between border-t pt-2">
              <span className="text-sm font-bold">Total Items:</span>
              <span className="text-sm font-bold">{grandTotal}</span>
            </div>
            {analysisCounts &&
              analysisCounts.completed > 0 &&
              grandTotal > 0 && (
                <div className="mt-2">
                  <div className="mb-1 flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Progress: {analysisCounts.completed} / {grandTotal}
                    </span>
                    <span className="text-sm font-medium">
                      {progressPercentage.toFixed(2)}%
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="w-full" />
                </div>
              )}
          </>
        ) : (
          <>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/4" />
          </>
        )}
      </CardContent>
    </Card>
  );
}
