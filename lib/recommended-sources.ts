export type RecommendedSource = {
  name: string;
  feedUrl: string;
  description: string;
  category: "AI 公司动态" | "AI 技术与开源" | "创业与产品";
};

export const recommendedSources: RecommendedSource[] = [
  {
    name: "OpenAI News",
    feedUrl: "https://openai.com/news/rss.xml",
    description: "OpenAI 官方新闻、产品更新、研究和公司动态。",
    category: "AI 公司动态"
  },
  {
    name: "Google AI",
    feedUrl: "https://blog.google/technology/ai/rss/",
    description: "Google 官方 AI 产品、研究和技术动态。",
    category: "AI 公司动态"
  },
  {
    name: "Hugging Face Blog",
    feedUrl: "https://huggingface.co/blog/feed.xml",
    description: "开源模型、数据集、AI 工程实践和社区项目。",
    category: "AI 技术与开源"
  },
  {
    name: "Latent Space",
    feedUrl: "https://www.latent.space/feed",
    description: "面向 AI 工程师和创业者的深度访谈与趋势分析。",
    category: "AI 技术与开源"
  },
  {
    name: "Y Combinator Blog",
    feedUrl: "https://www.ycombinator.com/blog/rss",
    description: "YC 官方创业方法论、公司故事和创始人观点。",
    category: "创业与产品"
  },
  {
    name: "TechCrunch AI",
    feedUrl: "https://techcrunch.com/category/artificial-intelligence/feed/",
    description: "AI 公司、产品、融资和行业新闻。",
    category: "创业与产品"
  },
  {
    name: "Hacker News",
    feedUrl: "https://hnrss.org/frontpage",
    description: "技术与创业社区的高频讨论和热门链接。",
    category: "创业与产品"
  }
];
