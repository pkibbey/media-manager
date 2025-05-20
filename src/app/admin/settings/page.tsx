'use client';

import {
  AlertTriangle,
  Loader2,
  Save,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '@/actions/admin/update-settings';
import AdminLayout from '@/components/admin/layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MAX_BATCH_SIZE } from '@/lib/consts';
import type { AppSettings, SettingsCategory } from '@/types/settings';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch settings on page load
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getSettings();

        if (response.error) {
          throw new Error(response.error);
        }

        setSettings(response.settings);
      } catch (e) {
        setError('Failed to load settings');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Handle form submission for the current category
  const handleSaveSettings = async (
    category: SettingsCategory,
    updatedSettings: any,
  ) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await updateSettings({
        category,
        settings: updatedSettings,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update settings');
      }

      // Update local state with the new settings
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              [category]: {
                ...prev[category],
                ...updatedSettings,
              },
            }
          : null,
      );

      setSaveSuccess(true);

      // Reset success message after a delay
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : 'An unknown error occurred',
      );
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Loading settings...
          </span>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  if (!settings) {
    return (
      <AdminLayout>
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Settings data is not available.</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Application Settings</h2>
          <SettingsIcon className="h-5 w-5 text-muted-foreground" />
        </div>

        {saveError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}

        {saveSuccess && (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
            <AlertTitle className="text-green-800 dark:text-green-300">
              Success
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              Settings have been saved successfully.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="thumbnails">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="thumbnails">Thumbnails</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="exif">EXIF</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="thumbnails">
            <ThumbnailSettings
              settings={settings.thumbnails}
              onSave={(updatedSettings) =>
                handleSaveSettings('thumbnails', updatedSettings)
              }
              isSaving={isSaving}
            />
          </TabsContent>

          <TabsContent value="analysis">
            <AnalysisSettings
              settings={settings.analysis}
              onSave={(updatedSettings) =>
                handleSaveSettings('analysis', updatedSettings)
              }
              isSaving={isSaving}
            />
          </TabsContent>

          <TabsContent value="exif">
            <ExifSettings
              settings={settings.exif}
              onSave={(updatedSettings) =>
                handleSaveSettings('exif', updatedSettings)
              }
              isSaving={isSaving}
            />
          </TabsContent>

          <TabsContent value="storage">
            <StorageSettings
              settings={settings.storage}
              onSave={(updatedSettings) =>
                handleSaveSettings('storage', updatedSettings)
              }
              isSaving={isSaving}
            />
          </TabsContent>

          <TabsContent value="system">
            <SystemSettings
              settings={settings.system}
              onSave={(updatedSettings) =>
                handleSaveSettings('system', updatedSettings)
              }
              isSaving={isSaving}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// Thumbnail Settings Component
function ThumbnailSettings({
  settings,
  onSave,
  isSaving,
}: {
  settings: AppSettings['thumbnails'];
  onSave: (settings: Partial<AppSettings['thumbnails']>) => void;
  isSaving: boolean;
}) {
  const [quality, setQuality] = useState(settings.quality);
  const [maxWidth, setMaxWidth] = useState(settings.maxWidth);
  const [maxHeight, setMaxHeight] = useState(settings.maxHeight);
  const [format, setFormat] = useState<string>(settings.format);
  const [generateWebP, setGenerateWebP] = useState(settings.generateWebP);

  const handleSave = () => {
    onSave({
      quality,
      maxWidth,
      maxHeight,
      format: format as 'jpeg' | 'webp' | 'avif',
      generateWebP,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thumbnail Settings</CardTitle>
        <CardDescription>
          Configure how thumbnails are generated and displayed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="quality">Quality ({quality}%)</Label>
            <Slider
              id="quality"
              min={10}
              max={100}
              step={5}
              value={[quality]}
              onValueChange={(value) => setQuality(value[0])}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxWidth">Max Width (pixels)</Label>
              <Input
                id="maxWidth"
                type="number"
                value={maxWidth}
                onChange={(e) =>
                  setMaxWidth(Number.parseInt(e.target.value) || 0)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxHeight">Max Height (pixels)</Label>
              <Input
                id="maxHeight"
                type="number"
                value={maxHeight}
                onChange={(e) =>
                  setMaxHeight(Number.parseInt(e.target.value) || 0)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Output Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jpeg">JPEG (Compatible)</SelectItem>
                <SelectItem value="webp">WebP (Efficient)</SelectItem>
                <SelectItem value="avif">AVIF (Best Quality/Size)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="generateWebP"
              checked={generateWebP}
              onCheckedChange={setGenerateWebP}
            />
            <Label htmlFor="generateWebP">
              Also generate WebP version (for browsers that support it)
            </Label>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Thumbnail Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Analysis Settings Component
function AnalysisSettings({
  settings,
  onSave,
  isSaving,
}: {
  settings: AppSettings['analysis'];
  onSave: (settings: Partial<AppSettings['analysis']>) => void;
  isSaving: boolean;
}) {
  const [batchSize, setBatchSize] = useState(settings.batchSize);
  const [modelName, setModelName] = useState(settings.modelName);
  const [autoProcessNew, setAutoProcessNew] = useState(settings.autoProcessNew);
  const [minConfidenceScore, setMinConfidenceScore] = useState(
    settings.minConfidenceScore,
  );

  const handleSave = () => {
    onSave({
      batchSize,
      modelName,
      autoProcessNew,
      minConfidenceScore,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media Analysis Settings</CardTitle>
        <CardDescription>Configure AI analysis behavior</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batchSize">Batch Size</Label>
            <Input
              id="batchSize"
              type="number"
              min="1"
              max={MAX_BATCH_SIZE}
              value={batchSize}
              onChange={(e) =>
                setBatchSize(Number.parseInt(e.target.value) || 1)
              }
            />
            <p className="text-xs text-muted-foreground">
              Number of items to process in a single batch
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelName">AI Model</Label>
            <Input
              id="modelName"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Name of the model to use for analysis (e.g., minicpm-v:latest)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minConfidenceScore">
              Minimum Confidence ({(minConfidenceScore * 100).toFixed(0)}%)
            </Label>
            <Slider
              id="minConfidenceScore"
              min={0}
              max={1}
              step={0.05}
              value={[minConfidenceScore]}
              onValueChange={(value) => setMinConfidenceScore(value[0])}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground">
              Minimum confidence score required for analysis results
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="autoProcessNew"
              checked={autoProcessNew}
              onCheckedChange={setAutoProcessNew}
            />
            <Label htmlFor="autoProcessNew">
              Automatically analyze newly added media
            </Label>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Analysis Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// EXIF Settings Component
function ExifSettings({
  settings,
  onSave,
  isSaving,
}: {
  settings: AppSettings['exif'];
  onSave: (settings: Partial<AppSettings['exif']>) => void;
  isSaving: boolean;
}) {
  const [batchSize, setBatchSize] = useState(settings.batchSize);
  const [autoProcessNew, setAutoProcessNew] = useState(settings.autoProcessNew);
  const [prioritizeGpsData, setPrioritizeGpsData] = useState(
    settings.prioritizeGpsData,
  );

  const handleSave = () => {
    onSave({
      batchSize,
      autoProcessNew,
      prioritizeGpsData,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>EXIF Processing Settings</CardTitle>
        <CardDescription>
          Configure metadata extraction behavior
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exifBatchSize">Batch Size</Label>
            <Input
              id="exifBatchSize"
              type="number"
              min="1"
              max={MAX_BATCH_SIZE}
              value={batchSize}
              onChange={(e) =>
                setBatchSize(Number.parseInt(e.target.value) || 1)
              }
            />
            <p className="text-xs text-muted-foreground">
              Number of items to process in a single batch
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="exifAutoProcessNew"
              checked={autoProcessNew}
              onCheckedChange={setAutoProcessNew}
            />
            <Label htmlFor="exifAutoProcessNew">
              Automatically extract EXIF data from new media
            </Label>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="prioritizeGpsData"
              checked={prioritizeGpsData}
              onCheckedChange={setPrioritizeGpsData}
            />
            <Label htmlFor="prioritizeGpsData">
              Prioritize media with GPS data for processing
            </Label>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save EXIF Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Storage Settings Component
function StorageSettings({
  settings,
  onSave,
  isSaving,
}: {
  settings: AppSettings['storage'];
  onSave: (settings: Partial<AppSettings['storage']>) => void;
  isSaving: boolean;
}) {
  const [mediaPath, setMediaPath] = useState(settings.mediaPath);
  const [thumbnailPath, setThumbnailPath] = useState(settings.thumbnailPath);
  const [maxStorageGB, setMaxStorageGB] = useState(settings.maxStorageGB);
  const [cleanupThresholdPercent, setCleanupThresholdPercent] = useState(
    settings.cleanupThresholdPercent,
  );

  const handleSave = () => {
    onSave({
      mediaPath,
      thumbnailPath,
      maxStorageGB,
      cleanupThresholdPercent,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Settings</CardTitle>
        <CardDescription>
          Configure media storage locations and limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mediaPath">Media Storage Path</Label>
            <Input
              id="mediaPath"
              value={mediaPath}
              onChange={(e) => setMediaPath(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Path where original media files are stored
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnailPath">Thumbnail Storage Path</Label>
            <Input
              id="thumbnailPath"
              value={thumbnailPath}
              onChange={(e) => setThumbnailPath(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Path where generated thumbnails are stored
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxStorageGB">Maximum Storage (GB)</Label>
            <Input
              id="maxStorageGB"
              type="number"
              min="1"
              value={maxStorageGB}
              onChange={(e) =>
                setMaxStorageGB(Number.parseInt(e.target.value) || 1)
              }
            />
            <p className="text-xs text-muted-foreground">
              Maximum storage space allocated for media
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cleanupThreshold">
              Cleanup Threshold ({cleanupThresholdPercent}%)
            </Label>
            <Slider
              id="cleanupThreshold"
              min={50}
              max={99}
              step={1}
              value={[cleanupThresholdPercent]}
              onValueChange={(value) => setCleanupThresholdPercent(value[0])}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground">
              Storage utilization percentage that triggers cleanup
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Storage Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// System Settings Component
function SystemSettings({
  settings,
  onSave,
  isSaving,
}: {
  settings: AppSettings['system'];
  onSave: (settings: Partial<AppSettings['system']>) => void;
  isSaving: boolean;
}) {
  const [maxConcurrentJobs, setMaxConcurrentJobs] = useState(
    settings.maxConcurrentJobs,
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    settings.notificationsEnabled,
  );
  const [logLevel, setLogLevel] = useState<string>(settings.logLevel);
  const [adminEmail, setAdminEmail] = useState(settings.adminEmail);

  const handleSave = () => {
    onSave({
      maxConcurrentJobs,
      notificationsEnabled,
      logLevel: logLevel as 'debug' | 'info' | 'warn' | 'error',
      adminEmail,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>
          Configure application-wide system settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxConcurrentJobs">Max Concurrent Jobs</Label>
            <Input
              id="maxConcurrentJobs"
              type="number"
              min="1"
              max={MAX_BATCH_SIZE}
              value={maxConcurrentJobs}
              onChange={(e) =>
                setMaxConcurrentJobs(Number.parseInt(e.target.value) || 1)
              }
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of jobs to process simultaneously
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logLevel">Log Level</Label>
            <Select value={logLevel} onValueChange={setLogLevel}>
              <SelectTrigger id="logLevel">
                <SelectValue placeholder="Select log level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Minimum log level to record
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminEmail">Admin Email</Label>
            <Input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Email address for system notifications
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="notificationsEnabled"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
            <Label htmlFor="notificationsEnabled">
              Enable system notifications
            </Label>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save System Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
