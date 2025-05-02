import { ArrowRightLeft, Ban, Monitor } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { FileType } from '@/types/db-types';

// Define the possible states for the file type
export enum FileTypeState {
  Native = 'native',
  Conversion = 'conversion',
  Ignored = 'ignored',
}

type FileTypeStateToggleProps = {
  fileType: FileType;
  isUpdating: boolean;
  onToggle: (newState: FileTypeState) => Promise<void>;
};

export function FileTypeStateToggle({
  fileType,
  isUpdating,
  onToggle,
}: FileTypeStateToggleProps) {
  // Determine current state directly from fileType prop
  // The parent component (FileTypeRow) handles the effective state logic
  let currentState: FileTypeState;
  if (fileType.ignore) {
    currentState = FileTypeState.Ignored;
  } else if (fileType.needs_conversion) {
    currentState = FileTypeState.Conversion;
  } else {
    currentState = FileTypeState.Native;
  }

  // Function to get the next state in the cycle
  const getNextState = (current: FileTypeState): FileTypeState => {
    switch (current) {
      case FileTypeState.Native:
        return FileTypeState.Conversion;
      case FileTypeState.Conversion:
        return FileTypeState.Ignored;
      case FileTypeState.Ignored:
        return FileTypeState.Native;
      default:
        return FileTypeState.Native;
    }
  };

  const handleClick = async () => {
    if (isUpdating) return;
    const nextState = getNextState(currentState);
    await onToggle(nextState);
  };

  // Render appropriate icon based on current state
  const renderIcon = () => {
    switch (currentState) {
      case FileTypeState.Native:
        return <Monitor className="h-4 w-4" />;
      case FileTypeState.Conversion:
        return <ArrowRightLeft className="h-4 w-4" />;
      case FileTypeState.Ignored:
        return <Ban className="h-4 w-4" />;
    }
  };

  // Get background and text color classes based on state
  const getStateClasses = () => {
    switch (currentState) {
      case FileTypeState.Native:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case FileTypeState.Conversion:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case FileTypeState.Ignored:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    }
  };

  // Get tooltip text based on state
  const getTooltipText = () => {
    switch (currentState) {
      case FileTypeState.Native:
        return 'Native Display - Can be displayed without conversion';
      case FileTypeState.Conversion:
        return 'Requires Conversion - Needs to be converted for display';
      case FileTypeState.Ignored:
        return 'Ignored - This file type will be skipped';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            disabled={isUpdating}
            className={cn(
              'mx-auto rounded-md p-1 transition-colors flex items-center justify-center',
              getStateClasses(),
              'hover:opacity-90',
              isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            )}
            aria-label={`Toggle file type state: ${currentState}`}
          >
            {renderIcon()}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{getTooltipText()}</p>
          <p className="text-xs opacity-75">Click to cycle through states</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
