'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getMediaTypes } from '@/actions/admin/manage-media-types';
import AdminLayout from '@/components/admin/layout';
import MediaTypeList from '@/components/admin/media-type-list';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { MediaType } from '@/types/media-types';

export default function AdminFileTypesPage() {
  const [mediaTypes, setMediaTypes] = useState<MediaType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all media types on page load
  useEffect(() => {
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

    fetchMediaTypes();
  }, []);

  const refreshMediaTypes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getMediaTypes();

      if (response.error) {
        throw response.error;
      }

      setMediaTypes(response.types);
    } catch (e) {
      setError('Failed to refresh media types');
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
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <MediaTypeList
          mediaTypes={mediaTypes || []}
          isLoading={isLoading}
          onUpdate={refreshMediaTypes}
        />
      </div>
    </AdminLayout>
  );
}
