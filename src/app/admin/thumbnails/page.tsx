import ResetThumbnails from '@/components/admin/thumbnails/reset-thumbnails';
import ThumbnailGenerator from '@/components/admin/thumbnails/thumbnail-generator';

export default function ThumbnailsPage() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] items-start gap-6">
      <ThumbnailGenerator />
      <ResetThumbnails />
    </div>
  );
}
