'use client';

import { Badge } from '../ui/badge';

interface ActiveJobData {
  id?: string;
  method?: string;
  media_path?: string;
  [key: string]: any; // Allow other properties in job.data
}

interface ActiveJobDisplayProps {
  jobData: ActiveJobData;
}

export function ActiveJobDisplay({ jobData }: ActiveJobDisplayProps) {
  return (
    <div className="flex w-full items-center justify-between gap-4 font-mono text-xs text-muted-foreground overflow-hidden">
      {jobData.media_path && (
        <div className="truncate">{jobData.media_path}</div>
      )}
      {jobData.method && <Badge>{jobData.method}</Badge>}
    </div>
  );
}
