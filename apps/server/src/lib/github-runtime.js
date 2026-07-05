import { Octokit } from "@octokit/rest";

const DEFAULT_OWNER = "emptyinkpot";
const OWNER = process.env.GITHUB_OWNER || DEFAULT_OWNER;
const DEFAULT_BRANCH = process.env.GITHUB_BRANCH || "main";

const ALLOWED_PATHS = [
  /^README\.md$/,
  /^wiki\/[A-Za-z0-9._/-]+\.md$/,
  /^data\/timeline\.json$/,
  /^data\/modules\.json$/,
];

export function jsonError(message, status = 500, extra = {}) {
  return Response.json(
    {
      ok: false,
      error: message,
      ...extra,
    },
    { status },
  );
}

export function getOctokit() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    const error = new Error("GitHub token is not configured on the server.");
    error.status = 503;
    throw error;
  }

  return new Octokit({ auth: token });
}

export function parseRepo(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) {
    const error = new Error("repo must use owner/name format.");
    error.status = 400;
    throw error;
  }

  const [, owner, repo] = match;
  if (owner !== OWNER) {
    const error = new Error(`repo owner must be ${OWNER}.`);
    error.status = 403;
    throw error;
  }

  return { owner, repo };
}

export function assertWritablePath(path) {
  const value = String(path || "").trim().replaceAll("\\", "/");
  if (!value || value.startsWith("/") || value.includes("..") || value.includes("//")) {
    const error = new Error("path is not allowed.");
    error.status = 400;
    throw error;
  }

  if (!ALLOWED_PATHS.some((pattern) => pattern.test(value))) {
    const error = new Error("path is outside the allowed write set.");
    error.status = 403;
    throw error;
  }

  return value;
}

export function getBranch(value) {
  const branch = String(value || DEFAULT_BRANCH).trim();
  if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes("..")) {
    const error = new Error("branch is not allowed.");
    error.status = 400;
    throw error;
  }
  return branch;
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    const error = new Error("request body must be valid JSON.");
    error.status = 400;
    throw error;
  }
}

export function toBase64(content) {
  return Buffer.from(String(content), "utf8").toString("base64");
}

export function fromBase64(content) {
  return Buffer.from(String(content || ""), "base64").toString("utf8");
}

export function handleRouteError(error) {
  return jsonError(error instanceof Error ? error.message : String(error), error.status || 500);
}
