'use client';

import {
  AlertCircle,
  CheckCircle,
  Play,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import {
  fixThumbnailIssues,
  validateThumbnails,
} from '@/actions/thumbnails/validate-thumbnails';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ThumbnailValidator() {
  const [isValidating, setIsValidating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [fixResults, setFixResults] = useState<Record<string, string>>({});
  const [itemsToFix, setItemsToFix] = useState<string[]>([]);
  const [sampleSize, setSampleSize] = useState(100);

  // Run the validation
  const handleValidate = async () => {
    try {
      setIsValidating(true);
      const { data, error } = await validateThumbnails(sampleSize);

      if (error) {
        throw new Error(error.message);
      }

      setValidationResult(data);

      // Auto-select items to fix
      if (data?.inconsistencies) {
        const mediaIdsToFix = data.inconsistencies
          .filter((inc) => inc.mediaId !== 'system')
          .map((inc) => inc.mediaId);
        setItemsToFix(mediaIdsToFix);
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  // Fix selected inconsistencies
  const handleFix = async () => {
    if (itemsToFix.length === 0) return;

    try {
      setIsFixing(true);
      const { data, error } = await fixThumbnailIssues(itemsToFix);

      if (error) {
        throw new Error(error.message);
      }

      if (data?.results) {
        setFixResults(data.results);
      }

      // Re-run validation after fixing
      await handleValidate();
    } catch (error) {
      console.error('Fix error:', error);
    } finally {
      setIsFixing(false);
    }
  };

  // Calculate inconsistency percentage
  const getInconsistencyPercentage = () => {
    if (!validationResult?.totalChecked) return 0;
    return (
      (validationResult.inconsistencies.length /
        validationResult.totalChecked) *
      100
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Thumbnail State Validator
        </CardTitle>
        <CardDescription>
          Check for inconsistencies between thumbnail processing states and
          actual files
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Sample size:</span>
            <select
              className="rounded-md border p-1.5 text-sm"
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              disabled={isValidating}
            >
              <option value="50">50 items</option>
              <option value="100">100 items</option>
              <option value="200">200 items</option>
              <option value="500">500 items</option>
            </select>
          </div>

          <Button
            size="sm"
            onClick={handleValidate}
            disabled={isValidating || isFixing}
          >
            {isValidating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Validation
              </>
            )}
          </Button>

          {validationResult && validationResult.inconsistencies.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleFix}
              disabled={isValidating || isFixing || itemsToFix.length === 0}
            >
              {isFixing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Fixing {itemsToFix.length} issues...
                </>
              ) : (
                <>
                  <Wrench className="mr-2 h-4 w-4" />
                  Fix {itemsToFix.length} Issues
                </>
              )}
            </Button>
          )}
        </div>

        {/* Summary Results */}
        {validationResult && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                {validationResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
                <span>
                  {validationResult.success
                    ? `All ${validationResult.totalChecked} items validated successfully`
                    : `Found ${validationResult.inconsistencies.length} issues in ${validationResult.totalChecked} items`}
                </span>
              </div>
            </div>

            {!validationResult.success && (
              <>
                <div>
                  <div className="mb-2 text-sm flex items-center justify-between">
                    <span>
                      {getInconsistencyPercentage().toFixed(1)}% of items have
                      issues
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {validationResult.inconsistencies.length} of{' '}
                      {validationResult.totalChecked}
                    </span>
                  </div>
                  <Progress
                    value={getInconsistencyPercentage()}
                    className="h-2"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-3 rounded-md">
                    <h4 className="font-medium mb-2 text-sm">Issue Summary</h4>
                    <ul className="text-sm space-y-1">
                      <li className="flex justify-between">
                        <span>Missing thumbnail path:</span>
                        <span>
                          {validationResult.recordsMissingThumbnailPath}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Without actual file:</span>
                        <span>{validationResult.recordsWithoutActualFile}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Without processing state:</span>
                        <span>
                          {validationResult.recordsWithoutProcessingState}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>State success but no path:</span>
                        <span>{validationResult.stateSuccessButNoPath}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>State error but has path:</span>
                        <span>{validationResult.stateErrorButHasPath}</span>
                      </li>
                    </ul>
                  </div>

                  {Object.keys(fixResults).length > 0 && (
                    <div className="bg-muted/30 p-3 rounded-md">
                      <h4 className="font-medium mb-2 text-sm">Fix Results</h4>
                      <div className="text-sm max-h-32 overflow-auto space-y-1">
                        {Object.entries(fixResults).map(([id, result]) => (
                          <div
                            key={id}
                            className="flex justify-between gap-4 text-xs"
                          >
                            <span className="truncate opacity-80">{id}</span>
                            <span className="truncate font-mono">{result}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Detailed Issues Table */}
                {validationResult.inconsistencies.length > 0 && (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Issue</TableHead>
                          <TableHead>File Name</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validationResult.inconsistencies.map(
                          (inc: any, idx: number) => (
                            <TableRow key={`${inc.mediaId}-${idx}`}>
                              <TableCell>
                                <div className="text-sm">{inc.issue}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  ID: {inc.mediaId}
                                </div>
                              </TableCell>
                              <TableCell>{inc.fileName || 'N/A'}</TableCell>
                            </TableRow>
                          ),
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {validationResult.success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>All Good!</AlertTitle>
                <AlertDescription>
                  All {validationResult.totalChecked} thumbnail records are
                  consistent with their processing states.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
