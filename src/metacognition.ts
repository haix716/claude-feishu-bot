/**
 * 元认知系统集成模块
 *
 * 连接飞书助手（执行层）和元认知系统（学习层）
 * - 读取元认知系统的洞察，供 AI 回复时参考（带缓存）
 * - 记录用户反馈，回流到元认知系统
 * - 推送每日洞察到飞书
 */

import fs from 'fs';
import path from 'path';

/** 元认知知识库路径 */
const METACOGNITION_BASE = path.join(
  __dirname,
  '..',
  '..',
  'claude-metacognition',
  'knowledge-base',
);

/** 用户反馈路径 */
const FEEDBACK_DIR = path.join(METACOGNITION_BASE, 'feedback');

/** 洞察结构 */
interface Insight {
  id: string;
  sourceId: string;
  insight: string;
  relevance: string;
  connection: string;
  score: number;
  domain: string;
  extractedAt: string;
}

// ==================== 缓存机制 ====================

/** 缓存的元认知上下文 */
let cachedContext: string | null = null;

/** 缓存时间 */
let cachedAt: number = 0;

/** 缓存有效期（1 小时） */
const CACHE_TTL = 60 * 60 * 1000;

/**
 * 读取最近的高价值洞察（带缓存）
 */
export function getRecentInsights(
  minScore: number = 7,
  limit: number = 10,
): Insight[] {
  const insightsDir = path.join(METACOGNITION_BASE, 'insights');
  if (!fs.existsSync(insightsDir)) {
    return [];
  }

  const insights: Insight[] = [];
  const domains = fs.readdirSync(insightsDir);

  for (const domain of domains) {
    const domainDir = path.join(insightsDir, domain);
    if (!fs.statSync(domainDir).isDirectory()) continue;

    const files = fs.readdirSync(domainDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const filepath = path.join(domainDir, file);
        const content = fs.readFileSync(filepath, 'utf-8');
        const insight = JSON.parse(content) as Insight;
        if (insight.score >= minScore) {
          insights.push(insight);
        }
      } catch {
        // skip invalid files
      }
    }
  }

  return insights
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * 读取最新的反思报告
 */
export function getLatestReflection(): string | null {
  const reflectionsDir = path.join(METACOGNITION_BASE, 'reflections');
  if (!fs.existsSync(reflectionsDir)) {
    return null;
  }

  const files = fs.readdirSync(reflectionsDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  return fs.readFileSync(path.join(reflectionsDir, files[0]), 'utf-8');
}

/**
 * 读取最新的日报
 */
export function getLatestDigest(): string | null {
  const digestDir = path.join(METACOGNITION_BASE, 'digest');
  if (!fs.existsSync(digestDir)) {
    return null;
  }

  const files = fs.readdirSync(digestDir)
    .filter(f => f.startsWith('daily-') && f.endsWith('.md'))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  return fs.readFileSync(path.join(digestDir, files[0]), 'utf-8');
}

/**
 * 生成元认知上下文（带缓存，1 小时刷新）
 */
export function generateMetacognitionContext(): string {
  const now = Date.now();

  // 缓存命中
  if (cachedContext && (now - cachedAt) < CACHE_TTL) {
    return cachedContext;
  }

  // 重新生成
  const insights = getRecentInsights(8, 5);

  if (insights.length === 0) {
    cachedContext = '';
    cachedAt = now;
    return '';
  }

  let context = '\n\n## 元认知系统最近学到的知识\n';
  context += '\n### 高价值洞察\n';
  for (const insight of insights) {
    context += `- [${insight.domain}] ${insight.insight}\n`;
  }

  cachedContext = context;
  cachedAt = now;

  console.log(`[元认知] 缓存已更新，${insights.length} 条洞察`);
  return context;
}

/**
 * 强制刷新缓存
 */
export function refreshCache(): void {
  cachedContext = null;
  cachedAt = 0;
  generateMetacognitionContext();
}

/**
 * 生成每日洞察摘要（用于推送到飞书）
 */
export function generateDailyInsightSummary(): string {
  const insights = getRecentInsights(7, 10);
  const date = new Date().toISOString().split('T')[0];

  if (insights.length === 0) {
    return `🧠 元认知日报 ${date}\n\n今天没有新的高价值洞察。`;
  }

  // 按领域分组
  const byDomain = new Map<string, Insight[]>();
  for (const insight of insights) {
    const existing = byDomain.get(insight.domain) || [];
    existing.push(insight);
    byDomain.set(insight.domain, existing);
  }

  let summary = `🧠 元认知日报 ${date}\n\n`;
  summary += `📊 今日采集 ${insights.length} 条高价值洞察，覆盖 ${byDomain.size} 个领域\n\n`;

  // Top 5 洞察
  summary += '📌 Top 5 洞察：\n';
  const top5 = insights.slice(0, 5);
  for (let i = 0; i < top5.length; i++) {
    const insight = top5[i];
    summary += `${i + 1}. [${insight.domain}] ${insight.insight}（${insight.score}分）\n`;
  }

  // 领域分布
  summary += '\n📈 领域分布：\n';
  for (const [domain, items] of byDomain) {
    summary += `- ${domain}：${items.length} 条\n`;
  }

  return summary;
}

/**
 * 记录用户反馈到元认知系统
 */
export function recordFeedback(
  userId: string,
  query: string,
  response: string,
  feedback: 'positive' | 'negative' | 'neutral',
  comment?: string,
): void {
  if (!fs.existsSync(FEEDBACK_DIR)) {
    fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString();
  const filename = `feedback-${date}.jsonl`;
  const filepath = path.join(FEEDBACK_DIR, filename);

  const entry = {
    timestamp,
    userId,
    query: query.substring(0, 500),
    response: response.substring(0, 500),
    feedback,
    comment,
  };

  fs.appendFileSync(filepath, JSON.stringify(entry) + '\n');
  console.log(`[元认知] 记录用户反馈: ${feedback}`);
}
