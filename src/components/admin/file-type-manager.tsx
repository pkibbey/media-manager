'use client';

import { updateFileType } from '@/app/actions/file-types';
import { formatDate } from '@/lib/utils';
import type { FileType } from '@/types/db-types';

import { useState } from 'react';

interface FileTypeManagerProps {
  fileTypes: FileType[];
}

interface GroupedFileTypes {
  [category: string]: FileType[];
}

export default function FileTypeManager({ fileTypes }: FileTypeManagerProps) {
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [updatedTypes, setUpdatedTypes] = useState<Record<number, FileType>>(
    {},
  );
  const [showIgnoredTypesHelp, setShowIgnoredTypesHelp] = useState(false);

  // State for drag and drop functionality
  const [draggingFileType, setDraggingFileType] = useState<FileType | null>(
    null,
  );
  const [draggingOver, setDraggingOver] = useState<string | null>(null);

  // State for new category creation
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Group file types by category for easier management
  const groupedTypes: GroupedFileTypes = fileTypes.reduce(
    (acc: GroupedFileTypes, fileType) => {
      const type = updatedTypes[fileType.id]
        ? updatedTypes[fileType.id]
        : fileType;
      const category = type.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(type);
      return acc;
    },
    {},
  );

  // Count ignored file types
  const ignoredTypesCount = fileTypes.filter(
    (type) => updatedTypes[type.id]?.ignore || type.ignore,
  ).length;

  // Sort categories alphabetically
  const categories = Object.keys(groupedTypes).sort();

  // Handle starting drag of a file type
  const handleDragStart = (fileType: FileType) => {
    setDraggingFileType(fileType);
  };

  // Handle dropping a file type into a category
  const handleDrop = async (category: string) => {
    if (!draggingFileType || draggingFileType.category === category) {
      setDraggingFileType(null);
      setDraggingOver(null);
      return;
    }

    setIsUpdating(draggingFileType.id);
    try {
      const updatedFileType = {
        ...draggingFileType,
        category: category,
      };

      const result = await updateFileType(draggingFileType.id, {
        category: category,
      });

      if (result.success) {
        setUpdatedTypes({
          ...updatedTypes,
          [draggingFileType.id]: updatedFileType,
        });
      }
    } catch (error) {
      console.error('Error updating file type category:', error);
    } finally {
      setIsUpdating(null);
      setDraggingFileType(null);
      setDraggingOver(null);
    }
  };

  // Handle creating a new category
  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;

    // Create an empty category that will show up in the UI
    const newCategory = newCategoryName.trim();

    // Add the empty category to our grouped types
    if (!groupedTypes[newCategory]) {
      groupedTypes[newCategory] = [];
    }

    // Reset form state
    setShowNewCategoryForm(false);
    setNewCategoryName('');
  };

  const handleToggleIgnore = async (fileType: FileType) => {
    setIsUpdating(fileType.id);
    try {
      const updatedFileType = {
        ...fileType,
        ignore: !fileType.ignore,
      };

      const result = await updateFileType(fileType.id, {
        ignore: !fileType.ignore,
      });

      if (result.success) {
        setUpdatedTypes({
          ...updatedTypes,
          [fileType.id]: updatedFileType,
        });
      }
    } catch (error) {
      console.error('Error updating file type:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleToggleNativeDisplay = async (fileType: FileType) => {
    setIsUpdating(fileType.id);
    try {
      const updatedFileType = {
        ...fileType,
        can_display_natively: !fileType.can_display_natively,
      };

      const result = await updateFileType(fileType.id, {
        can_display_natively: !fileType.can_display_natively,
      });

      if (result.success) {
        setUpdatedTypes({
          ...updatedTypes,
          [fileType.id]: updatedFileType,
        });
      }
    } catch (error) {
      console.error('Error updating file type:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleToggleNeedsConversion = async (fileType: FileType) => {
    setIsUpdating(fileType.id);
    try {
      const updatedFileType = {
        ...fileType,
        needs_conversion: !fileType.needs_conversion,
      };

      const result = await updateFileType(fileType.id, {
        needs_conversion: !fileType.needs_conversion,
      });

      if (result.success) {
        setUpdatedTypes({
          ...updatedTypes,
          [fileType.id]: updatedFileType,
        });
      }
    } catch (error) {
      console.error('Error updating file type:', error);
    } finally {
      setIsUpdating(null);
    }
  };

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
      {showNewCategoryForm && (
        <div className="border rounded-md p-4 bg-muted/20 space-y-4">
          <h4 className="font-medium">Create New Category</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="flex-1 px-3 py-2 border rounded-md text-sm"
            />
            <button
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim()}
              className="bg-primary text-primary-foreground px-3 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            After creating a category, drag and drop file types into it to
            organize your media.
          </p>
        </div>
      )}

      {/* Ignored Types Help */}
      <div className="relative">
        <button
          onClick={() => setShowIgnoredTypesHelp(!showIgnoredTypesHelp)}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          {showIgnoredTypesHelp ? 'Hide' : 'Show'} information about ignored
          file types
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <title>Information icon</title>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </button>

        {showIgnoredTypesHelp && (
          <div className="mt-2 p-4 border rounded-md bg-muted/50">
            <h4 className="font-medium mb-2">About Ignored File Types</h4>
            <p className="text-sm mb-2">
              When you mark a file type as "ignored":
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1 mb-2">
              <li>
                Files with this extension will be skipped during folder scanning
              </li>
              <li>
                Existing files with this extension will remain in the database
              </li>
              <li>
                No new files of this type will be added during future scans
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">
              This is useful for excluding file types that you don't want to
              manage in this application, such as system files, thumbnails, or
              other non-media formats.
            </p>
          </div>
        )}
      </div>

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
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr className="text-left text-xs">
                    <th className="p-2">Extension</th>
                    <th className="p-2">MIME Type</th>
                    <th className="p-2 text-center">Native Display</th>
                    <th className="p-2 text-center">Needs Conversion</th>
                    <th className="p-2 text-center">Ignore</th>
                    <th className="p-2">Discovered</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groupedTypes[category]
                    .sort((a, b) => a.extension.localeCompare(b.extension))
                    .map((fileType) => {
                      const isIgnored =
                        updatedTypes[fileType.id]?.ignore || fileType.ignore;
                      return (
                        <tr
                          key={fileType.id}
                          className={`
                            ${
                              isIgnored
                                ? 'bg-muted/50 text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                : 'hover:bg-accent/50'
                            }
                            ${draggingFileType?.id === fileType.id ? 'opacity-50' : ''}
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
                          <td className="p-2 text-xs">
                            {fileType.mime_type || 'unknown'}
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={fileType.can_display_natively || false}
                              onChange={() =>
                                handleToggleNativeDisplay(fileType)
                              }
                              disabled={
                                isUpdating === fileType.id || isIgnored || false
                              }
                              className="h-4 w-4"
                              aria-label="Can display natively"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={fileType.needs_conversion || false}
                              onChange={() =>
                                handleToggleNeedsConversion(fileType)
                              }
                              disabled={
                                isUpdating === fileType.id || isIgnored || false
                              }
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
                          <td className="p-2 text-xs">
                            {formatDate(fileType.created_at, 'PP')}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}
