import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { cacheOpenListSource, getCachedOpenListSource, resolveOpenListSourceInput } from "./openlist-file-cache";

const pageCacheVersion = "v1";
const pageRoot = path.join(resolvePublicDataRoot(), "openlist-pages");
const maxPageWidth = 1100;

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

export function getPdfPageCacheKey(input = {}) {
  return crypto
    .createHash("sha1")
    .update([
      pageCacheVersion,
      input.path || "",
      input.modified || "",
      input.size || "",
      input.page || 1,
      maxPageWidth,
    ].join("\n"))
    .digest("hex");
}

export async function getCachedOrRenderedPdfPage(input = {}) {
  const resolved = await resolveOpenListSourceInput(input);
  let openlistPath = String(resolved.path || "");
  const page = clampNumber(input.page, 1, 100000, 1);
  if (path.extname(openlistPath).toLowerCase() !== ".pdf") return null;

  let source = await getCachedOpenListSource({
    path: openlistPath,
    modified: resolved.modified,
    size: resolved.size,
  });
  if (!source) {
    await cacheOpenListSource({
      bookId: input.bookId || "",
      path: openlistPath,
      modified: resolved.modified,
      size: resolved.size,
    });
    source = await getCachedOpenListSource({
      path: openlistPath,
      modified: resolved.modified,
      size: resolved.size,
    });
  }
  if (!source) return null;

  const key = getPdfPageCacheKey({
    path: openlistPath,
    modified: resolved.modified || source.modified || "",
    size: resolved.size || source.size || "",
    page,
  });
  const imagePath = path.join(pageRoot, `${key}.jpg`);
  const cached = await readCachedImage(imagePath);
  if (cached) return cached;

  await fs.mkdir(pageRoot, { recursive: true });
  const body = await renderPdfPageWithPoppler(source.filePath, page);
  await fs.writeFile(imagePath, body);
  return {
    body,
    contentType: "image/jpeg",
    cacheStatus: "miss",
  };
}

export async function prewarmOpenListPdfPages(files = [], options = {}) {
  const limit = clampNumber(options.limit, 1, 5000, 100);
  const pageCount = clampNumber(options.pages, 1, 12, 2);
  const targets = files
    .filter((file) => !file.isDir)
    .filter((file) => String(file.ext || path.extname(file.name || "")).toLowerCase() === ".pdf")
    .slice(0, limit);
  const result = {
    total: targets.length,
    pages: pageCount,
    hit: 0,
    rendered: 0,
    missed: 0,
    errors: [],
    records: [],
  };

  for (const file of targets) {
    for (let page = 1; page <= pageCount; page += 1) {
      try {
        const pageImage = await getCachedOrRenderedPdfPage({
          path: file.path,
          modified: file.modified,
          size: file.size,
          page,
        });
        const record = {
          path: file.path,
          page,
          status: pageImage?.cacheStatus === "hit" ? "hit" : pageImage ? "rendered" : "missed",
        };
        if (record.status === "hit") result.hit += 1;
        else if (record.status === "rendered") result.rendered += 1;
        else result.missed += 1;
        result.records.push(record);
      } catch (error) {
        const failure = {
          path: file.path,
          page,
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        };
        result.errors.push(failure);
        result.records.push(failure);
      }
    }
  }

  return result;
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

async function renderPdfPageWithPoppler(inputPath, page) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openlist-page-"));
  const outputBase = path.join(tempDir, "page");
  const outputPath = `${outputBase}.jpg`;

  try {
    await runCommand("pdftoppm", [
      "-jpeg",
      "-singlefile",
      "-f",
      String(page),
      "-l",
      String(page),
      "-r",
      "144",
      "-scale-to",
      String(maxPageWidth),
      inputPath,
      outputBase,
    ]);

    return await sharp(await fs.readFile(outputPath))
      .rotate()
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
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

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}
