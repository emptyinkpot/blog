import { getOctokit, handleRouteError, parseRepo } from "@/lib/github-runtime";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const repoRef = parseRepo(searchParams.get("repo"));
    const octokit = getOctokit();
    const { data } = await octokit.repos.listContributors({
      ...repoRef,
      per_page: 50,
    });

    return Response.json({
      ok: true,
      contributors: data.map((contributor) => ({
        id: contributor.id,
        login: contributor.login,
        avatarUrl: contributor.avatar_url,
        htmlUrl: contributor.html_url,
        contributions: contributor.contributions,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
