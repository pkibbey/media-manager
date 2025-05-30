'use client';

import { useEffect, useState } from 'react';
import ActionButton from './action-button';

interface ResetQueueButtonProps {
  action: () => Promise<boolean>;
  queueName: string;
}

export default function ResetQueueButton({
  action,
  queueName,
}: ResetQueueButtonProps) {
  const [count, setCount] = useState<number | null>(null);

  // Dynamically import BullMQ and fetch the queue count on mount
  useEffect(() => {
    async function fetchCount() {
      const result = await fetch(`/api/admin/queue-counts/${queueName}`);
      const data = await result.json();
      if (result.ok) {
        setCount(
          data.counts.active +
            data.counts.completed +
            data.counts.delayed +
            data.counts.failed +
            data.counts.paused +
            data.counts.prioritized +
            data.counts['waiting-children'] +
            data.counts.waiting,
        );
      } else {
        console.error('Failed to fetch queue count:', data.error);
        setCount(0);
      }
    }
    fetchCount();
  }, [queueName]);

  const handleClear = async () => {
    const result = await action();
    // Re-fetch count after clearing
    setCount(0);
    return result;
  };

  return (
    <div className="flex items-center gap-2">
      <ActionButton
        action={handleClear}
        variant="outline"
        loadingMessage="Clearing queue..."
        successMessage="Queue cleared"
      >
        Clear Queue ({count})
      </ActionButton>
    </div>
  );
}
