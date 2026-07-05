import { getOctokit, handleRouteError, parseRepo } from "@/lib/github-runtime";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const repoRef = parseRepo(searchParams.get("repo"));
    const state = searchParams.get("state") || "open";
    const octokit = getOctokit();
    const { data } = await octokit.pulls.list({
      ...repoRef,
      state,
      per_page: 50,
    });

    return Response.json({
      ok: true,
      pulls: data.map((pull) => ({
        id: pull.id,
        number: pull.number,
        title: pull.title,
        state: pull.state,
        draft: pull.draft,
        htmlUrl: pull.html_url,
        createdAt: pull.created_at,
        updatedAt: pull.updated_at,
        user: pull.user
          ? {
              login: pull.user.login,
              avatarUrl: pull.user.avatar_url,
              htmlUrl: pull.user.html_url,
            }
          : null,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
