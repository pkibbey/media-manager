'use client';

import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getProcessingStates,
  type ProcessingStatesResponse,
  type ProcessingStateWithMedia,
} from './processing-states';

export function ProcessingStatesViewer() {
  const [loading, setLoading] = useState(true);
  const [processingStates, setProcessingStates] = useState<
    ProcessingStateWithMedia[]
  >([]);
  const [counts, setCounts] = useState<ProcessingStatesResponse['counts']>();
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const ITEMS_PER_PAGE = 10;
  const PROCESSING_TYPES = ['exif', 'thumbnail'];

  // Function to fetch processing states
  const fetchProcessingStates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getProcessingStates({
        status: selectedStatus || undefined,
        type: selectedType || undefined,
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
      });

      if (!response.success) {
        // Updated to handle the new standardized Action<T> format
        setError(response.error || 'Failed to fetch processing states');
        return;
      }

      setProcessingStates(response?.data || []);
      setCounts(response.counts); // Adjust to get counts from data
      setError(null);
    } catch (err) {
      setError('An error occurred while fetching processing states');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedStatus, selectedType]);

  // Fetch processing states on mount and when filters change
  useEffect(() => {
    fetchProcessingStates();
  }, [fetchProcessingStates]);

  // Get the status icon
  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'failure':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case null:
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return null;
    }
  };

  // Get status badge color
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'failure':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case null:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'complete':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300';
    }
  };

  // Format timestamp
  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Truncate error message for display
  const truncateMessage = (message: string, maxLength = 100) => {
    if (!message) return '';
    return message.length > maxLength
      ? `${message.substring(0, maxLength)}...`
      : message;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Processing States Monitor</CardTitle>
        <CardDescription>
          View and analyze processing states, including success and failed
          states
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <Card className="p-3">
            <p className="text-xs font-medium">Failure</p>
            <p className="text-2xl font-bold text-red-600">
              {counts?.failure || 0}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs font-medium">Processing</p>
            <p className="text-2xl font-bold text-yellow-600">
              {counts?.processing || 0}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs font-medium">Success</p>
            <p className="text-2xl font-bold text-green-600">
              {counts?.success || 0}
            </p>
          </Card>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col gap-4 mb-4 sm:flex-row">
          <div className="flex-1">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {PROCESSING_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button onClick={fetchProcessingStates}>Refresh</Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded mb-4 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Processing states table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Loading processing states...
                    </div>
                  </TableCell>
                </TableRow>
              ) : processingStates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No processing states found
                  </TableCell>
                </TableRow>
              ) : (
                processingStates.map((state) => (
                  <TableRow key={state.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(state.status)}
                        <Badge className={getStatusColor(state.status)}>
                          {state.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{state.type}</TableCell>
                    <TableCell>
                      {state.media_item_id || 'Unknown file'}
                    </TableCell>
                    <TableCell>
                      {state.processed_at
                        ? formatDateTime(state.processed_at)
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <span title={state.error_message || 'No message'}>
                        {truncateMessage(state.error_message || 'No message')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="mx-2">Page {currentPage}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={processingStates.length < ITEMS_PER_PAGE}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
