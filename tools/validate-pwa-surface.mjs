import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const issues = [];

const manifestPath = 'apps/web/public/manifest.webmanifest';
const serviceWorkerPath = 'apps/web/public/sw.js';
const assetLinksPath = 'apps/web/public/.well-known/assetlinks.json';
const baseLayoutPath = 'apps/web/src/layouts/BaseLayout.astro';
const homePagePath = 'apps/web/src/pages/index.astro';
const postPagePath = 'apps/web/src/pages/posts/[slug].astro';
const twaContractPath = 'apps/android-shell/twa.contract.json';

validateManifest();
validateServiceWorkerBoundary();
validateLayoutRegistration();
validateBrandSurface();
validateTwaContract();
validateAssetLinks();

if (issues.length) {
  console.error(['PWA surface validation failed:', ...issues.map((issue) => `- ${issue}`)].join('\n'));
  process.exit(1);
}

console.log('PWA surface validation passed');

function validateManifest() {
  const manifest = readJson(manifestPath);

  expectEqual(manifest.id, '/', 'manifest id must be /');
  expectEqual(manifest.start_url, '/', 'manifest start_url must be /');
  expectEqual(manifest.scope, '/', 'manifest scope must be /');
  expectEqual(manifest.display, 'standalone', 'manifest display must be standalone');
  expectEqual(manifest.name, '空瓶子', 'manifest name must match canonical site title');
  expectEqual(manifest.short_name, '空瓶子', 'manifest short_name must match canonical site title');
  expectString(manifest.name, 'manifest name is required');
  expectString(manifest.short_name, 'manifest short_name is required');
  expectString(manifest.theme_color, 'manifest theme_color is required');
  expectString(manifest.background_color, 'manifest background_color is required');

  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  if (!icons.length) {
    issues.push('manifest must define icons');
    return;
  }

  validateIcon(icons, '192x192');
  validateIcon(icons, '512x512');

  const shortcutUrls = new Set((manifest.shortcuts ?? []).map((shortcut) => shortcut.url));
  ['/', '/books/', '/knowledge/', '/codex/'].forEach((url) => {
    if (url !== '/' && !shortcutUrls.has(url)) {
      issues.push(`manifest shortcuts should include ${url}`);
    }
  });
}

function validateIcon(icons, expectedSize) {
  const icon = icons.find((item) => item.sizes === expectedSize && item.type === 'image/png');
  if (!icon) {
    issues.push(`manifest must include a PNG icon with size ${expectedSize}`);
    return;
  }

  if (!icon.purpose || !String(icon.purpose).includes('maskable')) {
    issues.push(`manifest icon ${icon.src} must include maskable purpose`);
  }

  const imagePath = String(icon.src || '').replace(/^\//, 'apps/web/public/');
  if (!fileExists(imagePath)) {
    issues.push(`manifest icon file is missing: ${icon.src}`);
    return;
  }

  const [width, height] = readPngSize(imagePath);
  const [expectedWidth, expectedHeight] = expectedSize.split('x').map(Number);
  if (width !== expectedWidth || height !== expectedHeight) {
    issues.push(`manifest icon ${icon.src} is ${width}x${height}, expected ${expectedSize}`);
  }
}

function validateServiceWorkerBoundary() {
  const source = readText(serviceWorkerPath);

  [
    "url.pathname.startsWith('/api/')",
    "url.pathname.startsWith('/openlist/')",
    "url.pathname.startsWith('/reader/openlist')",
    "url.pathname.startsWith('/books/openlist')",
    "request.headers.has('range')"
  ].forEach((needle) => {
    if (!source.includes(needle)) {
      issues.push(`service worker boundary is missing: ${needle}`);
    }
  });

  if (!source.includes("self.addEventListener('fetch'")) {
    issues.push('service worker must define a fetch handler');
  }
}

function validateLayoutRegistration() {
  const source = readText(baseLayoutPath);

  [
    'rel="manifest"',
    '/manifest.webmanifest',
    'serviceWorker.register',
    '/sw.js',
    'theme-color',
    'apple-touch-icon'
  ].forEach((needle) => {
    if (!source.includes(needle)) {
      issues.push(`BaseLayout is missing PWA registration fragment: ${needle}`);
    }
  });
}

function validateBrandSurface() {
  const layout = readText(baseLayoutPath);
  const homePage = readText(homePagePath);
  const postPage = readText(postPagePath);
  const favicon = readText('apps/web/public/favicon.svg');

  [
    "title = '空瓶子'",
    "description = '空瓶子的个人内容站",
    'apple-mobile-web-app-title" content="空瓶子"',
    'property="og:site_name" content="空瓶子"',
    'property="og:title" content={title}',
    'name="twitter:card" content="summary_large_image"',
    'title="空瓶子 RSS"',
    '/favicon.svg'
  ].forEach((needle) => {
    if (!layout.includes(needle)) {
      issues.push(`BaseLayout brand surface is missing: ${needle}`);
    }
  });

  ['aria-label="空瓶子"', '<rect width="64" height="64" rx="14"', 'stroke="#111827"'].forEach((needle) => {
    if (!favicon.includes(needle)) {
      issues.push(`favicon.svg brand mark is missing: ${needle}`);
    }
  });

  [
    '<BaseLayout title="空瓶子"',
    'description="空瓶子的首页',
    'data-copy-key="home.brand.name">空瓶子</span>',
    '<h1 data-hero-title data-copy-key="home.banner.title">空瓶子</h1>',
    'data-article-summary',
    'data-article-meta',
    'data-reader-copy-link',
    "showReaderToast('阅读链接已复制')"
  ].forEach((needle) => {
    if (!homePage.includes(needle)) {
      issues.push(`home page brand surface is missing: ${needle}`);
    }
  });

  [
    'title={`${article.title} | 空瓶子`}',
    'type="article"'
  ].forEach((needle) => {
    if (!postPage.includes(needle)) {
      issues.push(`post page brand surface is missing: ${needle}`);
    }
  });
}

function validateTwaContract() {
  const contract = readJson(twaContractPath);

  expectEqual(contract.phase, 'pwa-twa', 'TWA contract phase must be pwa-twa');
  expectEqual(contract.status, 'auto-generated-twa-artifacts-verified', 'TWA contract status must match verified TWA automation readiness');
  expectEqual(contract.webManifestSource, manifestPath, 'TWA contract manifest source must match canonical path');
  expectEqual(contract.serviceWorkerSource, serviceWorkerPath, 'TWA contract service worker source must match canonical path');
  expectEqual(contract.assetLinksSource, assetLinksPath, 'TWA contract assetlinks source must match canonical path');

  if (!Array.isArray(contract.sha256CertFingerprints) || !contract.sha256CertFingerprints.length) {
    issues.push('TWA contract must declare sha256CertFingerprints');
  }

  const boundaries = contract.serviceWorkerBoundary ?? [];
  ['do not intercept /api/*', 'do not intercept /openlist/*', 'do not intercept HTTP Range requests'].forEach((boundary) => {
    if (!boundaries.includes(boundary)) {
      issues.push(`TWA contract is missing service worker boundary: ${boundary}`);
    }
  });
}

function validateAssetLinks() {
  const contract = readJson(twaContractPath);
  const statements = readJson(assetLinksPath);
  if (!Array.isArray(statements)) {
    issues.push('assetlinks.json must be a JSON array');
    return;
  }

  const packageId = contract.packageId || 'com.tengokukk.myblog';
  const fingerprints = contract.sha256CertFingerprints || [];
  const matched = statements.some((statement) => {
    const target = statement?.target || {};
    const relation = statement?.relation || [];
    const targetFingerprints = target.sha256_cert_fingerprints || [];
    return target.namespace === 'android_app' &&
      target.package_name === packageId &&
      relation.includes('delegate_permission/common.handle_all_urls') &&
      fingerprints.every((fingerprint) => targetFingerprints.includes(fingerprint));
  });

  if (!matched) {
    issues.push(`assetlinks.json must trust ${packageId} with every TWA contract fingerprint`);
  }
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(resolvePath(relativePath), 'utf8');
}

function fileExists(relativePath) {
  return fs.existsSync(resolvePath(relativePath));
}

function resolvePath(relativePath) {
  return path.resolve(rootDir, relativePath);
}

function expectString(value, message) {
  if (!value || typeof value !== 'string') {
    issues.push(message);
  }
}

function expectEqual(actual, expected, message) {
  if (actual !== expected) {
    issues.push(`${message}; got ${JSON.stringify(actual)}`);
  }
}

function readPngSize(relativePath) {
  const buffer = fs.readFileSync(resolvePath(relativePath));
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    issues.push(`not a PNG file: ${relativePath}`);
    return [0, 0];
  }
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}
