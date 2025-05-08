'use client';

import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type React from 'react';
import { type ComponentProps, useState } from 'react';
import { Button } from '@/components/ui/button';

interface ActionButtonProps extends ComponentProps<'button'> {
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  action: () => Promise<{ success: boolean; error?: string }>;
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
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleAction = async () => {
    setIsLoading(true);
    setStatus('idle');
    setErrorMessage(undefined);

    try {
      const result = await action();

      if (result.success) {
        setStatus('success');
        // Reset success status after 2 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 2000);
      } else {
        setStatus('error');
        setErrorMessage(result.error);
      }
    } catch (e) {
      setStatus('error');
      setErrorMessage(
        e instanceof Error ? e.message : 'An unknown error occurred',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button onClick={handleAction} disabled={isLoading} {...props}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingMessage}
          </>
        ) : (
          <>
            {status === 'success' && (
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            )}
            {status === 'error' && (
              <AlertCircle className="mr-2 h-4 w-4 text-destructive" />
            )}
            {children}
          </>
        )}
      </Button>

      {status === 'error' && errorMessage && (
        <div className="absolute top-full mt-2 p-2 bg-destructive/10 text-destructive text-xs rounded-md min-w-[200px] z-10">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
