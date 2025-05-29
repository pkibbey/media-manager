'use client';

import { useState } from 'react';
import {
  addAdvancedAnalysisJob,
  addBasicAnalysisJob,
  addContentWarningsJob,
  addExifJob,
  addThumbnailJob,
} from '@/actions/queue/queue-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function QueueActions() {
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [limits, setLimits] = useState({
    thumbnails: 10,
    exif: 10,
    basicAnalysis: 10,
    advancedAnalysis: 10,
    contentWarnings: 10,
  });
  const [concurrency, setConcurrency] = useState({
    thumbnails: 3,
    exif: 3,
    advancedAnalysis: 3,
    contentWarnings: 3,
  });

  const handleJob = async (
    jobType: string,
    jobFunction: () => Promise<{ jobId?: string }>,
  ) => {
    setIsProcessing((prev) => ({ ...prev, [jobType]: true }));

    try {
      const result = await jobFunction();
      console.log('result: ', result);
    } catch (error) {
      console.error('error: ', error);
    } finally {
      setIsProcessing((prev) => ({ ...prev, [jobType]: false }));
    }
  };

  const actions = [
    {
      title: 'Process Thumbnails',
      key: 'thumbnails',
      action: () =>
        handleJob('thumbnails', () =>
          addThumbnailJob(limits.thumbnails, concurrency.thumbnails),
        ),
      hasLimit: true,
      hasConcurrency: true,
    },
    {
      title: 'Extract EXIF Data',
      key: 'exif',
      action: () =>
        handleJob('exif', () => addExifJob(limits.exif, concurrency.exif)),
      hasLimit: true,
      hasConcurrency: true,
    },
    {
      title: 'Basic Analysis',
      key: 'basicAnalysis',
      action: () =>
        handleJob('basic-analysis', () =>
          addBasicAnalysisJob(limits.basicAnalysis),
        ),
      hasLimit: true,
      hasConcurrency: false,
    },
    {
      title: 'Advanced Analysis',
      key: 'advancedAnalysis',
      action: () =>
        handleJob('advanced-analysis', () =>
          addAdvancedAnalysisJob(
            limits.advancedAnalysis,
            concurrency.advancedAnalysis,
          ),
        ),
      hasLimit: true,
      hasConcurrency: true,
    },
    {
      title: 'Content Warnings',
      key: 'contentWarnings',
      action: () =>
        handleJob('content-warnings', () =>
          addContentWarningsJob(
            limits.contentWarnings,
            concurrency.contentWarnings,
          ),
        ),
      hasLimit: true,
      hasConcurrency: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {actions.map((action) => (
        <Card key={action.key}>
          <CardHeader>
            <CardTitle className="text-lg">{action.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {action.hasLimit && (
              <div>
                <Label htmlFor={`${action.key}-limit`}>Batch Size</Label>
                <Input
                  id={`${action.key}-limit`}
                  type="number"
                  min="1"
                  max="100"
                  value={limits[action.key as keyof typeof limits]}
                  onChange={(e) =>
                    setLimits((prev) => ({
                      ...prev,
                      [action.key]: Number.parseInt(e.target.value) || 10,
                    }))
                  }
                />
              </div>
            )}

            {action.hasConcurrency && (
              <div>
                <Label htmlFor={`${action.key}-concurrency`}>Concurrency</Label>
                <Input
                  id={`${action.key}-concurrency`}
                  type="number"
                  min="1"
                  max="10"
                  value={concurrency[action.key as keyof typeof concurrency]}
                  onChange={(e) =>
                    setConcurrency((prev) => ({
                      ...prev,
                      [action.key]: Number.parseInt(e.target.value) || 3,
                    }))
                  }
                />
              </div>
            )}

            <Button
              onClick={action.action}
              disabled={isProcessing[action.key]}
              className="w-full"
            >
              {isProcessing[action.key]
                ? 'Queueing...'
                : `Queue ${action.title}`}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
