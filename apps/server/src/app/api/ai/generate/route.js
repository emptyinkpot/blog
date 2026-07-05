export async function POST(request) {
  const body = await request.json();
  const topic = body?.topic || "Untitled topic";

  return Response.json({
    ok: true,
    status: "success",
    content: `P0 mock draft for: ${topic}\n\nThis route currently returns placeholder content. In P2 it must run through token-pool and the writing pipeline.`,
  });
}
