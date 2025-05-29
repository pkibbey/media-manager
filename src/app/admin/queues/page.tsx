'use client';

import { QueueActions } from '@/components/queue/queue-actions';
import { QueueDashboard } from '@/components/queue/queue-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function QueuesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Queue Management</h1>
          <p className="text-gray-600">
            Monitor and manage background processing jobs
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="actions">Queue Jobs</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <QueueDashboard />
          </TabsContent>

          <TabsContent value="actions">
            <QueueActions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
