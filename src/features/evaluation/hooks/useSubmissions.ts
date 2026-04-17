import { useCallback, useEffect, useState } from 'react';
import type { ActivitySubmission } from '../evaluation.types';
import { submissionApi } from '../api/submission.api';

export function useMySubmissions() {
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await submissionApi.my();
      setSubmissions(items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando entregas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { submissions, isLoading, error, refresh, setSubmissions };
}

