import { useState } from 'react';
import { toast } from 'sonner';

interface UseSettingsFormProps<T> {
  initialSettings: T;
  saveSettings: (
    settings: T,
  ) => Promise<{ success: boolean; message?: string }>;
  onSuccessMessage?: string;
}

export function useSettingsForm<T>({
  initialSettings,
  saveSettings,
  onSuccessMessage = 'Settings saved successfully',
}: UseSettingsFormProps<T>) {
  const [settings, setSettings] = useState<T>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);

  const updateSetting = <K extends keyof T>(key: K, value: T[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsSaving(true);
    try {
      const result = await saveSettings(settings);

      if (result.success) {
        toast.success(onSuccessMessage);
      } else {
        toast.error(result.message || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    updateSetting,
    setSettings,
    isSaving,
    handleSubmit,
  };
}
