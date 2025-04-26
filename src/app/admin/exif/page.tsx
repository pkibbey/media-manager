import ExifProcessor from '@/components/admin/exif-processor';
import { ResetMedia } from '@/components/admin/reset-media';

export default function ProcessingPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Existing components */}
      <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] items-start gap-6">
        <ExifProcessor />
        <ResetMedia />
      </div>
    </div>
  );
}
