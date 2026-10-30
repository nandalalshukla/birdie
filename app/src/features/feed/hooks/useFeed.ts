import { useCallback, useEffect, useRef, useState } from 'react';

import { getFeed, getFeedStats, type FeedQuery, type FeedSighting, type FeedStats } from '../api';

/** Cursor-paginated community feed with pull-to-refresh and infinite scroll. */
export function useFeed(query: FeedQuery) {
  const [items, setItems] = useState<FeedSighting[]>([]);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(query);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const gen = ++generation.current;
    const q = JSON.parse(key) as FeedQuery;
    setRefreshing(true);
    try {
      const [page, s] = await Promise.all([getFeed(q), getFeedStats(q)]);
      if (gen !== generation.current) return;
      setItems(page.items);
      setCursor(page.next_cursor);
      setStats(s);
      setError(null);
    } catch (e) {
      if (gen === generation.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (gen === generation.current) setRefreshing(false);
    }
  }, [key]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || refreshing) return;
    const gen = generation.current;
    setLoadingMore(true);
    try {
      const page = await getFeed(JSON.parse(key) as FeedQuery, cursor);
      if (gen !== generation.current) return;
      setItems((prev) => [...prev, ...page.items.filter((i) => !prev.some((p) => p.id === i.id))]);
      setCursor(page.next_cursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, key, loadingMore, refreshing]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, stats, refreshing, loadingMore, hasMore: !!cursor, error, refresh, loadMore };
}
