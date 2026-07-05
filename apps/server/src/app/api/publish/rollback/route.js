export async function POST() {
  return Response.json({
    ok: true,
    state: "rollbacked",
    rolledBackTo: "2026-04-24-003",
  });
}
