import ExifProcessor from '@/components/admin/exif-processor';
import { ResetExifData } from '@/components/admin/reset-exif-data';
import { ResetMedia } from '@/components/admin/reset-media';

export default function ProcessingPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* EXIF processing components */}
      <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] items-start gap-6">
        <ExifProcessor />
        <div className="flex flex-col gap-6">
          <ResetMedia />
          <ResetExifData />
        </div>
      </div>
    </div>
  );
}
