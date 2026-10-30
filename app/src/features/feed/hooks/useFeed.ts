import { useCallback, useEffect, useState } from 'react';

import { getFeed, getFeedStats, type FeedQuery, type FeedSighting, type FeedStats } from '../api';

type Loaded = {
  key: string;
  items: FeedSighting[];
  stats: FeedStats | null;
  cursor: string | null;
  error: string | null;
};

async function fetchFirstPage(key: string): Promise<Loaded> {
  const q = JSON.parse(key) as FeedQuery;
  try {
    const [page, stats] = await Promise.all([getFeed(q), getFeedStats(q)]);
    return { key, items: page.items, stats, cursor: page.next_cursor, error: null };
  } catch (e) {
    return { key, items: [], stats: null, cursor: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Cursor-paginated community feed with pull-to-refresh and infinite scroll. */
export function useFeed(query: FeedQuery) {
  const key = JSON.stringify(query);
  const [data, setData] = useState<Loaded | null>(null);
  const [pulling, setPulling] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // (Re)load whenever the query changes. Results for a stale query are ignored.
  useEffect(() => {
    let cancelled = false;
    void fetchFirstPage(key).then((loaded) => !cancelled && setData(loaded));
    return () => {
      cancelled = true;
    };
  }, [key]);

  const current = data?.key === key ? data : null;

  const refresh = useCallback(async () => {
    setPulling(true);
    const loaded = await fetchFirstPage(key);
    setData((prev) => (loaded.key === key ? loaded : prev));
    setPulling(false);
  }, [key]);

  const loadMore = useCallback(async () => {
    if (!current?.cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getFeed(JSON.parse(key) as FeedQuery, current.cursor);
      setData((prev) =>
        prev && prev.key === key
          ? {
              ...prev,
              items: [...prev.items, ...page.items.filter((i) => !prev.items.some((p) => p.id === i.id))],
              cursor: page.next_cursor,
            }
          : prev,
      );
    } catch (e) {
      setData((prev) => (prev ? { ...prev, error: e instanceof Error ? e.message : String(e) } : prev));
    } finally {
      setLoadingMore(false);
    }
  }, [current?.cursor, key, loadingMore]);

  return {
    items: current?.items ?? [],
    stats: current?.stats ?? null,
    error: current?.error ?? null,
    refreshing: pulling || current === null,
    loadingMore,
    hasMore: !!current?.cursor,
    refresh,
    loadMore,
  };
}
