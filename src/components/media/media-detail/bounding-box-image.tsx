import type { DetectedObject } from '@tensorflow-models/coco-ssd';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface BoundingBoxImageProps {
  src: string;
  width: number;
  height: number;
  alt?: string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}

/**
 * Renders an image with bounding boxes overlayed, scaling boxes to image size.
 * Expects bounding boxes in pixel coordinates relative to the original image size.
 */
export const BoundingBoxImage: React.FC<BoundingBoxImageProps> = ({
  src,
  width,
  height,
  alt = '',
  maxWidth = '100%',
  maxHeight = 400,
}) => {
  const [objects, setObjects] = useState<DetectedObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [predictionTime, setPredictionTime] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [displaySize, setDisplaySize] = useState({ width, height });

  const imageRef = useRef<HTMLImageElement>(null); // Add ref for hidden img

  const objectsWithType = objects ? (objects as DetectedObject[]) : [];

  // Update display size based on actual rendered image size
  useEffect(() => {
    function updateSize() {
      if (imageRef.current) {
        setDisplaySize({
          width: imageRef.current.offsetWidth,
          height: imageRef.current.offsetHeight,
        });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Dynamically import tfjs and coco-ssd only in the browser
  const runDetection = useCallback(async (img: HTMLImageElement) => {
    setLoading(true);
    setObjects([]);
    setPredictionTime(null);
    try {
      const tf = await import('@tensorflow/tfjs');
      await import('@tensorflow/tfjs-backend-webgpu');
      await tf.setBackend('webgpu');
      await tf.ready();
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      const model = await cocoSsd.load();
      const start = performance.now();
      const preds = await model.detect(img);
      const end = performance.now();
      setPredictionTime(end - start);
      setObjects(preds);
    } catch (err) {
      setObjects([]);
      setPredictionTime(null);
      alert(`Error running detection: ${err}`);
    }
    setLoading(false);
  }, []);

  // Run detection when image loads
  useEffect(() => {
    if (imageRef.current && src) {
      runDetection(imageRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, runDetection]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: maxWidth,
        maxWidth,
        height: 'auto',
        maxHeight,
      }}
    >
      {loading && (
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          Detecting...
        </div>
      )}
      {predictionTime !== null && (
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          Prediction time: {predictionTime.toFixed(0)} ms
        </div>
      )}

      {/* Use a plain <img> for accurate sizing and ref */}
      {/** biome-ignore lint/performance/noImgElement: <used to load the image> */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onLoad={() => {
          if (imageRef.current) {
            setDisplaySize({
              width: imageRef.current.naturalWidth,
              height: imageRef.current.naturalHeight,
            });
            runDetection(imageRef.current);
          }
        }}
        crossOrigin="anonymous"
      />
      {/* SVG overlay for bounding boxes */}
      <svg
        width={displaySize.width}
        height={displaySize.height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          width: '100%',
          height: '100%',
        }}
      >
        {objectsWithType.map((obj, i) => {
          const [x, y, boxWidth, boxHeight] = obj.bbox;
          // Use natural image size for scaling
          const scaleX = displaySize.width / width;
          const scaleY = displaySize.height / height;
          const scaledX = x * scaleX;
          const scaledY = y * scaleY;
          const scaledWidth = boxWidth * scaleX;
          const scaledHeight = boxHeight * scaleY;
          return (
            <g key={i}>
              <rect
                x={scaledX}
                y={scaledY}
                width={scaledWidth}
                height={scaledHeight}
                fill="none"
                stroke="#ff5252"
                strokeWidth={2}
                rx={3}
              />
              <text
                x={scaledX + 4}
                y={scaledY + 16}
                fontSize={14}
                fill="#ff5252"
                stroke="#fff"
                strokeWidth={0.5}
                fontWeight="bold"
                style={{ userSelect: 'none' }}
              >
                {obj.class} ({obj.score.toFixed(2)})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
