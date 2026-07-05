import { getOpenListConfig, handleRouteError, listOpenListFiles } from "@/lib/openlist-runtime";

export async function GET() {
  try {
    const config = getOpenListConfig();
    const data = await listOpenListFiles({
      path: config.publicRoots[0],
      perPage: 1,
    });

    return Response.json({
      ok: true,
      baseUrl: config.baseUrl,
      apiPrefix: config.apiPrefix,
      publicRoots: config.publicRoots,
      total: Number(data?.total || 0),
      provider: data?.provider || "",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
