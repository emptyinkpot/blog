import { spawnSync } from 'node:child_process';
const remote = process.env.MYBLOG_VAULT_REMOTE || 'ubuntu@124.220.233.126';

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
echo "--- services"
systemctl is-active myblog-runtime-content-projector.service
echo "--- paths"
test -d /home/vault/obsidian-git
test -d /home/vault/obsidian-git/.git
git -C /home/vault/obsidian-git status --short --branch
echo "--- projector"
systemctl cat myblog-runtime-content-projector.service | grep -F "MYBLOG_VAULT_ROOT=/home/vault/obsidian-git"
systemctl cat myblog-runtime-content-projector.service | grep -F "MYBLOG_VAULT_WATCH_ROOT=/home/vault/obsidian-git"
systemctl cat myblog-runtime-content-projector.service | grep -F "MYBLOG_RUNTIME_OPENLIST_ROOT_LABEL=/openlist/obsidian-git"
echo "--- runtime identity"
python3 - <<'PY'
import json
import subprocess
from pathlib import Path
index = Path('/srv/myblog/site/runtime/content-index.json')
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
    if not str(item.get('openlistPath') or '').startswith('/openlist/obsidian-git/')
    or not str(item.get('openlistUrl') or '').startswith('/openlist/obsidian-git/')
]
bad_source_path = [
    item.get('slug')
    for item in articles
    if not str(item.get('sourcePath') or '').startswith('/home/vault/obsidian-git/')
]
if bad_source:
    raise SystemExit(f'runtime article source leaks /home/vault: {bad_source[:5]}')
if missing_openlist:
    raise SystemExit(f'runtime article missing OpenList identity: {missing_openlist[:5]}')
if bad_source_path:
    raise SystemExit(f'runtime article sourcePath is not Linux hot mirror: {bad_source_path[:5]}')
first_url = str(articles[0].get('openlistUrl') or '')
if not first_url.startswith('/openlist/obsidian-git/'):
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
