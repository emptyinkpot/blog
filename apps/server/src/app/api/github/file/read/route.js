import {
  assertWritablePath,
  fromBase64,
  getBranch,
  getOctokit,
  handleRouteError,
  parseRepo,
  readJson,
} from "@/lib/github-runtime";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const repoRef = parseRepo(body.repo);
    const path = assertWritablePath(body.path);
    const branch = getBranch(body.branch);
    const octokit = getOctokit();
    const { data } = await octokit.repos.getContent({
      ...repoRef,
      path,
      ref: branch,
    });

    if (Array.isArray(data) || data.type !== "file") {
      return Response.json({ ok: false, error: "path does not resolve to a file." }, { status: 400 });
    }

    return Response.json({
      ok: true,
      path,
      sha: data.sha,
      encoding: data.encoding,
      content: fromBase64(data.content),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
