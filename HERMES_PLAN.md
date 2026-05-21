# AI Reader 项目实施计划

## 技术栈
- **框架:** Next.js 14+ (App Router) + TypeScript
- **样式:** Tailwind CSS
- **数据库:** SQLite (better-sqlite3 + Drizzle ORM)
- **内容抓取:** rss-parser + cheerio
- **部署:** Vercel 或自托管

## 功能需求
1. 订阅管理 — 添加/编辑/删除 RSS 源
2. 自动抓取 — 定时拉取最新文章
3. 阅读界面 — 杂志风格的沉浸式阅读
4. 收藏/标记 — 已读/收藏/稍后读
5. AI 摘要 — （可选）对文章做摘要

## 实施步骤
1. 初始化 Next.js 项目 + Tailwind
2. 配置 SQLite + Drizzle ORM schema
3. 实现 RSS 抓取后端 API
4. 实现文章列表和阅读页面
5. 实现订阅管理功能
6. 美化 UI（杂志风格）
7. 基础数据持久化

## 启动源（示例）
- https://karpathy.github.io/feed.xml
- https://www.anthropic.com/feed.xml
- 后续可添加更多
