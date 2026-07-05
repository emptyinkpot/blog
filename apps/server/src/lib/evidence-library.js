import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const dataRoot = path.resolve(process.cwd(), "../../public-data/evidence-library");
const planPath = path.join(dataRoot, "evidence-library-plan.json");
const manifestPath = path.join(dataRoot, "manifests", "assets.json");
const queuePath = path.join(dataRoot, "manifests", "unlabeled-queue.json");
const remotionExportPath = path.join(dataRoot, "exports", "remotion-evidence-manifest.json");

export function readEvidencePlan() {
  return readJson(planPath, {});
}

export function readEvidenceManifest() {
  return readJson(manifestPath, { version: "1.0.0", assets: [], clips: [] });
}

export function readUnlabeledQueue() {
  return readJson(queuePath, { version: "1.0.0", updatedAt: "", items: [] });
}

export function evidencePaths() {
  return {
    dataRoot,
    planPath,
    manifestPath,
    queuePath,
    remotionExportPath,
  };
}

export async function scanOpenListDirectory(input = {}) {
  const plan = readEvidencePlan();
  const baseUrl = String(input.baseUrl || plan.actors?.openlist?.baseUrl || "http://127.0.0.1:5244").replace(/\/$/, "");
  const scanPath = normalizeOpenListPath(input.path || plan.actors?.openlist?.activeMounts?.[0] || "/");
  const response = await fetch(`${baseUrl}/api/fs/list`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      path: scanPath,
      password: "",
      page: Number(input.page || 1),
      per_page: Number(input.perPage || 50),
      refresh: Boolean(input.refresh),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`OpenList HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload.code !== 200) {
    throw new Error(payload.message || "OpenList list failed");
  }

  return {
    baseUrl,
    path: scanPath,
    total: Number(payload.data?.total || 0),
    provider: payload.data?.provider || "",
    items: (payload.data?.content || []).map((item) => ({
      name: item.name,
      isDir: Boolean(item.is_dir),
      size: Number(item.size || 0),
      modified: item.modified,
      type: item.type,
      openlistPath: joinOpenListPath(scanPath, item.name),
      thumb: item.thumb || "",
    })),
  };
}

export async function scanOpenListAndQueue(input = {}) {
  const scan = await scanOpenListDirectory(input);
  const queue = upsertQueueFromOpenListScan(scan);

  return {
    scan,
    queue,
  };
}

export function exportRemotionEvidenceManifest() {
  const sourceManifest = readEvidenceManifest();
  const generatedAt = new Date().toISOString();
  const assets = (sourceManifest.assets || []).map((asset) => ({
    id: asset.id,
    title: asset.title,
    providerType: asset.assetType === "video" || asset.assetType === "audio" ? "footage" : "static",
    assetType: asset.assetType,
    openlistPath: asset.openlistPath,
    sourceUrl: asset.sourceUrl || asset.openlistUrl || "",
    thumbnail: asset.thumbnail || "",
    license: asset.license,
    visibility: asset.visibility,
    entities: asset.entities || [],
    locations: asset.locations || [],
    organizations: asset.organizations || [],
    events: asset.events || [],
    visualKinds: asset.visualKinds || [],
    bestFor: asset.bestFor || [],
    avoidFor: asset.avoidFor || [],
    mustNotShow: asset.mustNotShow || [],
    evidenceLevel: asset.evidenceLevel || inferEvidenceLevel(asset.assetType),
  }));
  const clips = (sourceManifest.clips || []).map((clip) => ({
    id: clip.id,
    assetId: clip.assetId,
    title: clip.title,
    startMs: Number(clip.startMs || 0),
    endMs: Number(clip.endMs || 0),
    loopable: Boolean(clip.loopable),
    visualKinds: clip.visualKinds || [],
    bestFor: clip.bestFor || [],
    avoidFor: clip.avoidFor || [],
  }));
  const remotionManifest = {
    version: "1.0.0",
    generatedAt,
    source: {
      system: "myblog-evidence-library",
      manifestPath: "public-data/evidence-library/manifests/assets.json",
    },
    assets,
    clips,
  };

  writeJson(remotionExportPath, remotionManifest);

  return {
    path: remotionExportPath,
    manifest: remotionManifest,
  };
}

function upsertQueueFromOpenListScan(scan) {
  const current = readUnlabeledQueue();
  const existingItems = current.items || [];
  const existingByPath = new Map(existingItems.map((item) => [item.openlistPath, item]));
  const scannedAt = new Date().toISOString();
  let added = 0;
  let updated = 0;

  for (const item of scan.items || []) {
    if (item.isDir) {
      continue;
    }

    const next = {
      id: stableIdFromPath(item.openlistPath),
      status: "unlabeled",
      source: "openlist",
      name: item.name,
      openlistPath: item.openlistPath,
      size: item.size,
      modified: item.modified,
      thumb: item.thumb || "",
      detectedAssetType: detectAssetType(item.name),
      scannedAt,
    };
    const existing = existingByPath.get(item.openlistPath);

    if (existing) {
      existingByPath.set(item.openlistPath, { ...existing, ...next, status: existing.status || "unlabeled" });
      updated += 1;
    } else {
      existingByPath.set(item.openlistPath, next);
      added += 1;
    }
  }

  const queue = {
    version: current.version || "1.0.0",
    updatedAt: scannedAt,
    items: [...existingByPath.values()].sort((a, b) => String(b.scannedAt || "").localeCompare(String(a.scannedAt || ""))),
  };

  writeJson(queuePath, queue);

  return {
    path: queuePath,
    added,
    updated,
    total: queue.items.length,
    items: queue.items,
  };
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

function normalizeOpenListPath(value) {
  const pathValue = String(value || "/").trim().replace(/\\/g, "/");
  return pathValue.startsWith("/") ? pathValue : `/${pathValue}`;
}

function joinOpenListPath(parent, name) {
  return `${normalizeOpenListPath(parent).replace(/\/$/, "")}/${String(name || "").replace(/^\/+/, "")}`;
}

function stableIdFromPath(value) {
  return `openlist-${crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 16)}`;
}

function detectAssetType(fileName) {
  const ext = path.extname(String(fileName || "")).toLowerCase();
  if ([".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"].includes(ext)) {
    return "video";
  }
  if ([".mp3", ".wav", ".m4a", ".flac", ".aac", ".ogg"].includes(ext)) {
    return "audio";
  }
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".tif", ".tiff", ".bmp"].includes(ext)) {
    return "image";
  }
  if ([".pdf", ".doc", ".docx", ".txt", ".md"].includes(ext)) {
    return "document";
  }
  return "unknown";
}

function inferEvidenceLevel(assetType) {
  if (assetType === "document" || assetType === "newspaper") {
    return "primary";
  }
  if (assetType === "image" || assetType === "map" || assetType === "video") {
    return "secondary";
  }
  return "reconstruction";
}
