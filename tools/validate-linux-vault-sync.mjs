import { spawnSync } from 'node:child_process';
import { readProjectFacts } from './project-facts.mjs';

const remote = process.env.MYBLOG_VAULT_REMOTE || 'ubuntu@124.220.233.126';
const projectFacts = readProjectFacts();
const linuxVaultRoot = projectFacts.paths.linuxVaultRoot;
const openListRoot = projectFacts.paths.openListRoot;
const projectorWorkspace = projectFacts.paths.serverRuntimeProjectorWorkspace;
const siteRoot = projectFacts.paths.productionSiteRoot;
const githubRepo = projectFacts.github.repo;
const defaultBranch = projectFacts.github.defaultBranch;
const fetchUrl = `https://ghproxy.net/${githubRepo}.git`;
const pushUrl = `${githubRepo}.git`;

const failures = [];

checkRemote();

if (failures.length) {
  console.error(['Linux Vault sync validation failed:', ...failures.map((failure) => `- ${failure}`)].join('\n'));
  process.exit(1);
}

console.log('Linux Vault sync validation passed');

function checkRemote() {
  const script = String.raw`
set -e
LINUX_VAULT_ROOT=${shellQuote(linuxVaultRoot)}
OPENLIST_ROOT=${shellQuote(openListRoot)}
PROJECTOR_WORKSPACE=${shellQuote(projectorWorkspace)}
SITE_ROOT=${shellQuote(siteRoot)}
DEFAULT_BRANCH=${shellQuote(defaultBranch)}
FETCH_URL=${shellQuote(fetchUrl)}
PUSH_URL=${shellQuote(pushUrl)}
echo "--- services"
systemctl is-active myblog-runtime-content-projector.service
echo "--- paths"
test -d "$LINUX_VAULT_ROOT"
test -d "$LINUX_VAULT_ROOT/.git"
git -C "$LINUX_VAULT_ROOT" status --short --branch
echo "--- projector workspace"
test -d "$PROJECTOR_WORKSPACE/.git"
git -C "$PROJECTOR_WORKSPACE" fetch origin "$DEFAULT_BRANCH"
git -C "$PROJECTOR_WORKSPACE" status --short --branch | grep -F "## $DEFAULT_BRANCH...origin/$DEFAULT_BRANCH"
test "$(git -C "$PROJECTOR_WORKSPACE" config --get remote.origin.url)" = "$FETCH_URL"
test "$(git -C "$PROJECTOR_WORKSPACE" config --get remote.origin.pushurl)" = "$PUSH_URL"
echo "--- projector"
systemctl cat myblog-runtime-content-projector.service | grep -F "MYBLOG_VAULT_ROOT=$LINUX_VAULT_ROOT"
systemctl cat myblog-runtime-content-projector.service | grep -F "MYBLOG_VAULT_WATCH_ROOT=$LINUX_VAULT_ROOT"
systemctl cat myblog-runtime-content-projector.service | grep -F "MYBLOG_RUNTIME_OPENLIST_ROOT_LABEL=$OPENLIST_ROOT"
echo "--- runtime identity"
python3 - "$SITE_ROOT" "$LINUX_VAULT_ROOT" "$OPENLIST_ROOT" <<'PY'
import json
import sys
import subprocess
from pathlib import Path
site_root, linux_vault_root, openlist_root = sys.argv[1:4]
index = Path(site_root) / 'runtime/content-index.json'
data = json.loads(index.read_text(encoding='utf-8'))
articles = data.get('articles') or []
if not articles:
    raise SystemExit('runtime content-index has no articles')
bad_source = [
    item.get('slug')
    for item in articles
    if str(item.get('source') or '').startswith('/home/vault')
]
missing_openlist = [
    item.get('slug')
    for item in articles
    if not str(item.get('openlistPath') or '').startswith(f'{openlist_root}/')
    or not str(item.get('openlistUrl') or '').startswith(f'{openlist_root}/')
]
bad_source_path = [
    item.get('slug')
    for item in articles
    if not str(item.get('sourcePath') or '').startswith(f'{linux_vault_root}/')
]
if bad_source:
    raise SystemExit(f'runtime article source leaks /home/vault: {bad_source[:5]}')
if missing_openlist:
    raise SystemExit(f'runtime article missing OpenList identity: {missing_openlist[:5]}')
if bad_source_path:
    raise SystemExit(f'runtime article sourcePath is not Linux hot mirror: {bad_source_path[:5]}')
first_url = str(articles[0].get('openlistUrl') or '')
if not first_url.startswith(f'{openlist_root}/'):
    raise SystemExit(f'first article has invalid OpenList URL: {first_url}')
subprocess.run(
    ['curl', '-fsS', f'https://blog.tengokukk.com{first_url}'],
    stdout=subprocess.DEVNULL,
    check=True
)
print(f'Runtime OpenList identity verified for {len(articles)} articles')
PY
`;

  const result = spawnSync('ssh', [remote, 'bash -s'], {
    input: script,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  if (result.status !== 0) {
    failures.push(`Remote Linux Vault validation failed:\n${result.stdout}${result.stderr}`);
  }
}

function shellQuote(value) {
  return `'${String(value || '').replaceAll("'", "'\\''")}'`;
}
