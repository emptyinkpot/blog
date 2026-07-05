import { prewarmOpenListBookCovers } from "@/lib/openlist-cover";
import { readOpenListIndex } from "@/lib/openlist-index";
import { handleRouteError, readJson } from "@/lib/openlist-runtime";

export async function GET(request) {
  return prewarmFromInput(readQueryInput(request));
}

export async function POST(request) {
  try {
    const body = await readJsonOrEmpty(request);
    return prewarmFromInput({ ...readQueryInput(request), ...body });
  } catch (error) {
    return handleRouteError(error);
  }
}

async function prewarmFromInput(body = {}) {
  try {
    const index = readOpenListIndex();
    const files = selectFiles(index.files || [], body);
    const result = await prewarmOpenListBookCovers(files, {
      limit: body.limit || files.length || 50,
      retryMiss: body.retryMiss === true || body.retryMiss === "true" || body.retry === true || body.retry === "true",
    });

    return Response.json({
      ok: true,
      generatedAt: index.generatedAt,
      selected: files.length,
      ...result,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

async function readJsonOrEmpty(request) {
  if (!request.headers.get("content-length") && !request.headers.get("transfer-encoding")) return {};
  return readJson(request);
}

function selectFiles(files, body = {}) {
  const root = String(body.path || "").replace(/\/$/, "");
  const offset = Math.max(0, Number(body.offset || 0));
  const limit = Math.min(500, Math.max(1, Number(body.limit || 50)));

  return files
    .filter((file) => !root || file.path === root || file.path?.startsWith(`${root}/`))
    .filter((file) => !file.isDir)
    .filter((file) => [".epub", ".pdf"].includes(String(file.ext || "").toLowerCase()))
    .slice(offset, offset + limit);
}

function readQueryInput(request) {
  const params = new URL(request.url).searchParams;
  const input = {};
  for (const key of ["path", "offset", "limit", "retry", "retryMiss"]) {
    if (params.has(key)) input[key] = params.get(key);
  }
  return input;
}
