import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ThumbnailStatsProps = {
  thumbnailStats: {
    totalCompatibleFiles: number;
    filesWithThumbnails: number;
    filesPending: number;
    skippedLargeFiles: number;
  } | null;
};

export function ThumbnailStats({ thumbnailStats }: ThumbnailStatsProps) {
  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium">Thumbnail Generator</h2>
        <div className="text-sm text-muted-foreground">
          {!thumbnailStats ? (
            <span>Loading stats...</span>
          ) : (
            <span>
              {thumbnailStats.filesWithThumbnails} /{' '}
              {thumbnailStats.totalCompatibleFiles} files processed
            </span>
          )}
        </div>
      </div>

      <Progress
        value={
          !thumbnailStats
            ? undefined
            : thumbnailStats.filesPending === 0
              ? 100
              : Math.round(
                  (thumbnailStats.filesWithThumbnails /
                    thumbnailStats.totalCompatibleFiles) *
                    100,
                )
        }
        className="h-2"
      />

      <div className="text-xs flex flex-col space-y-1 text-muted-foreground">
        <div className="flex justify-between">
          <span>
            {thumbnailStats
              ? `${thumbnailStats.filesWithThumbnails} files with thumbnails`
              : 'Loading...'}
          </span>
          <span>
            {thumbnailStats
              ? `${thumbnailStats.skippedLargeFiles} large files skipped`
              : 'Loading...'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>
            {thumbnailStats
              ? `${thumbnailStats.filesPending} files waiting to be processed`
              : 'Loading...'}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help border-b border-dotted border-gray-400">
                  {thumbnailStats
                    ? `${thumbnailStats.totalCompatibleFiles} total thumbnail-compatible files`
                    : 'Loading thumbnail-compatible files...'}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Compatible image formats: JPG, JPEG, PNG, WebP, GIF, TIFF,
                  HEIC, AVIF, BMP. Excluded are files with extensions marked as
                  "ignored" in file settings.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Generate thumbnails for image files and store them in Supabase Storage.
        This helps improve performance by pre-generating thumbnails instead of
        creating them on-demand. Only processes images (.jpg, .png, .webp, .gif,
        etc.).
      </p>
    </>
  );
}
