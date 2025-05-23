# TensorFlow.js with Metal GPU on M3 MacBook Air

This document explains how to get the best performance with TensorFlow.js using Metal GPU acceleration on your M3 MacBook Air, particularly for object detection in the media manager.

## Overview

The media manager uses TensorFlow.js with Node.js bindings to perform object detection on images directly on your M3 MacBook Air. This leverages Apple's Metal GPU framework for significantly faster processing compared to CPU-only operations.

## Configuration

### Environment Variables

Metal GPU acceleration is enabled by setting the `TF_METAL_DEVICE` environment variable:

```bash
TF_METAL_DEVICE=1
```

This is already configured in the npm scripts:
- `pnpm dev:metal` - Development with Metal GPU acceleration
- `pnpm start:metal` - Production with Metal GPU acceleration
- `pnpm test:tf` - Tests TensorFlow.js performance with Metal GPU

### Performance Tuning

The following parameters can be adjusted for optimal performance on your M3 MacBook Air:

1. **Concurrency**: In `src/actions/analysis/process-for-objects.ts`, adjust the `DEFAULT_CONCURRENCY` value:
   - Current setting: 3 (recommended for M3 MacBook Air)
   - Increase for more powerful machines, decrease if experiencing memory issues

2. **Memory Allocation**: We've increased Node.js memory limit to 8GB in our npm scripts:
   ```
   NODE_OPTIONS='--max-old-space-size=8192'
   ```
   This is necessary for processing large batches or high-resolution images.

3. **Batch Size**: When processing large collections, consider the batch size:
   - For M3 MacBook Air, a batch size of 50-100 images is recommended
   - Larger batches require more memory but improve overall throughput

## Testing

You can verify that Metal GPU acceleration is working by running:

```bash
pnpm test:tf
```

Look for:
1. Backend: "tensorflow" (indicates native TensorFlow with Metal support)
2. Good performance in the matrix multiplication test (should be under 2 seconds)

## Troubleshooting

If you experience issues:

1. **Memory Errors**: 
   - Reduce concurrency
   - Process smaller batches
   - Ensure other memory-intensive applications are closed

2. **Metal GPU Not Used**:
   - Verify `TF_METAL_DEVICE=1` is set
   - Check if your specific M3 MacBook Air model is compatible
   - Update macOS to latest version

3. **Slow Performance**:
   - Check Activity Monitor to verify GPU usage
   - Tensor operations are lazy-evaluated; make sure to await results
   - Use `tensor.dispose()` after each operation to free memory

## References

- [TensorFlow.js Node GitHub Repository](https://github.com/tensorflow/tfjs/tree/master/tfjs-node)
- [TensorFlow.js Performance Best Practices](https://www.tensorflow.org/js/guide/platform_environment)
- [Metal Performance Shaders Documentation](https://developer.apple.com/documentation/metalperformanceshaders)
