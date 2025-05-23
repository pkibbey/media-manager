'use client';

import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  deleteAllMediaTypes,
  getMediaTypes,
} from '@/actions/admin/manage-media-types';
import AdminLayout from '@/components/admin/layout';
import MediaTypeList from '@/components/admin/media-type-list';
import { Button } from '@/components/ui/button';
import type { MediaType } from '@/types/media-types';

export default function AdminFileTypesPage() {
  const [mediaTypes, setMediaTypes] = useState<MediaType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all media types on page load
  const fetchMediaTypes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getMediaTypes();

      if (response.error) {
        throw response.error;
      }

      setMediaTypes(response.types);
    } catch (e) {
      setError('Failed to load media types');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize data on component mount
  useEffect(() => {
    fetchMediaTypes();
  }, [fetchMediaTypes]);

  const handleDeleteAllMediaTypes = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete ALL media types? This action cannot be undone and may fail if media files are using these types.',
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteAllMediaTypes();

      if (!result.success) {
        throw result.error || new Error('Failed to delete all media types');
      }

      toast.success(result.message || 'All media types deleted successfully');
      await fetchMediaTypes(); // Refresh the list
    } catch (e) {
      toast.error(
        'Failed to delete all media types. They may be in use by existing media.',
      );
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Media Types Management</h2>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteAllMediaTypes}
            disabled={isDeleting || isLoading || !mediaTypes?.length}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete All Media Types'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading media types...</div>
          </div>
        ) : (
          <MediaTypeList
            mediaTypes={mediaTypes || []}
            onUpdate={fetchMediaTypes}
          />
        )}
      </div>
    </AdminLayout>
  );
}
