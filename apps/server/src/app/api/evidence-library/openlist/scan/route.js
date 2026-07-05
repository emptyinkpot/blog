import { scanOpenListAndQueue, scanOpenListDirectory } from "@/lib/evidence-library";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = body.enqueue === false ? await scanOpenListDirectory(body) : await scanOpenListAndQueue(body);
    return Response.json({
      ok: true,
      result,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
