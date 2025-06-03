import { ActionButton } from '@/components/admin/action-button';
import { Trash2 } from 'lucide-react';

interface ResetDataButtonProps {
  action: () => Promise<boolean>;
}

export function ResetDataButton({ action }: ResetDataButtonProps) {
  return (
    <ActionButton
      action={action}
      variant="destructive"
      loadingMessage="Resetting data..."
    >
      <Trash2 className="h-4 w-4 mr-1" />
      Reset Data
    </ActionButton>
  );
}
