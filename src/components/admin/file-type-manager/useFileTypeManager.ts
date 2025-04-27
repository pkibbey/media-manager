import { useState } from 'react';
import type { FileType } from '@/types/db-types';
import { updateFileType } from '@/app/actions/file-types/update-file-type';

export interface GroupedFileTypes {
  [category: string]: FileType[];
}

export function useFileTypeManager(initialFileTypes: FileType[]) {
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
  const groupedTypes: GroupedFileTypes = initialFileTypes.reduce(
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
  const ignoredTypesCount = initialFileTypes.filter(
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

  return {
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
  };
}
