'use client';

import { InfoCircledIcon } from '@radix-ui/react-icons';
import type * as React from 'react';

import { cn } from '@/lib/utils';

interface WarningProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
}

function Warning({ className, message, ...props }: WarningProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 mb-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-900 rounded-md text-amber-800 dark:text-amber-300',
        className,
      )}
      {...props}
    >
      <InfoCircledIcon className="h-4 w-4 shrink-0" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export { Warning };
