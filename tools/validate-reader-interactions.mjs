import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const issues = [];

const indexPath = 'apps/web/src/pages/index.astro';
const globalCssPath = 'apps/web/src/styles/global.css';

const index = readText(indexPath);
const globalCss = readText(globalCssPath);

validateRuntimeDetailLoading();
validateCodeBlockTools();
validateReaderFeedback();
validateTocAutoReveal();
validateInlineScriptAwaitBoundary();
validateReaderInteractionStyles();
validateReaderLayoutContract();

if (issues.length) {
  console.error(['Reader interaction validation failed:', ...issues.map((issue) => `- ${issue}`)].join('\n'));
  process.exit(1);
}

console.log('Reader interaction validation passed');

function validateRuntimeDetailLoading() {
  [
    'const renderRuntimeDetailSkeleton = (body) =>',
    'body.dataset.loadState = \'loading\'',
    'class="reader-skeleton"',
    'renderRuntimeDetailSkeleton(body)',
    'body.dataset.loadState = \'loaded\''
  ].forEach((needle) => {
    if (!index.includes(needle)) issues.push(`runtime detail loading contract missing: ${needle}`);
  });

  if (!/renderRuntimeDetailSkeleton\(body\);\s*try\s*\{\s*const detail = await readRuntimeDetail\(detailUrl\);/s.test(index)) {
    issues.push('runtime detail skeleton must render before readRuntimeDetail(detailUrl)');
  }
}

function validateCodeBlockTools() {
  [
    'const getReaderCodeLanguage = (block) =>',
    'const createReaderCodeToolbar = (language) =>',
    'const enhanceReaderCodeBlocks = (root) =>',
    'figure[data-rehype-pretty-code-figure]',
    'data-reader-code-copy',
    'navigator.clipboard.writeText(text)',
    'enhanceReaderCodeBlocks(body)'
  ].forEach((needle) => {
    if (!index.includes(needle)) issues.push(`reader code block contract missing: ${needle}`);
  });

  const copyHandlerPattern = /drawerBody\?\.addEventListener\('click',\s*async\s*\(event\)\s*=>\s*\{[\s\S]*?data-reader-code-copy[\s\S]*?await navigator\.clipboard\.writeText\(text\)/;
  if (!copyHandlerPattern.test(index)) {
    issues.push('reader code copy handler must be an async drawerBody click listener');
  }
}

function validateReaderFeedback() {
  [
    'const showReaderToast = (message) =>',
    'data-reader-toast',
    'role\', \'status\'',
    'aria-live\', \'polite\'',
    'showReaderToast(\'代码已复制\')',
    'showReaderToast(exists ? \'已取消收藏\' : \'已收藏\')',
    'showReaderToast(\'选中文本已复制\')',
    'showReaderToast(\'已标记\')'
  ].forEach((needle) => {
    if (!index.includes(needle)) issues.push(`reader feedback contract missing: ${needle}`);
  });
}

function validateTocAutoReveal() {
  [
    'let activeLink = null',
    'const revealPadding = 20',
    'toc.scrollTop -= tocRect.top + revealPadding - linkRect.top',
    'toc.scrollTop += linkRect.bottom - (tocRect.bottom - revealPadding)'
  ].forEach((needle) => {
    if (!index.includes(needle)) issues.push(`TOC auto-reveal contract missing: ${needle}`);
  });

  if (index.includes('activeLink.scrollIntoView')) {
    issues.push('TOC auto-reveal must not call activeLink.scrollIntoView because it can move the reader drawer');
  }
}

function validateInlineScriptAwaitBoundary() {
  const listenerPattern = /addEventListener\([^,]+,\s*(async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{[\s\S]*?\n\s*\}\);/g;
  for (const match of index.matchAll(listenerPattern)) {
    const listener = match[0];
    if (listener.includes('await ') && !/addEventListener\([^,]+,\s*async\s/.test(listener)) {
      issues.push(`event listener contains await without async near: ${compact(listener).slice(0, 180)}`);
    }
  }
}

function validateReaderInteractionStyles() {
  [
    '.reader-code-block',
    '.reader-code-tools',
    '.reader-code-language',
    '.reader-code-copy',
    '--docs-reader-code-panel',
    '--docs-reader-code-keyword',
    '--docs-reader-code-string',
    '--docs-reader-code-function',
    '--docs-reader-code-number',
    '--docs-reader-code-comment',
    '.token.keyword',
    '.token.string',
    '.reader-skeleton',
    '@keyframes reader-skeleton-pulse',
    '.reader-toast',
    '.reader-toast.is-visible'
  ].forEach((needle) => {
    if (!globalCss.includes(needle)) issues.push(`reader interaction style missing: ${needle}`);
  });

  for (const block of globalCss.matchAll(/[^{}]*\.reader-code-(?:block|tools|copy|language)[^{]*\{[^{}]*\}/g)) {
    if (/(?:#[0-9a-fA-F]{3,6}|rgba?\(|hsla?\()/.test(block[0])) {
      issues.push('reader code tool styles should use docs-reader variables instead of introducing a separate color truth');
    }
  }

  [
    'background: color-mix(in srgb, var(--docs-reader-note)',
    'background: color-mix(in srgb, var(--docs-reader-tip)',
    'background: color-mix(in srgb, var(--docs-reader-warning)',
    'background: color-mix(in srgb, var(--docs-reader-danger)',
    'color: var(--docs-reader-code-text) !important'
  ].forEach((forbidden) => {
    if (globalCss.includes(forbidden)) issues.push(`reader style must not keep flattened/decorative code or callout styling: ${forbidden}`);
  });
}

function validateReaderLayoutContract() {
  [
    '--docs-reader-width: clamp(760px, 58vw, 840px)',
    '--docs-reader-toc-width: clamp(168px, 16vw, 220px)',
    '--docs-reader-gap: clamp(24px, 3vw, 44px)',
    '--docs-reader-shell-width: calc(var(--docs-reader-width) + var(--docs-reader-gap) + var(--docs-reader-toc-width))',
    'grid-template-columns: minmax(0, var(--docs-reader-width)) var(--docs-reader-toc-width)',
    'justify-content: center',
    '.home-article-toc {\n  order: 2',
    'border-left: 1px solid var(--docs-reader-border)',
    'max-height: calc(100dvh - 120px)',
    '.home-article-content {\n  order: 1',
    'min-width: 0',
    'width: min(var(--docs-reader-width), 100%)',
    'margin: 38px auto 0'
  ].forEach((needle) => {
    if (!globalCss.includes(needle)) issues.push(`reader right-TOC layout contract missing: ${needle}`);
  });

  [
    'grid-template-columns: var(--docs-reader-toc-width) minmax(0, var(--docs-reader-width))',
    'border-right: 1px solid var(--docs-reader-border)',
    'calc(50% - (var(--docs-reader-toc-width) + var(--docs-reader-gap) + var(--docs-reader-width))'
  ].forEach((forbidden) => {
    if (globalCss.includes(forbidden)) issues.push(`reader layout must not regress to left-TOC formula: ${forbidden}`);
  });
}

function readText(relativePath) {
  return fs.readFileSync(path.resolve(rootDir, relativePath), 'utf8');
}

function compact(value) {
  return value.replace(/\s+/g, ' ').trim();
}
