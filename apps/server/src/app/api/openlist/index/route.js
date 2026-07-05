import { readOpenListIndex } from "@/lib/openlist-index";

export async function GET() {
  const index = readOpenListIndex();

  return Response.json({
    ok: true,
    ...index,
  });
}
