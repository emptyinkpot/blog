import { handleRouteError, listOpenListFiles, normalizeOpenListPath, readJson } from "@/lib/openlist-runtime";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const path = normalizeOpenListPath(body.path || "/");
    const data = await listOpenListFiles(body);

    return Response.json({
      ok: true,
      path,
      total: Number(data?.total || 0),
      provider: data?.provider || "",
      items: (data?.content || []).map((item) => ({
        name: item.name,
        isDir: Boolean(item.is_dir),
        size: Number(item.size || 0),
        modified: item.modified,
        type: item.type,
        thumb: item.thumb || "",
        path: `${path.replace(/\/$/, "")}/${String(item.name || "").replace(/^\/+/, "")}`,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
