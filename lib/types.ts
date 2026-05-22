import type { Article, ReadingState, Source } from "@/lib/db/schema";

export type ArticleWithSource = Article & {
  source: Source;
  readingState: ReadingState | null;
};

export type ArticleListItem = {
  id: number;
  sourceId: number;
  title: string;
  url: string;
  author: string | null;
  summary: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  sourceName: string;
  sourceIconUrl: string | null;
  isRead: boolean;
  isBookmarked: boolean;
  readLater: boolean;
  isRelevant: number | null;
  relevanceScore: number | null;
  aiSummary: string | null;
  aiCategory: string | null;
  fetchStatus: string;
};
