import type { FileType } from '@/types/db-types';
import { FileTypeTable } from './FileTypeTable';
import type { GroupedFileTypes } from './useFileTypeManager';

type FileCategoriesProps = {
  categories: string[];
  groupedTypes: GroupedFileTypes;
  draggingFileType: FileType | null;
  draggingOver: string | null;
  setDraggingOver: (category: string | null) => void;
  isUpdating: number | null;
  updatedTypes: Record<number, FileType>;
  handleDragStart: (fileType: FileType) => void;
  handleDrop: (category: string) => Promise<void>;
  handleToggleNativeDisplay: (fileType: FileType) => Promise<void>;
  handleToggleNeedsConversion: (fileType: FileType) => Promise<void>;
  handleToggleIgnore: (fileType: FileType) => Promise<void>;
};

export function FileTypeCategories({
  categories,
  groupedTypes,
  draggingFileType,
  draggingOver,
  setDraggingOver,
  isUpdating,
  updatedTypes,
  handleDragStart,
  handleDrop,
  handleToggleNativeDisplay,
  handleToggleNeedsConversion,
  handleToggleIgnore,
}: FileCategoriesProps) {
  return (
    <>
      {categories
        // Sort categories with "other" being last
        .sort((a, b) => {
          if (a.toLowerCase() === 'other') return 1;
          if (b.toLowerCase() === 'other') return -1;
          return a.localeCompare(b);
        })
        .map((category) => (
          <div
            key={category}
            className="space-y-2"
            onDragOver={(e) => {
              e.preventDefault();
              if (draggingFileType && category !== draggingFileType.category) {
                setDraggingOver(category);
              }
            }}
            onDragLeave={() => setDraggingOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(category);
            }}
          >
            <h4
              className={`font-medium text-sm uppercase tracking-wide p-2 rounded-md ${
                draggingOver === category
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {category}
              {draggingOver === category && (
                <span className="ml-2 text-xs">
                  Drop to move file type here
                </span>
              )}
            </h4>

            <FileTypeTable
              fileTypes={groupedTypes[category]}
              isUpdating={isUpdating}
              updatedTypes={updatedTypes}
              handleDragStart={handleDragStart}
              handleToggleNativeDisplay={handleToggleNativeDisplay}
              handleToggleNeedsConversion={handleToggleNeedsConversion}
              handleToggleIgnore={handleToggleIgnore}
            />
          </div>
        ))}
    </>
  );
}
