'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Source {
  id: number;
  name: string;
  url: string;
  feedUrl: string;
  description: string | null;
  iconUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const loadSources = async () => {
    try {
      const res = await fetch('/api/sources');
      if (!res.ok) throw new Error('Failed to load sources');
      const data = await res.json();
      setSources(data.items ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedUrl.trim()) return;

    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedUrl: feedUrl.trim(),
          name: name.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add source');
      }

      await loadSources();
      setFeedUrl('');
      setName('');
      setShowForm(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add source');
    } finally {
      setAdding(false);
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
          <h1 className="font-serif text-3xl font-bold tracking-tight">Sources</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your RSS feeds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFetchAll}
            disabled={fetching || sources.length === 0}
            className="btn-ghost"
          >
            <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
            Fetch All
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add Source
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold">Add New Source</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                RSS Feed URL *
              </label>
              <input
                type="url"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Display Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Auto-detected from feed"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>

            {addError && (
              <p className="text-sm text-red-600 dark:text-red-400">{addError}</p>
            )}

            <div className="flex items-center gap-2">
              <button type="submit" disabled={adding} className="btn-primary">
                {adding ? 'Adding...' : 'Add Source'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setAddError(null);
                }}
                className="btn-ghost"
              >
                Cancel
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
            No sources yet
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add RSS feeds to start reading
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">
            <Plus className="h-4 w-4" />
            Add Your First Source
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
                  Feed: {source.feedUrl.slice(0, 60)}...
                </p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  Updated {formatDate(source.updatedAt)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(source.id)}
                className="btn-ghost ml-4 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                title="Delete source"
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
