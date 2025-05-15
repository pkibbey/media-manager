'use client';

import { useEffect, useState } from 'react';
import { getMediaTypes } from '@/actions/admin/manage-media-types';
import AdminLayout from '@/components/admin/layout';
import MediaTypeList from '@/components/admin/media-type-list';
import type { MediaType } from '@/types/media-types';

export default function AdminFileTypesPage() {
  const [mediaTypes, setMediaTypes] = useState<MediaType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all media types on page load
  useEffect(() => {
    fetchMediaTypes();
  }, []);

  const fetchMediaTypes = async () => {
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
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Media Types Management</h2>
        </div>

        {error && (
          <div className="text-red-500">
            <p>{error}</p>
          </div>
        )}

        <MediaTypeList
          mediaTypes={mediaTypes || []}
          isLoading={isLoading}
          onUpdate={fetchMediaTypes}
        />
      </div>
    </AdminLayout>
  );
}
