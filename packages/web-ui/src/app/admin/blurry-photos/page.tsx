'use client';

import { getBlurryPhotos } from '@/actions/blurry-photos/get-blurry-photos';
import { AddOneToQueueButton } from '@/components/admin/add-one-to-queue-button';
import { AddToQueueButton } from '@/components/admin/add-to-queue-button';
import { BlurryPhotosQueueStatus } from '@/components/admin/blurry-photos-queue-status';
import { PauseQueueButton } from '@/components/admin/pause-queue-button';
import { MediaListContainer } from '@/components/media/media-list/media-list-container';
import { useEffect, useState } from 'react';
import type { MediaWithRelations } from 'shared/types';

export default function BlurryPhotosAdminPage() {
  const [blurryPhotos, setBlurryPhotos] = useState<MediaWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlurryPhotos = async () => {
      try {
        const photos = await getBlurryPhotos();
        setBlurryPhotos(photos);
      } catch (error) {
        console.error('Error fetching blurry photos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlurryPhotos();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">Blurry Photos Detection</h2>
          <p className="text-muted-foreground">
            Detect and manage images that are all one solid color (indicating
            blank or corrupted images).
          </p>
        </div>
        <PauseQueueButton queueName="blurryPhotosQueue" />
      </div>

      <BlurryPhotosQueueStatus />

      {!loading && blurryPhotos.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">
              Detected Blurry/Solid Color Photos
            </h3>
            <p className="text-muted-foreground">
              Images detected as solid color or blank ({blurryPhotos.length}{' '}
              items)
            </p>
          </div>
          <MediaListContainer media={blurryPhotos} />
        </div>
      )}

      {!loading && blurryPhotos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No blurry or solid color photos detected yet.</p>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-border space-y-4">
        <h3 className="text-lg font-semibold">Actions</h3>
        <div className="flex flex-col gap-2 items-start">
          <div className="flex gap-2">
            <AddToQueueButton queueName="blurryPhotosQueue" method="standard" />
            <AddOneToQueueButton
              queueName="blurryPhotosQueue"
              method="standard"
            />
          </div>
          <p className="text-muted-foreground">
            Analyze images to detect blurry or corrupted content.
          </p>
        </div>
      </div>
    </div>
  );
}
