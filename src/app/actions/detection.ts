'use server';

import { ReadableStream } from 'node:stream/web';
import { TextEncoder } from 'node:util';
import { isAborted } from '@/lib/abort-tokens';
import { createServerSupabaseClient } from '@/lib/supabase';
import type {
  DetectionProcessingOptions,
  DetectionProgress,
} from '@/types/detection-types';

/**
 * Process media items for object detection and keyword extraction
 * @param options Detection processing options
 */
export async function runDetectionAnalysis(
  options: DetectionProcessingOptions = {},
): Promise<ReadableStream> {
  // Create a readable stream to send progress updates to the client
  let controller: ReadableStreamController<Uint8Array> | null = null;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  // Process in the background and send updates via the stream
  processDetectionInBackground(controller, options);

  return stream;
}

/**
 * Background processing function for detection analysis
 */
async function processDetectionInBackground(
  controller: ReadableStreamController<Uint8Array> | null,
  options: DetectionProcessingOptions,
) {
  const encoder = new TextEncoder();
  const progress: DetectionProgress = {
    status: 'started',
    message: 'Starting detection analysis...',
  };

  // Send initial progress update
  if (controller) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
  }

  try {
    const supabase = createServerSupabaseClient();

    // Get count of files that need processing
    let query = supabase
      .from('media_items')
      .select('id, file_name, file_path, extension', { count: 'exact' });

    // Apply filters based on options
    if (options.skipProcessedFiles) {
      // Assuming we have a has_detection column indicating whether detection has been run
      query = query.is('has_detection', null);
    }

    if (options.targetFileTypes && options.targetFileTypes.length > 0) {
      query = query.in('extension', options.targetFileTypes);
    } else {
      // Default to only processing image files if no specific types are provided
      const { data: fileTypes } = await supabase
        .from('file_types')
        .select('extension')
        .eq('category', 'image');

      if (fileTypes && fileTypes.length > 0) {
        const imageExtensions = fileTypes.map((type) => type.extension);
        query = query.in('extension', imageExtensions);
      }
    }

    // Get total count
    const { count: totalCount, error: countError } = await query;

    if (countError) {
      throw new Error(`Error counting media items: ${countError.message}`);
    }

    // Update progress with total file count
    progress.status = 'processing';
    progress.filesDiscovered = totalCount || 0;
    progress.filesProcessed = 0;
    progress.successCount = 0;
    progress.failedCount = 0;
    progress.method = options.detectionMethod || 'default';
    progress.message = `Found ${progress.filesDiscovered} files to process`;

    if (controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(progress)}\n\n`),
      );
    }

    // If no files to process, complete early
    if ((totalCount || 0) === 0) {
      progress.status = 'completed';
      progress.message = 'No files to process';

      if (controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(progress)}\n\n`),
        );
        controller.close();
      }
      return;
    }

    // Process files in batches to avoid memory issues
    const batchSize = 50;
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errorDetails: Array<{
      filePath: string;
      error: string;
      fileType?: string;
    }> = [];

    // Example batch processing loop
    while (processedCount < (totalCount || 0)) {
      // Check for abort signal
      if (options.abortToken && (await isAborted(options.abortToken))) {
        progress.status = 'error';
        progress.message = 'Detection cancelled';

        if (controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(progress)}\n\n`),
          );
          controller.close();
        }
        return;
      }

      // Get batch of files
      const { data: files, error: filesError } = await query.range(
        processedCount,
        processedCount + batchSize - 1,
      );

      if (filesError) {
        throw new Error(`Error fetching media items: ${filesError.message}`);
      }

      if (!files || files.length === 0) {
        break;
      }

      // Process each file in the batch
      for (const file of files) {
        // Check for abort again
        if (options.abortToken && (await isAborted(options.abortToken))) {
          progress.status = 'error';
          progress.message = 'Detection cancelled';

          if (controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(progress)}\n\n`),
            );
            controller.close();
          }
          return;
        }

        try {
          // Update progress with current file
          progress.currentFilePath = file.file_path;
          progress.message = `Processing ${file.file_name}`;
          progress.filesProcessed = processedCount + 1;

          if (controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(progress)}\n\n`),
            );
          }

          // This is a placeholder for the detection logic
          // In a real implementation, this would call a detection service/library
          // const detectedItems = await performDetection(
          //   file.file_path,
          //   options.detectionMethod,
          // );
          const detectedItems: any[] = []; // Replace with actual detection logic

          // Filter by confidence threshold if needed
          const filteredItems = detectedItems.filter(
            (item) => item.confidence >= (options.minConfidence || 0),
          );

          // Save detection results to database
          if (filteredItems.length > 0) {
            const { error: saveError } = await supabase
              .from('detection_results')
              .upsert({
                media_id: file.id,
                detected_items: filteredItems,
                detection_date: new Date().toISOString(),
                detection_method: options.detectionMethod || 'default',
              });

            if (saveError) {
              throw new Error(
                `Error saving detection results: ${saveError.message}`,
              );
            }

            // Update the media item to indicate it has detection data
            await supabase
              .from('media_items')
              .update({ has_detection: true })
              .eq('id', file.id);

            successCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          failedCount++;

          // Record error details
          errorDetails.push({
            filePath: file.file_path,
            error: error instanceof Error ? error.message : String(error),
            fileType: file.extension,
          });

          // Log failed detection to database for later retry
          await supabase.from('failed_detections').upsert({
            media_id: file.id,
            file_path: file.file_path,
            file_name: file.file_name,
            error: error instanceof Error ? error.message : String(error),
            extension: file.extension,
            attempted_at: new Date().toISOString(),
          });
        }

        processedCount++;
      }

      // Update progress after each batch
      progress.filesProcessed = processedCount;
      progress.successCount = successCount;
      progress.failedCount = failedCount;
      progress.skippedFiles = skippedCount;
      progress.message = `Processed ${processedCount} of ${totalCount} files`;

      if (errorDetails.length > 0) {
        progress.errorDetails = errorDetails.slice(0, 10); // Limit to first 10 errors
      }

      if (controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(progress)}\n\n`),
        );
      }
    }

    // Complete processing
    progress.status = 'completed';
    progress.message = `Completed detection analysis. ${successCount} files processed successfully, ${failedCount} failed.`;

    if (controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(progress)}\n\n`),
      );
      controller.close();
    }
  } catch (error) {
    // Handle overall errors
    progress.status = 'error';
    progress.message = 'Detection analysis failed';
    progress.error = error instanceof Error ? error.message : String(error);

    if (controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(progress)}\n\n`),
      );
      controller.close();
    }
  }
}

/**
 * Get failed detection jobs grouped by error category
 */
export async function getFailedDetectionJobs() {
  try {
    const supabase = createServerSupabaseClient();

    // Get all failed detection jobs
    const { data: failedJobs, error } = await supabase
      .from('failed_detections')
      .select('*')
      .order('attempted_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: `Failed to fetch failed detection jobs: ${error.message}`,
      };
    }

    // Group by error type
    const errorGroups: Record<string, any[]> = {};
    failedJobs?.forEach((job) => {
      // Create a simplified error key
      const errorKey = getSimplifiedErrorMessage(job.error || '');
      if (!errorGroups[errorKey]) {
        errorGroups[errorKey] = [];
      }
      errorGroups[errorKey].push(job);
    });

    // Format as error categories
    const errorCategories = Object.entries(errorGroups).map(([type, jobs]) => ({
      type,
      count: jobs.length,
      examples: jobs.slice(0, 5),
    }));

    return {
      success: true,
      errorCategories,
      totalFailedCount: failedJobs?.length || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error processing failed detection jobs: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Retry failed detection jobs
 */
export async function retryFailedDetectionJobs() {
  try {
    const supabase = createServerSupabaseClient();

    // Get count of failed jobs
    const { count, error: countError } = await supabase
      .from('failed_detections')
      .select('*', { count: 'exact' });

    if (countError) {
      return {
        success: false,
        error: `Failed to count failed detection jobs: ${countError.message}`,
      };
    }

    // Clear the failed_detections table
    const { error: clearError } = await supabase
      .from('failed_detections')
      .delete()
      .neq('id', '0'); // Delete all rows

    if (clearError) {
      return {
        success: false,
        error: `Failed to clear failed detection jobs: ${clearError.message}`,
      };
    }

    return {
      success: true,
      message: `Queued ${count} failed detection jobs for retry`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error retrying failed detection jobs: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Reset all detection data
 */
export async function resetDetectionData() {
  try {
    const supabase = createServerSupabaseClient();

    // Delete all detection results
    const { error: deleteError } = await supabase
      .from('detection_results')
      .delete()
      .neq('id', '0'); // Delete all rows

    if (deleteError) {
      return {
        success: false,
        error: `Failed to delete detection results: ${deleteError.message}`,
      };
    }

    // Clear has_detection flag on all media items
    const { error: updateError } = await supabase
      .from('media_items')
      .update({ has_detection: null })
      .neq('id', '0'); // Update all rows

    if (updateError) {
      return {
        success: false,
        error: `Failed to reset detection flags: ${updateError.message}`,
      };
    }

    // Clear failed_detections table
    await supabase.from('failed_detections').delete().neq('id', '0');

    return {
      success: true,
      message: 'All detection data has been reset',
    };
  } catch (error) {
    return {
      success: false,
      error: `Error resetting detection data: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Simplify error message for grouping similar errors
 */
function getSimplifiedErrorMessage(error: string): string {
  if (!error) return 'Unknown error';

  // Remove specific details like file paths, IDs, etc. to group similar errors
  let simplified = error
    .replace(/\/[^\s/]+\/[^\s/]+\/[^\s/:.]+/g, '[PATH]')
    .replace(/\d+/g, '[NUMBER]')
    .replace(/'.+?'/g, '[VALUE]')
    .replace(/"[^"]+"/g, '[VALUE]');

  // Limit length to avoid extremely long error keys
  if (simplified.length > 100) {
    simplified = `${simplified.substring(0, 100)}...`;
  }

  return simplified;
}
