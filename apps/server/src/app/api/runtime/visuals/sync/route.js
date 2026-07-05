import { handleRuntimeDbError, readJson } from "@/lib/runtime-db";
import { syncVisualSource } from "@/lib/visual-runtime";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const result = await syncVisualSource(String(body.sourceId || "pinterest-saved-pins"));
    return Response.json(result, { status: result.ok ? 200 : result.status || 500 });
  } catch (error) {
    return handleRuntimeDbError(error);
  }
}
