import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildCachedRawUrl, getOpenListConfig, listOpenListFiles, normalizeOpenListPath } from "./openlist-runtime";

const dataRoot = path.join(resolvePublicDataRoot(), "openlist-index");
const indexPath = path.join(dataRoot, "files.json");
const DEFAULT_MAX_DEPTH = 8;
const DEFAULT_MAX_FILES = 50000;
const PAGE_SIZE = 200;

function resolvePublicDataRoot() {
  if (process.env.MYBLOG_PUBLIC_DATA_DIR) {
    return path.resolve(process.env.MYBLOG_PUBLIC_DATA_DIR);
  }

  const candidates = [
    path.resolve(process.cwd(), "../../public-data"),
    path.resolve(process.cwd(), "../../../public-data"),
    "/srv/myblog/public-data",
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

export function openListIndexPaths() {
  return {
    dataRoot,
    indexPath,
  };
}

export function readOpenListIndex() {
  return readJson(indexPath, {
    version: "1.0.0",
    generatedAt: "",
    roots: [],
    stats: emptyStats(),
    files: [],
  });
}

export async function rebuildOpenListIndex(input = {}) {
  const config = getOpenListConfig();
  const roots = normalizeRoots(input.path ? [input.path] : input.roots || config.publicRoots);
  const maxDepth = clampInteger(input.maxDepth, 0, 8, DEFAULT_MAX_DEPTH);
  const maxFiles = clampInteger(input.maxFiles, 1, 50000, DEFAULT_MAX_FILES);
  const generatedAt = new Date().toISOString();
  const files = [];
  const seen = new Set();
  const errors = [];

  for (const root of roots) {
    if (files.length >= maxFiles) break;
    await scanPath({
      currentPath: root,
      root,
      depth: 0,
      maxDepth,
      maxFiles,
      files,
      seen,
      errors,
      refresh: Boolean(input.refresh),
    });
  }

  const index = {
    version: "1.0.0",
    generatedAt,
    roots,
    maxDepth,
    maxFiles,
    stats: buildStats(files, errors),
    files: files.sort((a, b) => a.path.localeCompare(b.path, "zh-CN")),
    errors,
  };

  writeJson(indexPath, index);

  return {
    path: indexPath,
    index,
  };
}

async function scanPath(context) {
  const { currentPath, root, depth, maxDepth, maxFiles, files, seen, errors, refresh } = context;

  let pageData;
  try {
    pageData = await listDirectoryPages(currentPath, refresh);
  } catch (error) {
    errors.push({
      path: currentPath,
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  for (const item of pageData.items) {
    if (files.length >= maxFiles) break;
    const itemPath = joinOpenListPath(currentPath, item.name);
    if (seen.has(itemPath)) continue;
    seen.add(itemPath);

    const record = toRecord(item, itemPath, root, depth + 1);
    files.push(record);

    if (record.isDir && depth < maxDepth) {
      await scanPath({
        ...context,
        currentPath: itemPath,
        depth: depth + 1,
      });
    }
  }
}

async function listDirectoryPages(scanPath, refresh) {
  const items = [];
  let total = 0;
  let provider = "";

  for (let page = 1; page < 1000; page += 1) {
    const data = await listOpenListFiles({
      path: scanPath,
      page,
      perPage: PAGE_SIZE,
      refresh,
    });
    const content = data?.content || [];
    total = Number(data?.total || content.length || total);
    provider = data?.provider || provider;
    items.push(...content);

    if (!content.length || content.length < PAGE_SIZE || items.length >= total) {
      break;
    }
  }

  return {
    total,
    provider,
    items,
  };
}

function toRecord(item, itemPath, root, depth) {
  const name = String(item.name || itemPath.split("/").pop() || "");
  const ext = path.extname(name).toLowerCase();
  const isDir = Boolean(item.is_dir);
  const kind = isDir ? "folder" : detectKind(name);

  return {
    id: stableIdFromPath(itemPath),
    source: "openlist",
    path: itemPath,
    parentPath: parentOpenListPath(itemPath),
    root,
    name,
    ext,
    kind,
    isDir,
    size: Number(item.size || 0),
    modified: item.modified || "",
    type: item.type,
    thumb: item.thumb || "",
    rawUrl: isDir
      ? ""
      : buildCachedRawUrl({
          path: itemPath,
          modified: item.modified || "",
          size: item.size || "",
        }),
    tags: buildTags({ name, ext, kind, root }),
    depth,
  };
}

function detectKind(name) {
  const ext = path.extname(String(name || "")).toLowerCase();
  if ([".epub", ".mobi", ".azw3"].includes(ext)) return "book";
  if ([".pdf", ".doc", ".docx", ".txt", ".md", ".csv", ".xls", ".xlsx", ".ppt", ".pptx"].includes(ext)) return "document";
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".tif", ".tiff", ".bmp", ".svg"].includes(ext)) return "image";
  if ([".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"].includes(ext)) return "video";
  if ([".mp3", ".wav", ".m4a", ".flac", ".aac", ".ogg"].includes(ext)) return "audio";
  if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(ext)) return "archive";
  return "unknown";
}

function buildTags({ name, ext, kind, root }) {
  return Array.from(
    new Set(
      [
        "openlist",
        kind,
        ext.replace(/^\./, ""),
        ...root
          .split("/")
          .filter(Boolean)
          .slice(0, 3),
        ...String(name)
          .replace(ext, "")
          .split(/[\s._()[\]【】（）-]+/)
          .filter((item) => item.length > 1)
          .slice(0, 8),
      ].filter(Boolean),
    ),
  );
}

function buildStats(files, errors) {
  return files.reduce(
    (stats, file) => {
      stats.total += 1;
      if (file.isDir) stats.folders += 1;
      else stats.files += 1;
      stats.size += file.size || 0;
      stats.byKind[file.kind] = (stats.byKind[file.kind] || 0) + 1;
      stats.errors = errors.length;
      return stats;
    },
    emptyStats(),
  );
}

function emptyStats() {
  return {
    total: 0,
    files: 0,
    folders: 0,
    size: 0,
    errors: 0,
    byKind: {},
  };
}

function normalizeRoots(roots) {
  return [...new Set((Array.isArray(roots) ? roots : [roots]).map((item) => normalizeOpenListPath(item)).filter(Boolean))];
}

function joinOpenListPath(parent, name) {
  return `${normalizeOpenListPath(parent).replace(/\/$/, "")}/${String(name || "").replace(/^\/+/, "")}`;
}

function parentOpenListPath(value) {
  const normalized = normalizeOpenListPath(value);
  const parent = normalized.slice(0, normalized.lastIndexOf("/"));
  return parent || "/";
}

function stableIdFromPath(value) {
  return `openlist:${crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 20)}`;
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(`${filePath}.tmp`, filePath);
}
