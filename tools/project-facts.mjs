import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const invokedDirectly = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

process.stdout.on('error', (error) => {
  if (error.code === 'EPIPE') process.exit(0);
  throw error;
});

export function readProjectFacts(rootDir = repoRoot) {
  const projectPath = path.join(rootDir, 'project.json');
  const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
  const linuxVaultRoot = stripPrefix(project.serverHotMirrorRoot, 'Linux:');
  const windowsVaultRoot = stripPrefix(project.vaultFileTruthRoot, 'Windows:');
  const openListRoot = project.publicContentAccessRoot;
  const openListMount = parseOpenListMount(project.openListLocalMount);

  return {
    project,
    paths: {
      windowsVaultRoot,
      windowsVaultRootSlash: windowsVaultRoot.replaceAll('\\', '/'),
      linuxVaultRoot,
      openListRoot,
      openListMountPath: openListMount.mountPath,
      openListMountTarget: openListMount.target,
      serverRuntimeProjectorWorkspace: project.serverSourceCheckout?.sourceRoot,
      productionSiteRoot: project.serverSourceCheckout?.deploymentRoot || project.sourceOfTruthMap?.productionSiteRoot
    },
    github: {
      repo: project.githubRepo,
      defaultBranch: project.defaultBranch || 'main'
    }
  };
}

function stripPrefix(value, prefix) {
  const text = String(value || '');
  return text.startsWith(prefix) ? text.slice(prefix.length) : text;
}

function parseOpenListMount(value) {
  const text = String(value || '');
  const [left, right] = text.split('->').map((part) => part.trim());
  return {
    mountPath: stripPrefix(left, 'OpenList:'),
    target: stripPrefix(right, 'Linux:')
  };
}

if (invokedDirectly) {
  const facts = readProjectFacts();
  if (process.argv.includes('--print')) {
    process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`);
  } else {
    process.stdout.write('project.json\n');
  }
}
