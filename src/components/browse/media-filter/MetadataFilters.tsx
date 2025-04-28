import type { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MediaFilters } from '@/types/media-types';

type MetadataFiltersProps = {
  form: UseFormReturn<MediaFilters>;
  availableCameras: string[];
};

export function MetadataFilters({
  form,
  availableCameras,
}: MetadataFiltersProps) {
  return (
    <>
      {/* Media Type */}
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Media Type</FormLabel>
            <Select value={field.value || 'all'} onValueChange={field.onChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue>
                  {field.value === 'all' && 'All types'}
                  {field.value === 'image' && 'Images'}
                  {field.value === 'video' && 'Videos'}
                  {field.value === 'data' && 'Data files'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="data">Data files</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      {/* Camera Selection */}
      <FormField
        control={form.control}
        name="camera"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Camera</FormLabel>
            <Select value={field.value || 'all'} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Any Camera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Camera</SelectItem>
                {availableCameras.map((camera) => (
                  <SelectItem key={camera} value={camera}>
                    {camera}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      {/* Location Data */}
      <FormField
        control={form.control}
        name="hasLocation"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Location Data</FormLabel>
            <Select value={field.value || 'all'} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Location data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any file</SelectItem>
                <SelectItem value="yes">Has location</SelectItem>
                <SelectItem value="no">No location</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
    </>
  );
}
