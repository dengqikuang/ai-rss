'use client';

import { useState, useEffect } from 'react';
import { Check, Plus, Trash2, RefreshCw, ExternalLink, Sparkles } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Source {
  id: number;
  name: string;
  url: string;
  feedUrl: string;
  description: string | null;
  iconUrl: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface RecommendedSource {
  name: string;
  feedUrl: string;
  description: string;
  category: string;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [recommendedSources, setRecommendedSources] = useState<RecommendedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [addingRecommended, setAddingRecommended] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const loadSources = async () => {
    try {
      const res = await fetch('/api/sources');
      if (!res.ok) throw new Error('信源加载失败');
      const data = await res.json();
      setSources(data.items ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendedSources = async () => {
    try {
      const res = await fetch('/api/sources/recommended');
      if (!res.ok) return;
      const data = await res.json();
      setRecommendedSources(data.items ?? []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSources();
    loadRecommendedSources();
  }, []);

  const addSource = async (source: { feedUrl: string; name?: string }) => {
    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || '添加信源失败');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedUrl.trim()) return;

    setAdding(true);
    setAddError(null);
    try {
      await addSource({
        feedUrl: feedUrl.trim(),
        name: name.trim() || undefined,
      });
      await loadSources();
      setFeedUrl('');
      setName('');
      setShowForm(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : '添加信源失败');
    } finally {
      setAdding(false);
    }
  };

  const handleAddRecommended = async (source: RecommendedSource) => {
    setAddingRecommended(source.feedUrl);
    try {
      await addSource({ feedUrl: source.feedUrl, name: source.name });
      await loadSources();
    } catch {
      // ignore
    } finally {
      setAddingRecommended(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    }
  };

  const handleFetchAll = async () => {
    setFetching(true);
    try {
      await fetch('/api/fetch', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setFetching(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">信源管理</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            管理你的 RSS 订阅源
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFetchAll}
            disabled={fetching || sources.length === 0}
            className="btn-ghost"
          >
            <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
            全部更新
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            添加信源
          </button>
        </div>
      </div>

      {/* Recommended sources */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            推荐 AI / 创业信源
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {recommendedSources.map((source) => {
            const added = sources.some((item) => item.feedUrl === source.feedUrl);
            return (
              <div
                key={source.feedUrl}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {source.name}
                    </h3>
                    <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                      {source.category}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddRecommended(source)}
                    disabled={added || addingRecommended === source.feedUrl}
                    className="btn-ghost shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {added ? (
                      <>
                        <Check className="h-4 w-4" />
                        已添加
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        {addingRecommended === source.feedUrl ? '添加中' : '添加'}
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {source.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add form */}
      {showForm && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold">添加新信源</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label htmlFor="feed-url" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                RSS Feed 地址 *
              </label>
              <input
                id="feed-url"
                type="url"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
                required
              />
            </div>
            <div>
              <label htmlFor="source-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                显示名称（可选）
              </label>
              <input
                id="source-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="留空则自动从 Feed 识别"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>

            {addError && (
              <p className="text-sm text-red-600 dark:text-red-400">{addError}</p>
            )}

            <div className="flex items-center gap-2">
              <button type="submit" disabled={adding} className="btn-primary">
                {adding ? '正在添加...' : '添加信源'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setAddError(null);
                }}
                className="btn-ghost"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sources list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="article-card">
              <div className="skeleton mb-2 h-5 w-40" />
              <div className="skeleton mb-1 h-3 w-full" />
              <div className="skeleton mt-3 h-3 w-24" />
            </div>
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
            <RefreshCw className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            暂无信源
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            添加 RSS Feed 后即可开始阅读
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">
            <Plus className="h-4 w-4" />
            添加第一个信源
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="article-card flex items-start justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {source.name}
                  </h3>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                {source.description && (
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {source.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Feed：{source.feedUrl.slice(0, 60)}...
                </p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  更新于 {formatDate(source.updatedAt)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(source.id)}
                className="btn-ghost ml-4 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                title="删除信源"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
