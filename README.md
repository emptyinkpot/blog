# MyBlog

MyBlog is a Vault-backed knowledge projection machine. It turns Obsidian/Vault file truth into public runtime surfaces without becoming a CMS, search engine, sync engine, database owner, or architecture showcase.

This README is the only human documentation entrypoint for the repository. Machine-readable truth stays in `project.json`, `workspace.manifest.json`, `workspaces/*.json`, executable validators, and the public Architecture Codex source at `apps/web/src/data/architectureCodex.ts`.

## Runtime Identity

- Primary model: Knowledge Runtime Surface.
- Core topology: `Vault -> Projection -> Web Runtime -> State Services`.
- Collection is context. Drawer is reading. Homepage is discovery.
- Everything stays alive.
- Do not turn collections into standalone CMS pages.
- Do not replace the homepage mixed-object masonry stream with collection grids.
- Do not make topic collections prerender into static collection pages.
- Do not make feed tabs route navigation.
- Do not put card walls inside reader drawers.
- topic collection 只作为 metadata / search / Graph 维度，不生成静态 topic collection 页面。
- Static Nginx route semantics must stay explicit: `try_files $uri $uri/index.html =404`; this is not a SPA catch-all fallback.

## Knowledge OS Core

MyBlog has four active layers only:

```text
Vault
-> Projection
-> Web Runtime
-> State Services
```

- `Vault`: `E:\Vaults\Obsidian` is the only authoring truth. Markdown, folders and assets remain human-readable and offline-capable.
- `Projection`: build tools normalize Vault and sidecar data into `public-data/`; the website reads projection output instead of inventing content truth.
- `Web Runtime`: `apps/web` is Astro plus React islands. Runtime concepts are limited to command, overlay, search and reader state.
- `State Services`: `apps/admin-next` and MySQL store dynamic state only: reader memory, highlights, visual pins, preferences and sync logs.

## Source And Runtime

- GitHub repository: `https://github.com/emptyinkpot/blog`.
- Canonical production source workspace: `E:\My Project\MyBlog`.
- GitHub repository `main` is the delivery surface; GitHub Actions builds from source and deploys static output to the server.
- Production static root: `/srv/myblog/site`.
- Server runtime projector workspace: `/srv/myblog/repo`; it is a service code workspace for `myblog-runtime-content-projector.service`, not a deployment authority.
- Active article projection: `public-data/runtime/content-index.json`.
- Generated production projection: `/srv/myblog/site/runtime/content-index.json`.
- Windows Obsidian authoring truth: `E:\Vaults\Obsidian`.
- Linux runtime hot mirror: `/home/vault/obsidian-git`.
- OpenList content control plane: `/openlist/obsidian-git`.
- OpenList 本地挂载：`/obsidian-git -> /home/vault/obsidian-git`.
- OpenList public roots include `/obsidian-git`, `/腾讯云COS`, and `/夸克网盘`.

## Repository Shape

- `apps/web`: Astro public shell and frontend runtime.
- `apps/admin-next`: runtime/admin APIs, reader memory, visual runtime, GitHub/OpenList/DataBase bridges.
- `apps/android-shell`: TWA shell contract.
- `packages/runtime-kernel`: small runtime event and storage key registry used by `apps/web`; it is not a platform SDK.
- `integrations/quartz`: embedded Quartz digital-garden substrate. It is an internal integration target, not the repository root and not the primary MyBlog shell.
- `tools/*`: canonical validators, projectors, importers, and deploy guards.
- `public-data/*`: static public data projections and editable data sidecars.
- `infra/*`: service definitions and skeleton infrastructure.
- `workspaces/*` plus `workspace.manifest.json`: workspace authority.

Documentation markdown outside this README is intentionally avoided unless it is public content data. Long-lived facts belong in README, project JSON, validators, projection output, or executable code.

## DataBase Gateway Boundary

MyBlog integrates DataBase through `apps/admin-next/lib/database-gateway-client.mjs`. The adapter is SDK-first: when `@emptyinkpot/database-gateway-generated-client` is installed in the runtime, MyBlog uses the generated OpenAPI client. When the package is absent, the adapter keeps the same Gateway HTTP contract as a fallback so production builds do not depend on an unpublished package.

MyBlog must not direct-connect to DataBase MySQL. Canonical Markdown projection writes go through `POST /writes/project-obsidian-markdown`; reader memory, highlights, visual runtime, and OpenList target access go through DataBase Gateway routes exposed by the generated client contract.

Obsidian/Vault remains Markdown file truth. DataBase owns structured identity, blocks, assets, relations, semantic context, and future cross-product queries. MyBlog is only a projection client and public rendering shell.

## OpenList Storage Boundary

OpenList/COS/Quark are cold archive, blob backend, public browse, and content address surfaces. They are not an ext4/system disk replacement, system disk, hot runtime disk, runtime build system, projection authority, database, Pagefind store, Astro dist store, Syncthing hot mirror, or `node_modules` location.

The re-generable reader file cache is `openlist-files`. It may be audited or pruned through:

```bash
npm run server:openlist-storage
npm run server:openlist-storage -- --prune-openlist-file-cache --apply
```

## Runtime Database

MyBlog runtime DB is Tencent Cloud CynosDB MySQL through `apps/admin-next`. It owns dynamic state only: reader memory, reader highlights, visual sources, visual pins, visual sync runs, and the explicit plaintext personal information table.

Runtime DB must not store article Markdown bodies, EPUB/PDF/image/video blobs, OpenList files, Tencent COS objects, Quark files, Astro dist, Pagefind output, or Syncthing hot mirror data.

## AI-Native Publishing Target

Directus + Dify is the target AI-native publishing architecture, but it is not the current deployed production path until readiness, migration, and rollback evidence exist.

Target responsibilities:

- Directus/Postgres owns structured content truth: articles, drafts, authors, tags, uploads metadata, comments, SEO fields, revisions, factpacks, citations, author contracts, critic reports, and workflow run records.
- Dify owns AI workflow orchestration only: research, rewrite, writer, critic, SEO, summary, prompt, agent, and knowledge workflow execution.
- Dify must not become the CMS, content database, article truth, citation store, factpack store, revision store, or long-lived runtime run ledger.
- MyBlog/Next.js/Astro remains a presentation and projection shell. It consumes Directus API, static snapshots, or generated build artifacts; it does not become a custom CMS backend.

Target flow:

```text
User / Editor
-> MyBlog or Directus Admin
-> Directus CMS / Postgres
-> Directus webhook
-> Dify Workflow
-> AI services / LangGraph / model providers
-> Directus API write-back
-> MyBlog static or dynamic presentation
```

Current production remains Vault/MarkdownObject projection until the Directus migration is explicitly executed. Any Directus cutover must define schema ownership, secret boundaries, migration source, rollback path, sync/index latency, and proof that `article`, `factpack`, `citation`, `author_contract`, `runtime_run`, and `critic_report` collections are durable in Directus/Postgres.

## Content Infrastructure Reduction

Content Infrastructure Reduction is active. MyBlog must not keep growing into a bespoke CMS/search/sync/deploy engine or a giant runtime JSON system.

Mature replacement / substrate lanes:

- Syncthing owns Windows Vault to Linux hot mirror file sync.
- Quartz is embedded under `integrations/quartz` as a digital garden / Obsidian publishing substrate for staged evolution into MyBlog.
- Contentlayer is a typed content pipeline candidate.
- Meilisearch is the future dynamic search target; 上线前 Pagefind 只叫静态 archive 搜索，不叫全站统一搜索。
- Coolify is a deployment platform candidate.
- Immich is the media runtime candidate.
- Payload / Directus is the object and metadata admin replacement lane.

Current stabilization priority:

1. Syncthing / Linux Vault readiness.
2. MarkdownObject schema and validation.
3. Quartz integration evolution under the MyBlog shell.

AppFlowy 只保留 `infra/appflowy-cloud/` skeleton during stabilization and must not be started as an active runtime before readiness evidence.

## Frontend Runtime

- `apps/web/src/data/architectureCodex.ts` is the public Architecture Codex source.
- Frontend runtime changes must update the relevant Codex entry or state why the Codex is unaffected.
- `packages/runtime-kernel` owns frontend event names, command kinds and storage key classification only.
- `apps/web/src/components/ui` owns current React UI primitives for Storybook-indexed component APIs; it consumes runtime tokens and must not become a data/runtime truth layer.
- `apps/web/src/components/shadcn` owns source-generated shadcn/ui React components for Storybook-indexed component composition; it is separate from MyBlog primitives and does not own runtime data truth.
- Theme tokens live in `apps/web/src/styles/global.css`; do not recreate a separate design-system package until there is a real second consumer.
- Local storage is preference/cache/legacy migration only, not runtime truth.
- Homepage remains the mixed object discovery surface.

## Deployment

Deploy from the local source workspace by pushing `main` to GitHub. GitHub Actions builds `apps/web/dist` and rsyncs it to `/srv/myblog/site`. `/srv/myblog/repo` may exist on the server only as the runtime projector code workspace and must not be used as a deploy source.

```bash
cd "E:\My Project\MyBlog"
npm run facts
npm run verify
git push origin main
```

Three-pillar command surface:

```bash
npm run run
npm run verify
npm run facts
```
