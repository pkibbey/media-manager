/**
 * Represents a node in the folder tree structure
 */
export type FolderNode = {
  name: string;
  path: string;
  children: FolderNode[];
  mediaCount?: number;
};
