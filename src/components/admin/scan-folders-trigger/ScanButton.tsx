import { Button } from '@/components/ui/button';

type ScanButtonProps = {
  isScanning: boolean;
  onScan: () => void;
  onCancel: () => void;
  canCancel: boolean;
};

export function ScanButton({
  isScanning,
  onScan,
  onCancel,
  canCancel,
}: ScanButtonProps) {
  return (
    <Button
      onClick={isScanning ? onCancel : onScan}
      disabled={isScanning && !canCancel}
      variant={isScanning ? 'destructive' : 'default'}
      className="flex items-center gap-2"
    >
      {isScanning ? 'Scanning' : 'Start Scan'}
    </Button>
  );
}
