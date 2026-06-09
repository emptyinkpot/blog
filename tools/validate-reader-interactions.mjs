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
    'activeLink.scrollIntoView({ block: \'nearest\' })',
    'const topLimit = tocRect.top + 20',
    'const bottomLimit = tocRect.bottom - 20'
  ].forEach((needle) => {
    if (!index.includes(needle)) issues.push(`TOC auto-reveal contract missing: ${needle}`);
  });
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
}

function readText(relativePath) {
  return fs.readFileSync(path.resolve(rootDir, relativePath), 'utf8');
}

function compact(value) {
  return value.replace(/\s+/g, ' ').trim();
}
