'use client';

import { useEffect, useState } from 'react';
import { getJobDetails } from '@/actions/queue/dashboard';
import { Progress } from '@/components/ui/progress';

interface JobTrackerProps {
  queueName: string;
  jobId: string;
  onComplete?: () => void;
}

export function JobTracker({ queueName, jobId, onComplete }: JobTrackerProps) {
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobStatus = async () => {
      try {
        const result = await getJobDetails(queueName, jobId);
        if (result.success) {
          setJobStatus(result.job);

          if (result.job?.status === 'completed' && onComplete) {
            onComplete();
          }
        }
      } catch (error) {
        console.error('Error fetching job status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobStatus();

    // Poll every 2 seconds if job is not completed
    const interval = setInterval(() => {
      if (jobStatus?.status !== 'completed' && jobStatus?.status !== 'failed') {
        fetchJobStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [queueName, jobId, jobStatus?.status, onComplete]);

  if (loading) {
    return <div>Loading job status...</div>;
  }

  if (!jobStatus) {
    return <div>Job not found</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>Job {jobId}</span>
        <span className="capitalize">{jobStatus.status}</span>
      </div>

      {jobStatus.progress !== undefined && (
        <Progress value={jobStatus.progress} className="w-full" />
      )}

      {jobStatus.status === 'failed' && (
        <div className="text-red-500 text-sm">
          Error: {jobStatus.failedReason}
        </div>
      )}
    </div>
  );
}
