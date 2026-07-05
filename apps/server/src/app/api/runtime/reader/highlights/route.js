import {
  handleRuntimeDbError,
  listMyBlogReaderHighlights,
  readJson,
  upsertMyBlogReaderHighlight,
} from "@/lib/runtime-db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const upstream = {};
    for (const key of ["objectId", "articleId", "limit"]) {
      const value = searchParams.get(key);
      if (value) upstream[key] = value;
    }
    const body = await listMyBlogReaderHighlights(upstream);
    return Response.json(body);
  } catch (error) {
    return handleRuntimeDbError(error);
  }
}

export async function POST(request) {
  try {
    const body = await readJson(request);
    const result = await upsertMyBlogReaderHighlight(body);
    return Response.json(result);
  } catch (error) {
    return handleRuntimeDbError(error);
  }
}
