import crypto from "node:crypto";
import { getMyBlogVisualSnapshot, recordMyBlogVisualSyncResult } from "@/lib/runtime-db";

const defaultSource = {
  id: "pinterest-saved-pins",
  provider:
    process.env.VISUAL_PINTEREST_PROVIDER ||
    (process.env.APIFY_PINTEREST_DATASET_ID || process.env.APIFY_PINTEREST_TASK_ID ? "apify_dataset" : "pinterest_api"),
};

const fallbackPalette = {
  dominant: "#6b2d5c",
  colors: ["#6b2d5c", "#c9a227", "#f5f1e8", "#2f5d50", "#1f1b18"],
};

export async function readVisualSnapshot() {
  const snapshot = await getMyBlogVisualSnapshot();
  const collections = [];
  const pinsBySource = snapshot.pinsBySource || {};

  for (const source of snapshot.sources || []) {
    const pins = Array.isArray(pinsBySource[source.id]) ? pinsBySource[source.id] : [];
    collections.push(...toPartitionCollections(source, pins.map(normalizeGatewayPin)));
  }

  return {
    version: snapshot.version || 1,
    mode: snapshot.mode || "bookmark-mirror",
    downloaded: false,
    generatedAt: snapshot.generatedAt || new Date().toISOString(),
    sources: (snapshot.sources || []).map(normalizeGatewaySource),
    collections,
  };
}

export async function syncVisualSource(sourceId = defaultSource.id) {
  try {
    const provider = defaultSource.provider;
    const source = { id: sourceId, provider };
    const pins = await fetchSourcePins(source);
    const snapshotHash = hashPins(pins);
    const result = await recordMyBlogVisualSyncResult({
      sourceId,
      provider,
      ok: true,
      snapshotHash,
      pins,
    });

    return {
      ok: true,
      sourceId,
      syncedItems: result.syncedItems ?? pins.length,
      snapshotHash: result.snapshotHash || snapshotHash,
      downloaded: false,
    };
  } catch (error) {
    try {
      await recordMyBlogVisualSyncResult({
        sourceId,
        provider: defaultSource.provider,
        ok: false,
        error: error?.message || "Visual source sync failed.",
        pins: [],
      });
    } catch {
      // The caller receives the original provider/Gateway failure below.
    }
    return { ok: false, sourceId, error: error?.message || "Visual source sync failed.", status: error?.status || 502 };
  }
}

async function fetchSourcePins(source) {
  if (source.provider === "pinterest_api") return fetchPinterestPins();
  if (source.provider === "apify_dataset") return fetchApifyDatasetPins();
  throw new Error(`Unsupported visual source provider: ${source.provider}`);
}

async function fetchPinterestPins() {
  const token = process.env.PINTEREST_ACCESS_TOKEN || "";
  if (!token) {
    throw new Error("PINTEREST_ACCESS_TOKEN is not configured. Use an official Pinterest API token or switch provider.");
  }

  const boardId = process.env.PINTEREST_BOARD_ID || "";
  if (!boardId) {
    throw new Error("PINTEREST_BOARD_ID is required for official board pin sync.");
  }

  const output = [];
  let bookmark = "";
  let page = 0;
  do {
    const url = new URL(`https://api.pinterest.com/v5/boards/${encodeURIComponent(boardId)}/pins`);
    url.searchParams.set("page_size", "100");
    if (bookmark) url.searchParams.set("bookmark", bookmark);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Pinterest API ${response.status}: ${payload?.message || payload?.error || "request failed"}`);
    }

    const items = Array.isArray(payload.items) ? payload.items : [];
    for (const item of items) {
      const normalized = normalizePinterestPin(item, output.length);
      if (normalized) output.push(normalized);
    }
    bookmark = payload.bookmark || "";
    page += 1;
  } while (bookmark && page < 100);

  return output;
}

async function fetchApifyDatasetPins() {
  const token = process.env.APIFY_TOKEN || "";
  if (!token) {
    throw new Error("APIFY_TOKEN is not configured. Configure an Apify scheduled scraper dataset/task for saved-pin mirror sync.");
  }

  const datasetId = process.env.APIFY_PINTEREST_DATASET_ID || "";
  const taskId = process.env.APIFY_PINTEREST_TASK_ID || "";
  const actorTaskId = datasetId || (taskId ? await fetchApifyTaskDatasetId(taskId, token) : "");
  if (!actorTaskId) {
    throw new Error("APIFY_PINTEREST_DATASET_ID or APIFY_PINTEREST_TASK_ID is required for Apify Pinterest mirror sync.");
  }

  const output = [];
  const pageSize = 1000;
  let offset = 0;
  while (offset < 100000) {
    const url = new URL(`https://api.apify.com/v2/datasets/${encodeURIComponent(actorTaskId)}/items`);
    url.searchParams.set("token", token);
    url.searchParams.set("format", "json");
    url.searchParams.set("clean", "true");
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url);
    const items = await response.json().catch(() => []);
    if (!response.ok) {
      throw new Error(`Apify dataset ${response.status}: ${items?.error?.message || "request failed"}`);
    }
    if (!Array.isArray(items) || !items.length) break;
    for (const item of items) {
      const normalized = normalizeApifyPinterestPin(item, output.length);
      if (normalized) output.push(normalized);
    }
    if (items.length < pageSize) break;
    offset += pageSize;
  }

  return output;
}

async function fetchApifyTaskDatasetId(taskId, token) {
  const url = new URL(`https://api.apify.com/v2/actor-tasks/${encodeURIComponent(taskId)}/runs/last`);
  url.searchParams.set("token", token);
  url.searchParams.set("status", "SUCCEEDED");
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Apify task ${response.status}: ${payload?.error?.message || "request failed"}`);
  }
  return payload?.data?.defaultDatasetId || "";
}

function normalizePinterestPin(pin, positionIndex) {
  const pinId = String(pin.id || "").trim();
  const previewUrl =
    pin.media?.images?.["600x"]?.url ||
    pin.media?.images?.["400x300"]?.url ||
    pin.media?.images?.["150x150"]?.url ||
    pin.media?.image_cover_url ||
    "";
  if (!pinId || !previewUrl) return null;
  return {
    pinId,
    pinUrl: pin.link || `https://www.pinterest.com/pin/${pinId}/`,
    imagePreviewUrl: previewUrl,
    title: pin.title || pin.alt_text || "Pinterest Pin",
    description: pin.description || "",
    boardId: pin.board_id || "",
    positionIndex,
    raw: pin,
  };
}

function normalizeApifyPinterestPin(item, positionIndex) {
  const rawUrl = item.pinUrl || item.url || item.link || item.sourceUrl || "";
  const pinId =
    String(item.id || item.pinId || "").trim() ||
    String(rawUrl).match(/\/pin\/([^/?#]+)/)?.[1] ||
    crypto.createHash("sha1").update(String(rawUrl || item.image || item.imageUrl || positionIndex)).digest("hex");
  const previewUrl =
    item.imagePreviewUrl ||
    item.imageUrl ||
    item.image ||
    item.images?.["600x"]?.url ||
    item.images?.orig?.url ||
    item.media?.images?.["600x"]?.url ||
    "";
  if (!pinId || !previewUrl) return null;
  return {
    pinId,
    pinUrl: rawUrl || `https://www.pinterest.com/pin/${pinId}/`,
    imagePreviewUrl: previewUrl,
    title: item.title || item.alt || item.altText || item.description || "Pinterest Pin",
    description: item.description || item.caption || "",
    boardId: item.boardId || item.board?.id || "",
    positionIndex,
    raw: item,
  };
}

function toPartitionCollections(source, pins) {
  const pattern = Array.isArray(source.partitionPattern) && source.partitionPattern.length
    ? source.partitionPattern
    : [6, 4, 9, 12];
  const chunks = chunkByPattern(pins, pattern);
  return chunks.map((items, index) => ({
    id: `${source.id}-cluster-${index + 1}`,
    title: `${source.collectionTitle || source.title} · Cluster ${String(index + 1).padStart(2, "0")}`,
    source: "pinterest",
    sourceLabel: "PINTEREST MIRROR",
    summary: `${source.title} 当前镜像快照中的第 ${index + 1} 个视觉主题簇。`,
    mood: "Visual Bookmark Mirror",
    tags: ["pinterest", "visual reference", "mirror"],
    palette: fallbackPalette,
    coverImages: items.slice(0, 4).map((pin) => pin.image),
    images: items,
    cluster: `cluster-${index + 1}`,
    parentSourceId: source.id,
    partitionIndex: index,
    partitionSize: items.length,
    curationNote: `这个 collection 来自 ${source.title} 的镜像快照，是按 ${items.length} 张一组切出的视觉主题簇。系统只保存 Pinterest 预览图 URL、pin URL 和 metadata，不下载原图。`,
  }));
}

function chunkByPattern(items, pattern) {
  const chunks = [];
  let cursor = 0;
  let index = 0;
  while (cursor < items.length) {
    const size = Math.max(1, Number(pattern[index % pattern.length]) || 6);
    chunks.push(items.slice(cursor, cursor + size));
    cursor += size;
    index += 1;
  }
  return chunks;
}

function normalizeGatewayPin(pin) {
  return {
    id: `pin:${pin.pinId}`,
    title: pin.title || "Pinterest Pin",
    image: pin.imagePreviewUrl,
    previewUrl: pin.imagePreviewUrl,
    type: "reference",
    source: "Pinterest",
    sourceUrl: pin.pinUrl,
    summary: pin.description || pin.title || "Pinterest mirrored pin",
    note: "由 Pinterest mirror sync 写入 DataBase 的收藏记录。当前阶段不下载原图，只保留平台预览图 URL、pin URL 和 metadata。",
    tags: ["pinterest", "visual reference"],
    palette: fallbackPalette,
    related: { visuals: [] },
  };
}

function normalizeGatewaySource(source) {
  return {
    id: source.id,
    type: source.sourceType,
    provider: source.provider,
    url: source.sourceUrl,
    mode: "bookmark-mirror",
    downloaded: false,
    activeItems: source.pinCount || 0,
    syncStatus: source.syncStatus,
    snapshotHash: source.pinsSnapshotHash || "",
    lastSyncedAt: source.lastSyncedAt,
    lastError: source.lastError || "",
  };
}

function hashPins(pins) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(pins.map((pin) => [pin.pinId, pin.imagePreviewUrl, pin.positionIndex])))
    .digest("hex");
}
