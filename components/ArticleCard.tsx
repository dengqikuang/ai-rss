'use client';

import Link from 'next/link';
import { Bookmark, BookmarkCheck, Clock, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

const AI_KEYWORDS: Record<string, RegExp> = {
  'ChatGPT': /\bchatgpt\b/i,
  'GPT-4': /\bgpt[\s\-]?4o?\b/i,
  'GPT-5': /\bgpt[\s\-]?5\b/i,
  'Claude': /\bclaude\b/i,
  'Gemini': /\bgemini\b/i,
  'Llama': /\bllama\b/i,
  'Sora': /\bsora\b/i,
  'Midjourney': /\bmidjourney\b/i,
  'Stable Diffusion': /\bstable[\s\-]?diffusion\b/i,
  'DALL-E': /\bdall[\s\-]?e\b/i,
  'Copilot': /\bcopilot\b/i,
  'DeepSeek': /\bdeepseek\b/i,
  'Kimi': /\bkimi\b/i,
  '通义千问': /通义千问|qwen/i,
  '文心一言': /文心一言|ernie/i,
  'Cursor': /\bcursor\b/i,
  'Perplexity': /\bperplexity\b/i,
  'LLM': /\bllm\b|\blarge language model/i,
  'AIGC': /\baigc\b/i,
  'Agent': /\bagent\b/i,
  'RAG': /\brag\b|\bretrieval.?augmented/i,
  '多模态': /多模态|multi.?modal/i,
  'AI 搜索': /ai搜索|ai搜索引擎|\bai search/i,
  'AI 编程': /ai编程|ai写代码|coding copilot|代码助手/i,
  '具身智能': /具身智能|embodied ai/i,
  'AI 芯片': /ai芯片|gpu|nvidia|英伟达|tpu/i,
  'Fine-tuning': /fine.?tun|微调/i,
  'Prompt': /prompt engineering|提示词工程/i,
  'MCP': /\bmcp\b|model context protocol/i,
  'Reasoning': /\breasoning\b|推理模型|\bo[14]\b/i,
  'Diffusion': /\bdiffusion\b/i,
  'Transformers': /\btransformers?\b/i,
  'Voice AI': /voice ai|语音ai|tts|语音合成/i,
  'AI 视频': /ai视频|video ai|ai生成视频/i,
  'OpenAI': /\bopenai\b/i,
  'Anthropic': /\banthropic\b/i,
  'Google AI': /google ai|bard|google deepmind/i,
};

function extractTags(title: string, summary: string | null, aiSummary: string | null, aiCategory: string | null): string[] {
  const text = [title, summary, aiSummary, aiCategory].filter(Boolean).join(' ');
  const tags: string[] = [];
  for (const [tag, re] of Object.entries(AI_KEYWORDS)) {
    if (re.test(text)) tags.push(tag);
  }
  return tags.slice(0, 4);
}

interface ArticleCardProps {
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
  onToggleBookmark: () => void;
  onToggleReadLater: () => void;
}

export function ArticleCard({
  id,
  title,
  summary,
  sourceName,
  publishedAt,
  createdAt,
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

        {/* AI Topic Tags */}
        {(() => {
          const tags = extractTags(title, summary, aiSummary, aiCategory);
          return tags.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null;
        })()}

        {/* AI Recommendation */}
        {aiSummary && (
          <div className="mb-2 flex items-start gap-1.5 rounded-md bg-indigo-50/50 px-2.5 py-2 dark:bg-indigo-950/30">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
            <p className="text-sm leading-relaxed text-indigo-700/80 dark:text-indigo-300/80">
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
          <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            入库 {formatDate(createdAt)}
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
