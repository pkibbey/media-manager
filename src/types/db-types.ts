import type { PostgrestError } from '@supabase/supabase-js';

export type ActionResult<T> = {
  data: T | null;
  error: PostgrestError | null;
  count?: number | null;
  status?: number;
  statusText?: string;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
};

export type Action<T> = Promise<ActionResult<T>>;
