import { providers } from "@/lib/mock-data";

export async function GET() {
  return Response.json({
    ok: true,
    providers,
  });
}
