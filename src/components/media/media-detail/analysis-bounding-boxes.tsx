import Image from 'next/image';
import type { ObjectsType } from '@/types/analysis';

interface AnalysisBoundingBoxesProps {
  mediaId: string;
  objects: ObjectsType[] | undefined;
  width: number;
  height: number;
}

export function AnalysisBoundingBoxes({
  mediaId,
  objects,
  width,
  height,
}: AnalysisBoundingBoxesProps) {
  return (
    <div className="relative w-full h-full">
      <Image
        src={`/api/media/${mediaId}`}
        alt="Analysis"
        width={width}
        height={height}
        className="object-contain"
        unoptimized
      />
      {objects && objects.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {objects.map((obj, idx) => {
            const box = obj.box;
            console.log('box: ', box);

            // Scale the bounding box coordinates to the actual image dimensions
            const scaledLeft = (box.left / width) * width;
            const scaledTop = (box.top / height) * height;
            const scaledRight = (box.right / width) * width;
            const scaledBottom = (box.bottom / height) * height;

            const leftPercent = (scaledLeft / width) * 100;
            const topPercent = (scaledTop / height) * 100;
            const widthPercent = ((scaledRight - scaledLeft) / width) * 100;
            const heightPercent = ((scaledBottom - scaledTop) / height) * 100;

            return (
              <div
                key={idx}
                className="absolute border-2 border-red-500"
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  width: `${widthPercent}%`,
                  height: `${heightPercent}%`,
                }}
              >
                <span className="absolute top-0 left-0 bg-red-500 text-white text-[10px] px-1 rounded-br">
                  {obj.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
