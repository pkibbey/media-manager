'use client';

import { Loader2 } from 'lucide-react';
import type React from 'react';
import { type ComponentProps, useState } from 'react';
import { Button } from '@/components/ui/button';

interface ActionButtonProps extends ComponentProps<'button'> {
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  action: () => Promise<boolean> | Promise<void>;
  successMessage?: string;
  loadingMessage?: string;
}

export default function ActionButton({
  children,
  action,
  successMessage = 'Completed',
  loadingMessage = 'Processing...',
  ...props
}: ActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async () => {
    setIsLoading(true);

    try {
      await action();
    } catch (e) {
      console.error('e: ', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleAction} disabled={isLoading} {...props}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingMessage}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
