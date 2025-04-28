'use client';

import { useState } from 'react';
import { addScanFolder } from '@/app/actions/scan/add-scan-folder';

export default function AddFolderForm() {
  const [folderPath, setFolderPath] = useState('');
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await addScanFolder(folderPath, includeSubfolders);
      if (error) {
        setError(error.message || 'Failed to add folder');
        return;
      }
      setMessage('Folder added successfully');
      setFolderPath('');
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
      // router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Add Folders to scan</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="folderPath" className="block text-sm font-medium">
            Folder Path
          </label>
          <input
            id="folderPath"
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="/path/to/your/media/folder"
            className="w-full p-2 border rounded-md bg-background"
            required
          />
          <p className="text-xs text-muted-foreground">
            Enter the absolute path to the folder containing your media files
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="includeSubfolders"
            type="checkbox"
            checked={includeSubfolders}
            onChange={(e) => setIncludeSubfolders(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="includeSubfolders" className="text-sm">
            Include subfolders
          </label>
        </div>

        {error && (
          <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 text-sm rounded-md bg-primary/10 text-primary">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !folderPath}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSubmitting ? 'Adding...' : 'Add Folder'}
        </button>
      </form>
    </div>
  );
}
