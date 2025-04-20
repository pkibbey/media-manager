'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterIcon, XIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

// Local storage key for saved filters
const SAVED_FILTERS_KEY = 'media-manager-saved-filters';

interface FilterOption {
  id: string;
  label: string;
  value: string | null;
  type: 'select' | 'range' | 'date' | 'toggle' | 'text';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

interface SavedFilter {
  id: string;
  name: string;
  params: URLSearchParams;
  dateCreated: string;
}

export function EnhancedFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // Filter configuration
  const filterOptions: FilterOption[] = useMemo(
    () => [
      {
        id: 'type',
        label: 'Media Type',
        value: searchParams.get('type'),
        type: 'select',
        options: [
          { value: 'all', label: 'All Types' },
          { value: 'image', label: 'Images' },
          { value: 'video', label: 'Videos' },
          { value: 'audio', label: 'Audio' },
          { value: 'document', label: 'Documents' },
        ],
      },
      {
        id: 'processed',
        label: 'Processing Status',
        value: searchParams.get('processed'),
        type: 'select',
        options: [
          { value: 'all', label: 'All Files' },
          { value: 'yes', label: 'Processed' },
          { value: 'no', label: 'Unprocessed' },
        ],
      },
      {
        id: 'hasLocation',
        label: 'Location Data',
        value: searchParams.get('hasLocation'),
        type: 'select',
        options: [
          { value: 'all', label: 'All Files' },
          { value: 'yes', label: 'Has Location' },
          { value: 'no', label: 'No Location' },
        ],
      },
      {
        id: 'hasThumbnail',
        label: 'Thumbnail',
        value: searchParams.get('hasThumbnail'),
        type: 'select',
        options: [
          { value: 'all', label: 'All Files' },
          { value: 'yes', label: 'Has Thumbnail' },
          { value: 'no', label: 'No Thumbnail' },
        ],
      },
      {
        id: 'hasExif',
        label: 'EXIF Data',
        value: searchParams.get('hasExif'),
        type: 'select',
        options: [
          { value: 'all', label: 'All Files' },
          { value: 'yes', label: 'Has EXIF' },
          { value: 'no', label: 'No EXIF' },
        ],
      },
      {
        id: 'sortBy',
        label: 'Sort By',
        value: searchParams.get('sortBy'),
        type: 'select',
        options: [
          { value: 'date', label: 'Date' },
          { value: 'name', label: 'Name' },
          { value: 'size', label: 'Size' },
          { value: 'type', label: 'Type' },
        ],
      },
      {
        id: 'sortOrder',
        label: 'Sort Order',
        value: searchParams.get('sortOrder'),
        type: 'select',
        options: [
          { value: 'desc', label: 'Descending' },
          { value: 'asc', label: 'Ascending' },
        ],
      },
    ],
    [searchParams],
  );

  // Load saved filters on mount
  useEffect(() => {
    const savedJson = localStorage.getItem(SAVED_FILTERS_KEY);
    if (savedJson) {
      try {
        const parsed = JSON.parse(savedJson) as SavedFilter[];
        setSavedFilters(parsed);
      } catch (error: any) {
        console.error('Failed to parse saved filters', error);
      }
    }
  }, []);

  // Update active filters whenever search params change
  useEffect(() => {
    const active = filterOptions
      .filter((filter) => {
        const value = searchParams.get(filter.id);
        return value && value !== 'all';
      })
      .map((filter) => filter.id);

    setActiveFilters(active);
  }, [searchParams, filterOptions]);

  // Apply a filter
  const applyFilter = useCallback(
    (id: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      params.set(id, value);
      router.push(`${pathname}?${params.toString()}`);
      setIsPopoverOpen(false);
    },
    [pathname, router, searchParams],
  );

  // Clear a filter
  const clearFilter = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams);
      params.delete(id);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  // Save current filters
  const saveCurrentFilters = useCallback(() => {
    if (!saveFilterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: saveFilterName,
      params: new URLSearchParams(searchParams),
      dateCreated: new Date().toISOString(),
    };

    const updatedFilters = [...savedFilters, newFilter];
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updatedFilters));
    setSavedFilters(updatedFilters);
    setSaveFilterName('');
    setSaveDialogOpen(false);
  }, [saveFilterName, savedFilters, searchParams]);

  // Apply a saved filter
  const applySavedFilter = useCallback(
    (filter: SavedFilter) => {
      router.push(`${pathname}?${filter.params.toString()}`);
    },
    [pathname, router],
  );

  // Delete a saved filter
  const deleteSavedFilter = useCallback(
    (id: string) => {
      const updatedFilters = savedFilters.filter((filter) => filter.id !== id);
      localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updatedFilters));
      setSavedFilters(updatedFilters);
    },
    [savedFilters],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {/* Filter trigger button */}
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <FilterIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters.length > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {activeFilters.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Tabs defaultValue="filters">
              <div className="border-b px-3">
                <TabsList className="mt-2">
                  <TabsTrigger value="filters">Filters</TabsTrigger>
                  <TabsTrigger value="saved">Saved Filters</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="filters" className="p-4 pt-2">
                <div className="space-y-4">
                  {filterOptions.map((filter) => (
                    <div key={filter.id} className="space-y-1">
                      <Label htmlFor={filter.id}>{filter.label}</Label>
                      {filter.type === 'select' && (
                        <Select
                          value={filter.value || 'all'}
                          onValueChange={(value) =>
                            applyFilter(filter.id, value)
                          }
                        >
                          <SelectTrigger id={filter.id}>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filter.options?.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}

                  <div className="flex justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSaveDialogOpen(true)}
                      disabled={activeFilters.length === 0}
                    >
                      Save Filters
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      disabled={activeFilters.length === 0}
                    >
                      Clear All
                    </Button>
                  </div>

                  {saveDialogOpen && (
                    <div className="border-t mt-4 pt-4">
                      <Label htmlFor="filterName">
                        Save current filters as:
                      </Label>
                      <div className="flex mt-2 gap-2">
                        <Input
                          id="filterName"
                          value={saveFilterName}
                          onChange={(e) => setSaveFilterName(e.target.value)}
                          placeholder="My filters"
                          className="flex-1"
                        />
                        <Button size="sm" onClick={saveCurrentFilters}>
                          Save
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="saved" className="p-4 pt-2">
                {savedFilters.length > 0 ? (
                  <div className="space-y-2">
                    {savedFilters.map((filter) => (
                      <div
                        key={filter.id}
                        className="flex items-center justify-between border rounded-md p-2"
                      >
                        <Button
                          variant="ghost"
                          className="h-auto py-1 justify-start flex-1"
                          onClick={() => applySavedFilter(filter)}
                        >
                          {filter.name}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => deleteSavedFilter(filter.id)}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>No saved filters yet</p>
                    <p className="text-xs">
                      Save your filters to quickly apply them later
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>

        {/* Active filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {activeFilters.map((filterId) => {
            const filter = filterOptions.find((f) => f.id === filterId);
            if (!filter) return null;

            const value = searchParams.get(filterId);
            const optionLabel = filter.options?.find(
              (o) => o.value === value,
            )?.label;

            return (
              <div
                key={filterId}
                className="bg-secondary text-secondary-foreground rounded-full px-2 py-1 text-xs flex items-center"
              >
                <span>
                  {filter.label}: {optionLabel || value}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => clearFilter(filterId)}
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </div>
            );
          })}

          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={clearAllFilters}
            >
              Clear all
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
