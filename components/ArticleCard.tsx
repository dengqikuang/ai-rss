'use client';

import Link from 'next/link';
import { Bookmark, BookmarkCheck, Clock, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface ArticleCardProps {
  id: number;
  title: string;
  summary: string | null;
  sourceName: string;
  publishedAt: Date | string | null;
  isRead: boolean;
  isBookmarked: boolean;
  readLater: boolean;
  aiSummary: string | null;
  aiCategory: string | null;
  relevanceScore: number | null;
  fetchStatus: string;
  onToggleBookmark: () => void;
  onToggleReadLater: () => void;
}

export function ArticleCard({
  id,
  title,
  summary,
  sourceName,
  publishedAt,
  isRead,
  isBookmarked,
  readLater,
  aiSummary,
  aiCategory,
  relevanceScore,
  fetchStatus,
  onToggleBookmark,
  onToggleReadLater,
}: ArticleCardProps) {
  return (
    <div className={cn('article-card group relative', isRead && 'opacity-70')}>
      {/* Read indicator */}
      <div className="absolute -left-0.5 top-6">
        {isRead ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Circle className="h-4 w-4 text-indigo-400" />
        )}
      </div>

      <Link href={`/articles/${id}`} className="block pl-5">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {sourceName}
          </span>
          {aiCategory && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[11px]">
              {aiCategory}
            </span>
          )}
          {fetchStatus === 'pending' || fetchStatus === 'checking' ? (
            <span className="text-gray-400 text-[11px]">AI 分析中...</span>
          ) : null}
          {readLater && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Clock className="h-3 w-3" />
              稍后读
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mb-1.5 text-lg font-semibold leading-snug tracking-tight text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
          {title}
        </h3>

        {/* AI Recommendation */}
        {aiSummary && (
          <div className="mb-2 flex items-start gap-1.5 rounded-md bg-indigo-50/50 px-2.5 py-2 dark:bg-indigo-950/30">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
            <p className="text-sm leading-relaxed text-indigo-700/80 dark:text-indigo-300/80 line-clamp-2">
              {aiSummary}
            </p>
          </div>
        )}

        {/* Original Summary (fallback, when no AI summary yet) */}
        {!aiSummary && summary && (
          <p className="line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {summary}
          </p>
        )}
      </Link>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between pl-5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(publishedAt)}
          </span>
          {relevanceScore != null && relevanceScore > 0 && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              相关度 {relevanceScore}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleBookmark();
            }}
            className="btn-ghost rounded-full p-1.5"
            title={isBookmarked ? '取消收藏' : '收藏'}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleReadLater();
            }}
            className={cn(
              'btn-ghost rounded-full p-1.5',
              readLater && 'text-amber-600 dark:text-amber-400'
            )}
            title={readLater ? '移出稍后读' : '稍后读'}
          >
            <Clock className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
