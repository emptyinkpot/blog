import {
  getBranch,
  getOctokit,
  handleRouteError,
  parseRepo,
  readJson,
  toBase64,
} from "@/lib/github-runtime";

const TIMELINE_PATH = "data/timeline.json";

async function readTimeline(octokit, repoRef, branch) {
  try {
    const { data } = await octokit.repos.getContent({
      ...repoRef,
      path: TIMELINE_PATH,
      ref: branch,
    });

    if (Array.isArray(data) || data.type !== "file") {
      return { sha: undefined, items: [] };
    }

    const raw = Buffer.from(String(data.content || ""), "base64").toString("utf8");
    const parsed = JSON.parse(raw || "[]");
    return {
      sha: data.sha,
      items: Array.isArray(parsed) ? parsed : [],
    };
  } catch (error) {
    if (error.status === 404) {
      return { sha: undefined, items: [] };
    }
    throw error;
  }
}

export async function POST(request, context) {
  try {
    const body = await readJson(request);
    const repoRef = parseRepo(body.repo);
    const branch = getBranch(body.branch);
    const title = String(body.title || "").trim();
    const summary = String(body.body || body.summary || "").trim();
    const params = await context.params;
    const slug = String(params.slug || "").trim();

    if (!title) {
      return Response.json({ ok: false, error: "title is required." }, { status: 400 });
    }

    const octokit = getOctokit();
    const current = await readTimeline(octokit, repoRef, branch);
    const item = {
      id: `${slug}-${Date.now()}`,
      project: slug,
      title,
      summary,
      date: new Date().toISOString(),
    };
    const next = [item, ...current.items];
    const content = `${JSON.stringify(next, null, 2)}\n`;

    const { data } = await octokit.repos.createOrUpdateFileContents({
      ...repoRef,
      path: TIMELINE_PATH,
      branch,
      message: `更新项目时间线：${title}`,
      content: toBase64(content),
      ...(current.sha ? { sha: current.sha } : {}),
    });

    return Response.json({
      ok: true,
      path: TIMELINE_PATH,
      branch,
      item,
      commit: {
        sha: data.commit.sha,
        htmlUrl: data.commit.html_url,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
