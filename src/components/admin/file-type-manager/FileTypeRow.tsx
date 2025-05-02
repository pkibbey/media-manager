import { cn } from '@/lib/utils';
import type { FileType } from '@/types/db-types';
import { FileTypeState, FileTypeStateToggle } from './FileTypeStateToggle';

type FileTypeRowProps = {
  fileType: FileType;
  isUpdating: number | null;
  updatedTypes: Record<number, FileType>;
  handleDragStart: (fileType: FileType) => void;
  handleToggleNativeDisplay: (fileType: FileType) => Promise<void>;
  handleToggleNeedsConversion: (fileType: FileType) => Promise<void>;
  handleToggleIgnore: (fileType: FileType) => Promise<void>;
};

export function FileTypeRow({
  fileType,
  isUpdating,
  updatedTypes,
  handleDragStart,
  handleToggleNativeDisplay,
  handleToggleNeedsConversion,
  handleToggleIgnore,
}: FileTypeRowProps) {
  // Determine effective state based on original and updated types
  const effectiveIsNative =
    updatedTypes[fileType.id]?.can_display_natively ??
    fileType.can_display_natively;
  const effectiveIsNeedsConversion =
    updatedTypes[fileType.id]?.needs_conversion ?? fileType.needs_conversion;
  const effectiveIsIgnored =
    updatedTypes[fileType.id]?.ignore ?? fileType.ignore;

  // Handler for the FileTypeStateToggle component
  const handleStateToggle = async (newState: FileTypeState) => {
    switch (newState) {
      case FileTypeState.Native:
        // Target: native=true, conversion=false, ignore=false
        if (!effectiveIsNative) await handleToggleNativeDisplay(fileType); // Toggle to true
        if (effectiveIsNeedsConversion)
          await handleToggleNeedsConversion(fileType); // Toggle to false
        if (effectiveIsIgnored) await handleToggleIgnore(fileType); // Toggle to false
        break;
      case FileTypeState.Conversion:
        // Target: native=false, conversion=true, ignore=false
        if (effectiveIsNative) await handleToggleNativeDisplay(fileType); // Toggle to false
        if (!effectiveIsNeedsConversion)
          await handleToggleNeedsConversion(fileType); // Toggle to true
        if (effectiveIsIgnored) await handleToggleIgnore(fileType); // Toggle to false
        break;
      case FileTypeState.Ignored:
        // Target: native=false, conversion=false, ignore=true
        if (effectiveIsNative) await handleToggleNativeDisplay(fileType); // Toggle to false
        if (effectiveIsNeedsConversion)
          await handleToggleNeedsConversion(fileType); // Toggle to false
        if (!effectiveIsIgnored) await handleToggleIgnore(fileType); // Toggle to true
        break;
    }
  };

  return (
    <tr
      className={cn(
        effectiveIsIgnored &&
          'bg-muted/50 text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-950/30',
        !effectiveIsIgnored && 'hover:bg-accent/50',
        effectiveIsNative &&
          'bg-muted/50 text-muted-foreground hover:bg-green-50 dark:hover:bg-green-950/30',
        effectiveIsNeedsConversion &&
          'bg-muted/50 text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-950/30',
        'cursor-move',
      )}
      draggable
      onDragStart={(e) => {
        // Set required dataTransfer data to make drag work across browsers
        e.dataTransfer.setData('text/plain', fileType.id.toString());
        e.dataTransfer.effectAllowed = 'move';

        handleDragStart(fileType);
      }}
    >
      <td className="p-2">
        <code
          className={cn(
            'px-1 py-0.5 rounded text-xs',
            effectiveIsIgnored &&
              'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
            effectiveIsNative &&
              'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
            effectiveIsNeedsConversion &&
              'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
          )}
        >
          .{fileType.extension}
        </code>
      </td>
      <td className="p-2 text-center w-12">
        <FileTypeStateToggle
          fileType={fileType}
          isUpdating={isUpdating === fileType.id}
          onToggle={handleStateToggle}
        />
      </td>
    </tr>
  );
}
