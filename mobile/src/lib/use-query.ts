import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { api, ApiError } from "./api";

/** Loads `path` whenever the screen gains focus; supports pull-to-refresh. */
export function useQuery<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(path);
  latest.current = path;

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!path) return;
      if (mode === "refresh") setRefreshing(true);
      try {
        const result = await api<T>(path);
        if (latest.current === path) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [path],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { data, error, loading, refreshing, reload: () => load("refresh"), setData };
}
