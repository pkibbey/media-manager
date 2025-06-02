'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@radix-ui/react-checkbox';
import { Label } from '@radix-ui/react-label';
import { FilterX, Search } from 'lucide-react';
import { useState } from 'react';
import type { MediaFiltersType } from 'shared/types';

interface FileFiltersProps {
  filters: MediaFiltersType;
  onFilterChange: (filters: MediaFiltersType) => void;
}

export function MediaFilters({ filters, onFilterChange }: FileFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);

  const updateFilter = <K extends keyof MediaFiltersType>(
    key: K,
    value: MediaFiltersType[K],
  ) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchInput);
  };

  const resetFilters = () => {
    onFilterChange({
      search: '',
      category: 'all',
      hasExif: 'all',
      hasLocation: 'all',
      hasThumbnail: 'all',
      hasAnalysis: 'all',
      includeHidden: false,
      includeDeleted: false,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search files..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* File Type Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Type */}
        <div>
          <Label className="text-sm font-medium mb-1 block">
            File Type
            <Select
              value={filters.category}
              onValueChange={(value) =>
                updateFilter('category', value as MediaFiltersType['category'])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="data">Documents</SelectItem>
              </SelectContent>
            </Select>
          </Label>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 border-t pt-4">
        {/* Has EXIF */}
        <div>
          <Label className="text-sm font-medium mb-1 block">
            EXIF Data
            <Select
              value={filters.hasExif}
              onValueChange={(value) =>
                updateFilter('hasExif', value as MediaFiltersType['hasExif'])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Files" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="yes">With EXIF</SelectItem>
                <SelectItem value="no">Without EXIF</SelectItem>
              </SelectContent>
            </Select>
          </Label>
        </div>

        {/* Has Location */}
        <div>
          <Label className="text-sm font-medium mb-1 block">
            Location Data
            <Select
              value={filters.hasLocation}
              onValueChange={(value) =>
                updateFilter(
                  'hasLocation',
                  value as MediaFiltersType['hasLocation'],
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Files" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="yes">With Location</SelectItem>
                <SelectItem value="no">Without Location</SelectItem>
              </SelectContent>
            </Select>
          </Label>
        </div>

        {/* Has Thumbnail */}
        <div>
          <Label className="text-sm font-medium mb-1 block">
            Thumbnail Data
            <Select
              value={filters.hasThumbnail}
              onValueChange={(value) =>
                updateFilter(
                  'hasThumbnail',
                  value as MediaFiltersType['hasThumbnail'],
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Files" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="yes">With Thumbnail</SelectItem>
                <SelectItem value="no">Without Thumbnail</SelectItem>
              </SelectContent>
            </Select>
          </Label>
        </div>

        {/* Has Analysis */}
        <div>
          <Label className="text-sm font-medium mb-1 block">
            Analysis Data
            <Select
              value={filters.hasAnalysis}
              onValueChange={(value) =>
                updateFilter(
                  'hasAnalysis',
                  value as MediaFiltersType['hasAnalysis'],
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Files" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="yes">With Analysis</SelectItem>
                <SelectItem value="no">Without Analysis</SelectItem>
              </SelectContent>
            </Select>
          </Label>
        </div>
      </div>

      {/* Include Options */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t pt-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeHidden"
            checked={filters.includeHidden}
            onCheckedChange={(checked) =>
              updateFilter('includeHidden', Boolean(checked))
            }
          />
          <label
            htmlFor="includeHidden"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Include hidden files
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeDeleted"
            checked={filters.includeDeleted}
            onCheckedChange={(checked) =>
              updateFilter('includeDeleted', Boolean(checked))
            }
          />
          <label
            htmlFor="includeDeleted"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Include deleted files
          </label>
        </div>
      </div>

      {/* Reset Filters */}
      <div className="flex justify-end border-t pt-4">
        <Button
          variant="outline"
          onClick={resetFilters}
          className="flex items-center gap-1"
        >
          <FilterX className="h-4 w-4" />
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
