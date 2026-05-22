'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, BookOpen, PlusCircle } from 'lucide-react';
import { ArticleCard } from '@/components/ArticleCard';
import { cn } from '@/lib/utils';

type Filter = 'ai_relevant' | 'all_raw' | 'unread' | 'bookmarked' | 'read_later';

interface ArticleItem {
  id: number;
  title: string;
  summary: string | null;
  sourceName: string;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  isRead: boolean;
  isBookmarked: boolean;
  readLater: boolean;
  aiSummary: string | null;
  aiCategory: string | null;
  relevanceScore: number | null;
  fetchStatus: string;
}

interface SourceItem {
  id: number;
  name: string;
}

const filters: { key: Filter; label: string; desc: string }[] = [
  { key: 'ai_relevant', label: 'AI 精选', desc: '只看 AI 筛选通过的好内容' },
  { key: 'all_raw', label: '全部来源', desc: '不过滤，显示全部抓取内容' },
  { key: 'unread', label: '未读', desc: '尚未读完的文章' },
  { key: 'bookmarked', label: '已收藏', desc: '手工标记收藏' },
  { key: 'read_later', label: '稍后读', desc: '留着以后看' },
];

export default function HomePage() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [filter, setFilter] = useState<Filter>('ai_relevant');
  const [sourceFilter, setSourceFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add URL modal
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [addUrlSource, setAddUrlSource] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);
  const [addUrlError, setAddUrlError] = useState<string | null>(null);
  const [addUrlSuccess, setAddUrlSuccess] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'ai_relevant') params.set('filter', filter);
      if (sourceFilter) params.set('source', String(sourceFilter));

      const res = await fetch(`/api/articles?${params}`);
      if (!res.ok) throw new Error('文章加载失败');
      const data = await res.json();
      setArticles(data.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '文章加载失败');
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

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUrl.trim()) return;

    try {
      setAddingUrl(true);
      setAddUrlError(null);
      setAddUrlSuccess(null);
      const res = await fetch('/api/articles/add-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: addUrl.trim(), sourceName: addUrlSource.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '添加失败');

      setAddUrl('');
      setAddUrlSource('');
      setShowAddUrl(false);
      setAddUrlSuccess(data.title ? `"${data.title}" 添加成功，AI 已完成分析` : '文章添加成功，AI 已完成分析');
      await loadArticles();
      setTimeout(() => setAddUrlSuccess(null), 5000);
    } catch (e) {
      setAddUrlError(e instanceof Error ? e.message : '添加失败');
    } finally {
      setAddingUrl(false);
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
        <h1 className="font-serif text-3xl font-bold tracking-tight">AI 创业情报台</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          汇集 AI 和创业信源，由 AI 为你筛选和推荐
        </p>
      </div>

      {/* Success / Error Toast */}
      {addUrlSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {addUrlSuccess}
          <button onClick={() => setAddUrlSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">&times;</button>
        </div>
      )}
      {addUrlError && !showAddUrl && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {addUrlError}
          <button onClick={() => setAddUrlError(null)} className="ml-auto text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

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
              title={f.desc}
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
            <option value="">全部信源</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowAddUrl(true)}
            className="btn-ghost"
          >
            <PlusCircle className="h-4 w-4" />
            添加链接
          </button>
          <button
            onClick={handleFetch}
            disabled={fetching}
            className="btn-primary"
          >
            <RefreshCw className={cn('h-4 w-4', fetching && 'animate-spin')} />
            {fetching ? '更新中...' : '更新内容'}
          </button>
        </div>
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
            重试
          </button>
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
            <BookOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {filter === 'ai_relevant' ? '暂无 AI 精选文章' : '暂无文章'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filter === 'ai_relevant'
              ? '先添加信源，再更新内容，AI 会自动为你筛选'
              : '先添加推荐信源，再更新内容开始阅读'}
          </p>
          <div className="mt-4 flex gap-2">
            <a href="/sources" className="btn-primary">
              添加信源
            </a>
            <button onClick={() => setShowAddUrl(true)} className="btn-ghost">
              粘贴链接
            </button>
          </div>
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

      {/* Add URL Modal */}
      {showAddUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowAddUrl(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">手动添加文章</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              贴入任意文章的链接，系统自动抓取全文并用 AI 筛选分析
            </p>
            <form onSubmit={handleAddUrl} className="space-y-3">
              <input
                type="url"
                value={addUrl}
                onChange={(e) => { setAddUrl(e.target.value); setAddUrlError(null); }}
                placeholder="https://example.com/article"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                autoFocus
              />
              <input
                type="text"
                value={addUrlSource}
                onChange={(e) => setAddUrlSource(e.target.value)}
                placeholder="来源名称（选填，如：某博客）"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              {addUrlError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  {addUrlError}
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUrl(false)}
                  className="btn-ghost"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!addUrl.trim() || addingUrl}
                  className="btn-primary"
                >
                  {addingUrl ? 'AI 正在分析中，请稍候...' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
