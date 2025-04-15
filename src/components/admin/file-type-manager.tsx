'use client';

import { updateFileType } from '@/app/api/actions/file-types';
import { formatDate } from '@/lib/utils';
import type { Tables } from '@/types/supabase';
import { useState } from 'react';

type FileType = Tables<'file_types'>;

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

  // Group file types by category for easier management
  const groupedTypes: GroupedFileTypes = fileTypes.reduce(
    (acc: GroupedFileTypes, fileType) => {
      const category = fileType.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(
        updatedTypes[fileType.id] ? updatedTypes[fileType.id] : fileType,
      );
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

      {categories.map((category) => (
        <div key={category} className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            {category}
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
                        className={
                          isIgnored
                            ? 'bg-muted/50 text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-950/30'
                            : 'hover:bg-accent/50'
                        }
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
                            checked={fileType.can_display_natively}
                            onChange={() => handleToggleNativeDisplay(fileType)}
                            disabled={isUpdating === fileType.id || isIgnored}
                            className="h-4 w-4"
                            aria-label="Can display natively"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={fileType.needs_conversion}
                            onChange={() =>
                              handleToggleNeedsConversion(fileType)
                            }
                            disabled={isUpdating === fileType.id || isIgnored}
                            className="h-4 w-4"
                            aria-label="Needs conversion"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={isIgnored}
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
