import { InfoCircledIcon } from '@radix-ui/react-icons';
import { getMediaStats } from '@/app/actions/stats';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Warning } from '@/components/ui/warning';

export async function CorrectorStats() {
  // Fetch the stats directly in the server component
  const { success, data: stats, error } = await getMediaStats();

  // Calculate the percentage of files that don't need timestamp correction
  const correctedPercentage =
    stats?.totalMediaItems && stats.totalMediaItems > 0
      ? ((stats.totalMediaItems - (stats.needsTimestampCorrectionCount ?? 0)) /
          stats.totalMediaItems) *
        100
      : 0;

  if (!success || !stats) {
    return (
      <div className="overflow-hidden space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-medium">Timestamp Correction</h2>
          <div className="text-sm text-muted-foreground">
            Error loading data: {error}
          </div>
        </div>
        <Progress value={undefined} className="h-2" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden space-y-4">
      <Warning message="This step should only be performed after EXIF data processing is complete." />
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium">Timestamp Correction</h2>
        <div className="text-sm text-muted-foreground">
          {stats.totalMediaItems - (stats.needsTimestampCorrectionCount ?? 0)} /{' '}
          {stats.totalMediaItems} files corrected
        </div>
      </div>

      {/* Always display progress bar */}
      <Progress value={correctedPercentage} className="h-2" />

      <div className="text-xs flex flex-col space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>
            {stats.needsTimestampCorrectionCount ?? 0} files need timestamp
            correction
          </span>
          <span>
            {stats.totalMediaItems
              ? stats.totalMediaItems -
                (stats.needsTimestampCorrectionCount ?? 0)
              : 0}{' '}
            files with correct timestamps
          </span>
        </div>

        <div className="flex justify-between">
          <span>Only processed, EXIF-capable files are eligible</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="inline-flex items-center underline-offset-4 text-xs hover:underline">
                  <InfoCircledIcon className="h-3 w-3 mr-1" /> Correction info
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[300px]">
                Timestamp correction attempts to extract date information from
                filenames when EXIF data is missing. This helps organize media
                chronologically.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Fix missing or incorrect timestamps by extracting date information from
        filenames.
      </p>
    </div>
  );
}
