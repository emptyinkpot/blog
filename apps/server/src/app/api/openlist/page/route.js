import { getCachedOrRenderedPdfPage } from "@/lib/openlist-pdf-pages";
import { handleRouteError } from "@/lib/openlist-runtime";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = await getCachedOrRenderedPdfPage({
      bookId: searchParams.get("bookId") || "",
      path: searchParams.get("path") || "",
      modified: searchParams.get("modified") || "",
      size: searchParams.get("size") || "",
      page: searchParams.get("page") || "1",
    });

    if (!page) {
      return Response.json(
        {
          ok: false,
          error: "PDF page is not available. Ensure the OpenList source file is cached first.",
        },
        {
          status: 404,
          headers: {
            "cache-control": "private, max-age=60",
          },
        },
      );
    }

    return new Response(page.body, {
      status: 200,
      headers: {
        "content-type": page.contentType,
        "cache-control": "public, max-age=31536000, immutable",
        "x-openlist-page-cache": page.cacheStatus,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
