import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderMarkdownToHtml } from '../apps/web/src/lib/markdown/pipeline.mjs';

const defaultVaultRoot = process.env.MYBLOG_VAULT_ROOT || (process.platform === 'win32' ? 'E:/Vaults/Obsidian' : '/home/vault/obsidian-git');
const defaultSourceRootLabel = process.env.MYBLOG_RUNTIME_SOURCE_ROOT_LABEL || '/home/vault/obsidian-git';
const defaultOpenListRootLabel = process.env.MYBLOG_RUNTIME_OPENLIST_ROOT_LABEL || '/openlist/obsidian-git';
const sourceRootType = 'vault';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function buildRuntimeContentIndex(options = {}) {
  const rootDir = path.resolve(options.rootDir || repoRoot);
  const vaultRoot = path.resolve(options.vaultRoot || readArgValue('--vault') || defaultVaultRoot);
  const sourceRootLabel = options.sourceRootLabel || process.env.MYBLOG_RUNTIME_SOURCE_ROOT_LABEL || defaultSourceRootLabel;
  const openListRootLabel = options.openListRootLabel || process.env.MYBLOG_RUNTIME_OPENLIST_ROOT_LABEL || defaultOpenListRootLabel;
  const publicDataRoot = path.join(rootDir, 'public-data/runtime');
  const webPublicRoot = path.join(rootDir, 'apps/web/public/runtime');
  const generatedAt = options.generatedAt || new Date().toISOString();

  if (!fs.existsSync(vaultRoot)) {
    return reuseExistingRuntimeIndex({ rootDir, publicDataRoot, webPublicRoot, vaultRoot });
  }

  const projectedArticles = (
    await Promise.all(
      listMarkdownFiles(vaultRoot).map((absolutePath) => toRuntimeArticle(absolutePath, vaultRoot, sourceRootLabel, openListRootLabel))
    )
  )
    .filter(Boolean)
    .sort((a, b) => b.article.date.localeCompare(a.article.date) || a.article.title.localeCompare(b.article.title, 'zh-CN'));
  const articles = projectedArticles.map((item) => item.article);
  populateBacklinks(articles);
  const collections = buildKnowledgeCollections(articles);
  articles.forEach((article) => {
    article.detailPath = `articles/${article.id}.json`;
  });

  const index = {
    schemaVersion: 1,
    generatedAt,
    authority: {
      type: 'markdown-runtime-index',
      fileTruth: process.platform === 'win32' ? 'E:\\Vaults\\Obsidian' : '/home/vault/obsidian-git',
      authoringTruth: `${sourceRootLabel}`,
      publicFileAccess: `${openListRootLabel}`,
      projectionTruth: 'public-data/runtime/content-index.json'
    },
    stats: {
      articles: articles.length,
      collections: collections.length
    },
    collections,
    articles
  };

  const fullFiles = options.fullOutputFiles?.length
    ? options.fullOutputFiles.map((filePath) => path.resolve(filePath))
    : options.outputFiles?.length
      ? []
      : [path.join(publicDataRoot, 'content-index.json')];
  const publicFiles = options.publicOutputFiles?.length
    ? options.publicOutputFiles.map((filePath) => path.resolve(filePath))
    : options.outputFiles?.length
      ? options.outputFiles.map((filePath) => path.resolve(filePath))
      : [path.join(webPublicRoot, 'content-index.json')];

  fullFiles.forEach((filePath) => {
    writeJson(filePath, index);
    writeRuntimeProjectionPackage(path.dirname(filePath), index, { publicPayload: false });
  });
  publicFiles.forEach((filePath) => writePublicRuntimeIndex(filePath, index));

  console.log(`Built runtime content index with ${articles.length} MarkdownObject article(s).`);
  return {
    index,
    files: [...fullFiles, ...publicFiles],
    canonicalProjectionItems: projectedArticles.map((item) => item.canonicalProjection)
  };
}

if (isMain()) {
  buildRuntimeContentIndex().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

function reuseExistingRuntimeIndex({ rootDir, publicDataRoot, webPublicRoot, vaultRoot }) {
  const fullIndexPath = path.join(publicDataRoot, 'content-index.json');
  const publicIndexPath = path.join(webPublicRoot, 'content-index.json');
  const candidates = [fullIndexPath, publicIndexPath, path.join(rootDir, 'public/runtime/content-index.json')];
  const existingIndexPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!existingIndexPath) {
    const fallbackIndex = createEmptyRuntimeIndex();
    fs.mkdirSync(publicDataRoot, { recursive: true });
    fs.mkdirSync(webPublicRoot, { recursive: true });
    writeJson(fullIndexPath, fallbackIndex);
    writeRuntimeProjectionPackage(publicDataRoot, fallbackIndex, { publicPayload: false });
    writePublicRuntimeIndex(publicIndexPath, fallbackIndex);
    console.log(`Vault root not found and no existing runtime index is available: ${vaultRoot}`);
    console.log('Generated empty runtime content index for build fallback.');
    return { index: fallbackIndex, files: [fullIndexPath, publicIndexPath] };
  }

  fs.mkdirSync(publicDataRoot, { recursive: true });
  fs.mkdirSync(webPublicRoot, { recursive: true });

  if (existingIndexPath !== fullIndexPath) {
    fs.copyFileSync(existingIndexPath, fullIndexPath);
  }
  if (existingIndexPath !== publicIndexPath) {
    fs.copyFileSync(existingIndexPath, publicIndexPath);
  }

  console.log(`Vault root not found: ${vaultRoot}`);
  console.log(`Reusing existing runtime content index: ${path.relative(rootDir, existingIndexPath)}`);
  return {
    index: JSON.parse(fs.readFileSync(existingIndexPath, 'utf8')),
    files: [fullIndexPath, publicIndexPath]
  };
}

function createEmptyRuntimeIndex() {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    authority: {
      type: 'markdown-runtime-index',
      fileTruth: process.platform === 'win32' ? 'E:\\Vaults\\Obsidian' : '/home/vault/obsidian-git',
      authoringTruth: defaultSourceRootLabel,
      publicFileAccess: defaultOpenListRootLabel,
      projectionTruth: 'public-data/runtime/content-index.json',
      fallback: {
        reason: 'vault-unavailable',
        mode: 'empty-runtime-index'
      }
    },
    stats: {
      articles: 0,
      collections: 0
    },
    collections: [],
    articles: []
  };
}

async function toRuntimeArticle(
  absolutePath,
  vaultRoot,
  sourceRootLabel = defaultSourceRootLabel,
  openListRootLabel = defaultOpenListRootLabel
) {
  const relativePath = toSlash(path.relative(vaultRoot, absolutePath));
  if (isPrivatePath(relativePath)) return null;

  const source = fs.readFileSync(absolutePath, 'utf8');
  const fileStat = fs.statSync(absolutePath);
  const parsed = parseFrontmatter(source);
  const data = parsed ? parseYamlish(parsed.frontmatter) : {};
  const rawBody = parsed ? parsed.body : source;
  const relations = extractRelations(rawBody);
  const body = normalizeBody(rawBody, relativePath);
  if (!body.trim()) return null;

  const explicitPublished = readBoolean(data.published);
  const explicitlyUnpublished = readString(data.published).toLowerCase() === 'false';
  const draft = readBoolean(data.draft);
  const runtimeFeed = readBoolean(data.runtimeFeed);
  const kind = deriveKind(relativePath, data);
  const visibility = deriveVisibility(relativePath, data);
  const inDocsVault = true;
  const published = explicitPublished || inDocsVault;

  if (draft || explicitlyUnpublished || visibility !== 'public') return null;
  if (!hasPublishableBody(body) && !readString(data.summary) && !readString(data.description)) return null;

  const folderTags = getFolderTags(relativePath);
  const folder = deriveRuntimeFolder(relativePath);
  const title = readString(data.title) || path.basename(relativePath, path.extname(relativePath));
  const explicitSlug = readString(data.slug);
  const slugSource = explicitSlug || relativePath.replace(/\.[^.]+$/, '').replace(/\./g, '-');
  const slug = slugify(slugSource);
  const date = normalizeDate(readString(data.date), fileStat.mtime);
  const updated = normalizeDate(readString(data.updated), fileStat.mtime);
  const summary = readString(data.summary) || readString(data.description) || getExcerpt(body, 150);
  const project = deriveProject(relativePath, data);
  const explicitTags = readStringList(data.tags);
  const explicitCategories = readStringList(data.categories);
  const categories = unique(explicitCategories.length ? explicitCategories : deriveCategories(relativePath, kind, folderTags));
  const tags = unique([
    ...explicitTags,
    ...readStringList(data.keywords),
    ...readStringList(data.topics),
    ...folderTags,
    ...relations.wikilinks.map(slugify)
  ]);
  const sourcePath = `${sourceRootLabel.replace(/\/$/, '')}/${relativePath}`;
  const openlistPath = `${openListRootLabel.replace(/\/$/, '')}/${relativePath}`;
  const openlistUrl = readString(data.openlistUrl) || encodeUrlPath(openlistPath);
  const semantic = readSemanticSidecar(absolutePath, relativePath, sourceRootLabel, openListRootLabel);
  const derivedTaxonomy = {
    mode: 'filesystem-frontmatter-wikilink-derived',
    semanticAuthority: false,
    semanticSidecarStatus: semantic.status,
    categorySources: explicitCategories.length ? ['frontmatter.categories'] : ['filesystem.folderTags', 'kind'],
    tagSources: [
      ...(explicitTags.length ? ['frontmatter.tags'] : []),
      ...(readStringList(data.keywords).length ? ['frontmatter.keywords'] : []),
      ...(readStringList(data.topics).length ? ['frontmatter.topics'] : []),
      ...(folderTags.length ? ['filesystem.folderTags'] : []),
      ...(relations.wikilinks.length ? ['obsidian.wikilinks'] : [])
    ],
    folderTags,
    explicitTags,
    explicitCategories
  };
  const card = deriveCard({
    kind,
    categories,
    tags,
    folderTags,
    project,
    series: readString(data.series),
    title,
    summary
  });

  const article = {
    id: `md_${hash(sourcePath).slice(0, 12)}`,
    type: 'MarkdownObject',
    source: openlistUrl,
    sourcePath,
    sourceRoot: sourceRootType,
    openlistPath,
    openlistUrl,
    slug,
    title,
    summary,
    description: readString(data.description) || summary,
    date,
    updated,
    kind,
    folder,
    tags,
    categories,
    folderTags,
    derivedTaxonomy,
    semantic,
    series: readString(data.series),
    project,
    visibility,
    published,
    runtimeFeed,
    relations,
    card,
    projection: {
      feed: true,
      reader: true,
      search: true,
      graph: true
    },
    body,
    html: await renderMarkdownToHtml(body),
    toc: getRuntimeHeadings(body)
  };

  return {
    article,
    canonicalProjection: {
      articleId: article.id,
      sourceProvider: 'obsidian-vault',
      relativePath,
      sourcePath: relativePath,
      runtimeSourcePath: sourcePath,
      sourceUri: `obsidian://vault/obsidian-git/${relativePath}`,
      openlistPath,
      openlistUrl,
      sha256: hash(source),
      mtime: fileStat.mtime.toISOString(),
      frontmatter: data,
      rawBody,
      body,
      relations,
      article: {
        id: article.id,
        title,
        subtitle: readString(data.subtitle),
        kind,
        status: published ? 'active' : 'draft',
        summary,
        description: article.description,
        slug,
        date,
        updated,
        tags,
        categories,
        folder,
        series: article.series,
        project
      }
    }
  };
}

function deriveRuntimeFolder(relativePath) {
  const segments = relativePath.split('/').filter(Boolean);
  if (segments.length <= 1) {
    return {
      key: '__docs_root__',
      label: 'docs root',
      path: ''
    };
  }

  return {
    key: slugify(segments[0]) || '__docs_root__',
    label: segments[0],
    path: segments[0]
  };
}

function getRuntimeHeadings(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^(#{1,3})\s+(.+)$/))
    .filter(Boolean)
    .map((match) => ({
      depth: match[1].length,
      slug: slugify(match[2]),
      text: match[2].trim()
    }));
}

function readSemanticSidecar(absolutePath, relativePath, sourceRootLabel, openListRootLabel) {
  const sidecarAbsolutePath = absolutePath.replace(/\.mdx?$/i, '.semantic.json');
  const sidecarRelativePath = relativePath.replace(/\.mdx?$/i, '.semantic.json');
  const sidecarPath = `${sourceRootLabel.replace(/\/$/, '')}/${sidecarRelativePath}`;
  const openlistPath = `${openListRootLabel.replace(/\/$/, '')}/${sidecarRelativePath}`;
  const base = {
    status: 'missing',
    authority: false,
    source: 'sidecar',
    sidecarPath,
    openlistPath,
    openlistUrl: encodeUrlPath(openlistPath),
    rule: 'AI semantic metadata is projection sidecar only; never write back to Markdown/frontmatter.'
  };

  if (!fs.existsSync(sidecarAbsolutePath)) return base;

  try {
    const parsed = JSON.parse(fs.readFileSync(sidecarAbsolutePath, 'utf8'));
    return {
      ...base,
      status: 'active',
      generatedAt: readString(parsed.generatedAt),
      model: readString(parsed.model),
      entities: readSemanticList(parsed.entities),
      topics: readSemanticList(parsed.topics),
      relations: Array.isArray(parsed.relations) ? parsed.relations.slice(0, 80).map(sanitizeSemanticRelation) : [],
      collections: readSemanticList(parsed.collections),
      clusters: readSemanticList(parsed.clusters || parsed.similarityCluster)
    };
  } catch (error) {
    return {
      ...base,
      status: 'invalid',
      error: error.message
    };
  }
}

function readSemanticList(value) {
  if (!Array.isArray(value)) return [];
  return unique(value.map((item) => readString(typeof item === 'string' ? item : item?.name || item?.title || item?.label)).filter(Boolean)).slice(0, 80);
}

function sanitizeSemanticRelation(value) {
  if (!value || typeof value !== 'object') return {};
  return {
    type: readString(value.type),
    target: readString(value.target || value.to || value.id),
    label: readString(value.label),
    confidence: typeof value.confidence === 'number' ? value.confidence : undefined
  };
}

function populateBacklinks(articles) {
  const lookup = new Map();

  for (const article of articles) {
    [article.slug, article.title, article.project, getSourceBaseName(article.sourcePath || article.source)]
      .filter(Boolean)
      .forEach((value) => {
        lookup.set(slugify(value), article.id);
      });
  }

  for (const article of articles) {
    for (const target of article.relations.wikilinks) {
      const targetId = lookup.get(slugify(target));
      if (!targetId || targetId === article.id) continue;
      const targetArticle = articles.find((item) => item.id === targetId);
      if (!targetArticle) continue;
      targetArticle.relations.backlinks = unique([...targetArticle.relations.backlinks, article.id]);
    }
  }
}

function buildKnowledgeCollections(articles) {
  const collections = [];
  const folderGroups = new Map();
  const topicGroups = new Map();
  const seriesGroups = new Map();

  for (const article of articles) {
    const folder = article.folder || {
      key: article.folderTags?.[0] || '__docs_root__',
      label: article.folderTags?.[0] || 'docs root',
      path: article.folderTags?.[0] || ''
    };
    pushGroup(folderGroups, folder.key, {
      id: `collection:folder:${folder.key}`,
      title: folder.label,
      description: `Vault folder collection generated from ${folder.path || 'docs root'}.`,
      basis: 'folder',
      layout: 'feed',
      tags: [folder.label, ...article.card.chips],
      objects: [],
      source: {
        type: 'vault-folder',
        path: folder.path
      }
    }, article);

    if (article.series) {
      const key = slugify(article.series);
      pushGroup(seriesGroups, key, {
        id: `collection:series:${key}`,
        title: article.series,
        description: `Series collection generated from frontmatter series "${article.series}".`,
        basis: 'series',
        layout: 'timeline',
        tags: [article.series, ...article.card.chips],
        objects: [],
        source: {
          type: 'frontmatter-series',
          path: article.series
        }
      }, article);
    }

    for (const tag of unique([...article.categories, ...article.tags]).filter((tag) => slugify(tag) !== 'blog')) {
      const key = slugify(tag);
      pushGroup(topicGroups, key, {
        id: `collection:topic:${key}`,
        title: tag,
        description: `Topic collection generated from Runtime MarkdownObject metadata "${tag}".`,
        basis: 'topic',
        layout: 'magazine',
        tags: [tag],
        objects: [],
        source: {
          type: 'metadata-tag',
          path: tag
        }
      }, article);
    }
  }

  for (const group of [...folderGroups.values(), ...seriesGroups.values()]) {
    collections.push(finalizeCollection(group));
  }

  for (const group of topicGroups.values()) {
    if (group.objects.length >= 2) collections.push(finalizeCollection(group));
  }

  return collections.sort((a, b) => b.stats.objectCount - a.stats.objectCount || a.title.localeCompare(b.title, 'zh-CN'));
}

function pushGroup(groups, key, seed, article) {
  if (!key) return;
  const group = groups.get(key) || seed;
  group.objects.push(toObjectRef(article));
  group.tags = unique([...(group.tags || []), ...article.card.chips]);
  groups.set(key, group);
}

function finalizeCollection(group) {
  const latest = group.objects
    .map((object) => object.updated || object.date)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    id: group.id,
    type: 'KnowledgeCollection',
    title: group.title,
    description: group.description,
    basis: group.basis,
    source: group.source,
    objects: group.objects,
    relations: [],
    tags: unique(group.tags || []).slice(0, 12),
    layout: group.layout,
    projections: {
      home: true,
      graph: true,
      runtime: true,
      search: true
    },
    card: {
      eyebrow: `${String(group.basis).toUpperCase()} COLLECTION`,
      chips: unique(unique([group.basis, ...group.tags]).map(formatChip)).filter(Boolean).slice(0, 6),
      subtitle: `${group.objects.length} object${group.objects.length === 1 ? '' : 's'} in this knowledge collection.`
    },
    stats: {
      objectCount: group.objects.length,
      latestUpdated: latest || ''
    }
  };
}

function toObjectRef(article) {
  return {
    id: article.id,
    type: article.kind || 'post',
    title: article.title,
    slug: article.slug,
    href: `/posts/${article.slug}/`,
    date: article.date,
    updated: article.updated,
    summary: article.summary,
    chips: article.card.chips
  };
}

function getSourceBaseName(sourcePath) {
  return String(sourcePath).split('/').pop()?.replace(/\.[^.]+$/, '') || '';
}

function listMarkdownFiles(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listMarkdownFiles(absolutePath);
      return /\.mdx?$/i.test(entry.name) ? [absolutePath] : [];
    });
}

function isPrivatePath(relativePath) {
  const normalizedPath = toSlash(relativePath);
  const basename = path.basename(normalizedPath).toLowerCase();
  const generatedSegments = new Set([
    '_archive',
    'archive',
    'archives',
    'assets',
    'build',
    'dist',
    'evidence',
    'node_modules',
    'output',
    'outputs',
    'private',
    'runtime',
    'temp',
    'tmp'
  ]);

  if (/\.(recovered|backup|bak|tmp)\.mdx?$/i.test(basename)) {
    return true;
  }

  if (/\.(paper|pandoc|raw|generated|runtime)\.mdx?$/i.test(basename)) {
    return true;
  }

  return normalizedPath
    .split('/')
    .some((segment) => segment.startsWith('.') || generatedSegments.has(segment) || segment === 'drafts');
}

function deriveKind(relativePath, data) {
  const explicitKind = readString(data.kind);
  if (explicitKind) return normalizeKind(explicitKind);

  const firstSegment = relativePath.split('/')[0];
  const folderKindMap = {
    blog: 'post',
    posts: 'post',
    notes: 'note',
    note: 'note',
    papers: 'paper',
    paper: 'paper',
    '论文': 'paper',
    projects: 'project',
    project: 'project',
    '项目': 'project',
    books: 'book-note',
    book: 'book-note',
    '读书': 'book-note',
    codex: 'codex',
    architecture: 'codex'
  };

  return folderKindMap[firstSegment] || 'note';
}

function normalizeKind(value) {
  const normalized = slugify(value);
  if (['post', 'note', 'paper', 'project', 'book-note', 'codex'].includes(normalized)) return normalized;
  if (normalized === 'book' || normalized === 'booknote') return 'book-note';
  if (normalized === 'thesis' || normalized === '论文') return 'paper';
  return 'note';
}

function deriveVisibility(relativePath, data) {
  const explicitVisibility = slugify(readString(data.visibility));
  if (['public', 'private', 'draft'].includes(explicitVisibility)) return explicitVisibility;
  if (readBoolean(data.private)) return 'private';
  if (readBoolean(data.draft)) return 'draft';

  const segments = relativePath.split('/');
  if (segments.includes('private')) return 'private';
  if (segments.includes('drafts')) return 'draft';
  return 'public';
}

function deriveCategories(relativePath, kind, folderTags) {
  const firstFolder = folderTags[0];
  if (firstFolder) return [firstFolder];
  return [kind];
}

function deriveProject(relativePath, data) {
  const explicitProject = readString(data.project);
  if (explicitProject) return explicitProject;

  const series = readString(data.series);
  if (series) return series;

  const baseName = path.basename(relativePath, path.extname(relativePath));
  return baseName
    .replace(/[._-]?\d{4}[._-]\d{1,2}[._-]\d{1,2}$/g, '')
    .replace(/[._-]?\d{4}-\d{2}-\d{2}$/g, '')
    .replace(/[._-]+/g, ' ')
    .trim();
}

function deriveCard({ kind, categories, tags, folderTags, project, series, title, summary }) {
  const category = categories[0] || folderTags[0] || kind;
  const chips = unique([
    category,
    ...categories.slice(1),
    ...tags,
    project,
    series
  ])
    .map(formatChip)
    .filter(Boolean)
    .slice(0, 6);

  return {
    eyebrow: formatChip(category || kind) || 'MARKDOWNOBJECT',
    chips: chips.length ? chips : [formatChip(kind)],
    subtitle: summary || project || title
  };
}

function formatChip(value) {
  const cleaned = readString(value).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return /[a-z]/i.test(cleaned) ? cleaned.toUpperCase() : cleaned;
}

function extractRelations(markdown) {
  const wikilinks = [];
  const assets = [];

  markdown.replace(/!\[\[([^\]]+)\]\]/g, (_match, target) => {
    assets.push(cleanRelationTarget(target));
    return '';
  });

  markdown.replace(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g, (_match, target) => {
    wikilinks.push(cleanRelationTarget(target));
    return '';
  });

  markdown.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (_match, target) => {
    assets.push(cleanRelationTarget(target));
    return '';
  });

  return {
    wikilinks: unique(wikilinks.filter(Boolean)),
    backlinks: [],
    assets: unique(assets.filter(Boolean))
  };
}

function cleanRelationTarget(value) {
  return readString(value).split('#')[0].trim();
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;
  return { frontmatter: match[1], body: source.slice(match[0].length) };
}

function parseYamlish(frontmatter) {
  const lines = frontmatter.split(/\r?\n/);
  const data = {};
  let currentKey = '';

  for (const line of lines) {
    if (/^\s*-\s+/.test(line) && currentKey) {
      data[currentKey] ||= [];
      data[currentKey].push(stripQuotes(line.replace(/^\s*-\s+/, '').trim()));
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    currentKey = match[1];
    const value = match[2].trim();
    data[currentKey] = value ? stripQuotes(value) : [];
  }

  return data;
}

function normalizeBody(body, relativePath) {
  return body
    .replace(/!\[\[([^\]]+)\]\]/g, (_match, target) => `<!-- Runtime embed pending migration: ${relativePath} -> ${target} -->`)
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_match, target, label) => `[${label}](#${slugify(target)})`)
    .replace(/\[\[([^\]]+)\]\]/g, (_match, target) => `[${target}](#${slugify(target)})`)
    .trim();
}

function getFolderTags(relativePath) {
  const segments = relativePath.split('/').slice(0, -1);
  return segments.map((segment) => slugify(segment)).filter(Boolean);
}

function getExcerpt(markdown, maxLength) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_~|>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length <= maxLength ? text : `${text.slice(0, maxLength).trim()}...`;
}

function hasPublishableBody(markdown) {
  return getExcerpt(markdown, 1).length > 0;
}

function normalizeDate(value, fallback) {
  const date = value ? new Date(value) : fallback;
  if (Number.isNaN(date.getTime())) return fallback.toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function readArgValue(name) {
  const argv = process.argv.slice(2);
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : '';
}

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  return value.toLowerCase() === 'true';
}

function readStringList(value) {
  if (Array.isArray(value)) return value.map(readString).filter(Boolean);
  if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => stripQuotes(item.trim()))
      .filter(Boolean);
  }
  return [];
}

function stripQuotes(value) {
  return String(value).replace(/^['"]|['"]$/g, '');
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\\/g, '/')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function toSlash(value) {
  return value.replace(/\\/g, '/');
}

function encodeUrlPath(value) {
  return String(value)
    .split('/')
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
    .join('/');
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  JSON.parse(payload);
  writeFileAtomic(filePath, payload);
}

function writeFileAtomic(filePath, payload) {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );

  fs.writeFileSync(temporaryPath, payload, 'utf8');
  try {
    renameWithRetry(temporaryPath, filePath);
  } catch (error) {
    try {
      fs.rmSync(temporaryPath, { force: true });
    } catch {
      // Best effort cleanup only; preserve the original error.
    }
    throw error;
  }
}

function renameWithRetry(sourcePath, targetPath) {
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.renameSync(sourcePath, targetPath);
      return;
    } catch (error) {
      lastError = error;
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error?.code)) {
        throw error;
      }
      sleepSync(25 * (attempt + 1));
    }
  }

  if (process.platform === 'win32' && lastError?.code === 'EPERM') {
    fs.rmSync(targetPath, { force: true });
    fs.renameSync(sourcePath, targetPath);
    return;
  }

  throw lastError;
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function writePublicRuntimeIndex(filePath, index) {
  const articleDir = path.join(path.dirname(filePath), 'articles');
  fs.rmSync(articleDir, { recursive: true, force: true });
  fs.mkdirSync(articleDir, { recursive: true });

  const publicIndex = {
    ...index,
    stats: {
      ...index.stats,
      publicPayload: 'metadata-only',
      articleDetailPath: 'runtime/articles/{slug}.json'
    },
    articles: index.articles.map((article) => {
      const detailPath = article.detailPath || `articles/${article.id}.json`;
      writeJson(path.join(path.dirname(filePath), detailPath), {
        schemaVersion: index.schemaVersion,
        generatedAt: index.generatedAt,
        authority: index.authority,
        article
      });

      return {
        ...article,
        body: '',
        html: '',
        detailPath,
        readingMinutes: Math.max(1, Math.round(stripMarkdown(article.body).length / 320)),
        bodyBytes: Buffer.byteLength(article.body || '', 'utf8'),
        htmlBytes: Buffer.byteLength(article.html || '', 'utf8')
      };
    })
  };

  writeJson(filePath, publicIndex);
  writeRuntimeProjectionPackage(path.dirname(filePath), publicIndex, { publicPayload: true });
}

function writeRuntimeProjectionPackage(runtimeRoot, index, { publicPayload }) {
  const packageRoot = path.join(runtimeRoot, 'projection-package');
  fs.rmSync(packageRoot, { recursive: true, force: true });
  fs.mkdirSync(packageRoot, { recursive: true });

  const manifest = buildProjectionManifest(index, { publicPayload });
  const toc = buildProjectionToc(index);
  const anchorMap = buildProjectionAnchorMap(index);
  const assetMap = buildProjectionAssetMap(index);
  const searchChunks = buildProjectionSearchChunks(index, { publicPayload });
  const readerLayout = buildProjectionReaderLayout(index);
  const annotationsOverlay = buildProjectionAnnotationsOverlay(index);

  writeJson(path.join(packageRoot, 'manifest.json'), manifest);
  writeJson(path.join(packageRoot, 'toc.json'), toc);
  writeJson(path.join(packageRoot, 'anchor-map.json'), anchorMap);
  writeJson(path.join(packageRoot, 'asset-map.json'), assetMap);
  writeJson(path.join(packageRoot, 'search-chunks.json'), searchChunks);
  writeJson(path.join(packageRoot, 'reader-layout.json'), readerLayout);
  writeJson(path.join(packageRoot, 'annotations.overlay.json'), annotationsOverlay);
}

function buildProjectionManifest(index, { publicPayload }) {
  return {
    schemaVersion: 'myblog.projection-package.v1',
    generatedAt: index.generatedAt,
    sourceIndex: 'content-index.json',
    authority: {
      ...index.authority,
      type: 'projection-package',
      upstream: index.authority?.type || 'markdown-runtime-index',
      rule: 'This package is a derived projection artifact. It is not source truth, canonical AST storage, or a DataBase schema copy.'
    },
    payload: {
      public: Boolean(publicPayload),
      articleBodies: publicPayload ? 'detail-payloads' : 'inline',
      articleDetailPath: 'runtime/articles/{id}.json'
    },
    artifacts: {
      toc: 'toc.json',
      anchorMap: 'anchor-map.json',
      assetMap: 'asset-map.json',
      searchChunks: 'search-chunks.json',
      readerLayout: 'reader-layout.json',
      annotationsOverlay: 'annotations.overlay.json'
    },
    stats: {
      articles: Array.isArray(index.articles) ? index.articles.length : 0,
      collections: Array.isArray(index.collections) ? index.collections.length : 0,
      anchors: countProjectionAnchors(index),
      assets: countProjectionAssets(index),
      searchChunks: countProjectionSearchChunks(index)
    }
  };
}

function buildProjectionToc(index) {
  return {
    schemaVersion: 'myblog.toc.v1',
    generatedAt: index.generatedAt,
    documents: articlesOf(index).map((article) => ({
      documentId: article.id,
      slug: article.slug,
      title: article.title,
      href: `/posts/${article.slug}/`,
      detailPath: article.detailPath || `articles/${article.id}.json`,
      sections: normalizeToc(article)
    }))
  };
}

function buildProjectionAnchorMap(index) {
  return {
    schemaVersion: 'myblog.anchor-map.v1',
    generatedAt: index.generatedAt,
    anchors: articlesOf(index).flatMap((article) => {
      const documentAnchors = [{
        id: `${article.id}:document`,
        documentId: article.id,
        type: 'document',
        slug: article.slug,
        href: `/posts/${article.slug}/`,
        title: article.title,
        sourcePath: article.sourcePath,
        openlistPath: article.openlistPath
      }];

      const sectionAnchors = normalizeToc(article).map((section, sectionIndex) => ({
        id: `${article.id}:section:${section.id}`,
        documentId: article.id,
        type: 'section',
        sectionId: section.id,
        slug: article.slug,
        href: `/posts/${article.slug}/#${section.id}`,
        title: section.title,
        depth: section.depth,
        ordinal: sectionIndex + 1
      }));

      return [...documentAnchors, ...sectionAnchors];
    })
  };
}

function buildProjectionAssetMap(index) {
  return {
    schemaVersion: 'myblog.asset-map.v1',
    generatedAt: index.generatedAt,
    assets: articlesOf(index).flatMap((article) =>
      unique(article.relations?.assets || []).map((target) => ({
        id: `asset_${hash(`${article.id}:${target}`).slice(0, 16)}`,
        documentId: article.id,
        target,
        sourcePath: article.sourcePath,
        openlistPath: article.openlistPath,
        status: 'referenced',
        rule: 'Asset entries are references. Binary truth remains in the mounted file/blob backend.'
      }))
    )
  };
}

function buildProjectionSearchChunks(index, { publicPayload }) {
  return {
    schemaVersion: 'myblog.search-chunks.v1',
    generatedAt: index.generatedAt,
    chunks: articlesOf(index).flatMap((article) => {
      const base = {
        documentId: article.id,
        slug: article.slug,
        href: `/posts/${article.slug}/`,
        title: article.title,
        kind: article.kind,
        categories: article.categories || [],
        tags: article.tags || []
      };
      const summaryText = article.summary || article.description || '';
      const chunks = [{
        id: `${article.id}:summary`,
        ...base,
        anchorId: `${article.id}:document`,
        role: 'summary',
        text: summaryText
      }];

      if (!publicPayload && article.body) {
        splitSearchText(article.body).forEach((text, indexNumber) => {
          chunks.push({
            id: `${article.id}:body:${indexNumber + 1}`,
            ...base,
            anchorId: `${article.id}:document`,
            role: 'body',
            ordinal: indexNumber + 1,
            text
          });
        });
      }

      return chunks.filter((chunk) => chunk.text);
    })
  };
}

function buildProjectionReaderLayout(index) {
  return {
    schemaVersion: 'myblog.reader-layout.v1',
    generatedAt: index.generatedAt,
    documents: articlesOf(index).map((article) => ({
      documentId: article.id,
      slug: article.slug,
      title: article.title,
      href: `/posts/${article.slug}/`,
      detailPath: article.detailPath || `articles/${article.id}.json`,
      readingMinutes: Math.max(1, Math.round(stripMarkdown(article.body || article.summary || article.description || '').length / 320)),
      layoutHints: {
        reflowable: true,
        pageNumbersAreProjection: true,
        anchorStrategy: 'document-and-section-anchor',
        tocSource: 'section-tree-projection'
      }
    }))
  };
}

function buildProjectionAnnotationsOverlay(index) {
  return {
    schemaVersion: 'myblog.annotations-overlay.v1',
    generatedAt: index.generatedAt,
    authority: {
      owner: 'DataBase',
      intakeSchema: 'public-edit-intake.v1',
      rule: 'MyBlog can render annotation overlays and emit intake proposals, but canonical review and graph mutation belong to DataBase.'
    },
    overlays: articlesOf(index).map((article) => ({
      documentId: article.id,
      slug: article.slug,
      annotations: []
    }))
  };
}

function normalizeToc(article) {
  return (Array.isArray(article.toc) ? article.toc : []).map((heading, indexNumber) => ({
    id: heading.slug || `section-${indexNumber + 1}`,
    title: heading.text || `Section ${indexNumber + 1}`,
    depth: Number.isInteger(heading.depth) ? heading.depth : 1,
    ordinal: indexNumber + 1
  }));
}

function splitSearchText(text) {
  const clean = stripMarkdown(text);
  if (!clean) return [];
  const chunks = [];
  const chunkSize = 900;
  for (let index = 0; index < clean.length; index += chunkSize) {
    chunks.push(clean.slice(index, index + chunkSize).trim());
  }
  return chunks.filter(Boolean);
}

function articlesOf(index) {
  return Array.isArray(index?.articles) ? index.articles : [];
}

function countProjectionAnchors(index) {
  return articlesOf(index).reduce((total, article) => total + 1 + normalizeToc(article).length, 0);
}

function countProjectionAssets(index) {
  return articlesOf(index).reduce((total, article) => total + unique(article.relations?.assets || []).length, 0);
}

function countProjectionSearchChunks(index) {
  return buildProjectionSearchChunks(index, { publicPayload: false }).chunks.length;
}

function stripMarkdown(text) {
  return String(text ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_~>-]/g, ' ')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMain() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}
