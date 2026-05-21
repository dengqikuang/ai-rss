'use client';

import Link from 'next/link';
import { Bookmark, BookmarkCheck, Clock, CheckCircle2, Circle } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface ArticleCardProps {
  id: number;
  title: string;
  summary: string | null;
  sourceName: string;
  publishedAt: Date | null;
  isRead: boolean;
  isBookmarked: boolean;
  readLater: boolean;
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
          {readLater && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Clock className="h-3 w-3" />
              Later
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mb-1.5 text-lg font-semibold leading-snug tracking-tight text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
          {title}
        </h3>

        {/* Summary */}
        {summary && (
          <p className="line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {summary}
          </p>
        )}
      </Link>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between pl-5">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {formatDate(publishedAt)}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleBookmark();
            }}
            className="btn-ghost rounded-full p-1.5"
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
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
            title={readLater ? 'Remove from read later' : 'Read later'}
          >
            <Clock className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
