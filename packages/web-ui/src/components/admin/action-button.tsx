'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type React from 'react';
import { type ComponentProps, useState } from 'react';

interface ActionButtonProps extends ComponentProps<'button'> {
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  action: () => Promise<boolean> | Promise<void>;
}

export function ActionButton({
  children,
  action,
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
      className={cn(
        props.className,
        'cursor-pointer',
        isLoading && 'opacity-50',
      )}
    >
      {children}
    </Button>
  );
}
