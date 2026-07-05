import { exportRemotionEvidenceManifest } from "@/lib/evidence-library";

export async function GET() {
  return Response.json({
    ok: true,
    result: exportRemotionEvidenceManifest(),
  });
}

export async function POST() {
  return Response.json({
    ok: true,
    result: exportRemotionEvidenceManifest(),
  });
}
