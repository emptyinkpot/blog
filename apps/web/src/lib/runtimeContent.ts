import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdownToHtml } from './markdown/pipeline';
export {
  formatRuntimeDate,
  getRuntimeArticleCard,
  getRuntimeArticleReadingMinutes,
  getRuntimeReadingTime,
  type RuntimeArticleCard
} from './runtimeArticleCard';

export type RuntimeMarkdownObject = {
  id: string;
  type: 'MarkdownObject';
  source: string;
  sourcePath?: string;
  sourceRoot?: 'vault';
  openlistPath?: string;
  openlistUrl?: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  date: string;
  updated: string;
  kind?: 'post' | 'note' | 'paper' | 'project' | 'book-note' | 'codex';
  folder?: {
    key: string;
    label: string;
    path: string;
  };
  tags: string[];
  categories: string[];
  folderTags?: string[];
  derivedTaxonomy?: {
    mode: 'filesystem-frontmatter-wikilink-derived' | string;
    semanticAuthority: false;
    semanticSidecarStatus?: 'missing' | 'active' | 'invalid' | string;
    categorySources: string[];
    tagSources: string[];
    folderTags: string[];
    explicitTags: string[];
    explicitCategories: string[];
  };
  semantic?: {
    status: 'missing' | 'active' | 'invalid' | string;
    authority: false;
    source: 'sidecar' | string;
    sidecarPath: string;
    openlistPath: string;
    openlistUrl: string;
    rule: string;
    generatedAt?: string;
    model?: string;
    entities?: string[];
    topics?: string[];
    relations?: Array<{
      type?: string;
      target?: string;
      label?: string;
      confidence?: number;
    }>;
    collections?: string[];
    clusters?: string[];
    error?: string;
  };
  series?: string;
  project?: string;
  visibility?: 'public' | 'private' | 'draft';
  published?: boolean;
  runtimeFeed?: boolean;
  relations?: {
    wikilinks: string[];
    backlinks: string[];
    assets: string[];
  };
  card?: RuntimeArticleCard;
  projection: {
    feed: boolean;
    reader: boolean;
    search: boolean;
    graph: boolean;
  };
  body: string;
  html?: string;
  toc?: RuntimeHeading[];
  detailPath?: string;
  readingMinutes?: number;
  bodyBytes?: number;
  htmlBytes?: number;
};

export type KnowledgeCollection = {
  id: string;
  type: 'KnowledgeCollection';
  title: string;
  description: string;
  basis: 'folder' | 'series' | 'topic' | string;
  source?: {
    type: string;
    path: string;
  };
  objects: Array<{
    id: string;
    type: string;
    title: string;
    slug?: string;
    href?: string;
    date?: string;
    updated?: string;
    summary?: string;
    chips?: string[];
  }>;
  relations: Array<unknown>;
  tags: string[];
  layout: 'feed' | 'gallery' | 'timeline' | 'graph' | 'column' | 'magazine' | string;
  projections: {
    home: boolean;
    graph: boolean;
    runtime: boolean;
    search: boolean;
  };
  card: RuntimeArticleCard;
  stats: {
    objectCount: number;
    latestUpdated: string;
  };
};

export type RuntimeContentIndex = {
  schemaVersion: number;
  generatedAt: string;
  authority: {
    type: string;
    fileTruth: string;
    authoringTruth: string;
    publicFileAccess?: string;
    projectionTruth: string;
  };
  stats: {
    articles: number;
    collections?: number;
  };
  collections?: KnowledgeCollection[];
  articles: RuntimeMarkdownObject[];
};

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const indexPath = findRuntimeIndexPath();

export function getRuntimeContentIndex(): RuntimeContentIndex {
  if (!fs.existsSync(indexPath)) {
    return {
      schemaVersion: 1,
      generatedAt: '',
      authority: {
        type: 'markdown-runtime-index',
        fileTruth: 'E:\\Vaults\\Obsidian',
        authoringTruth: '/home/vault/Obsidian/docs',
        publicFileAccess: '/openlist/Obsidian/docs',
        projectionTruth: 'public-data/runtime/content-index.json'
      },
      stats: { articles: 0 },
      articles: []
    };
  }

  return JSON.parse(fs.readFileSync(indexPath, 'utf8')) as RuntimeContentIndex;
}

export function getRuntimeArticles() {
  return getRuntimeContentIndex().articles.filter((article) => article.projection.feed);
}

export function getRuntimeArticleDetail(article: RuntimeMarkdownObject): RuntimeMarkdownObject {
  const detailPath = article.detailPath || `articles/${article.id}.json`;
  const detailFilePath = findRuntimeDetailPath(detailPath);
  if (!detailFilePath) return article;

  const detail = JSON.parse(fs.readFileSync(detailFilePath, 'utf8')) as { article?: RuntimeMarkdownObject };
  return detail.article ? { ...article, ...detail.article } : article;
}

export function getRuntimeCollections() {
  return (getRuntimeContentIndex().collections ?? []).filter((collection) => {
    if (collection.projections?.home === false) return false;
    if (collection.basis === 'topic') return false;
    return true;
  });
}

export function getRuntimeCollectionSlug(collection: KnowledgeCollection) {
  return slugify(collection.id.replace(/^collection:/, ''));
}

export function getRuntimeCollectionHref(collection: KnowledgeCollection) {
  return `/collections/${getRuntimeCollectionSlug(collection)}/`;
}

export function getRuntimeFolders() {
  const folders = new Map<string, { key: string; label: string; path: string; count: number }>();

  for (const article of getRuntimeArticles()) {
    const folder = article.folder || deriveRuntimeFolderFromArticle(article);
    const current = folders.get(folder.key) || { ...folder, count: 0 };
    current.count += 1;
    folders.set(folder.key, current);
  }

  return [...folders.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
}

export async function getRuntimeHtml(markdown: string) {
  return renderMarkdownToHtml(markdown);
}

export type RuntimeHeading = {
  depth: number;
  slug: string;
  text: string;
};

export function getRuntimeHeadings(markdown: string): RuntimeHeading[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^(#{1,3})\s+(.+)$/))
    .filter(Boolean)
    .map((match) => ({
      depth: match![1].length,
      slug: slugify(match![2]),
      text: match![2].trim()
    }));
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function deriveRuntimeFolderFromArticle(article: RuntimeMarkdownObject) {
  const source = article.openlistPath || article.sourcePath || article.source || '';
  const relative = source
    .replace(/^\/openlist\/Obsidian\/docs\/?/i, '')
    .replace(/^\/home\/vault\/Obsidian\/docs\/?/i, '')
    .replace(/^.*?\/docs\/?/i, '');
  const first = relative.split('/').filter(Boolean)[0] || '';
  return {
    key: first ? slugify(first) : '__docs_root__',
    label: first || 'docs root',
    path: first
  };
}

function findRuntimeIndexPath() {
  const candidates = [
    path.join(process.cwd(), 'public/runtime/content-index.json'),
    path.join(process.cwd(), 'apps/web/public/runtime/content-index.json'),
    path.join(moduleDir, '../../public/runtime/content-index.json'),
    path.join(process.cwd(), 'public-data/runtime/content-index.json'),
    path.join(process.cwd(), '../../public-data/runtime/content-index.json'),
    path.join(moduleDir, '../../../../public-data/runtime/content-index.json')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return candidates[0];
}

function findRuntimeDetailPath(detailPath: string) {
  const normalized = detailPath.replace(/^\/?runtime\//, '').replace(/^\/+/, '');
  const candidates = [
    path.join(process.cwd(), 'public/runtime', normalized),
    path.join(process.cwd(), 'apps/web/public/runtime', normalized),
    path.join(moduleDir, '../../public/runtime', normalized),
    path.join(process.cwd(), 'public-data/runtime', normalized),
    path.join(process.cwd(), '../../public-data/runtime', normalized),
    path.join(moduleDir, '../../../../public-data/runtime', normalized)
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}
