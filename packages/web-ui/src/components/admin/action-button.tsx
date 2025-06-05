'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type React from 'react';
import { type ComponentProps, useState } from 'react';

interface ActionButtonProps extends ComponentProps<'button'> {
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  action: () => Promise<boolean> | Promise<void>;
  loadingMessage?: string;
}

export function ActionButton({
  children,
  action,
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
    <Button
      onClick={handleAction}
      disabled={isLoading}
      {...props}
      className={cn(props.className, 'cursor-pointer')}
    >
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
