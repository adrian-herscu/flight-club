import { useState, useEffect } from "react";
import { apiClient } from "@/services/apiClient";

/**
 * Custom hook for fetching data from API endpoints
 * Handles loading, error, and data state automatically
 *
 * Usage:
 * const { data, loading, error, refetch } = useApiData<Syllabus[]>("/api/v1/syllabuses");
 */
export function useApiData<T>(endpoint: string, options?: { skip?: boolean }) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (options?.skip) return;

    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.get<T>(endpoint);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [endpoint]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
