import { getOctokit, handleRouteError, parseRepo } from "@/lib/github-runtime";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const repoRef = parseRepo(searchParams.get("repo"));
    const octokit = getOctokit();
    const { data } = await octokit.repos.get(repoRef);

    return Response.json({
      ok: true,
      repo: {
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        defaultBranch: data.default_branch,
        htmlUrl: data.html_url,
        language: data.language,
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        pushedAt: data.pushed_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
