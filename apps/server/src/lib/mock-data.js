export const dashboardCards = [
  ["Current Release", "2026-04-25-001"],
  ["Publish Status", "Healthy"],
  ["Posts", "128"],
  ["Drafts", "12"],
  ["AI Jobs", "6"],
  ["Providers", "4 / 5"],
];

export const releaseHistory = [
  "2026-04-25-001 · success",
  "2026-04-24-003 · success",
  "2026-04-24-002 · rollback",
];

export const errorHistory = [
  "build warning: missing description",
  "provider timeout: web-to-api-01",
];

export const providers = [
  {
    name: "openai-main",
    status: "healthy",
    successRate: "98%",
    latency: "820ms",
    cost: "medium",
    failCount: 1,
  },
  {
    name: "web-to-api-01",
    status: "cooldown",
    successRate: "72%",
    latency: "2400ms",
    cost: "low",
    failCount: 8,
  },
];

export const publishSteps = [
  "checking",
  "building",
  "uploading",
  "switching",
  "health_checking",
  "success",
];

export const publishLogText = `[checking] npm run lint\n[checking] npm run check\n[building] npm run build\n[switching] current -> releases/2026-04-25-001\n[health] https://blog.tengokukk.com/ OK`;

export const aiPipeline = ["topic", "outline", "draft", "rewrite", "seo", "review"];
