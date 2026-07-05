import crypto from "node:crypto";
import { spawn, execFile } from "node:child_process";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import JSZip from "jszip";
import { resolveRawUrl } from "./openlist-runtime";
import { resolveOpenListSourceInput } from "./openlist-file-cache";

const coverCacheVersion = "v7";
const coverRoot = path.join(resolvePublicDataRoot(), "openlist-covers");
const coverManifestPath = path.join(coverRoot, "manifest.json");
const missTtlMs = 1000 * 60 * 60 * 24 * 7;
const maxCoverWidth = 520;
const maxSourceBytes = 640 * 1024 * 1024;

function resolvePublicDataRoot() {
  if (process.env.MYBLOG_PUBLIC_DATA_DIR) {
    return path.resolve(process.env.MYBLOG_PUBLIC_DATA_DIR);
  }

  const candidates = [
    path.resolve(process.cwd(), "../../public-data"),
    path.resolve(process.cwd(), "../../../public-data"),
    "/srv/myblog/public-data",
  ];

  return candidates.find((candidate) => fsSync.existsSync(candidate)) || candidates[0];
}

export function getCoverCacheKey(input = {}) {
  return crypto
    .createHash("sha1")
    .update([coverCacheVersion, input.path || "", input.modified || "", input.size || ""].join("\n"))
    .digest("hex");
}

export async function getCachedOrExtractedOpenListCover(input = {}, options = {}) {
  const resolved = await resolveOpenListSourceInput(input);
  const openlistPath = String(resolved.path || "");
  const effectiveInput = {
    ...input,
    path: openlistPath,
    modified: resolved.modified,
    size: resolved.size,
  };

  if (openlistPath) {
    const cachedFromManifest = await readManifestCover(openlistPath, effectiveInput);
    if (cachedFromManifest) return cachedFromManifest;

    if (effectiveInput.modified && effectiveInput.size) {
      const cachedFromVersion = await readVersionedCachedCover(effectiveInput);
      if (cachedFromVersion) return cachedFromVersion;
    }
  }

  if (options.allowExtract === false) {
    return null;
  }

  const key = getCoverCacheKey(effectiveInput);
  const imagePath = path.join(coverRoot, `${key}.jpg`);
  const missPath = path.join(coverRoot, `${key}.miss.json`);

  const cachedImage = await readCachedImage(imagePath);
  if (cachedImage) return cachedImage;

  if (!options.retryMiss && (await hasFreshMiss(missPath))) {
    return null;
  }

  await fs.mkdir(coverRoot, { recursive: true });

  try {
    if (resolved.file?.thumb) {
      const thumb = await fetchSourceBuffer(resolveRawUrl(resolved.file.thumb));
      const cover = await normalizeImageToJpeg(thumb);
      await fs.writeFile(imagePath, cover);
      await fs.rm(missPath, { force: true });
      await writeCoverManifest(effectiveInput.path, {
        key,
        modified: effectiveInput.modified,
        size: effectiveInput.size,
        source: "openlist-thumb",
      });
      return {
        body: cover,
        contentType: "image/jpeg",
        cacheStatus: "miss",
      };
    }

    const rawUrl = resolveRawUrl(resolved.file?.raw_url || "");
    if (!rawUrl) throw new Error("OpenList did not return raw_url.");

    const ext = path.extname(effectiveInput.path).toLowerCase();
    const cover =
      ext === ".epub"
        ? await extractEpubCover(await fetchSourceBuffer(rawUrl))
        : ext === ".pdf"
          ? await extractPdfCoverFromUrl(rawUrl)
          : null;

    if (!cover?.length) {
      await writeMiss(missPath, "no embedded cover detected");
      return null;
    }

    await fs.writeFile(imagePath, cover);
    await fs.rm(missPath, { force: true });
    await writeCoverManifest(effectiveInput.path, {
      key,
      modified: effectiveInput.modified,
      size: effectiveInput.size,
      source: ext === ".epub" ? "epub-embedded-cover" : "pdf-first-page",
    });
    return {
      body: cover,
      contentType: "image/jpeg",
      cacheStatus: "miss",
    };
  } catch (error) {
    await writeMiss(missPath, error);
    return null;
  }
}

export async function getCachedOpenListCover(input = {}) {
  const openlistPath = String(input.path || "");
  if (!openlistPath) return null;
  return (await readManifestCover(openlistPath, input)) || (await readVersionedCachedCover(input));
}

export async function prewarmOpenListBookCovers(files = [], options = {}) {
  const limit = clampNumber(options.limit, 1, 5000, 500);
  const targets = files
    .filter((file) => !file.isDir)
    .filter((file) => [".epub", ".pdf"].includes(String(file.ext || path.extname(file.name || "")).toLowerCase()))
    .slice(0, limit);
  const result = {
    total: targets.length,
    hit: 0,
    extracted: 0,
    missed: 0,
    errors: [],
    records: [],
  };

  for (const file of targets) {
    try {
      const before = await getCachedOpenListCover(file);
      if (before) {
        result.hit += 1;
        result.records.push({ path: file.path, status: "hit" });
        continue;
      }

      const cover = await getCachedOrExtractedOpenListCover({
        path: file.path,
        modified: file.modified,
        size: file.size,
      }, {
        retryMiss: Boolean(options.retryMiss),
      });

      if (cover) {
        result.extracted += 1;
        result.records.push({ path: file.path, status: "extracted" });
      } else {
        result.missed += 1;
        result.records.push({ path: file.path, status: "missed" });
      }
    } catch (error) {
      const failure = {
        path: file.path,
        message: error instanceof Error ? error.message : String(error),
      };
      result.errors.push(failure);
      result.records.push({ ...failure, status: "error" });
    }
  }

  return result;
}

async function readVersionedCachedCover(input = {}) {
  if (!input.path || !input.modified || !input.size) return null;
  const key = getCoverCacheKey(input);
  const cachedImage = await readCachedImage(path.join(coverRoot, `${key}.jpg`));
  if (!cachedImage) return null;

  await writeCoverManifest(String(input.path || ""), {
    key,
    modified: input.modified,
    size: input.size,
    source: "existing-cache",
  });
  return cachedImage;
}

async function readCachedImage(imagePath) {
  try {
    const body = await fs.readFile(imagePath);
    return {
      body,
      contentType: "image/jpeg",
      cacheStatus: "hit",
    };
  } catch {
    return null;
  }
}

async function readManifestCover(openlistPath, input = {}) {
  const manifest = await readCoverManifest();
  const entry = manifest.files?.[openlistPath];
  if (!entry?.key) return null;
  if (input.modified && entry.modified && String(input.modified) !== String(entry.modified)) return null;
  if (input.size && entry.size && Number(input.size) !== Number(entry.size)) return null;

  const cachedImage = await readCachedImage(path.join(coverRoot, `${entry.key}.jpg`));
  if (!cachedImage) return null;

  return {
    ...cachedImage,
    cacheStatus: "hit",
  };
}

async function readCoverManifest() {
  try {
    const raw = await fs.readFile(coverManifestPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      version: "1.0.0",
      files: {},
      ...parsed,
      files: parsed.files && typeof parsed.files === "object" ? parsed.files : {},
    };
  } catch {
    return {
      version: "1.0.0",
      updatedAt: "",
      files: {},
    };
  }
}

async function writeCoverManifest(openlistPath, entry) {
  if (!openlistPath || !entry?.key) return;

  await fs.mkdir(coverRoot, { recursive: true });
  const manifest = await readCoverManifest();
  manifest.updatedAt = new Date().toISOString();
  manifest.files[openlistPath] = {
    path: openlistPath,
    image: `${entry.key}.jpg`,
    key: entry.key,
    modified: entry.modified || "",
    size: Number(entry.size || 0),
    source: entry.source || "unknown",
    cachedAt: manifest.files[openlistPath]?.cachedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(`${coverManifestPath}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.rename(`${coverManifestPath}.tmp`, coverManifestPath);
}

async function hasFreshMiss(missPath) {
  try {
    const stat = await fs.stat(missPath);
    return Date.now() - stat.mtimeMs < missTtlMs;
  } catch {
    return false;
  }
}

async function writeMiss(missPath, error) {
  const reason = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : "";
  await fs.mkdir(path.dirname(missPath), { recursive: true });
  await fs.writeFile(missPath, JSON.stringify({ ok: false, reason, stack, cachedAt: new Date().toISOString() }));
}

async function fetchSourceBuffer(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`OpenList raw_url HTTP ${response.status}`);

  const size = Number(response.headers.get("content-length") || 0);
  if (size > maxSourceBytes) {
    throw new Error(`source file too large for cover extraction: ${size}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxSourceBytes) {
    throw new Error(`source file too large for cover extraction: ${arrayBuffer.byteLength}`);
  }

  return Buffer.from(arrayBuffer);
}

async function extractEpubCover(source) {
  const zip = await JSZip.loadAsync(source);
  const opfPath = await findOpfPath(zip);
  if (!opfPath) return null;

  const opfFile = zip.file(opfPath);
  if (!opfFile) return null;

  const opf = await opfFile.async("string");
  const manifest = parseManifest(opf);
  const coverHref = findCoverHref(opf, manifest) || (await findFallbackEpubCoverHref(zip, opfPath, opf, manifest));
  if (!coverHref) return null;

  const coverPath = normalizeZipPath(path.posix.join(path.posix.dirname(opfPath), coverHref));
  const coverFile = zip.file(coverPath) || zip.file(decodeURIComponent(coverPath));
  if (!coverFile) return null;

  const image = await coverFile.async("nodebuffer");
  return normalizeImageToJpeg(image);
}

async function findOpfPath(zip) {
  const containerFile = zip.file("META-INF/container.xml");
  if (containerFile) {
    const container = await containerFile.async("string");
    const match = container.match(/full-path=["']([^"']+\.opf)["']/i);
    if (match?.[1]) return normalizeZipPath(match[1]);
  }

  const fallback = Object.keys(zip.files).find((name) => name.toLowerCase().endsWith(".opf"));
  return fallback ? normalizeZipPath(fallback) : "";
}

function parseManifest(opf) {
  const items = [];
  const itemPattern = /<item\b[^>]*>/gi;
  for (const match of opf.matchAll(itemPattern)) {
    const tag = match[0];
    items.push({
      id: readXmlAttr(tag, "id"),
      href: readXmlAttr(tag, "href"),
      mediaType: readXmlAttr(tag, "media-type"),
      properties: readXmlAttr(tag, "properties"),
    });
  }
  return items;
}

function findCoverHref(opf, manifest) {
  const coverMeta = opf.match(/<meta\b[^>]*name=["']cover["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const coverId = coverMeta?.[1];
  const byMeta = coverId ? manifest.find((item) => item.id === coverId)?.href : "";
  if (byMeta) return byMeta;

  const byProperty = manifest.find((item) => /\bcover-image\b/i.test(item.properties || ""))?.href;
  if (byProperty) return byProperty;

  const byId = manifest.find((item) => /cover/i.test(item.id || "") && /^image\//i.test(item.mediaType || ""))?.href;
  if (byId) return byId;

  return (
    manifest.find((item) => /^image\//i.test(item.mediaType || "") && /cover|front/i.test(item.href || ""))?.href ||
    ""
  );
}

async function findFallbackEpubCoverHref(zip, opfPath, opf, manifest) {
  const guideHref = findGuideCoverHref(opf);
  if (guideHref) {
    const guidePath = normalizeZipPath(path.posix.join(path.posix.dirname(opfPath), guideHref));
    const guideFile = zip.file(guidePath) || zip.file(decodeURIComponent(guidePath));
    if (guideFile) {
      const html = await guideFile.async("string");
      const imageHref = findFirstHtmlImageHref(html);
      if (imageHref) return path.posix.join(path.posix.dirname(guideHref), imageHref);
    }
  }

  for (const item of manifest) {
    if (!/x?html/i.test(item.mediaType || "") && !/\.x?html?$/i.test(item.href || "")) continue;
    const itemPath = normalizeZipPath(path.posix.join(path.posix.dirname(opfPath), item.href));
    const htmlFile = zip.file(itemPath) || zip.file(decodeURIComponent(itemPath));
    if (!htmlFile) continue;

    const html = await htmlFile.async("string");
    if (!/cover|封面|front/i.test(html) && item !== manifest[0]) continue;

    const imageHref = findFirstHtmlImageHref(html);
    if (imageHref) return path.posix.join(path.posix.dirname(item.href), imageHref);
  }

  const imageItems = manifest
    .filter((item) => /^image\//i.test(item.mediaType || "") || /\.(jpe?g|png|webp)$/i.test(item.href || ""))
    .sort((a, b) => coverCandidateScore(b) - coverCandidateScore(a));
  return imageItems[0]?.href || "";
}

function findGuideCoverHref(opf) {
  const guide = opf.match(/<reference\b[^>]*type=["'](?:cover|frontcover)["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (guide?.[1]) return guide[1];

  const alternate = opf.match(/<reference\b[^>]*href=["']([^"']+)["'][^>]*type=["'](?:cover|frontcover)["'][^>]*>/i);
  return alternate?.[1] || "";
}

function findFirstHtmlImageHref(html) {
  const image = html.match(/<(?:img|image)\b[^>]*(?:src|href|xlink:href)=["']([^"']+)["'][^>]*>/i);
  return image?.[1] || "";
}

function coverCandidateScore(item) {
  const value = `${item.id || ""} ${item.href || ""}`.toLowerCase();
  let score = 0;
  if (/cover|front|封面/.test(value)) score += 100;
  if (/title|page/.test(value)) score += 20;
  if (/\.(jpe?g|png|webp)$/.test(value)) score += 10;
  return score;
}

function readXmlAttr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"));
  return match?.[1] || "";
}

function normalizeZipPath(value) {
  return String(value || "").replace(/^\/+/, "").replace(/\\/g, "/");
}

async function normalizeImageToJpeg(source) {
  const { default: sharp } = await import("sharp");
  return sharp(source)
    .rotate()
    .resize({ width: maxCoverWidth, withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

async function extractPdfCoverFromUrl(url) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openlist-cover-source-"));
  const inputPath = path.join(tempDir, "source.pdf");

  try {
    await downloadToFile(url, inputPath);
    return await extractPdfCoverFromFile(inputPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function extractPdfCoverFromFile(inputPath) {
  const popplerCover = await extractPdfCoverWithPoppler(inputPath).catch(() => null);
  if (popplerCover?.length) return popplerCover;

  const source = await fs.readFile(inputPath);
  const sharpCover = await extractPdfCoverWithSharp(source).catch(() => null);
  if (sharpCover?.length) return sharpCover;

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = await import("@napi-rs/canvas");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ).href;
  const wasmUrl = `${path.join(process.cwd(), "node_modules/pdfjs-dist/wasm")}${path.sep}`;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(source),
    disableWorker: true,
    wasmUrl,
    useSystemFonts: true,
  });

  try {
    const document = await loadingTask.promise;
    const page = await document.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(1, maxCoverWidth / viewport.width);
    const scaledViewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(scaledViewport.width), Math.ceil(scaledViewport.height));
    const context = canvas.getContext("2d");

    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
    }).promise;

    return await normalizeImageToJpeg(await canvas.encode("png"));
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}

async function extractPdfCoverWithPoppler(inputPath) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openlist-cover-"));
  const outputBase = path.join(tempDir, "cover");
  const outputPath = `${outputBase}.jpg`;

  try {
    await runCommand("pdftoppm", [
      "-jpeg",
      "-singlefile",
      "-f",
      "1",
      "-l",
      "1",
      "-r",
      "144",
      "-scale-to",
      String(maxCoverWidth),
      inputPath,
      outputBase,
    ]);

    return await normalizeImageToJpeg(await fs.readFile(outputPath));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    const stderr = [];

    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with ${code}: ${Buffer.concat(stderr).toString("utf8").trim()}`));
    });
  });
}

function downloadToFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "curl",
      ["-fL", "--retry", "3", "--retry-delay", "2", "--max-time", "900", "-o", outputPath, url],
      { maxBuffer: 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`curl download failed: ${stderr || error.message}`));
          return;
        }
        resolve();
      },
    );
    child.stdin?.end();
  });
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

async function extractPdfCoverWithSharp(source) {
  const { default: sharp } = await import("sharp");
  return sharp(source, { page: 0, density: 144, limitInputPixels: false })
    .resize({ width: maxCoverWidth, withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}
