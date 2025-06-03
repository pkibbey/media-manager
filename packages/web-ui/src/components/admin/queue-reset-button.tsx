'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { QueueName } from 'shared/types';

interface QueueResetButtonProps {
  queueName: QueueName;
}

export function QueueResetButton({ queueName }: QueueResetButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedState, setSelectedState] = useState<string>('');

  const queueStates = [
    { key: 'waiting', label: 'Waiting' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'failed', label: 'Failed' },
    { key: 'paused', label: 'Paused' },
  ];

  const handleResetState = async () => {
    if (!selectedState) {
      console.error('No state selected');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/queue-reset?queueName=${queueName}&state=${selectedState}`,
        {
          method: 'POST',
        },
      );

      const result = await response.json();

      if (response.ok) {
        console.log(result.message);
        setSelectedState(''); // Reset selection after successful reset
      } else {
        console.error('Error resetting queue state:', result.error);
      }
    } catch (error) {
      console.error('Failed to reset queue state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Select value={selectedState} onValueChange={setSelectedState}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select queue state" />
        </SelectTrigger>
        <SelectContent>
          {queueStates.map((state) => (
            <SelectItem key={state.key} value={state.key}>
              {state.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={handleResetState}
        disabled={isLoading || !selectedState}
        variant="destructive"
        size="sm"
      >
        <Trash2 className="h-4 w-4 mr-1" />
        {isLoading ? 'Resetting...' : 'Reset Queue'}
      </Button>
    </div>
  );
}
