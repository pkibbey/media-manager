import { useEffect, useState } from 'react';

// This component only loads TensorFlow.js and the model in the browser, never on the server.
export default function BrowserObjectDetection({
  imageUrl,
  width = 400,
  height = 400,
}: {
  imageUrl: string;
  width?: number;
  height?: number;
}) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [predictionTime, setPredictionTime] = useState<number | null>(null);

  // Only run detection when imageUrl changes
  useEffect(() => {
    if (!imageUrl) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.width = width;
    img.height = height;
    img.onload = () => runDetection(img);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, width, height]);

  // Dynamically import tfjs and coco-ssd only in the browser
  const runDetection = async (img: HTMLImageElement) => {
    setLoading(true);
    setPredictions([]);
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
      setPredictions(preds);
    } catch (err) {
      setPredictions([]);
      setPredictionTime(null);
      alert(`Error running detection: ${err}`);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Overlay bounding boxes if predictions exist */}
      {predictions.length > 0 && (
        <svg
          role="presentation"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            width: width,
            height: height,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
          width={width}
          height={height}
        >
          {predictions.map((pred, i) => {
            const [x, y, w, h] = pred.bbox; // [x, y, width, height]
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill="none"
                  stroke="#00FF00"
                  strokeWidth="2"
                />
                <text
                  x={x}
                  y={y - 4}
                  fill="#00FF00"
                  fontSize="14"
                  fontWeight="bold"
                  stroke="#000"
                  strokeWidth="0.5"
                >
                  {pred.class} ({(pred.score * 100).toFixed(1)}%)
                </text>
              </g>
            );
          })}
        </svg>
      )}
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
    </>
  );
}
