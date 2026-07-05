import { getBranch, getOctokit, handleRouteError, parseRepo } from "@/lib/github-runtime";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const repoRef = parseRepo(searchParams.get("repo"));
    const branch = getBranch(searchParams.get("branch"));
    const perPage = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));
    const octokit = getOctokit();
    const { data } = await octokit.repos.listCommits({
      ...repoRef,
      sha: branch,
      per_page: perPage,
    });

    return Response.json({
      ok: true,
      commits: data.map((commit) => ({
        sha: commit.sha,
        htmlUrl: commit.html_url,
        message: commit.commit.message,
        date: commit.commit.author?.date,
        author: commit.author
          ? {
              login: commit.author.login,
              avatarUrl: commit.author.avatar_url,
              htmlUrl: commit.author.html_url,
            }
          : null,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
