export async function POST() {
  return Response.json({
    ok: true,
    stage: "building",
    steps: ["lint", "check", "build"],
  });
}
