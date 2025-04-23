import { HandIcon } from '@radix-ui/react-icons';
import { Toggle } from '@/components/ui/toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type MediaDetailHeaderProps = {
  isImageFile: boolean;
  zoomMode: boolean;
  toggleZoomMode: () => void;
};

export function MediaDetailHeader({
  isImageFile,
  zoomMode,
  toggleZoomMode,
}: MediaDetailHeaderProps) {
  if (!isImageFile) {
    return null;
  }

  return (
    <div className="absolute top-2 right-2 z-10 flex space-x-2 bg-background/80 backdrop-blur-sm p-1 rounded-md shadow-md">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={zoomMode}
              onPressedChange={toggleZoomMode}
              size="sm"
              variant="outline"
              aria-label="Toggle zoom mode"
            >
              <HandIcon className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Toggle zoom mode for rotated images</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
