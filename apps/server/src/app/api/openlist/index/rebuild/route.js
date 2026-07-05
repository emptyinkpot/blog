import { handleRouteError, readJson } from "@/lib/openlist-runtime";
import { rebuildOpenListIndex } from "@/lib/openlist-index";

export async function GET(request) {
  return rebuildFromInput(readQueryInput(request));
}

export async function POST(request) {
  try {
    const body = await readJsonOrEmpty(request);
    return rebuildFromInput({ ...readQueryInput(request), ...body });
  } catch (error) {
    return handleRouteError(error);
  }
}

async function rebuildFromInput(input) {
  try {
    const result = await rebuildOpenListIndex(input);

    return Response.json({
      ok: true,
      path: result.path,
      generatedAt: result.index.generatedAt,
      roots: result.index.roots,
      maxDepth: result.index.maxDepth,
      maxFiles: result.index.maxFiles,
      stats: result.index.stats,
      errors: result.index.errors,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

async function readJsonOrEmpty(request) {
  if (!request.headers.get("content-length") && !request.headers.get("transfer-encoding")) return {};
  return readJson(request);
}

function readQueryInput(request) {
  const params = new URL(request.url).searchParams;
  const input = {};
  for (const key of ["path", "maxDepth", "maxFiles", "refresh"]) {
    if (params.has(key)) input[key] = params.get(key);
  }
  return input;
}
