import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getOpenListFile, resolveRawUrl } from "./openlist-runtime";

const fileCacheVersion = "v1";
const fileRoot = path.join(resolvePublicDataRoot(), "openlist-files");
const fileManifestPath = path.join(fileRoot, "manifest.json");
const defaultMaxSourceBytes = 1024 * 1024 * 1024;

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

export function getOpenListFileCacheKey(input = {}) {
  return crypto
    .createHash("sha1")
    .update([fileCacheVersion, input.path || "", input.modified || "", input.size || ""].join("\n"))
    .digest("hex");
}

export async function resolveOpenListSourceInput(input = {}) {
  const file = await getOpenListFile({
    bookId: input.bookId || "",
    path: input.path || "",
  });
  const resolvedPath = String(file?.path || input.path || "");
  return {
    file,
    path: resolvedPath,
    modified: input.modified || file?.modified || "",
    size: input.size || file?.size || "",
    contentType: getContentType(resolvedPath || file?.name || ""),
  };
}

export async function getCachedOpenListSource(input = {}) {
  const openlistPath = String(input.path || "");
  if (!openlistPath) return null;
  const manifest = await readFileManifest();
  const entry = manifest.files?.[openlistPath];
  if (!entry?.key || !entry?.file) return null;
  if (input.modified && entry.modified && String(input.modified) !== String(entry.modified)) return null;
  if (input.size && entry.size && Number(input.size) !== Number(entry.size)) return null;

  const filePath = path.join(fileRoot, entry.file);
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat?.isFile()) return null;

  return {
    path: openlistPath,
    key: entry.key,
    filePath,
    contentType: entry.contentType || getContentType(openlistPath),
    size: stat.size,
    modified: entry.modified || "",
    cacheStatus: "hit",
  };
}

export async function cacheOpenListSource(input = {}) {
  const resolved = await resolveOpenListSourceInput(input);
  const openlistPath = String(resolved.path || "");
  if (!openlistPath) return { path: openlistPath, status: "skipped", reason: "missing path" };
  const ext = path.extname(openlistPath).toLowerCase();
  if (![".epub", ".pdf"].includes(ext)) {
    return { path: openlistPath, status: "skipped", reason: "unsupported extension" };
  }

  const effectiveInput = {
    path: openlistPath,
    modified: resolved.modified,
    size: resolved.size,
  };
  const cached = await getCachedOpenListSource(effectiveInput);
  if (cached) return { path: openlistPath, status: "hit", key: cached.key, size: cached.size };

  const sourceSize = Number(effectiveInput.size || 0);
  const maxBytes = getMaxSourceBytes();
  if (sourceSize > maxBytes) {
    return { path: openlistPath, status: "skipped", reason: `source file too large: ${sourceSize}` };
  }

  const rawUrl = resolveRawUrl(resolved.file?.raw_url || "");
  if (!rawUrl) throw new Error("OpenList did not return raw_url.");

  await fs.mkdir(fileRoot, { recursive: true });
  const key = getOpenListFileCacheKey(effectiveInput);
  const outputName = `${key}${ext}`;
  const outputPath = path.join(fileRoot, outputName);
  const tempPath = `${outputPath}.tmp`;

  await downloadToFile(rawUrl, tempPath, maxBytes);
  const stat = await fs.stat(tempPath);
  if (stat.size > maxBytes) {
    await fs.rm(tempPath, { force: true });
    return { path: openlistPath, status: "skipped", reason: `downloaded file too large: ${stat.size}` };
  }

  await fs.rename(tempPath, outputPath);
  await writeFileManifest(openlistPath, {
    key,
    file: outputName,
    modified: effectiveInput.modified,
    size: stat.size || sourceSize,
    contentType: resolved.contentType,
  });

  return { path: openlistPath, status: "cached", key, size: stat.size };
}

export async function getOpenListSourceUrl(input = {}) {
  const resolved = await resolveOpenListSourceInput(input);
  const rawUrl = resolveRawUrl(resolved.file?.raw_url || "");
  if (!rawUrl) throw new Error("OpenList did not return raw_url.");
  return {
    rawUrl,
    size: Number(resolved.size || 0),
    modified: resolved.modified,
    contentType: resolved.contentType,
    path: resolved.path,
  };
}

export async function createOpenListSourceProxyResponse(input = {}, request) {
  const source = await getOpenListSourceUrl(input);
  const headers = {};
  const range = request.headers.get("range");
  if (range) headers.range = range;

  const upstream = await fetch(source.rawUrl, {
    headers,
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) {
    throw new Error(`OpenList raw_url HTTP ${upstream.status}`);
  }

  const responseHeaders = new Headers();
  responseHeaders.set("content-type", source.contentType || upstream.headers.get("content-type") || "application/octet-stream");
  responseHeaders.set("accept-ranges", upstream.headers.get("accept-ranges") || "bytes");
  responseHeaders.set("cache-control", "private, max-age=60");
  responseHeaders.set("x-openlist-file-cache", "proxy");
  for (const header of ["content-length", "content-range"]) {
    const value = upstream.headers.get(header);
    if (value) responseHeaders.set(header, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function prewarmOpenListBookFiles(files = [], options = {}) {
  const limit = clampNumber(options.limit, 1, 5000, 100);
  const targets = files
    .filter((file) => !file.isDir)
    .filter((file) => [".epub", ".pdf"].includes(String(file.ext || path.extname(file.name || "")).toLowerCase()))
    .slice(0, limit);
  const result = {
    total: targets.length,
    hit: 0,
    cached: 0,
    skipped: 0,
    errors: [],
    records: [],
  };

  for (const file of targets) {
    try {
      const record = await cacheOpenListSource({
        path: file.path,
        modified: file.modified,
        size: file.size,
      });

      if (record.status === "hit") result.hit += 1;
      else if (record.status === "cached") result.cached += 1;
      else if (record.status === "skipped") result.skipped += 1;

      result.records.push(record);
    } catch (error) {
      const failure = {
        path: file.path,
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
      result.errors.push(failure);
      result.records.push(failure);
    }
  }

  return result;
}

export function createCachedSourceResponse(source, request) {
  const range = request.headers.get("range");
  const parsedRange = parseRange(range, source.size);
  const headers = new Headers({
    "content-type": source.contentType,
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=31536000, immutable",
    "x-openlist-file-cache": source.cacheStatus,
  });

  if (parsedRange) {
    const stream = fsSync.createReadStream(source.filePath, {
      start: parsedRange.start,
      end: parsedRange.end,
    });
    headers.set("content-length", String(parsedRange.end - parsedRange.start + 1));
    headers.set("content-range", `bytes ${parsedRange.start}-${parsedRange.end}/${source.size}`);
    return new Response(Readable.toWeb(stream), { status: 206, headers });
  }

  const stream = fsSync.createReadStream(source.filePath);
  headers.set("content-length", String(source.size));
  return new Response(Readable.toWeb(stream), { status: 200, headers });
}

async function readFileManifest() {
  try {
    const raw = await fs.readFile(fileManifestPath, "utf8");
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

async function writeFileManifest(openlistPath, entry) {
  if (!openlistPath || !entry?.key || !entry?.file) return;

  await fs.mkdir(fileRoot, { recursive: true });
  const manifest = await readFileManifest();
  manifest.updatedAt = new Date().toISOString();
  manifest.files[openlistPath] = {
    path: openlistPath,
    key: entry.key,
    file: entry.file,
    modified: entry.modified || "",
    size: Number(entry.size || 0),
    contentType: entry.contentType || getContentType(openlistPath),
    cachedAt: manifest.files[openlistPath]?.cachedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(`${fileManifestPath}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.rename(`${fileManifestPath}.tmp`, fileManifestPath);
}

async function downloadToFile(url, outputPath, maxBytes) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok || !response.body) throw new Error(`OpenList raw_url HTTP ${response.status}`);

  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > maxBytes) {
    throw new Error(`source file too large: ${declaredSize}`);
  }

  const file = await fs.open(outputPath, "w");
  let written = 0;
  try {
    const reader = response.body.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      written += value.byteLength;
      if (written > maxBytes) {
        throw new Error(`source file too large: ${written}`);
      }
      await file.write(Buffer.from(value));
    }
  } finally {
    await file.close();
  }
}

function parseRange(range, size) {
  if (!range) return null;
  const match = String(range).match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (match[1] === "" && match[2]) {
    const suffix = Number(match[2]);
    start = Math.max(0, size - suffix);
    end = size - 1;
  }
  start = Math.max(0, start);
  end = Math.min(size - 1, end);
  if (start > end) return null;
  return { start, end };
}

function getContentType(value) {
  const ext = path.extname(String(value || "")).toLowerCase();
  if (ext === ".epub") return "application/epub+zip";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

function getMaxSourceBytes() {
  return clampNumber(process.env.OPENLIST_FILE_CACHE_MAX_BYTES, 1024 * 1024, 10 * 1024 * 1024 * 1024, defaultMaxSourceBytes);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}
