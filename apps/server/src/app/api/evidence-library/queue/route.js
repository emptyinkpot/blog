import { readUnlabeledQueue } from "@/lib/evidence-library";

export async function GET() {
  return Response.json({
    ok: true,
    queue: readUnlabeledQueue(),
  });
}
