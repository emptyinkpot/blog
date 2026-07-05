import { getOctokit, handleRouteError } from "@/lib/github-runtime";

const DEFAULT_OWNER = "emptyinkpot";
const OWNER = process.env.GITHUB_OWNER || DEFAULT_OWNER;
const MAX_LANGUAGE_REPOS = 24;
const CACHE_TTL_MS = 60 * 1000;

let cachedPayload = null;
let cachedAt = 0;

const LANGUAGE_COLORS = {
  Astro: "#ff5d01",
  CSS: "#563d7c",
  HTML: "#e34c26",
  JavaScript: "#f1e05a",
  MDX: "#fcb32c",
  Python: "#3572a5",
  Shell: "#89e051",
  TypeScript: "#3178c6",
  Vue: "#41b883",
};

const CONTRIBUTION_LEVELS = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const CONTRIBUTION_QUERY = `
  query GitHubContributionOverview($login: String!) {
    user(login: $login) {
      login
      name
      avatarUrl
      followers {
        totalCount
      }
      following {
        totalCount
      }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          months {
            name
            firstDay
            totalWeeks
          }
          weeks {
            firstDay
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

function assertAllowedUsername(username) {
  const value = String(username || OWNER).trim();
  if (!/^[A-Za-z0-9-]+$/.test(value)) {
    const error = new Error("username is not allowed.");
    error.status = 400;
    throw error;
  }
  if (value !== OWNER) {
    const error = new Error(`username must be ${OWNER}.`);
    error.status = 403;
    throw error;
  }
  return value;
}

function monthLabel(date) {
  return new Intl.DateTimeFormat("en", { month: "short" }).format(date);
}

function buildMonthly(weeks) {
  const buckets = new Map();

  for (const week of weeks) {
    for (const day of week.days) {
      const date = new Date(`${day.date}T00:00:00Z`);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      const existing = buckets.get(key) || {
        order: key,
        label: monthLabel(date),
        value: 0,
      };
      existing.value += day.count;
      buckets.set(key, existing);
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.order.localeCompare(b.order))
    .slice(-12)
    .map(({ label, value }) => ({ label, value }));
}

function normalizeWeeks(calendarWeeks) {
  return calendarWeeks.map((week) => ({
    label: week.firstDay || week.contributionDays?.[0]?.date || "",
    days: (week.contributionDays || []).map((day) => ({
      date: day.date,
      count: day.contributionCount,
      level: CONTRIBUTION_LEVELS[day.contributionLevel] || 0,
    })),
  }));
}

function normalizeRepos(repos) {
  return repos.map((repo) => ({
    name: repo.name,
    description: repo.description || "",
    language: repo.language || "Unknown",
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    issues: repo.open_issues_count || 0,
    size: repo.size || 0,
    htmlUrl: repo.html_url,
  }));
}

function buildLanguages(languagePayloads) {
  const totals = new Map();

  for (const languageMap of languagePayloads) {
    for (const [language, bytes] of Object.entries(languageMap || {})) {
      totals.set(language, (totals.get(language) || 0) + Number(bytes || 0));
    }
  }

  const totalBytes = Array.from(totals.values()).reduce((sum, bytes) => sum + bytes, 0);
  if (!totalBytes) return [];

  const ranked = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, 7);
  const otherBytes = ranked.slice(7).reduce((sum, [, bytes]) => sum + bytes, 0);
  const slices = otherBytes ? [...top, ["Other", otherBytes]] : top;

  return slices.map(([label, bytes]) => ({
    label,
    bytes,
    percent: Math.max(1, Math.round((bytes / totalBytes) * 100)),
    color: LANGUAGE_COLORS[label] || "#6b645c",
  }));
}

function buildAnalytics(overview) {
  const heatmapWeeks = overview.weeks.map((week) => ({
    label: week.label,
    days: week.days.map((day) => ({ date: day.date, level: day.level, count: day.count })),
  }));
  const languages = overview.languages.map((language) => ({
    label: language.label,
    percent: language.percent,
    color: language.color,
  }));

  return {
    totalContributions: overview.totalContributions,
    activeDays: heatmapWeeks.flatMap((week) => week.days).filter((day) => day.count > 0).length,
    topLanguage: languages[0] || null,
    heatmapWeeks,
    monthly: overview.monthly,
    languages,
    repos: overview.repos,
  };
}

async function fetchOverview(username) {
  const octokit = getOctokit();
  const [profileResponse, reposResponse, contributionResponse] = await Promise.all([
    octokit.rest.users.getByUsername({ username }),
    octokit.rest.repos.listForUser({
      username,
      type: "owner",
      sort: "updated",
      direction: "desc",
      per_page: 30,
    }),
    octokit.graphql(CONTRIBUTION_QUERY, { login: username }),
  ]);

  const repos = normalizeRepos(reposResponse.data);
  const languagePayloads = await Promise.all(
    reposResponse.data.slice(0, MAX_LANGUAGE_REPOS).map(async (repo) => {
      try {
        const { data } = await octokit.rest.repos.listLanguages({
          owner: repo.owner.login,
          repo: repo.name,
        });
        return data;
      } catch {
        return {};
      }
    }),
  );

  const user = contributionResponse.user || {};
  const calendar = user.contributionsCollection?.contributionCalendar || {};
  const weeks = normalizeWeeks(calendar.weeks || []);
  const profile = profileResponse.data;
  const overview = {
    profile: {
      login: profile.login,
      name: user.name || profile.name || profile.login,
      avatarUrl: user.avatarUrl || profile.avatar_url,
      publicRepos: profile.public_repos,
      followers: user.followers?.totalCount ?? profile.followers,
      following: user.following?.totalCount ?? profile.following,
      updatedAt: profile.updated_at,
    },
    totalContributions: calendar.totalContributions || 0,
    months: (calendar.months || []).map((month) => month.name),
    weeks,
    monthly: buildMonthly(weeks),
    languages: buildLanguages(languagePayloads),
    repos,
  };

  return {
    ok: true,
    username,
    source: "github-runtime-graphql-rest",
    fetchedAt: new Date().toISOString(),
    overview,
    analytics: buildAnalytics(overview),
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = assertAllowedUsername(searchParams.get("username"));
    const refresh = searchParams.get("refresh") === "true";
    const now = Date.now();

    if (!refresh && cachedPayload?.username === username && now - cachedAt < CACHE_TTL_MS) {
      return Response.json(
        {
          ...cachedPayload,
          cached: true,
        },
        { headers: { "Cache-Control": "private, max-age=30" } },
      );
    }

    cachedPayload = await fetchOverview(username);
    cachedAt = now;

    return Response.json(cachedPayload, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
