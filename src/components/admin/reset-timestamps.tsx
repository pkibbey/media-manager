'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ResetTimestamps() {
  const [isResetting, setIsResetting] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  }>({});
  const router = useRouter();

  const handleReset = async () => {
    if (
      !confirm(
        'Are you sure you want to reset all timestamp corrections? This will clear all manually corrected timestamps and mark files as needing correction again.',
      )
    ) {
      return;
    }

    setIsResetting(true);
    setResult({});

    try {
      // We can reuse the same resetAllMediaItems function or create a more specific one if needed
      // const result = await resetAllMediaItems();
      setResult(result);

      if (result.success) {
        router.refresh();
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset Timestamp Corrections</CardTitle>
        <CardDescription>
          Reset the timestamp correction status of all media files. This is a
          destructive action and will require you to correct timestamps again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Use this if you want to start over with timestamp corrections or if
          you've made mistakes in your timestamp correction process.
        </p>
      </CardContent>
      <CardFooter>
        <Button
          variant="destructive"
          onClick={handleReset}
          disabled={isResetting}
          className="w-full"
        >
          {isResetting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset All Timestamp Corrections
            </>
          )}
        </Button>
      </CardFooter>

      {result.success === true && (
        <div className="px-6 pb-4">
          <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm">
            {result.message}
          </div>
        </div>
      )}

      {result.success === false && (
        <div className="px-6 pb-4">
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            Error: {result.error}
          </div>
        </div>
      )}
    </Card>
  );
}
