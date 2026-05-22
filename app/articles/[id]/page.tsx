'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Clock,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface ArticleDetail {
  id: number;
  title: string;
  url: string;
  author: string | null;
  content: string | null;
  summary: string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  source: {
    id: number;
    name: string;
    url: string;
  };
  readingState: {
    isRead: boolean;
    isBookmarked: boolean;
    readLater: boolean;
    readAt: Date | string | null;
  } | null;
  aiSummary?: string | null;
  aiCategory?: string | null;
  relevanceScore?: number | null;
  rawHtml?: string | null;
  isRelevant?: number | null;
}

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params.id;
    if (!id) return;

    fetch(`/api/articles/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? '文章不存在' : '文章加载失败');
        const data = await res.json();
        setArticle(data);
        setError(null);

        // Mark as read
        if (!data.readingState?.isRead) {
          fetch(`/api/articles/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true }),
          }).catch(() => {});
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const updateState = async (updates: Record<string, boolean>) => {
    if (!article) return;
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const newState = await res.json();
        setArticle((prev) =>
          prev ? { ...prev, readingState: { ...prev.readingState!, ...newState } } : prev
        );
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="skeleton h-8 w-24" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-4 w-1/3" />
        <div className="space-y-3">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">
          {error || '文章不存在'}
        </p>
        <button onClick={() => router.back()} className="btn-primary mt-4">
          返回
        </button>
      </div>
    );
  }

  const rs = article.readingState;
  // Determine which content to show: scraped rawHtml > RSS content
  const displayContent = article.rawHtml || article.content;

  return (
    <article>
      {/* Back */}
      <Link
        href="/"
        className="btn-ghost -ml-2 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        返回订阅
      </Link>

      {/* AI Recommendation Bar */}
      {article.aiSummary && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-800 dark:bg-indigo-950/30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              AI 推荐
            </span>
            {article.aiCategory && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400">
                {article.aiCategory}
              </span>
            )}
            {article.relevanceScore != null && (
              <span className="text-xs text-indigo-400">
                相关度 {article.relevanceScore}%
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-indigo-600/80 dark:text-indigo-300/80">
            {article.aiSummary}
          </p>
        </div>
      )}

      {/* Meta */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {article.source.name}
        </span>
        {article.author && (
          <>
            <span>·</span>
            <span>{article.author}</span>
          </>
        )}
        <span>·</span>
        <span>{formatDate(article.publishedAt || article.createdAt)}</span>
      </div>

      {/* Title */}
      <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100">
        {article.title}
      </h1>

      {/* Actions */}
      <div className="mb-8 mt-4 flex items-center gap-2">
        <button
          onClick={() => updateState({ isBookmarked: !rs?.isBookmarked })}
          className={cn(
            'btn-ghost',
            rs?.isBookmarked && 'text-indigo-600 dark:text-indigo-400'
          )}
        >
          {rs?.isBookmarked ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
          {rs?.isBookmarked ? '已收藏' : '收藏'}
        </button>
        <button
          onClick={() => updateState({ readLater: !rs?.readLater })}
          className={cn(
            'btn-ghost',
            rs?.readLater && 'text-amber-600 dark:text-amber-400'
          )}
        >
          <Clock className="h-4 w-4" />
          {rs?.readLater ? '已加入稍后读' : '稍后读'}
        </button>
        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost ml-auto"
          >
            <ExternalLink className="h-4 w-4" />
            查看原文
          </a>
        )}
      </div>

      {/* Divider */}
      <div className="mb-8 border-t border-gray-200 dark:border-gray-800" />

      {/* Content */}
      {displayContent ? (
        <div
          className="prose prose-lg max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: displayContent }}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            暂无全文内容。{' '}
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                查看原文 &rarr;
              </a>
            )}
          </p>
        </div>
      )}
    </article>
  );
}
