import { handleRuntimeDbError } from "@/lib/runtime-db";
import { readVisualSnapshot } from "@/lib/visual-runtime";

export async function GET() {
  try {
    const snapshot = await readVisualSnapshot();
    return Response.json({ ok: true, ...snapshot });
  } catch (error) {
    return handleRuntimeDbError(error);
  }
}
