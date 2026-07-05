import { readEvidenceManifest } from "@/lib/evidence-library";

export async function GET() {
  return Response.json({
    ok: true,
    manifest: readEvidenceManifest(),
  });
}
