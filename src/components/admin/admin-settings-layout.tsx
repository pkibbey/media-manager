import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AdminSettingsLayoutProps {
  title: string;
  description: string;
  isLoading?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
  saveButtonText?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AdminSettingsLayout({
  title,
  description,
  isLoading = false,
  isSaving = false,
  onSave,
  saveButtonText = 'Save changes',
  children,
  footer,
}: AdminSettingsLayoutProps) {
  return (
    <div className="container">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        {isLoading ? (
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        ) : (
          <>
            <CardContent>{children}</CardContent>

            <CardFooter className="flex justify-between">
              {footer}
              {onSave && (
                <Button onClick={onSave} disabled={isSaving}>
                  {isSaving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {saveButtonText}
                </Button>
              )}
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
