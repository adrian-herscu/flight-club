import { useState } from "react";
import { apiClient } from "@/services/apiClient";
import { showError } from "../toast";

interface MutationOptions<TData = any, TVariables = any> {
  onSuccess?: (data: TData) => void | Promise<void>;
  onError?: (error: Error) => void;
  showErrorAlert?: boolean;
  successMessage?: string;
}

/**
 * Custom hook for API mutations (POST, PATCH, DELETE)
 * Handles loading states, errors, and success callbacks
 *
 * Usage:
 * const { mutate, loading, error } = useApiMutation({
 *   onSuccess: () => refetch(),
 *   onError: (err) => console.error(err),
 *   successMessage: "Operation completed!",
 * });
 *
 * await mutate(() => apiClient.post('/api/v1/endpoint', data));
 */
export function useApiMutation<TData = any, TVariables = any>(
  options: MutationOptions<TData, TVariables> = {},
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (mutationFn: () => Promise<TData>): Promise<TData | null> => {
    try {
      setLoading(true);
      setError(null);

      const data = await mutationFn();

      if (options.onSuccess) {
        await options.onSuccess(data);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Operation failed";
      setError(errorMessage);

      if (options.onError) {
        options.onError(err as Error);
      } else if (options.showErrorAlert !== false) {
        showError(errorMessage);
      }

      return null;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
