import {
  getOpenListFile as getDataBaseOpenListFile,
  getOpenListTargetFile,
  hasDataBaseGatewayConfig,
  listOpenListFiles as listDataBaseOpenListFiles,
} from "@/lib/runtime-db";

const DEFAULT_BASE_URL = "http://127.0.0.1:5244";
const DEFAULT_ROOT = "/夸克网盘,/Obsidian";
const DEFAULT_API_PREFIX = "/openlist";
const DEFAULT_BOOKS_TARGET_ID = "myblog-books-original";

export function jsonError(message, status = 500, extra = {}) {
  return Response.json(
    {
      ok: false,
      error: message,
      ...extra,
    },
    { status },
  );
}

export function getOpenListConfig() {
  return {
    baseUrl: String(process.env.OPENLIST_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
    apiPrefix: normalizeApiPrefix(process.env.OPENLIST_API_PREFIX ?? DEFAULT_API_PREFIX),
    token: process.env.OPENLIST_TOKEN || "",
    booksTargetId: process.env.MYBLOG_BOOKS_OPENLIST_TARGET_ID || DEFAULT_BOOKS_TARGET_ID,
    publicRoots: String(process.env.OPENLIST_PUBLIC_ROOTS || process.env.OPENLIST_PUBLIC_ROOT || DEFAULT_ROOT)
      .split(",")
      .map((item) => normalizeOpenListPath(item))
      .filter(Boolean),
  };
}

function normalizeApiPrefix(value) {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw || raw === "/") return "";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function normalizeOpenListPath(value) {
  const pathValue = String(value || "/").trim().replace(/\\/g, "/");
  const normalized = pathValue.startsWith("/") ? pathValue : `/${pathValue}`;
  return normalized.replace(/\/{2,}/g, "/");
}

export function assertPublicOpenListPath(value) {
  const normalized = normalizeOpenListPath(value);
  const segments = normalized.split("/").filter(Boolean);
  if (!normalized || segments.includes("..")) {
    const error = new Error("OpenList path is not allowed.");
    error.status = 400;
    throw error;
  }

  const { publicRoots } = getOpenListConfig();
  const allowed = publicRoots.some((root) => normalized === root || normalized.startsWith(`${root.replace(/\/$/, "")}/`));
  if (!allowed) {
    const error = new Error("OpenList path is outside public roots.");
    error.status = 403;
    throw error;
  }

  return normalized;
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    const error = new Error("request body must be valid JSON.");
    error.status = 400;
    throw error;
  }
}

export async function openListFetch(route, body, init = {}) {
  const { baseUrl, apiPrefix, token } = getOpenListConfig();
  const headers = {
    "content-type": "application/json",
    ...(token ? { authorization: token } : {}),
    ...(init.headers || {}),
  };
  const response = await fetch(`${baseUrl}${apiPrefix}${route}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = new Error(`OpenList HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  if (payload.code !== 200) {
    const error = new Error(payload.message || "OpenList request failed.");
    error.status = 502;
    throw error;
  }

  return payload.data;
}

export async function getOpenListFile(input) {
  const request = typeof input === "string" ? { path: input } : { ...(input || {}) };
  const path = String(request.path || "");
  const bookId = String(request.bookId || "");
  if (hasDataBaseGatewayConfig()) {
    const { booksTargetId } = getOpenListConfig();
    const targetPayload = bookId
      ? {
          bookId,
          password: "",
        }
      : null;
    const payload = targetPayload
      ? await getOpenListTargetFile(booksTargetId, targetPayload)
      : await getDataBaseOpenListFile({
          path: assertPublicOpenListPath(path),
          password: "",
        });
    return payload.item;
  }

  return openListFetch("/api/fs/get", {
    path: assertPublicOpenListPath(path),
    password: "",
    page: 1,
    per_page: 0,
    refresh: false,
  });
}

export async function listOpenListFiles(input = {}) {
  const path = assertPublicOpenListPath(input.path || getOpenListConfig().publicRoots[0] || "/");
  if (hasDataBaseGatewayConfig()) {
    return listDataBaseOpenListFiles({
      path,
      password: "",
      page: Number(input.page || 1),
      per_page: Math.min(200, Math.max(1, Number(input.perPage || input.per_page || 50))),
      refresh: Boolean(input.refresh),
    });
  }

  return openListFetch("/api/fs/list", {
    path,
    password: "",
    page: Number(input.page || 1),
    per_page: Math.min(200, Math.max(1, Number(input.perPage || input.per_page || 50))),
    refresh: Boolean(input.refresh),
  });
}

export function resolveRawUrl(rawUrl) {
  const { baseUrl, apiPrefix } = getOpenListConfig();
  if (!rawUrl) return "";
  if (/^https?:\/\//i.test(rawUrl)) {
    if (hasDataBaseGatewayConfig()) return rawUrl;

    const parsed = new URL(rawUrl);
    if (apiPrefix && (parsed.pathname === apiPrefix || parsed.pathname.startsWith(`${apiPrefix}/`))) {
      return new URL(`${parsed.pathname}${parsed.search}`, `${baseUrl}/`).toString();
    }
    return rawUrl;
  }
  return new URL(rawUrl, `${baseUrl}/`).toString();
}

export function publicFileInfo(file, path) {
  const resolvedPath = file?.path || path;
  return {
    name: file?.name || path.split("/").pop() || "",
    size: Number(file?.size || 0),
    isDir: Boolean(file?.is_dir),
    modified: file?.modified || "",
    thumb: file?.thumb || "",
    type: file?.type,
    raw_url: buildCachedRawUrl({
      path: resolvedPath,
      bookId: file?.id || "",
      modified: file?.modified || "",
      size: file?.size || "",
    }),
    id: file?.id || "",
    path: resolvedPath,
  };
}

export function buildCachedRawUrl(input = {}) {
  const params = new URLSearchParams();
  if (input.bookId) params.set("bookId", String(input.bookId));
  if (input.path) params.set("path", String(input.path));
  if (input.modified) params.set("modified", String(input.modified));
  if (input.size) params.set("size", String(input.size));
  return `/api/openlist/raw?${params.toString()}`;
}

export function handleRouteError(error) {
  return jsonError(error instanceof Error ? error.message : String(error), error.status || 500);
}
