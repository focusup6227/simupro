'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/supabase/error-emitter';
import type { DatabasePermissionError } from '@/supabase/errors';
import { toast } from '@/hooks/use-toast';

export function AppErrorListener() {
  useEffect(() => {
    const handleError = (err: DatabasePermissionError) => {
      console.error('[database]', err);
      const summary =
        err.message.length > 280 ? `${err.message.slice(0, 280)}…` : err.message;
      toast({
        variant: 'destructive',
        title: 'Could not load data',
        description: summary,
      });
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null;
}
