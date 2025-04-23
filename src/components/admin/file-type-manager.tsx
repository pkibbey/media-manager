'use client';

import type { FileType } from '@/types/db-types';
import { FileTypeCategories } from './file-type-manager/FileTypeCategories';
import { IgnoredTypesHelp } from './file-type-manager/IgnoredTypesHelp';
import { NewCategoryForm } from './file-type-manager/NewCategoryForm';
import { useFileTypeManager } from './file-type-manager/useFileTypeManager';

interface FileTypeManagerProps {
  fileTypes: FileType[];
}

export default function FileTypeManager({ fileTypes }: FileTypeManagerProps) {
  const {
    isUpdating,
    updatedTypes,
    showIgnoredTypesHelp,
    setShowIgnoredTypesHelp,
    draggingFileType,
    draggingOver,
    setDraggingOver,
    showNewCategoryForm,
    setShowNewCategoryForm,
    newCategoryName,
    setNewCategoryName,
    groupedTypes,
    ignoredTypesCount,
    categories,
    handleDragStart,
    handleDrop,
    handleCreateCategory,
    handleToggleIgnore,
    handleToggleNativeDisplay,
    handleToggleNeedsConversion,
  } = useFileTypeManager(fileTypes);

  if (fileTypes.length === 0) {
    return (
      <div className="text-center p-4 border rounded-md bg-muted">
        No file types found. File types will be discovered during scanning.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Manage File Types</h3>
        <div className="text-sm text-muted-foreground flex gap-2 items-center">
          {fileTypes.length} file types discovered
          {ignoredTypesCount > 0 && (
            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded text-xs">
              {ignoredTypesCount} ignored
            </span>
          )}
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-md mb-4">
        <p className="text-sm">
          <strong>Tip:</strong> Drag and drop file types between categories to
          organize them. Changes will be saved automatically and reflected when
          guessing file categories.
        </p>
      </div>

      {/* New Category Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
          className="text-sm bg-primary text-primary-foreground px-3 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          {showNewCategoryForm ? 'Cancel' : 'New Category'}
        </button>
      </div>

      {/* New Category Form */}
      <NewCategoryForm
        showNewCategoryForm={showNewCategoryForm}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        handleCreateCategory={handleCreateCategory}
      />

      {/* Ignored Types Help */}
      <IgnoredTypesHelp
        showIgnoredTypesHelp={showIgnoredTypesHelp}
        setShowIgnoredTypesHelp={setShowIgnoredTypesHelp}
      />

      {/* File Type Categories */}
      <FileTypeCategories
        categories={categories}
        groupedTypes={groupedTypes}
        draggingFileType={draggingFileType}
        draggingOver={draggingOver}
        setDraggingOver={setDraggingOver}
        isUpdating={isUpdating}
        updatedTypes={updatedTypes}
        handleDragStart={handleDragStart}
        handleDrop={handleDrop}
        handleToggleNativeDisplay={handleToggleNativeDisplay}
        handleToggleNeedsConversion={handleToggleNeedsConversion}
        handleToggleIgnore={handleToggleIgnore}
      />
    </div>
  );
}
