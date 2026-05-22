/**
 * DeepSeek AI service — relevance checking and content summarization.
 * Uses OpenAI-compatible API: https://api.deepseek.com/v1
 */

const BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1";
const API_KEY = process.env.DEEPSEEK_API_KEY ?? "";
const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

interface AiResult {
  relevant: boolean;
  score: number; // 0-100
  summary: string;
  category: string;
}

async function chat(messages: { role: string; content: string }[], maxTokens = 1024) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

/**
 * Quick relevance check using title + summary (cheap — ~200 tokens).
 * Returns whether the article is about AI and/or personal entrepreneurship.
 */
export async function checkRelevance(
  title: string,
  summary: string
): Promise<{ relevant: boolean; score: number }> {
  if (!API_KEY) {
    console.warn("DEEPSEEK_API_KEY not set, treating all articles as relevant");
    return { relevant: true, score: 50 };
  }

  const prompt = `判断以下文章是否属于"AI/人工智能"或"个人创业/独立开发/产品思考"相关的内容。

标题：${title}
摘要：${summary}

请只返回 JSON，格式：{"relevant": true/false, "score": 0-100}
- relevant: 是否与 AI 或创业相关
- score: 相关度打分（0完全不相关，100高度相关）`;

  const text = await chat([{ role: "user", content: prompt }], 256);

  try {
    const json = JSON.parse(text.replace(/```json\s*|```/g, "").trim());
    return {
      relevant: Boolean(json.relevant),
      score: Math.max(0, Math.min(100, Number(json.score) || 50))
    };
  } catch {
    // If parsing fails, default to relevant
    return { relevant: true, score: 50 };
  }
}

/**
 * Deep reading: generates a recommendation note and category tags
 * after reading the full article content.
 */
export async function generateReadingNote(
  title: string,
  content: string
): Promise<{ summary: string; category: string }> {
  if (!API_KEY) {
    return {
      summary: "（AI 服务未配置，无法生成推荐理由）",
      category: "未分类"
    };
  }

  // Truncate content to avoid excessive tokens
  const truncated = content.slice(0, 8000);

  const prompt = `阅读以下文章，为读者生成推荐说明和分类标签。

文章标题：${title}
文章内容：
${truncated}

请返回 JSON，格式：{"summary": "...", "category": "..."}
- summary: 2-3 句话的推荐理由，说明文章核心观点和为什么值得读（中文，口语化）
- category: 从中选择一个：AI技术进展、AI产品与工具、创业经验、产品思考、行业趋势、其他`;

  const text = await chat([{ role: "user", content: prompt }], 512);

  try {
    const json = JSON.parse(text.replace(/```json\s*|```/g, "").trim());
    return {
      summary: String(json.summary || "值得一读").slice(0, 300),
      category: String(json.category || "其他").slice(0, 50)
    };
  } catch {
    return { summary: "值得一读", category: "其他" };
  }
}

/**
 * Full pipeline: check relevance first, then generate reading note.
 */
export async function analyzeArticle(
  title: string,
  summary: string,
  fullContent?: string
): Promise<AiResult> {
  // Step 1: relevance check
  const relevance = await checkRelevance(title, summary);

  if (!relevance.relevant) {
    return {
      relevant: false,
      score: relevance.score,
      summary: "",
      category: ""
    };
  }

  // Step 2: deep reading (use full content if available, otherwise summary)
  const contentToRead = fullContent || summary;
  const reading = await generateReadingNote(title, contentToRead);

  return {
    relevant: true,
    score: relevance.score,
    summary: reading.summary,
    category: reading.category
  };
}

/**
 * Check if the AI service is configured.
 */
export function isConfigured(): boolean {
  return Boolean(API_KEY);
}
