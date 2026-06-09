export type RuntimeArticleCard = {
  eyebrow: string;
  chips: string[];
  subtitle: string;
};

export type RuntimeArticleCardSource = {
  card?: RuntimeArticleCard;
  categories?: string[];
  kind?: string;
  tags?: string[];
  description?: string;
  summary?: string;
  readingMinutes?: number;
  bodyBytes?: number;
  body?: string;
};

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~\-[\]()`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getRuntimeArticleCard(article: RuntimeArticleCardSource): RuntimeArticleCard {
  if (article.card?.chips?.length) return article.card;

  const eyebrow = article.card?.eyebrow || article.categories?.[0] || article.kind || 'MarkdownObject';
  return {
    eyebrow,
    chips: [eyebrow, ...(article.tags ?? [])].filter(Boolean).slice(0, 6),
    subtitle: article.card?.subtitle || article.description || article.summary || ''
  };
}

export function formatRuntimeDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(date));
}

export function getRuntimeReadingTime(text: string) {
  const clean = stripMarkdown(text);
  return Math.max(1, Math.round(clean.length / 320));
}

export function getRuntimeArticleReadingMinutes(article: RuntimeArticleCardSource) {
  if (article.readingMinutes) return article.readingMinutes;
  if (article.bodyBytes) return Math.max(1, Math.round(article.bodyBytes / 960));
  return getRuntimeReadingTime(article.body || article.summary || article.description || '');
}
