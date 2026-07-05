import {
  databaseGatewayFetch,
  getDataBaseGatewayConfig,
  getMyBlogReaderMemory,
  getMyBlogVisualSnapshot,
  getOpenListFile,
  getOpenListTargetFile,
  hasDataBaseGatewayConfig,
  listMyBlogReaderHighlights,
  listOpenListFiles,
  recordMyBlogVisualSyncResult,
  upsertMyBlogReaderHighlight,
  upsertMyBlogReaderMemory,
} from "./database-gateway-client.mjs";

export {
  databaseGatewayFetch,
  getDataBaseGatewayConfig,
  getMyBlogReaderMemory,
  getMyBlogVisualSnapshot,
  getOpenListFile,
  getOpenListTargetFile,
  hasDataBaseGatewayConfig,
  listMyBlogReaderHighlights,
  listOpenListFiles,
  recordMyBlogVisualSyncResult,
  upsertMyBlogReaderHighlight,
  upsertMyBlogReaderMemory,
};

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function handleRuntimeDbError(error) {
  const status = hasDataBaseGatewayConfig() ? error?.status || 500 : 503;
  return Response.json(
    {
      ok: false,
      error: error?.message || "DataBase Gateway runtime request failed.",
    },
    { status },
  );
}
