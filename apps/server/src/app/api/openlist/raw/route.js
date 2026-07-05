import {
  createCachedSourceResponse,
  createOpenListSourceProxyResponse,
  getCachedOpenListSource,
  resolveOpenListSourceInput,
} from "@/lib/openlist-file-cache";
import { handleRouteError } from "@/lib/openlist-runtime";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const input = {
      bookId: searchParams.get("bookId") || "",
      path: searchParams.get("path") || "",
      modified: searchParams.get("modified") || "",
      size: searchParams.get("size") || "",
    };
    const resolved = await resolveOpenListSourceInput(input);
    const resolvedInput = {
      ...input,
      path: resolved.path,
      modified: resolved.modified,
      size: resolved.size,
    };
    let source = await getCachedOpenListSource(resolvedInput);
    if (!source) return createOpenListSourceProxyResponse(resolvedInput, request);

    return createCachedSourceResponse(source, request);
  } catch (error) {
    return handleRouteError(error);
  }
}
