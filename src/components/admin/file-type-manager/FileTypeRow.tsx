import { formatDate } from '@/lib/utils';
import type { FileType } from '@/types/db-types';

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
  const isIgnored = updatedTypes[fileType.id]?.ignore || fileType.ignore;

  return (
    <tr
      className={`
        ${
          isIgnored
            ? 'bg-muted/50 text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-950/30'
            : 'hover:bg-accent/50'
        }
        cursor-move
      `}
      draggable={!isIgnored}
      onDragStart={() => handleDragStart(fileType)}
    >
      <td className="p-2">
        <code
          className={`px-1 py-0.5 rounded text-xs ${
            isIgnored
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
              : 'bg-secondary'
          }`}
        >
          .{fileType.extension}
        </code>
      </td>
      <td className="p-2 text-xs">{fileType.mime_type || 'unknown'}</td>
      <td className="p-2 text-center">
        <input
          type="checkbox"
          checked={fileType.can_display_natively || false}
          onChange={() => handleToggleNativeDisplay(fileType)}
          disabled={isUpdating === fileType.id || isIgnored || false}
          className="h-4 w-4"
          aria-label="Can display natively"
        />
      </td>
      <td className="p-2 text-center">
        <input
          type="checkbox"
          checked={fileType.needs_conversion || false}
          onChange={() => handleToggleNeedsConversion(fileType)}
          disabled={isUpdating === fileType.id || isIgnored || false}
          className="h-4 w-4"
          aria-label="Needs conversion"
        />
      </td>
      <td className="p-2 text-center">
        <input
          type="checkbox"
          checked={isIgnored || false}
          onChange={() => handleToggleIgnore(fileType)}
          disabled={isUpdating === fileType.id}
          className="h-4 w-4"
          aria-label="Ignore file type"
        />
      </td>
      <td className="p-2 text-xs">{formatDate(fileType.created_at, 'PP')}</td>
    </tr>
  );
}
