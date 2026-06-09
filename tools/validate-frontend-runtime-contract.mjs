import fs from 'node:fs';

const requiredFiles = [
  'README.md',
  'project.json',
  'public-data/books/books.metadata.json',
  'public-data/books/books-index.json',
  'apps/web/public/public-data/books/books-index.json',
  'apps/web/src/pages/index.astro',
  'apps/web/src/lib/runtime/home-runtime.ts',
  'apps/web/src/lib/runtime/shell-runtime.ts',
  'apps/web/src/lib/runtime/shell-overlays.ts',
  'packages/runtime-kernel/src/events.ts',
  'packages/runtime-kernel/src/storage-keys.mjs'
];

const errors = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) errors.push(`Missing ${file}`);
}

const readText = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
const readJson = (file) => {
  try {
    return JSON.parse(readText(file) || '{}');
  } catch (error) {
    errors.push(`${file} is invalid JSON: ${error.message}`);
    return {};
  }
};

const readme = readText('README.md');
const project = readJson('project.json');
const index = readText('apps/web/src/pages/index.astro');
const runtimeBookFeed = readText('apps/web/src/components/books/RuntimeBookFeed.tsx');
const bookshelfGrid = readText('apps/web/src/components/books/BookshelfGrid.tsx');
const booksManifest = readText('apps/web/src/lib/books/manifest.ts');
const buildBooksIndex = readText('tools/build-books-index.mjs');
const booksMetadata = readJson('public-data/books/books.metadata.json');
const booksIndex = readJson('public-data/books/books-index.json');
const collectionDetail = readText('apps/web/src/pages/collections/[slug].astro');
const runtimeStorage = readText('packages/runtime-kernel/src/storage-keys.mjs');
const runtimeEvents = readText('packages/runtime-kernel/src/events.ts');
const homeRuntime = readText('apps/web/src/lib/runtime/home-runtime.ts');
const shellRuntime = readText('apps/web/src/lib/runtime/shell-runtime.ts');
const shellOverlays = readText('apps/web/src/lib/runtime/shell-overlays.ts');

if (project.knowledgeOsCore?.status !== 'active') {
  errors.push('project.json must declare knowledgeOsCore.status active');
}

const expectedTopology = ['Vault', 'Projection', 'Web Runtime', 'State Services'];
if (JSON.stringify(project.knowledgeOsCore?.topology ?? []) !== JSON.stringify(expectedTopology)) {
  errors.push('project.json knowledgeOsCore.topology must be Vault -> Projection -> Web Runtime -> State Services');
}

for (const term of [
  'Core topology: `Vault -> Projection -> Web Runtime -> State Services`',
  'npm run facts',
  'Runtime MarkdownObject article projection',
  'Astro plus React islands',
  'Local storage is preference/cache/legacy migration only'
]) {
  if (!readme.includes(term)) errors.push(`README.md must include: ${term}`);
}

for (const term of [
  'createRuntimeCommandDetail',
  'createRuntimeOverlayDetail',
  'createRuntimeDrawerOpenDetail',
  'mapLegacyReaderCommandToRuntimeIntent'
]) {
  if (!homeRuntime.includes(term)) errors.push(`home runtime adapter missing: ${term}`);
}

for (const term of [
  'createShellRuntimeOverlayDetail',
  'createShellRuntimeOverlayCloseDetail',
  'mapShellRuntimeCommandToOverlayIntent',
  'shellLegacyRuntimeBridges'
]) {
  if (!shellRuntime.includes(term)) errors.push(`shell runtime adapter missing: ${term}`);
}

for (const term of [
  'initOpenListShell',
  'initPinterestShell',
  'createShellRuntimeOverlayDetail',
  'mapShellRuntimeCommandToOverlayIntent'
]) {
  if (!shellOverlays.includes(term)) errors.push(`shell overlay runtime missing: ${term}`);
}

for (const term of [
  'runtime:command',
  'runtime:overlay-open',
  'runtime:overlay-close',
  'runtime:drawer-open',
  'runtime:drawer-close'
]) {
  if (!runtimeEvents.includes(term)) errors.push(`runtime event registry missing: ${term}`);
}

for (const forbidden of [
  'collection-only homepage',
  'collection page takeover',
  'drawer card wall'
]) {
  if (index.includes(forbidden)) errors.push(`Forbidden frontend pattern found: ${forbidden}`);
}

if (/const\s+feedItems\s*=\s*collectionFeedItems\s*;/.test(index)) {
  errors.push('Homepage feedItems must not be collection-only');
}

for (const feedSource of [
  'collectionFeedItems',
  'postItems',
  'noteItems',
  'projectItems',
  'RuntimeBookFeed',
  'musicFeedItems',
  'githubItems',
  'visualFeedItems'
]) {
  if (!index.includes(feedSource)) errors.push(`Homepage mixed feed source missing: ${feedSource}`);
}

for (const filter of ['all', 'collection', 'post', 'note', 'project', 'book', 'music', 'github', 'visual']) {
  if (!index.includes(`data-feed-filter="${filter}"`)) errors.push(`Homepage client-side feed tab missing: ${filter}`);
}

if (/<a[^>]+data-feed-filter=/.test(index)) {
  errors.push('Feed tabs with data-feed-filter must be buttons, not route links');
}

if (!index.includes('data-home-collection-session') || !index.includes('data-home-collection-body')) {
  errors.push('Collection drawer must keep ReaderSession body hooks');
}

if (!index.includes('data-home-collection-detail-url')) {
  errors.push('Collection drawer must switch active objects inside the drawer');
}

if (!runtimeBookFeed.includes('home-feed-card--book')) {
  errors.push('RuntimeBookFeed must preserve home-feed-card--book projection grammar');
}

if (!runtimeBookFeed.includes('buildCachedBookCoverUrl')) {
  errors.push('RuntimeBookFeed must preserve real cover projection URL fallback');
}

if (runtimeBookFeed.includes('listOpenListFiles(') || bookshelfGrid.includes('listOpenListFiles(')) {
  errors.push('Book UI must not live-list OpenList; it must read books-index.json');
}

if (!runtimeBookFeed.includes('loadBooksIndex()')) {
  errors.push('RuntimeBookFeed must load public books-index manifest');
}

if (!bookshelfGrid.includes('loadBooksIndex()')) {
  errors.push('BookshelfGrid must load public books-index manifest');
}

if (!booksManifest.includes('/public-data/books/books-index.json')) {
  errors.push('Book manifest loader must read /public-data/books/books-index.json');
}

if (!buildBooksIndex.includes('liveListForbidden: true') || !buildBooksIndex.includes('/Obsidian/docs/books/original')) {
  errors.push('Book index builder must encode canonical path and forbid live-list runtime semantics');
}

if (!buildBooksIndex.includes('books.metadata.json') || buildBooksIndex.includes('const overlays =')) {
  errors.push('Book metadata must live in public-data/books/books.metadata.json, not script-level overlays');
}

for (const forbiddenMetadataLiteral of ["category: '历史'", "category: '设计'", "category: '文学'", "category: '思想'"]) {
  if (buildBooksIndex.includes(forbiddenMetadataLiteral)) {
    errors.push(`Book index builder must not hard-code semantic metadata: ${forbiddenMetadataLiteral}`);
  }
}

if (booksMetadata?.authority !== 'metadata-layer') {
  errors.push('books.metadata.json must declare metadata-layer authority');
}

if (!Array.isArray(booksMetadata?.entries) || booksMetadata.entries.length < 1) {
  errors.push('books.metadata.json must contain editable metadata entries');
}

if (booksIndex?.source?.metadataAuthority !== 'sidecar-json') {
  errors.push('books-index.json must declare sidecar-json metadata authority');
}

if (booksIndex?.source?.liveListForbidden !== true) {
  errors.push('books-index.json must forbid live-list runtime semantics');
}

const storageLiteralPattern = /['"`](emptyinkpot-[A-Za-z0-9:-]+)['"`]/g;
const allowedNonStorageLiterals = new Set([
  'emptyinkpot-openlist-embed-style',
  'emptyinkpot:book-drawer-open',
  'emptyinkpot:book-drawer-close',
  'emptyinkpot:runtime-books-ready',
  'emptyinkpot:runtime-home-feed-ready'
]);
const registryLiterals = new Set([...runtimeStorage.matchAll(storageLiteralPattern)].map((match) => match[1]));
for (const [file, text] of [
  ['apps/web/src/pages/index.astro', index],
  ['apps/web/src/pages/knowledge/index.astro', readText('apps/web/src/pages/knowledge/index.astro')],
  ['apps/web/src/pages/visuals/index.astro', readText('apps/web/src/pages/visuals/index.astro')],
  ['apps/web/src/pages/settings.astro', readText('apps/web/src/pages/settings.astro')],
  ['apps/web/src/layouts/BaseLayout.astro', readText('apps/web/src/layouts/BaseLayout.astro')],
  ['apps/web/src/components/react/HoverPreviewSystem.tsx', readText('apps/web/src/components/react/HoverPreviewSystem.tsx')],
  ['apps/web/src/components/books/BookReader.tsx', readText('apps/web/src/components/books/BookReader.tsx')],
  ['apps/web/src/lib/myblog/plugins.mjs', readText('apps/web/src/lib/myblog/plugins.mjs')]
]) {
  for (const match of text.matchAll(storageLiteralPattern)) {
    const literal = match[1];
    if (allowedNonStorageLiterals.has(literal) || registryLiterals.has(literal)) continue;
    errors.push(`${file} uses unregistered emptyinkpot storage/event literal: ${literal}`);
  }
}

if (!Array.isArray(booksIndex?.books) || booksIndex.books.length < 15) {
  errors.push('books-index.json must preserve a stable public book manifest');
}

if (/allowGeneratedCover=\{false\}/.test(runtimeBookFeed)) {
  errors.push('RuntimeBookFeed must not disable generated cover projection on homepage book cards');
}

if (runtimeBookFeed.includes('loadBookSettings')) {
  errors.push('RuntimeBookFeed must not read browser-local book settings for public bookshelf projection');
}

for (const term of ['data-bookshelf-surface', 'data-book-projection="shelf"', 'bookshelf-mode-switch', 'bookshelf-reading-lane']) {
  if (!bookshelfGrid.includes(term)) errors.push(`BookshelfGrid must preserve Shelf Surface grammar: ${term}`);
}

if (bookshelfGrid.includes('loadBookSettings')) {
  errors.push('BookshelfGrid must not read browser-local book settings for public bookshelf projection');
}

if (!collectionDetail.includes('data-collection-bookshelf-projection') || !collectionDetail.includes('<BookshelfGrid client:load />')) {
  errors.push('Books collection route must project to BookshelfGrid Shelf Surface');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Knowledge OS core frontend guard passed');
