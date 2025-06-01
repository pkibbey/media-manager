import type { DetectedObject } from '@tensorflow-models/coco-ssd';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface BoundingBoxImageProps {
  src: string;
  width: number;
  height: number;
  objects?: DetectedObject[];
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
  objects,
  alt = '',
  maxWidth = '100%',
  maxHeight = 400,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displaySize, setDisplaySize] = useState({ width, height });

  const imageRef = useRef<HTMLImageElement>(null); // Add ref for hidden img

  // The size that bounding boxes were generated for
  const ORIGINAL_BBOX_SIZE = 224;

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
    // Store updateSize in a ref so it can be used in onLoad
    (window as any)._boundingBoxUpdateSize = updateSize;
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

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
      {/** biome-ignore lint/performance/noImgElement: <used to load the image> */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onLoad={() => {
          // Always update display size after image loads
          if (typeof (window as any)._boundingBoxUpdateSize === 'function') {
            (window as any)._boundingBoxUpdateSize();
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
        {objects?.map((obj, i) => {
          const [x, y, boxWidth, boxHeight] = obj.bbox;
          // Use original bbox size for scaling
          const scaleX = displaySize.width / ORIGINAL_BBOX_SIZE;
          const scaleY = displaySize.height / ORIGINAL_BBOX_SIZE;
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
