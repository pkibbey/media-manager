'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { resetQueueState } from '@/actions/admin/reset-queue-state';

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

export function AnalysisCountsCard({ queueName }: AnalysisCountsCardProps) {
  const [analysisCounts, setAnalysisCounts] = useState<AnalysisCounts | null>(
    null,
  );
  const [resettingStates, setResettingStates] = useState<Set<string>>(
    new Set(),
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
  }, [queueName]);

  const handleResetState = async (state: keyof AnalysisCounts) => {
    if (resettingStates.has(state)) return; // Prevent double-clicks

    setResettingStates((prev) => new Set(prev).add(state));

    try {
      const success = await resetQueueState(queueName, state);
      if (success) {
        // Refresh the counts after successful reset
        const response = await fetch(`/api/admin/queue-counts/${queueName}`);
        if (response.ok) {
          const data = await response.json();
          setAnalysisCounts(data.counts);
        }
      }
    } catch (error) {
      console.error('Error resetting queue state:', error);
    } finally {
      setResettingStates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(state);
        return newSet;
      });
    }
  };

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
            <div className="grid grid-cols-1 gap-y-2">
              {countOrder.map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex justify-between flex-1 mr-2">
                    <span className="text-sm capitalize text-muted-foreground">
                      {key.replace('-', ' ')}:
                    </span>
                    <span className="text-sm font-medium">
                      {analysisCounts[key]}
                    </span>
                  </div>
                  {analysisCounts[key] > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-destructive/10"
                      onClick={() => handleResetState(key)}
                      disabled={resettingStates.has(key)}
                      title={`Reset ${key.replace('-', ' ')} jobs`}
                    >
                      <RotateCcw
                        className={`h-3 w-3 ${resettingStates.has(key) ? 'animate-spin' : ''}`}
                      />
                    </Button>
                  )}
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
