import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const appDir = 'apps/web';
const runtimeContentIndexPath = resolvePath('public-data/runtime/content-index.json');
const publicRuntimeContentIndexPath = resolvePath(`${appDir}/public/runtime/content-index.json`);
const runtimeProjectionPackagePath = resolvePath('public-data/runtime/projection-package');
const publicProjectionPackagePath = resolvePath(`${appDir}/public/runtime/projection-package`);
const rssPagePath = resolvePath(`${appDir}/src/pages/rss.xml.ts`);
const searchPagePath = resolvePath(`${appDir}/src/pages/search.astro`);
const issues = [];
const isCi = process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true';
const slugOwners = new Map();

validateRuntimeIndexJson(runtimeContentIndexPath, 'Runtime article index');
validateRuntimeIndexJson(publicRuntimeContentIndexPath, 'Public runtime article index');
validateRuntimeArticles();
validateRuntimeCollections();
validateProjectionPackage(runtimeProjectionPackagePath, 'Runtime projection package');
validateProjectionPackage(publicProjectionPackagePath, 'Public runtime projection package');
validateSiteSupportPages();

if (issues.length) {
  console.error(['Content governance validation failed:', ...issues.map((issue) => `- ${issue}`)].join('\n'));
  process.exit(1);
}

console.log('Content governance validation passed');

function validateRuntimeIndexJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    issues.push(`${label} is missing: ${path.relative(rootDir, filePath)}`);
    return;
  }

  try {
    JSON.parse(readText(filePath));
  } catch (error) {
    issues.push(`${label} must be valid JSON: ${error.message}`);
  }
}

function validateRuntimeArticles() {
  if (!fs.existsSync(runtimeContentIndexPath)) {
    issues.push('Runtime article index is missing: public-data/runtime/content-index.json');
    return;
  }

  const index = JSON.parse(readText(runtimeContentIndexPath));
  const publicPayload = index?.stats?.publicPayload === 'metadata-only';
  const articles = Array.isArray(index.articles) ? index.articles : [];

  if (!articles.length) {
    if (isAllowedCiRuntimeFallback(index)) return;
    issues.push('Runtime article index does not contain any articles');
    return;
  }

  articles.forEach((article, indexNumber) => {
    const label = article?.slug || article?.id || `article[${indexNumber}]`;

    if (article?.type !== 'MarkdownObject') {
      issues.push(`Runtime article must be a MarkdownObject: ${label}`);
    }

    if (!article?.slug) {
      issues.push(`Runtime article is missing slug: ${label}`);
    } else {
      recordUnique(slugOwners, article.slug, `Duplicate runtime article slug: ${article.slug}`);
    }

    if (!article?.title) {
      issues.push(`Runtime article is missing title: ${label}`);
    }

    if (!article?.summary && !article?.description) {
      issues.push(`Runtime article must provide summary or description: ${label}`);
    }

    if (!article?.date) {
      issues.push(`Runtime article is missing date: ${label}`);
    }

    if (!publicPayload && !article?.body && !article?.html) {
      issues.push(`Runtime article must provide body or html: ${label}`);
    }

    // Metadata-only public runtime indexes can be seeded from the live site in CI
    // or remote IDE worktrees without copying every article detail payload.

    if (article?.projection?.feed !== true) {
      issues.push(`Runtime article is not enabled for feed projection: ${label}`);
    }

    if (!article?.sourcePath) {
      issues.push(`Runtime article is missing sourcePath: ${label}`);
    }

    if (!article?.openlistPath) {
      issues.push(`Runtime article is missing openlistPath: ${label}`);
    } else if (!String(article.openlistPath).startsWith('/openlist/obsidian-git/')) {
      issues.push(`Runtime article openlistPath must use the public OpenList content bus: ${label}`);
    }

    if (!article?.openlistUrl) {
      issues.push(`Runtime article is missing openlistUrl: ${label}`);
    } else if (!String(article.openlistUrl).startsWith('/openlist/obsidian-git/')) {
      issues.push(`Runtime article openlistUrl must use the public OpenList content bus: ${label}`);
    }

    if (String(article?.source || '').startsWith('/home/vault')) {
      issues.push(`Runtime article source must not expose the Linux hot mirror path: ${label}`);
    }

    if (article?.sourceRoot !== 'vault') {
      issues.push(`Runtime article must declare sourceRoot=vault: ${label}`);
    }

    if (!['post', 'note', 'paper', 'project', 'book-note', 'codex'].includes(article?.kind)) {
      issues.push(`Runtime article has invalid kind: ${label}`);
    }

    if (!Array.isArray(article?.folderTags)) {
      issues.push(`Runtime article is missing folderTags array: ${label}`);
    }

    if (article?.derivedTaxonomy?.mode !== 'filesystem-frontmatter-wikilink-derived') {
      issues.push(`Runtime article must declare filesystem/frontmatter/wikilink derived taxonomy mode: ${label}`);
    }

    if (article?.derivedTaxonomy?.semanticAuthority !== false) {
      issues.push(`Runtime article derived taxonomy must not claim semantic authority: ${label}`);
    }

    if (!article?.semantic || article.semantic.authority !== false || article.semantic.source !== 'sidecar') {
      issues.push(`Runtime article semantic metadata must be a non-authoritative sidecar slot: ${label}`);
    }

    if (!['public', 'private', 'draft'].includes(article?.visibility)) {
      issues.push(`Runtime article has invalid visibility: ${label}`);
    }

    if (article?.visibility !== 'public') {
      issues.push(`Runtime article must not project private or draft content: ${label}`);
    }

    if (typeof article?.published !== 'boolean') {
      issues.push(`Runtime article is missing published boolean: ${label}`);
    }

    if (typeof article?.runtimeFeed !== 'boolean') {
      issues.push(`Runtime article is missing runtimeFeed boolean: ${label}`);
    }

    if (!article?.published) {
      issues.push(`Runtime article must be published by default docs projection or explicit published=true: ${label}`);
    }

    if (!article?.relations || !Array.isArray(article.relations.wikilinks) || !Array.isArray(article.relations.backlinks) || !Array.isArray(article.relations.assets)) {
      issues.push(`Runtime article is missing normalized relations: ${label}`);
    }

    if (!article?.card?.eyebrow || !Array.isArray(article.card.chips) || !article.card.chips.length || !article.card.subtitle) {
      issues.push(`Runtime article is missing derived card metadata: ${label}`);
    }
  });
}

function validateRuntimeCollections() {
  if (!fs.existsSync(runtimeContentIndexPath)) return;

  const index = JSON.parse(readText(runtimeContentIndexPath));
  const collections = Array.isArray(index.collections) ? index.collections : [];

  if (!collections.length) {
    if (isAllowedCiRuntimeFallback(index)) return;
    issues.push('Runtime content index must expose KnowledgeCollection projections');
    return;
  }

  collections.forEach((collection, indexNumber) => {
    const label = collection?.id || `collection[${indexNumber}]`;

    if (collection?.type !== 'KnowledgeCollection') {
      issues.push(`Runtime collection must be a KnowledgeCollection: ${label}`);
    }

    if (!collection?.title || !collection?.description) {
      issues.push(`Runtime collection is missing title or description: ${label}`);
    }

    if (!Array.isArray(collection?.objects) || !collection.objects.length) {
      issues.push(`Runtime collection must contain object refs: ${label}`);
    }

    if (!collection?.card?.eyebrow || !Array.isArray(collection.card.chips) || !collection.card.chips.length) {
      issues.push(`Runtime collection is missing derived card metadata: ${label}`);
    }

    if (collection?.projections?.home !== true || collection?.projections?.graph !== true || collection?.projections?.search !== true) {
      issues.push(`Runtime collection must declare home/graph/search projections: ${label}`);
    }
  });
}

function validateProjectionPackage(packagePath, label) {
  const artifactNames = [
    'manifest.json',
    'toc.json',
    'anchor-map.json',
    'asset-map.json',
    'search-chunks.json',
    'reader-layout.json',
    'annotations.overlay.json'
  ];

  if (!fs.existsSync(packagePath)) {
    issues.push(`${label} is missing: ${path.relative(rootDir, packagePath)}`);
    return;
  }

  const artifacts = new Map();
  for (const artifactName of artifactNames) {
    const artifactPath = path.join(packagePath, artifactName);
    if (!fs.existsSync(artifactPath)) {
      issues.push(`${label} artifact is missing: ${path.relative(rootDir, artifactPath)}`);
      continue;
    }

    try {
      artifacts.set(artifactName, JSON.parse(readText(artifactPath)));
    } catch (error) {
      issues.push(`${label} artifact must be valid JSON (${artifactName}): ${error.message}`);
    }
  }

  const manifest = artifacts.get('manifest.json');
  const toc = artifacts.get('toc.json');
  const anchorMap = artifacts.get('anchor-map.json');
  const searchChunks = artifacts.get('search-chunks.json');
  const readerLayout = artifacts.get('reader-layout.json');
  const annotationsOverlay = artifacts.get('annotations.overlay.json');

  if (!manifest) return;

  if (manifest.schemaVersion !== 'myblog.projection-package.v1') {
    issues.push(`${label} manifest has invalid schemaVersion`);
  }

  if (manifest.authority?.type !== 'projection-package') {
    issues.push(`${label} manifest must declare projection-package authority`);
  }

  if (manifest.authority?.upstream !== 'markdown-runtime-index') {
    issues.push(`${label} manifest must declare markdown-runtime-index as upstream`);
  }

  const articleCount = manifest.stats?.articles;
  if (!Number.isInteger(articleCount) || articleCount <= 0) {
    if (isAllowedCiProjectionFallback(manifest)) return;
    issues.push(`${label} manifest must report at least one article`);
  }

  if (toc && toc.documents?.length !== articleCount) {
    issues.push(`${label} toc document count must match manifest article count`);
  }

  if (!Array.isArray(anchorMap?.anchors) || !anchorMap.anchors.length) {
    if (isAllowedCiProjectionFallback(manifest)) return;
    issues.push(`${label} anchor-map must expose anchors`);
  }

  if (!Array.isArray(searchChunks?.chunks) || !searchChunks.chunks.length) {
    if (isAllowedCiProjectionFallback(manifest)) return;
    issues.push(`${label} search-chunks must expose chunks`);
  }

  if (readerLayout && readerLayout.documents?.length !== articleCount) {
    issues.push(`${label} reader-layout document count must match manifest article count`);
  }

  if (annotationsOverlay?.authority?.owner !== 'DataBase') {
    issues.push(`${label} annotations overlay must preserve DataBase as review/mutation authority`);
  }
}

function isAllowedCiRuntimeFallback(index) {
  return isCi && index?.authority?.fallback?.reason === 'vault-unavailable';
}

function isAllowedCiProjectionFallback(manifest) {
  return isCi && manifest?.authority?.fallback?.reason === 'vault-unavailable';
}

function validateSiteSupportPages() {
  if (!fs.existsSync(rssPagePath)) {
    issues.push(`RSS page is missing: ${appDir}/src/pages/rss.xml.ts`);
  } else {
    const rssSource = readText(rssPagePath);

    if (rssSource.includes('Site v2')) {
      issues.push('RSS metadata still uses the old Site v2 wording');
    }

    if (
      !rssSource.includes('description: post.data.description ?? post.data.summary ??') &&
      !rssSource.includes('description: article.description || article.summary')
    ) {
      issues.push('RSS feed is not yet reusing summary as the fallback description field');
    }
  }

  if (!fs.existsSync(searchPagePath)) {
    issues.push(`Search page is missing: ${appDir}/src/pages/search.astro`);
  } else {
    const searchSource = readText(searchPagePath);

    if (searchSource.includes('site-v2 的全文搜索页')) {
      issues.push('Search page description still uses the old site-v2 wording');
    }

    if (!searchSource.includes("withBase('/pagefind/pagefind-ui.css')") || !searchSource.includes("withBase('/pagefind/pagefind-ui.js')")) {
      issues.push('Search page is missing the expected Pagefind asset wiring');
    }
  }
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function resolvePath(relativePath) {
  return path.resolve(rootDir, relativePath);
}

function recordUnique(ownerMap, value, message) {
  if (ownerMap.has(value)) {
    issues.push(message);
    return;
  }

  ownerMap.set(value, true);
}
