import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ExifStatsResult } from '@/types/db-types';

type ExifStatsProps = {
  stats: ExifStatsResult | null;
};

export function ExifStats({ stats }: ExifStatsProps) {
  const processedPercentage = stats
    ? Math.round((stats.with_exif / Math.max(stats.total, 1)) * 100)
    : 0;
  const totalProcessed = stats ? stats.with_exif + stats.with_errors : 0;
  const totalUnprocessed = stats ? stats.total - totalProcessed : 0;

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium">EXIF Processor</h2>
        <div className="text-sm text-muted-foreground">
          {totalProcessed} / {stats?.total || 0} files processed
        </div>
      </div>

      <Progress value={processedPercentage} className="h-2" />

      <div className="text-xs flex flex-col space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>{stats?.with_exif || 0} files with EXIF data</span>
          <span>
            {stats?.with_errors || 0} files processed but no EXIF found
          </span>
        </div>

        <div className="flex justify-between">
          <span>{totalUnprocessed} files waiting to be processed</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="inline-flex items-center underline-offset-4 text-xs hover:underline">
                  <InfoCircledIcon className="h-3 w-3 mr-1" /> Processing info
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[300px]">
                EXIF extraction processes files in batches. Large files or
                unsupported formats may take longer.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Extract EXIF data from image and video files. This helps organize your
        media by date, location, and camera information.
        {totalProcessed === 0 && !stats?.total ? (
          <span className="block mt-2 text-amber-600 dark:text-amber-500">
            No compatible media files found. This could be due to one of the
            following reasons:
            <ul className="list-disc pl-5 space-y-1 mt-1 text-xs">
              <li>No media items have been added to the database yet</li>
              <li>Media items don't have proper file type associations</li>
              <li>
                No compatible file types (jpg, jpeg, tiff, heic) exist in your
                library
              </li>
            </ul>
          </span>
        ) : (
          totalUnprocessed === 0 &&
          totalProcessed < (stats?.total || 0) && (
            <span className="block mt-1 text-amber-600 dark:text-amber-500">
              Note: The remaining files either have extensions marked as ignored
              in file settings or are file types that don't typically contain
              EXIF data.
            </span>
          )
        )}
      </div>
    </>
  );
}
