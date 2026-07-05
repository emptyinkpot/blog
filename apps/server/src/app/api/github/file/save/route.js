import {
  assertWritablePath,
  getBranch,
  getOctokit,
  handleRouteError,
  parseRepo,
  readJson,
  toBase64,
} from "@/lib/github-runtime";

async function getCurrentSha(octokit, repoRef, path, branch) {
  try {
    const { data } = await octokit.repos.getContent({
      ...repoRef,
      path,
      ref: branch,
    });

    if (!Array.isArray(data) && data.type === "file") {
      return data.sha;
    }
  } catch (error) {
    if (error.status === 404) return undefined;
    throw error;
  }

  return undefined;
}

export async function POST(request) {
  try {
    const body = await readJson(request);
    const repoRef = parseRepo(body.repo);
    const path = assertWritablePath(body.path);
    const branch = getBranch(body.branch);
    const content = String(body.content ?? "");
    const message = String(body.message || `Update ${path}`).trim();
    const octokit = getOctokit();
    const sha = await getCurrentSha(octokit, repoRef, path, branch);

    const { data } = await octokit.repos.createOrUpdateFileContents({
      ...repoRef,
      path,
      branch,
      message,
      content: toBase64(content),
      ...(sha ? { sha } : {}),
    });

    return Response.json({
      ok: true,
      path,
      branch,
      commit: {
        sha: data.commit.sha,
        htmlUrl: data.commit.html_url,
      },
      content: data.content
        ? {
            sha: data.content.sha,
            htmlUrl: data.content.html_url,
          }
        : null,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
