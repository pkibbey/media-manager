'use client';

import { useEffect, useState } from 'react';
import { getDashboardData } from '@/actions/queue/dashboard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

interface DashboardData {
  success: boolean;
  queues?: Record<string, QueueStats>;
  queueNames?: string[];
  error?: string;
}

export function QueueDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getDashboardData();
        setData(result);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-4">Loading queue dashboard...</div>;
  }

  if (!data || !data.success) {
    return (
      <div className="p-4 text-red-500">
        Error loading dashboard: {data?.error || 'Unknown error'}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-blue-500';
      case 'active':
        return 'bg-green-500';
      case 'completed':
        return 'bg-gray-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Queue Dashboard</h2>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.queues &&
          Object.entries(data.queues).map(([queueName, stats]) => (
            <Card key={queueName}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {queueName
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between">
                    <span>Waiting:</span>
                    <Badge className={getStatusColor('waiting')}>
                      {stats.waiting}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Active:</span>
                    <Badge className={getStatusColor('active')}>
                      {stats.active}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Completed:</span>
                    <Badge className={getStatusColor('completed')}>
                      {stats.completed}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Failed:</span>
                    <Badge className={getStatusColor('failed')}>
                      {stats.failed}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
