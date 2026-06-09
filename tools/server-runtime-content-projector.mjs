import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import chokidar from 'chokidar';
import { buildRuntimeContentIndex } from './build-runtime-content-index.mjs';
import { readProjectFacts } from './project-facts.mjs';
import { projectObsidianMarkdown } from '../apps/admin-next/lib/database-gateway-client.mjs';

const projectFacts = readProjectFacts();
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vaultRoot = path.resolve(process.env.MYBLOG_VAULT_ROOT || projectFacts.paths.linuxVaultRoot);
const watchRoot = path.resolve(process.env.MYBLOG_VAULT_WATCH_ROOT || vaultRoot);
const runtimeIndexPath = path.resolve(process.env.MYBLOG_RUNTIME_INDEX_PATH || path.join(projectFacts.paths.productionSiteRoot, 'runtime/content-index.json'));
const sourceRootLabel = process.env.MYBLOG_RUNTIME_SOURCE_ROOT_LABEL || projectFacts.paths.linuxVaultRoot;
const openListRootLabel = process.env.MYBLOG_RUNTIME_OPENLIST_ROOT_LABEL || projectFacts.paths.openListRoot;
const debounceMs = Number(process.env.MYBLOG_RUNTIME_PROJECTOR_DEBOUNCE_MS || 3000);
const databaseProjectionEnabled = process.env.MYBLOG_DATABASE_CANONICAL_PROJECTION === '1';
readRequiredEnvWhenEnabled('MYBLOG_DATABASE_GATEWAY_URL');
const databaseProjectionActor = process.env.MYBLOG_DATABASE_PROJECTION_ACTOR || 'myblog-runtime-projector';
const databaseProjectionAuthorProfileId = process.env.MYBLOG_DATABASE_AUTHOR_PROFILE_ID || 'emptyinkpot_primary_author';

let timer = null;
let running = false;
let queued = false;
let changedFiles = new Set();

assertDirectory(vaultRoot, 'Vault root');
assertDirectory(watchRoot, 'Watch root');

console.log(`[runtime-content-projector] Vault root: ${vaultRoot}`);
console.log(`[runtime-content-projector] Watch root: ${watchRoot}`);
console.log(`[runtime-content-projector] Runtime index: ${runtimeIndexPath}`);
console.log(`[runtime-content-projector] Public OpenList root: ${openListRootLabel}`);
console.log(`[runtime-content-projector] DataBase canonical projection: ${databaseProjectionEnabled ? 'enabled' : 'disabled'}`);
console.log('[runtime-content-projector] This service only rewrites runtime projection artifacts. It never runs Astro build, Pagefind, deploy, scp or rsync.');

scheduleProjection('startup');

const watcher = chokidar.watch(watchRoot, {
  ignored: [
    /(^|[/\\])\../,
    /[/\\]node_modules[/\\]/,
    /[/\\]\.git[/\\]/,
    /[/\\]\.obsidian[/\\]/,
    /[/\\]private[/\\]/,
    /[/\\]drafts[/\\]/
  ],
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 250
  }
});

watcher.on('add', onFileChange);
watcher.on('change', onFileChange);
watcher.on('unlink', onFileChange);
watcher.on('error', (error) => {
  console.error(`[runtime-content-projector] Watch error: ${error.message}`);
});

function onFileChange(filePath) {
  if (!/\.mdx?$/i.test(filePath)) return;
  const relativePath = toSlash(path.relative(watchRoot, filePath));
  changedFiles.add(relativePath);
  scheduleProjection(relativePath);
}

function scheduleProjection(reason) {
  if (running) {
    queued = true;
    console.log(`[runtime-content-projector] Change queued during projection: ${reason}`);
    return;
  }

  if (timer) clearTimeout(timer);
  console.log(`[runtime-content-projector] Change detected: ${reason}`);
  timer = setTimeout(projectRuntimeIndex, debounceMs);
}

async function projectRuntimeIndex() {
  timer = null;
  running = true;
  queued = false;
  const files = Array.from(changedFiles);
  changedFiles = new Set();
  if (files.length) {
    console.log(`[runtime-content-projector] Rebuilding after ${files.length} markdown change(s).`);
  }

  try {
    const result = await buildRuntimeContentIndex({
      rootDir,
      vaultRoot,
      sourceRootLabel,
      openListRootLabel,
      outputFiles: [runtimeIndexPath]
    });
    if (databaseProjectionEnabled) {
      await projectCanonicalContent(result.canonicalProjectionItems || []);
    }
    console.log('[runtime-content-projector] Runtime projection artifacts refreshed.');
  } catch (error) {
    console.error(`[runtime-content-projector] Projection failed: ${error.message}`);
    if (databaseProjectionEnabled) process.exit(1);
  }

  running = false;
  if (queued || changedFiles.size > 0) scheduleProjection('queued changes');
}

function assertDirectory(directory, label) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    console.error(`[runtime-content-projector] ${label} not found: ${directory}`);
    process.exit(1);
  }
}

function readRequiredEnvWhenEnabled(name) {
  const value = process.env[name] || '';
  if (databaseProjectionEnabled && !value.trim()) {
    console.error(`[runtime-content-projector] ${name} is required when MYBLOG_DATABASE_CANONICAL_PROJECTION=1.`);
    process.exit(1);
  }
  return value.replace(/\/$/, '');
}

async function projectCanonicalContent(items) {
  if (!Array.isArray(items)) {
    throw new Error('Canonical projection items must be an array.');
  }

  for (const item of items) {
    const payload = toDataBaseProjectionEnvelope(item);
    const idempotencyKey = `myblog:obsidian:${item.sha256}:${item.articleId}`.slice(0, 191);
    const result = await projectObsidianMarkdown(payload, { idempotencyKey });
    const parsed = result || null;
    if (!parsed?.ok) {
      throw new Error(`DataBase canonical projection returned non-ok response for ${item.relativePath}.`);
    }
  }

  console.log(`[runtime-content-projector] DataBase canonical projection wrote ${items.length} article(s).`);
}

function toDataBaseProjectionEnvelope(item) {
  assertProjectionItem(item);
  const workId = `obsidian_work_${hashId(item.sourcePath)}`;
  const partId = `obsidian_part_${hashId(item.sourcePath)}`;

  return {
    requestId: `myblog-obsidian-${item.articleId}-${item.sha256.slice(0, 12)}`,
    actor: databaseProjectionActor,
    payload: {
      source: {
        provider: item.sourceProvider,
        sourcePath: item.sourcePath,
        sourceUri: item.sourceUri,
        sha256: item.sha256,
        mtime: item.mtime,
        frontmatter: item.frontmatter
      },
      work: {
        id: workId,
        kind: toDataBaseWorkKind(item.article.kind),
        title: item.article.title,
        subtitle: item.article.subtitle || undefined,
        status: item.article.status,
        authorProfileId: databaseProjectionAuthorProfileId,
        metadata: {
          myblogArticleId: item.articleId,
          sourcePath: item.sourcePath,
          runtimeSourcePath: item.runtimeSourcePath,
          openlistPath: item.openlistPath,
          openlistUrl: item.openlistUrl,
          slug: item.article.slug,
          summary: item.article.summary,
          description: item.article.description,
          tags: item.article.tags,
          categories: item.article.categories,
          folder: item.article.folder,
          series: item.article.series,
          project: item.article.project,
          date: item.article.date,
          updated: item.article.updated
        }
      },
      part: {
        id: partId,
        kind: 'article_section',
        partOrder: 1,
        title: item.article.title,
        status: item.article.status,
        metadata: {
          myblogArticleId: item.articleId,
          sourcePath: item.sourcePath,
          runtimeSourcePath: item.runtimeSourcePath,
          slug: item.article.slug
        }
      },
      assets: toDataBaseAssets(item),
      blocks: toDataBaseBlocks(item, workId, partId),
      relations: toDataBaseRelations(item, workId, partId)
    }
  };
}

function assertProjectionItem(item) {
  const required = ['articleId', 'sourceProvider', 'relativePath', 'sourcePath', 'sourceUri', 'sha256', 'mtime', 'body'];
  for (const key of required) {
    if (!item?.[key]) throw new Error(`Canonical projection item is missing ${key}.`);
  }
  if (!item.article?.title || !item.article?.kind) {
    throw new Error(`Canonical projection item is missing article identity for ${item.relativePath}.`);
  }
}

function toDataBaseAssets(item) {
  return (item.relations?.assets || []).map((assetTarget) => {
    const assetPath = toSlash(assetTarget);
    return {
      id: `obsidian_asset_${hashId(`${item.sourcePath}:${assetPath}`)}`,
      kind: 'markdown_asset',
      title: assetPath.split('/').pop() || assetPath,
      storageProvider: 'openlist',
      storageUri: assetPath.startsWith('/') ? assetPath : `${path.posix.dirname(item.openlistPath)}/${assetPath}`,
      metadata: {
        sourcePath: item.sourcePath,
        relationTarget: assetPath
      }
    };
  });
}

function toDataBaseBlocks(item) {
  const blocks = splitMarkdownBlocks(item.body).map((block, index) => ({
    id: `obsidian_block_${hashId(`${item.sourcePath}:${index + 1}:${block.text.slice(0, 80)}`)}`,
    kind: block.kind,
    blockOrder: index + 1,
    textContent: block.text,
    payload: {
      markdown: block.markdown,
      sourcePath: item.sourcePath
    }
  }));

  if (!blocks.length) {
    throw new Error(`Canonical projection item has no blocks: ${item.relativePath}`);
  }

  return blocks;
}

function splitMarkdownBlocks(markdown) {
  return String(markdown)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => ({
      kind: blockKind(block),
      markdown: block,
      text: stripMarkdown(block)
    }))
    .filter((block) => block.text);
}

function blockKind(block) {
  if (/^#{1,6}\s+/.test(block)) return 'heading';
  if (/^>\s?/m.test(block)) return 'quote';
  if (/^```/.test(block)) return 'code';
  if (/^[-*+]\s+/m.test(block) || /^\d+\.\s+/m.test(block)) return 'list';
  return 'paragraph';
}

function toDataBaseRelations(item, workId, partId) {
  const wikilinks = item.relations?.wikilinks || [];
  return wikilinks.map((target) => ({
    fromEntityType: 'content_part',
    fromEntityId: partId,
    relationType: 'references',
    toEntityType: 'obsidian_note',
    toEntityId: `obsidian_note_${hashId(target)}`,
    payload: {
      workId,
      target,
      sourcePath: item.sourcePath
    }
  }));
}

function toDataBaseWorkKind(kind) {
  const map = {
    post: 'blog_post',
    note: 'essay',
    paper: 'essay',
    project: 'manuscript',
    'book-note': 'essay',
    codex: 'manuscript'
  };
  const mapped = map[kind];
  if (!mapped) throw new Error(`Unsupported MyBlog article kind for DataBase projection: ${kind}`);
  return mapped;
}

function hashId(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
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

function toSlash(value) {
  return value.replace(/\\/g, '/');
}
