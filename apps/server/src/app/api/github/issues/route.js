import { getOctokit, handleRouteError, parseRepo } from "@/lib/github-runtime";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const repoRef = parseRepo(searchParams.get("repo"));
    const state = searchParams.get("state") || "open";
    const octokit = getOctokit();
    const { data } = await octokit.issues.listForRepo({
      ...repoRef,
      state,
      per_page: 50,
    });

    return Response.json({
      ok: true,
      issues: data
        .filter((issue) => !issue.pull_request)
        .map((issue) => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          htmlUrl: issue.html_url,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          labels: issue.labels.map((label) => (typeof label === "string" ? label : label.name)),
        })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
