import fs from 'node:fs';
import path from 'node:path';
import { readProjectFacts } from './project-facts.mjs';

const rootDir = process.cwd();
const projectFacts = readProjectFacts(rootDir);
const canonicalPaths = projectFacts.paths;
const issues = [];

validateMigrationStatus();
validateThreePillars();
validatePackageScripts();
validateGitHubPagesRetired();
validateWorkspaceGovernance();
validateMatureReplacementContract();
validateContentInfrastructureReductionContract();
validateStabilizationSprint();
validateObsidianAuthorityContract();
validateOpenListServerStorageBoundary();
validateKnowledgeOsCore();
validateDocumentationIsNotFactsTruth();

if (issues.length) {
  console.error(['Repository governance validation failed:', ...issues.map((issue) => `- ${issue}`)].join('\n'));
  process.exit(1);
}

console.log('Repository governance validation passed');

function validateMigrationStatus() {
  const source = readText(resolvePath('README.md'));

  if (!source.includes('Runtime MarkdownObject article projection')) {
    issues.push('README.md must document the Runtime MarkdownObject article projection without copying concrete facts paths');
  }

  if (source.split('\n').some((line) => line.includes('Astro posts') && line.includes('现行'))) {
    issues.push('README.md still marks Astro posts as current content authority');
  }
}

function validateThreePillars() {
  const packageJson = JSON.parse(readText(resolvePath('package.json')));
  const scripts = packageJson.scripts ?? {};

  if (scripts.run !== 'npm run run:web') {
    issues.push('package.json scripts.run must be the canonical run entry and delegate to run:web');
  }

  if (scripts.verify !== 'npm run verify:all') {
    issues.push('package.json scripts.verify must be the canonical verify entry and delegate to verify:all');
  }

  if (scripts.facts !== 'npm run facts:print') {
    issues.push('package.json scripts.facts must be the canonical facts entry and delegate to facts:print');
  }

  const requiredInternalScripts = {
    'run:web': 'npm --prefix apps/web run dev',
    'run:projector': 'node tools/server-runtime-content-projector.mjs',
    'verify:all': 'npm run check && npm run verify:vault-sync',
    'verify:governance': 'node tools/validate-repo-governance.mjs',
    'facts:print': 'node tools/project-facts.mjs --print'
  };

  Object.entries(requiredInternalScripts).forEach(([name, expectedCommand]) => {
    if (scripts[name] !== expectedCommand) {
      issues.push(`package.json scripts.${name} must be ${expectedCommand}`);
    }
  });

  const legacyAliasExpectations = {
    dev: 'npm run run:web',
    preview: 'npm run run:preview',
    astro: 'npm run run:astro',
    lint: 'npm run verify:lint',
    'check:vault-sync': 'npm run verify:vault-sync',
    'check:governance': 'npm run verify:governance',
    'runtime:content:server': 'npm run run:projector',
    'runtime:content:sse': 'npm run run:sse',
    'server:openlist-storage': 'npm run run:openlist-storage'
  };

  Object.entries(legacyAliasExpectations).forEach(([name, expectedCommand]) => {
    if (scripts[name] !== expectedCommand) {
      issues.push(`legacy package.json script ${name} must delegate to three-pillar internal command: ${expectedCommand}`);
    }
  });

  Object.entries(scripts).forEach(([name, command]) => {
    if (name.includes(':')) return;
    if (['run', 'verify', 'facts', 'check', 'build', 'deploy', 'dev', 'preview', 'astro', 'lint'].includes(name)) return;
    if (/^(admin|quartz|android|runtime|check|server|import|new|semantic|refresh):/.test(name)) return;
    const commandText = String(command);
    if (!/^npm run (run|verify|facts)(:|$)/.test(commandText)) {
      issues.push(`top-level package.json script ${name} must delegate to run/verify/facts or be explicitly classified`);
    }
  });

  const checkCommand = String(scripts.check || '');
  if (!checkCommand.includes('verify:content') || !checkCommand.includes('verify:governance')) {
    issues.push('package.json scripts.check must delegate validation steps through verify:* commands');
  }

  if (!fileExists('project.json')) {
    issues.push('project.json must exist as the facts entry');
  }

  const factsReader = readText(resolvePath('tools/project-facts.mjs'));
  if (!factsReader.includes("path.join(rootDir, 'project.json')")) {
    issues.push('tools/project-facts.mjs must read project.json as the only facts owner');
  }
}

function validatePackageScripts() {
  const packageJsonPath = resolvePath('package.json');
  const packageJson = JSON.parse(readText(packageJsonPath));
  const scripts = packageJson.scripts ?? {};

  Object.entries(scripts).forEach(([name, command]) => {
    const normalizedCommand = String(command).toLowerCase();
    if (normalizedCommand.includes('hexo')) {
      issues.push(`Hexo command is no longer allowed in package scripts: ${name}`);
    }

    if (name === 'runtime:content:sync' || name.startsWith('sync:obsidian-home')) {
      issues.push(`Deprecated Windows content sync script must not be exposed as a normal package script: ${name}`);
    }

    if (
      normalizedCommand.includes('watch-obsidian-home-sync') ||
      normalizedCommand.includes('sync-runtime-content-index')
    ) {
      issues.push(`Deprecated Windows watcher/scp runtime sync command must not be exposed in package scripts: ${name}`);
    }
  });
}

function validateGitHubPagesRetired() {
  const workflowPath = resolvePath('.github/workflows/pages.yml');

  if (fs.existsSync(workflowPath)) {
    issues.push('Production GitHub Pages workflow must stay retired: .github/workflows/pages.yml must not exist');
  }

  const pagesWorkflows = fs
    .readdirSync(resolvePath('.github/workflows'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /pages/i.test(entry.name))
    .map((entry) => entry.name);

  if (pagesWorkflows.length) {
    issues.push(`GitHub Pages workflows must be removed after repository rename to blog: ${pagesWorkflows.join(', ')}`);
  }
}

function validateWorkspaceGovernance() {
  const manifestPath = resolvePath('workspace.manifest.json');
  if (!fs.existsSync(manifestPath)) {
    issues.push('workspace.manifest.json is required so build/deploy authority is machine-readable');
    return;
  }

  const manifest = JSON.parse(readText(manifestPath));
  const project = JSON.parse(readText(resolvePath('project.json')));
  const requiredCapabilityKeys = [
    'canBuild',
    'canDeploy',
    'canModifyRuntime',
    'canTouchPWA',
    'canModifyRuntimeSchema',
    'canModifyOpenListAuthority'
  ];

  if (!manifest.workspaceId) {
    issues.push('workspace.manifest.json is missing workspaceId');
  }
  if (!manifest.workspaceType) {
    issues.push('workspace.manifest.json is missing workspaceType');
  }
  if (!manifest.capabilities || typeof manifest.capabilities !== 'object') {
    issues.push('workspace.manifest.json is missing capabilities');
  } else {
    requiredCapabilityKeys.forEach((key) => {
      if (typeof manifest.capabilities[key] !== 'boolean') {
        issues.push(`workspace.manifest.json capabilities.${key} must be boolean`);
      }
    });
  }

  if (!fileExists('tools/deploy-guard.mjs')) {
    issues.push('tools/deploy-guard.mjs is required for deployment authority checks');
  }
  if (!fileExists('tools/deploy-static-site.mjs')) {
    issues.push('tools/deploy-static-site.mjs is required so deploys go through deploy guard');
  }
  if (!fileExists('workspaces/canonical.json')) {
    issues.push('workspaces/canonical.json is required');
  }
  if (!fileExists('workspaces/experimental.json')) {
    issues.push('workspaces/experimental.json is required');
  }
  if (!fileExists('workspaces/sandbox.json')) {
    issues.push('workspaces/sandbox.json is required');
  }

  const allowedRoots = [manifest.root, ...(manifest.allowedRoots ?? [])].filter(Boolean);
  if (project.localSourceRoot && !allowedRoots.includes(project.localSourceRoot)) {
    issues.push('workspace.manifest.json allowedRoots must include project.json localSourceRoot');
  }

  if (manifest.workspaceType === 'canonical' && manifest.deploymentAuthority !== true) {
    issues.push('canonical workspace must declare deploymentAuthority=true');
  }

  const packageJson = JSON.parse(readText(resolvePath('package.json')));
  if (!packageJson.scripts?.['check:workspace']) {
    issues.push('package.json is missing check:workspace script');
  }
  if (!packageJson.scripts?.['deploy:site']) {
    issues.push('package.json is missing deploy:site script');
  }
}

function validateMatureReplacementContract() {
  const requiredTerms = ['Syncthing', 'Quartz', 'Contentlayer', 'Meilisearch', 'Coolify', 'Immich'];
  const readme = readText(resolvePath('README.md'));
  const project = readText(resolvePath('project.json'));
  const codex = readText(resolvePath('apps/web/src/data/architectureCodex.ts'));

  requiredTerms.forEach((term) => {
    if (!readme.includes(term)) {
      issues.push(`README.md must include mature replacement layer: ${term}`);
    }
    if (!project.includes(term)) {
      issues.push(`project.json must include mature replacement layer: ${term}`);
    }
    if (!codex.includes(term)) {
      issues.push(`architectureCodex.ts must include mature replacement layer: ${term}`);
    }
  });

  if (!readme.includes('Payload / Directus')) {
    issues.push('README.md must document Payload / Directus as the object and metadata admin replacement lane');
  }
  if (!project.includes('Payload or Directus')) {
    issues.push('project.json must document Payload or Directus as the object and metadata admin replacement lane');
  }
  if (!codex.includes('Payload / Directus')) {
    issues.push('architectureCodex.ts must document Payload / Directus as the object and metadata admin replacement lane');
  }
}

function validateContentInfrastructureReductionContract() {
  const readme = readText(resolvePath('README.md'));
  const project = JSON.parse(readText(resolvePath('project.json')));
  const projectText = readText(resolvePath('project.json'));
  const codex = readText(resolvePath('apps/web/src/data/architectureCodex.ts'));
  const reduction = project.contentInfrastructureReduction;

  if (!reduction || reduction.status !== 'target-policy-active') {
    issues.push('project.json must declare contentInfrastructureReduction.status target-policy-active');
    return;
  }

  const requiredTerms = [
    'Content Infrastructure Reduction',
    'Quartz',
    'Contentlayer',
    'Meilisearch',
    'Coolify',
    'giant runtime JSON',
    'OpenList'
  ];

  requiredTerms.forEach((term) => {
    if (!readme.includes(term)) {
      issues.push(`README.md must document Content Infrastructure Reduction term: ${term}`);
    }
    if (!projectText.toLowerCase().includes(term.toLowerCase())) {
      issues.push(`project.json must document Content Infrastructure Reduction term: ${term}`);
    }
    if (!codex.includes(term)) {
      issues.push(`architectureCodex.ts must document Content Infrastructure Reduction term: ${term}`);
    }
  });

  const candidates = reduction.targetCandidates ?? {};
  const requiredCandidateStatuses = {
    quartz: 'embedded-integration',
    contentlayer: 'candidate-not-installed',
    meilisearch: 'target-not-deployed',
    coolify: 'candidate-not-deployed'
  };

  Object.entries(requiredCandidateStatuses).forEach(([name, status]) => {
    if (candidates[name]?.status !== status) {
      issues.push(`project.json contentInfrastructureReduction.targetCandidates.${name}.status must be ${status}`);
    }
  });

  const openListBoundary = String(reduction.activeNow?.openListBoundary ?? '');
  ['runtime build', 'projection', 'database', 'Pagefind', 'Astro dist', 'Syncthing hot mirror', 'node_modules'].forEach((term) => {
    if (!openListBoundary.includes(term)) {
      issues.push(`project.json contentInfrastructureReduction.activeNow.openListBoundary must forbid OpenList as ${term}`);
    }
  });

  const forbiddenText = (reduction.forbidden ?? []).join('\n');
  ['content-index.json', 'bespoke watcher', 'RSS race', 'Quartz', 'Contentlayer', 'Meilisearch', 'Coolify', 'OpenList'].forEach((term) => {
    if (!forbiddenText.includes(term)) {
      issues.push(`project.json contentInfrastructureReduction.forbidden must include ${term}`);
    }
  });

  const referenceSystems = project.runtimeFederation?.referenceSystems ?? {};
  if (referenceSystems.quartz?.status && !['reference / substrate candidate', 'embedded integration'].includes(referenceSystems.quartz.status)) {
    issues.push('project.json runtimeFederation.referenceSystems.quartz must remain reference/substrate or embedded integration');
  }
  if (referenceSystems.contentlayer?.status !== 'candidate-not-installed') {
    issues.push('project.json runtimeFederation.referenceSystems.contentlayer must remain candidate-not-installed');
  }
  if (referenceSystems.meilisearch?.status !== 'target-not-deployed') {
    issues.push('project.json runtimeFederation.referenceSystems.meilisearch must remain target-not-deployed');
  }
  if (referenceSystems.coolify?.status !== 'candidate-not-deployed') {
    issues.push('project.json runtimeFederation.referenceSystems.coolify must remain candidate-not-deployed');
  }

  if (!String(reduction.activeNow?.search ?? '').includes('not unified full-site dynamic search')) {
    issues.push('project.json contentInfrastructureReduction.activeNow.search must say current search is not unified full-site dynamic search');
  }
  if (project.quartzIntegration?.root !== 'integrations/quartz') {
    issues.push('project.json quartzIntegration.root must be integrations/quartz');
  }
  if (!String(project.quartzIntegration?.rule ?? '').includes('apps/web Astro shell remains the primary frontend')) {
    issues.push('project.json quartzIntegration.rule must keep apps/web Astro shell as primary frontend');
  }
  if (!readme.includes('上线前 Pagefind 只叫静态 archive 搜索，不叫全站统一搜索')) {
    issues.push('README.md must prevent Pagefind from being documented as unified full-site search before Meilisearch');
  }

  if (!readme.includes('topic collection 只作为 metadata / search / Graph 维度')) {
    issues.push('README.md must document that topic collections are dimensions, not static collection pages');
  }
  if (!String(project.contentPipeline?.runtimeProjection?.collectionSchema?.surfaceRule ?? '').includes('topic collections remain metadata/search/Graph dimensions')) {
    issues.push('project.json contentPipeline.runtimeProjection.collectionSchema.surfaceRule must prevent topic collections from static collection page generation');
  }
  if (!codex.includes('topic collection 只作为 metadata / search / Graph 维度')) {
    issues.push('architectureCodex.ts must document that topic collections are dimensions, not static collection pages');
  }
  const runtimeContent = readText(resolvePath('apps/web/src/lib/runtimeContent.ts'));
  if (!runtimeContent.includes("collection.basis === 'topic'")) {
    issues.push('apps/web/src/lib/runtimeContent.ts must filter topic collections out of static collection surfaces');
  }
}

function validateStabilizationSprint() {
  const project = JSON.parse(readText(resolvePath('project.json')));
  const readme = readText(resolvePath('README.md'));
  const codex = readText(resolvePath('apps/web/src/data/architectureCodex.ts'));
  const sprint = project.stabilizationSprint;

  if (!sprint || sprint.status !== 'active') {
    issues.push('project.json must declare active stabilizationSprint before adding more target runtimes');
    return;
  }

  if (sprint.mode !== 'reduction-not-feature-sprint') {
    issues.push('stabilizationSprint.mode must be reduction-not-feature-sprint');
  }

  const frozen = sprint.frozenTargetRuntimes ?? {};
  ['appflowyCloud', 'immich', 'directus', 'meilisearch'].forEach((name) => {
    if (!frozen[name]) {
      issues.push(`stabilizationSprint.frozenTargetRuntimes.${name} is required`);
      return;
    }
    if (frozen[name].allowStart !== false) {
      issues.push(`stabilizationSprint.frozenTargetRuntimes.${name}.allowStart must remain false during stabilization`);
    }
  });

  ['Syncthing', 'MarkdownObject', 'Quartz'].forEach((term) => {
    if (!readme.includes(term)) {
      issues.push(`README.md must include stabilization priority: ${term}`);
    }
    if (!codex.includes(term)) {
      issues.push(`architectureCodex.ts must include stabilization priority: ${term}`);
    }
  });

  if (!readme.includes('AppFlowy 只保留') && !readme.includes('AppFlowy 只保留 `infra/appflowy-cloud/` skeleton')) {
    issues.push('README.md must explicitly say AppFlowy remains skeleton-only during stabilization');
  }

  if (!project.contentPipeline?.vaultSync || project.contentPipeline.vaultSync.status !== 'active') {
    issues.push('project.json must mark contentPipeline.vaultSync.status active after Linux Vault sync cutover');
  }

  if (!project.contentPipeline?.commands?.vaultSyncCheck) {
    issues.push('project.json must expose a repeatable vaultSyncCheck command');
  }

  if (!readme.includes('npm run verify')) {
    issues.push('README.md must document npm run verify as the canonical verification entry');
  }

  if (!codex.includes('obsidian-vault') || !codex.includes('facts-entry Linux hot mirror') || !codex.includes('facts-entry OpenList public root')) {
    issues.push('architectureCodex.ts must document the active obsidian-vault Syncthing folder, Linux hot mirror, and OpenList public root as facts-entry concepts');
  }
}

function validateObsidianAuthorityContract() {
  const checkedFiles = ['project.json'];

  const requiredTerms = [
    [windowsPathMatcher(canonicalPaths.windowsVaultRoot), `Windows Obsidian authoring truth: ${canonicalPaths.windowsVaultRoot}`],
    [textMatcher(canonicalPaths.linuxVaultRoot), `Linux runtime hot mirror: ${canonicalPaths.linuxVaultRoot}`],
    [textMatcher(canonicalPaths.openListRoot), `OpenList content control plane: ${canonicalPaths.openListRoot}`],
    [/content control plane/, 'OpenList content control plane term']
  ];

  checkedFiles.forEach((relativePath) => {
    const source = readText(resolvePath(relativePath));
    requiredTerms.forEach(([pattern, label]) => {
      if (!pattern.test(source)) {
        issues.push(`${relativePath} must include ${label}`);
      }
    });
  });

  const stalePatterns = [
    {
      pattern: /OpenList\s+\/Vault|\/Vault maps|\/Vault 映射/,
      message: 'stale OpenList /Vault mapping must not be documented as active'
    },
    {
      pattern: /Linux \/home\/vault file truth|Linux:\/home\/vault"/,
      message: `Linux /home/vault must not be documented as file truth; use ${canonicalPaths.linuxVaultRoot} hot mirror`
    },
    {
      pattern: /\/home\/vault\/image/,
      message: `Vault image mirror must live under ${canonicalPaths.linuxVaultRoot}/image`
    },
    {
      pattern: /\/夸克网盘\/obsidian\/data\/docs.*真源|真源.*\/夸克网盘\/obsidian\/data/,
      message: 'legacy /夸克网盘/obsidian/data must not be documented as Obsidian truth'
    },
    {
      pattern: /Remotely Save.*负责完整 Vault 文件同步/,
      message: 'Remotely Save must not be documented as the current active Vault sync owner'
    }
  ];

  checkedFiles.forEach((relativePath) => {
    const source = readText(resolvePath(relativePath));
    stalePatterns.forEach(({ pattern, message }) => {
      if (pattern.test(source)) {
        issues.push(`${relativePath}: ${message}`);
      }
    });
  });
}

function validateOpenListServerStorageBoundary() {
  const checkedFiles = ['project.json'];

  const requiredTerms = [
    [textMatcher(canonicalPaths.openListMountPath), `OpenList local ${canonicalPaths.openListMountPath} mount`],
    [/\/腾讯云COS/, 'Tencent COS OpenList cold/blob mount'],
    [/\/夸克网盘/, 'Quark OpenList cold/legacy mount'],
    [/server:openlist-storage/, 'server OpenList storage maintenance command'],
    [/openlist-files/, 're-generable OpenList reader file cache'],
    [/系统盘|system disk|system\/hot disk|系统盘或热运行盘/, 'OpenList must not be a system/hot disk'],
    [/cold archive|冷归档/, 'OpenList/COS/Quark cold archive role']
  ];

  checkedFiles.forEach((relativePath) => {
    const source = readText(resolvePath(relativePath));
    requiredTerms.forEach(([pattern, label]) => {
      if (!pattern.test(source)) {
        issues.push(`${relativePath} must document ${label}`);
      }
    });
  });

  const readme = readText(resolvePath('README.md'));
  const project = JSON.parse(readText(resolvePath('project.json')));
  const packageJson = JSON.parse(readText(resolvePath('package.json')));

  if (!packageJson.scripts?.['server:openlist-storage']) {
    issues.push('package.json must expose server:openlist-storage');
  }

  const expectedOpenListLocalMount = `OpenList:${canonicalPaths.openListMountPath} -> Linux:${canonicalPaths.openListMountTarget}`;
  if (project.openListLocalMount !== expectedOpenListLocalMount) {
    issues.push(`project.json openListLocalMount must be ${expectedOpenListLocalMount}`);
  }

  const publicRoots = project.openListPublicRoots ?? [];
  [canonicalPaths.openListMountPath, '/腾讯云COS', '/夸克网盘'].forEach((root) => {
    if (!publicRoots.includes(root)) {
      issues.push(`project.json openListPublicRoots must include ${root}`);
    }
  });

  if (!project.serverStorageBoundary?.maintenanceCommand?.includes('server:openlist-storage')) {
    issues.push('project.json serverStorageBoundary must expose npm run server:openlist-storage');
  }

  if (!String(project.serverStorageBoundary?.coldLayerRule || '').includes('not an ext4/system disk replacement')) {
    issues.push('project.json serverStorageBoundary.coldLayerRule must forbid treating OpenList as an ext4/system disk replacement');
  }

  const sourceMap = project.sourceOfTruthMap ?? {};
  if (sourceMap.openListLocalMount !== project.openListLocalMount) {
    issues.push('project.json sourceOfTruthMap.openListLocalMount must mirror the active top-level OpenList local mount');
  }

  const sourceRoots = sourceMap.openListPublicRoots ?? [];
  [canonicalPaths.openListMountPath, '/腾讯云COS', '/夸克网盘'].forEach((root) => {
    if (!sourceRoots.includes(root)) {
      issues.push(`project.json sourceOfTruthMap.openListPublicRoots must include ${root}`);
    }
  });

  if (!sourceMap.serverStorageBoundary?.maintenanceCommand?.includes('server:openlist-storage')) {
    issues.push('project.json sourceOfTruthMap.serverStorageBoundary must expose npm run server:openlist-storage');
  }

  if (!String(sourceMap.serverStorageBoundary?.coldLayerRule || '').includes('not an ext4/system disk replacement')) {
    issues.push('project.json sourceOfTruthMap.serverStorageBoundary.coldLayerRule must forbid treating OpenList as an ext4/system disk replacement');
  }

  if (!readme.includes('npm run facts')) {
    issues.push('README.md must point users to npm run facts for concrete OpenList and runtime paths');
  }

  if (!readme.includes('try_files $uri $uri/index.html =404')) {
    issues.push('README.md must document static route 404 semantics for Nginx');
  }
  if (!String(project.nginxStaticRouteRule ?? '').includes('try_files $uri $uri/index.html =404')) {
    issues.push('project.json nginxStaticRouteRule must forbid SPA-style /index.html fallback');
  }
}

function validateKnowledgeOsCore() {
  const readme = readText(resolvePath('README.md'));
  const project = JSON.parse(readText(resolvePath('project.json')));
  const codex = readText(resolvePath('apps/web/src/data/architectureCodex.ts'));

  [
    'Core topology: `Vault -> Projection -> Web Runtime -> State Services`',
    'Vault',
    'Projection',
    'Web Runtime',
    'State Services'
  ].forEach((term) => {
    if (!readme.includes(term)) {
      issues.push(`README.md must include Knowledge OS Core term: ${term}`);
    }
  });

  const topology = project.knowledgeOsCore?.topology ?? [];
  const expected = ['Vault', 'Projection', 'Web Runtime', 'State Services'];
  if (project.knowledgeOsCore?.status !== 'active') {
    issues.push('project.json must declare knowledgeOsCore.status active');
  }
  if (JSON.stringify(topology) !== JSON.stringify(expected)) {
    issues.push('project.json knowledgeOsCore.topology must be Vault -> Projection -> Web Runtime -> State Services');
  }
  if (project.knowledgeOsCore?.vault?.root !== `Windows:${canonicalPaths.windowsVaultRoot}`) {
    issues.push(`project.json knowledgeOsCore.vault.root must be Windows:${canonicalPaths.windowsVaultRoot}`);
  }
  if (project.knowledgeOsCore?.projection?.activeArticleProjection !== 'public-data/runtime/content-index.json') {
    issues.push('project.json knowledgeOsCore.projection.activeArticleProjection must be public-data/runtime/content-index.json');
  }
  if (!codex.includes('Vault -> Projection -> Web Runtime -> State Services')) {
    issues.push('architectureCodex.ts must include the Knowledge OS Core topology');
  }
}

function validateDocumentationIsNotFactsTruth() {
  const docs = [
    ['README.md', readText(resolvePath('README.md'))],
    ['apps/web/src/data/architectureCodex.ts', readText(resolvePath('apps/web/src/data/architectureCodex.ts'))]
  ];

  const forbiddenFactCopies = [
    canonicalPaths.windowsVaultRoot,
    canonicalPaths.linuxVaultRoot,
    canonicalPaths.openListRoot,
    canonicalPaths.openListMountPath,
    canonicalPaths.openListMountTarget,
    canonicalPaths.serverRuntimeProjectorWorkspace,
    canonicalPaths.productionSiteRoot
  ].filter(Boolean);

  docs.forEach(([relativePath, source]) => {
    forbiddenFactCopies.forEach((fact) => {
      const escapedFact = fact.replaceAll('\\', '\\\\');
      if (source.includes(fact) || source.includes(escapedFact)) {
        issues.push(`${relativePath} must not copy facts entry value ${fact}; use npm run facts/project.json instead`);
      }
    });
  });
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function fileExists(relativePath) {
  return fs.existsSync(resolvePath(relativePath));
}

function resolvePath(relativePath) {
  return path.resolve(rootDir, relativePath);
}

function textMatcher(value) {
  return {
    test(source) {
      return String(source).includes(value);
    }
  };
}

function windowsPathMatcher(value) {
  const escapedJsonPath = value.replaceAll('\\', '\\\\');
  return {
    test(source) {
      const text = String(source);
      return text.includes(value) || text.includes(escapedJsonPath);
    }
  };
}
