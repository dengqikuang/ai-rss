'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, BookOpen } from 'lucide-react';
import { ArticleCard } from '@/components/ArticleCard';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'unread' | 'bookmarked' | 'read_later';

interface ArticleItem {
  id: number;
  title: string;
  summary: string | null;
  sourceName: string;
  publishedAt: Date | null;
  createdAt: Date;
  isRead: boolean;
  isBookmarked: boolean;
  readLater: boolean;
}

interface SourceItem {
  id: number;
  name: string;
}

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'bookmarked', label: 'Bookmarked' },
  { key: 'read_later', label: 'Read Later' },
];

export default function HomePage() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [sourceFilter, setSourceFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('filter', filter);
      if (sourceFilter) params.set('source', String(sourceFilter));

      const res = await fetch(`/api/articles?${params}`);
      if (!res.ok) throw new Error('Failed to load articles');
      const data = await res.json();
      setArticles(data.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [filter, sourceFilter]);

  const loadSources = useCallback(async () => {
    try {
      const res = await fetch('/api/sources');
      if (!res.ok) return;
      const data = await res.json();
      setSources(data.items ?? []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadArticles();
    loadSources();
  }, [loadArticles, loadSources]);

  const handleFetch = async () => {
    try {
      setFetching(true);
      await fetch('/api/fetch', { method: 'POST' });
      await loadArticles();
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  const toggleBookmark = async (article: ArticleItem) => {
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBookmarked: !article.isBookmarked }),
      });
      if (res.ok) {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === article.id ? { ...a, isBookmarked: !a.isBookmarked } : a
          )
        );
      }
    } catch {
      // ignore
    }
  };

  const toggleReadLater = async (article: ArticleItem) => {
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readLater: !article.readLater }),
      });
      if (res.ok) {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === article.id ? { ...a, readLater: !a.readLater } : a
          )
        );
      }
    } catch {
      // ignore
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Your Feed</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Stay updated with the latest from your sources
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                filter === f.key
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Source filter */}
        {sources.length > 0 && (
          <select
            value={sourceFilter ?? ''}
            onChange={(e) => setSourceFilter(e.target.value ? Number(e.target.value) : null)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={handleFetch}
          disabled={fetching}
          className="btn-primary ml-auto"
        >
          <RefreshCw className={cn('h-4 w-4', fetching && 'animate-spin')} />
          {fetching ? 'Fetching...' : 'Fetch New'}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="article-card">
              <div className="skeleton mb-2 h-4 w-20" />
              <div className="skeleton mb-2 h-6 w-full" />
              <div className="skeleton mb-1 h-4 w-3/4" />
              <div className="skeleton mt-3 h-3 w-24" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-red-50 p-4 dark:bg-red-950">
            <BookOpen className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={loadArticles} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
            <BookOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            No articles yet
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add sources and fetch to get started
          </p>
          <a href="/sources" className="btn-primary mt-4">
            Add Sources
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              {...article}
              onToggleBookmark={() => toggleBookmark(article)}
              onToggleReadLater={() => toggleReadLater(article)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
