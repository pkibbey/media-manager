import type { FileType } from '@/types/db-types';
import { FileTypeRow } from './FileTypeRow';

type FileTypeTableProps = {
  fileTypes: FileType[];
  isUpdating: number | null;
  updatedTypes: Record<number, FileType>;
  handleDragStart: (fileType: FileType) => void;
  handleToggleNativeDisplay: (fileType: FileType) => Promise<void>;
  handleToggleNeedsConversion: (fileType: FileType) => Promise<void>;
  handleToggleIgnore: (fileType: FileType) => Promise<void>;
};

export function FileTypeTable({
  fileTypes,
  isUpdating,
  updatedTypes,
  handleDragStart,
  handleToggleNativeDisplay,
  handleToggleNeedsConversion,
  handleToggleIgnore,
}: FileTypeTableProps) {
  return (
    <div className="border rounded-md overflow-auto relative">
      <table className="w-full">
        <thead className="bg-muted sticky top-0">
          <tr className="text-left text-xs">
            <th className="p-2">Extension</th>
            <th className="p-2 text-center">State</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {fileTypes
            .sort((a, b) => a.extension.localeCompare(b.extension))
            .map((fileType) => (
              <FileTypeRow
                key={fileType.id}
                fileType={fileType}
                isUpdating={isUpdating}
                updatedTypes={updatedTypes}
                handleDragStart={handleDragStart}
                handleToggleNativeDisplay={handleToggleNativeDisplay}
                handleToggleNeedsConversion={handleToggleNeedsConversion}
                handleToggleIgnore={handleToggleIgnore}
              />
            ))}
        </tbody>
      </table>
    </div>
  );
}
