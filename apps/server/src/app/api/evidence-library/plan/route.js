import { evidencePaths, readEvidencePlan } from "@/lib/evidence-library";

export async function GET() {
  return Response.json({
    ok: true,
    plan: readEvidencePlan(),
    paths: evidencePaths(),
  });
}
