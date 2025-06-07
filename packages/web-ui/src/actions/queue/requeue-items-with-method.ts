'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { QueueName, QueueState } from 'shared/types';

const connection = new IORedis(
  process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  process.env.REDIS_HOST ? process.env.REDIS_HOST : 'localhost',
  {
    maxRetriesPerRequest: null,
  },
);

/**
 * Requeue items in a specific state with a new method
 * @param queueName - Name of the queue
 * @param method - The new method to use for requeuing items
 * @param state - The queue state to filter jobs by
 * @returns Number of items requeued or -1 if failed
 */
export async function requeueItemsWithMethod(
  queueName: QueueName,
  method: string,
  state: QueueState,
): Promise<number> {
  try {
    const queue = new Queue(queueName, { connection });

    // Pause the queue to prevent new jobs from being processed during requeuing
    await queue.pause();
    console.log(`Paused queue "${queueName}" for requeuing operation`);

    // Map UI state names to BullMQ state names
    let bullMQState: string;
    switch (state) {
      case 'waiting':
        bullMQState = 'wait';
        break;
      case 'waiting-children':
        bullMQState = 'waiting-children';
        break;
      default:
        bullMQState = state;
        break;
    }

    // Get all jobs in the specified state
    const jobs = await queue.getJobs([bullMQState as any], 0, -1);

    if (!jobs || jobs.length === 0) {
      console.log(`No jobs found in state "${state}" for queue "${queueName}"`);
      return 0;
    }

    console.log(
      `Found ${jobs.length} jobs in state "${state}" for queue "${queueName}"`,
    );

    let requeuedCount = 0;

    // Process each job: delete it and add it back with the new method
    for (const job of jobs) {
      try {
        // Get the job data
        const jobData = job.data;
        const jobOpts = job.opts || {};

        // Create new job data with updated method
        const newJobData = {
          ...jobData,
          method,
        };

        // Generate a new job ID if one exists, updating it to include the new method
        let newJobId: string | undefined;
        if (jobOpts.jobId) {
          // If the job ID contains a method suffix, replace it
          const jobIdParts = jobOpts.jobId.split('-');
          if (jobIdParts.length > 1) {
            // Assume the last part is the method, replace it
            jobIdParts[jobIdParts.length - 1] = method;
            newJobId = jobIdParts.join('-');
          } else {
            // No method suffix, just append the new method
            newJobId = `${jobOpts.jobId}-${method}`;
          }
        }

        // Remove the old job
        await job.remove();

        // Add the job back with the new method
        const newJobOpts = {
          ...jobOpts,
          ...(newJobId && { jobId: newJobId }),
        };

        await queue.add(job.name || 'requeued-job', newJobData, newJobOpts);

        requeuedCount++;
        console.log(`Requeued job ${job.id} with method "${method}"`);
      } catch (jobError) {
        console.error(`Failed to requeue job ${job.id}:`, jobError);
      }
    }

    console.log(
      `Successfully requeued ${requeuedCount} out of ${jobs.length} jobs from state "${state}" in queue "${queueName}" with method "${method}"`,
    );

    // Resume the queue after requeuing is complete
    await queue.resume();
    console.log(`Resumed queue "${queueName}" after requeuing operation`);

    return requeuedCount;
  } catch (error) {
    console.error('Error requeuing items with method:', error);

    // Ensure the queue is resumed even if an error occurs
    try {
      const queue = new Queue(queueName, { connection });
      await queue.resume();
      console.log(`Resumed queue "${queueName}" after error during requeuing`);
    } catch (resumeError) {
      console.error('Failed to resume queue after error:', resumeError);
    }

    return -1;
  }
}
