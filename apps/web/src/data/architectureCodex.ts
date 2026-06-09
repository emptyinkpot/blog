import { withBase } from '../lib/site';

export type ArchitectureCodexEntry = {
  slug: string;
  title: string;
  subtitle: string;
  thesis: string;
  status: 'active' | 'forming' | 'future';
  systems: string[];
  inspiration: string[];
  rejected: string[];
  runtime: string[];
  tradeoffs: string[];
  future: string[];
  related: string[];
};

export const architectureCodexEntries: ArchitectureCodexEntry[] = [
  {
    slug: 'content-infrastructure-reduction',
    title: 'Content Infrastructure Reduction',
    subtitle: '不要把博客继续扩成自研 CMS 内核。',
    thesis:
      'MyBlog 已经触碰到 content-index、RSS prerender、OpenList projection、atomic write、watcher、search 和 deploy glue 等 Content Infrastructure 问题。下一阶段的正确方向不是继续扩大自研 runtime，而是在 apps/web 视觉与入口不变的前提下，吸收 Quartz、Contentlayer、Meilisearch 和 Coolify 等成熟底座来削减维护面。',
    status: 'forming',
    systems: ['Runtime MarkdownObject Index', 'Quartz', 'Contentlayer', 'Meilisearch', 'Coolify', 'Pagefind', 'OpenList Cold Layer', 'Astro Presentation Shell'],
    inspiration: ['Quartz digital garden substrate', 'Contentlayer typed content pipeline', 'Meilisearch object search', 'Coolify deployment platform', 'Astro Paper as content-layer reference'],
    rejected: [
      '继续把 content-index.json 膨胀成 JSON database，因为它已经承担了 projection、RSS、search 和 runtime payload 的过多责任。',
      '继续新增 watcher、RSS 竞态补丁、build sync、deploy wrapper 或 runtime governance 文件来掩盖成熟系统本该接管的问题。',
      '把 OpenList 当 runtime build 或 projection authority，因为它只能承担 public browse、blob backend、cold archive 和 content address space。',
      '把 Quartz、Contentlayer、Meilisearch 或 Coolify 写成 active 能力；没有 clone/install/start/readiness evidence 时，它们只能是 candidate 或 target。'
    ],
    runtime: [
      '当前 active 线仍是 Runtime MarkdownObject：public-data/runtime/content-index.json 与 facts-entry production site runtime/content-index.json 是公开文章投影索引，但只允许作为过渡 projection。',
      'Quartz 是 embedded substrate candidate：优先研究 jackyzha0/quartz 的 Obsidian Markdown pipeline、wikilink、backlink、graph、RSS、search、SPA/incremental、component registry 和 content index 思路，但不替换 apps/web 生产前端。',
      'Contentlayer 是 Astro-native candidate：保留 Astro UI shell 时，应优先评估 typed content schema、parsing、watch 和 projection 能否替换自写 build-runtime-content-index glue。',
      'Meilisearch 是 target-not-deployed search runtime：动态对象、OpenList 文件索引、KnowledgeObject snapshot、Directus metadata 和 Immich import 不得继续塞进 giant runtime JSON；Pagefind 在上线前只叫静态 archive 搜索。',
      'Coolify 是 candidate-not-deployed deployment platform：当前仍用 npm run deploy:site；后续评估 Git deploy、env、healthcheck、rollback、cron 和 compose 接管手写 SSH / PowerShell quoting / smoke glue。',
      'OpenList 边界保持不变：the facts-entry OpenList local mount 是 Linux hot mirror 的 public access identity，/腾讯云COS 与 /夸克网盘 是 cold/blob backend，不参与数据库、Pagefind、Astro dist、Syncthing hot mirror、node_modules 或 runtime build。'
    ],
    tradeoffs: [
      '评估成熟底座会暂时慢于继续 patch 当前脚本，但能避免长期陷入 build race、cache invalidation、projection consistency 和 deploy drift。',
      'Quartz / Contentlayer 可能要求调整现有 MarkdownObject schema，但比继续维护自研 Markdown compiler、graph、RSS 和 search glue 更可控。',
      'Meilisearch 会引入服务运维，但能把搜索从 34MB+ runtime JSON 和 Pagefind 静态边界中拆出来。',
      'Coolify 会改变部署流程，因此必须先保留 npm run deploy:site 作为 active fallback，等 readiness evidence 充足再切换。'
    ],
    future: [
      '写 Quartz/Contentlayer 对比 spike：输入 the facts-entry Linux hot mirror/docs，输出 MarkdownObject 或等价 typed document，验证 wikilink、backlink、RSS、graph 和 search 能力。',
      '写 Meilisearch readiness plan：schema、index source、secret、backup、healthcheck、rollback 和 Pagefind fallback。',
      '写 Coolify readiness plan：GitHub deploy、env、healthcheck、rollback、cron、compose 和当前 Nginx / systemd 边界。',
      '把 runtime index 限定为 projection snapshot；搜索、部署、媒体库、CMS 和文件同步优先交给成熟服务。'
    ],
    related: ['content-pipeline', 'runtime-architecture', 'composable-service-stack', 'runtime-federation']
  },
  {
    slug: 'ai-native-publishing-system',
    title: 'AI-Native Publishing System',
    subtitle: 'Directus owns content truth; Dify runs AI workflows.',
    thesis:
      'MyBlog 的长期方向不是把 Dify 当数据库，也不是继续自写后台，而是用 Directus/Postgres 承担结构化内容真源，用 Dify 承担 AI workflow orchestration，再让 MyBlog/Next.js/Astro 只消费 API、snapshot 或构建产物来展示。Directus 和 Dify 正好互补：一个管 durable content system，一个管 AI runtime execution。',
    status: 'future',
    systems: ['Directus', 'Postgres', 'Dify', 'LangGraph', 'AI Services', 'MyBlog Presentation Shell', 'Next.js/Astro'],
    inspiration: ['headless CMS architecture', 'AI workflow orchestration', 'database-first content modeling', 'editorial workflow systems'],
    rejected: [
      '把 Dify 当 CMS，因为 Dify 不应该拥有 article、draft、factpack、citation、revision 或 permissions truth。',
      '把 Dify 当数据库，因为 workflow runtime 不适合承载 durable content source of truth。',
      '继续自己写后台，因为 Directus 已经提供 admin panel、auth、RBAC、file upload、API、revision、dashboard、hooks 和 realtime。',
      '让 MyBlog 前台直接拥有文章编辑 authority，因为前台应是 presentation/projection shell。',
      '把大文件 blob 放进 Directus/Postgres，因为 EPUB、PDF、图片和视频仍应该留在 OpenList / COS。'
    ],
    runtime: [
      '当前生产仍是 Vault/MarkdownObject projection；Directus + Dify 是 target-not-deployed 架构，不能写成已上线事实。',
      '目标职责划分：Directus/Postgres 管 articles、drafts、authors、tags、uploads metadata、comments、SEO、revisions、factpacks、citations、author_contracts、critic_reports 和 runtime_runs。',
      '目标职责划分：Dify 管 Research、FactPack、Writer、Critic、SEO、Summary、Prompt、Agent 和 Workflow orchestration，但 durable output 必须写回 Directus。',
      '目标调用链是 User / Editor -> MyBlog or Directus Admin -> Directus CMS / Postgres -> Directus webhook -> Dify Workflow -> AI services / LangGraph / model providers -> Directus API write-back -> MyBlog static or dynamic presentation。',
      '典型 write-back 是 Dify 通过 Directus HTTP API 调用 PATCH /items/articles/:id 或 POST /items/factpacks；Dify 不直接生成网页，不直接变成内容真源。',
      'MyBlog/Next.js/Astro 只能消费 Directus API、static snapshot 或 generated build artifacts；它不再扩张为 bespoke CMS backend。'
    ],
    tradeoffs: [
      'Directus + Dify 比全塞进 Dify 多一个系统边界，但这个边界正好防止 workflow runtime 污染 durable content truth。',
      'Directus/Postgres 会引入 schema migration、backup、permission 和 webhook 运维成本，但换来结构化写作系统需要的 revision、permission、metadata 和 relation truth。',
      'Dify write-back 需要 idempotency、retry 和 audit log 设计，否则 AI workflow 失败会污染草稿状态。',
      '切到 Directus 之前继续保留 Vault/MarkdownObject projection，短期多一条迁移线，但能避免没有 rollback 的生产切换。'
    ],
    future: [
      '定义 Directus schema：articles、factpacks、citations、author_contracts、runtime_runs、critic_reports。',
      '定义 Directus webhook -> Dify workflow -> Directus write-back 的 idempotent contract。',
      '把 Author System、Fact Compiler、Narrative Engine 和 Critic Runtime 做成 Dify/LangGraph workflow，而不是写进 MyBlog 前台。',
      '写 Directus readiness plan：Postgres storage、backup、secrets、RBAC、webhooks、migration、rollback 和 API smoke tests。',
      '写 Dify readiness plan：workflow inputs/outputs、model provider boundary、token usage logging、latency budget、retry and audit trail。'
    ],
    related: ['composable-service-stack', 'runtime-federation', 'object-layer', 'content-pipeline']
  },
  {
    slug: 'frontend-runtime-archaeology',
    title: 'Frontend Runtime Archaeology',
    subtitle: '前端不是组件树，而是运行时系统。',
    thesis:
      'Frontend Runtime Archaeology 要求维护者沿用户行为追踪 DOM、事件、状态、渲染、hydration、网络、动画、authority 和 fallback，避免把 MyBlog 这种 Astro islands + inline runtime + API patch + iframe shell 的系统误读成静态组件集合。',
    status: 'active',
    systems: ['Astro SSR', 'React Islands', 'Inline Runtime Scripts', 'MyBlog Capability Registry', 'Command Palette', 'Drawer Runtime', 'Reader Runtime', 'OpenList Shell', 'Pinterest Shell', 'Pagefind', 'Runtime APIs'],
    inspiration: ['browser runtime archaeology', 'frontend behavior audit', 'event tracing', 'hydration boundary mapping'],
    rejected: [
      '只解释文件结构或组件树，因为首页、OpenList/Pinterest shell、Graph 和项目页大量行为都在 inline script 与 delegated event 里。',
      '只 grep import graph，因为自定义事件、document/window listener、data-* selector、observer 和 iframe mutation 不一定出现在 React tree。',
      '把 UI authority 等同视觉来源，因为 MyBlog 常用 SSR seed + runtime API patch + localStorage fallback。'
    ],
    runtime: [
      '规范入口是 README.md 与本 Architecture Codex 条目；前端运行时考古不再维护独立 docs 文档。',
      '审计路径固定为 user behavior -> DOM -> event -> state -> render -> hydration -> network -> animation -> authority -> fallback。',
      'BaseLayout 通过 MyBlog runtime resource registry 挂载 build-version reload guard，并继续持有 visual settings applier、OpenList iframe shell、Pinterest mirror shell 和 HoverPreviewSystem island。',
      'apps/web/src/lib/myblog/capabilities.ts 是 Quartz component/plugin registry 思路的 MyBlog-native 入口层：站点能力先声明 id、surface、href/action、icon 和导航顺序，再由首页 Command Palette 与侧栏消费运行时指标。',
      '首页拥有大型 inline runtime：Feed filter、Drawer、Reader commands、local search、reader theme、highlights、seals、sidebar state 和 keyboard navigation。',
      'React islands 负责 Command Palette、Hover Preview、Book covers、RuntimeBookFeed、BookshelfGrid、Reader 和项目 command；它们与 inline runtime 通过 custom events 和 DOM selectors 交互。',
      'Search 当前双轨：HomeCommandPalette 是唯一显式全局检索按钮；home inline search 是 fallback；/search/ 仍由 Pagefind 提供静态全文搜索。',
      'OpenList iframe shell 会 lazy 设置 iframe src，并尝试注入 CSS / MutationObserver 隐藏登录入口。',
      'Pinterest shell 不 iframe 官方 Pinterest，而是读取 /api/runtime/visuals/snapshot 并回退到构建期 seed。'
    ],
    tradeoffs: [
      '运行时考古比组件说明更慢，但能暴露 hidden authority、zombie path、hydration race 和 fallback drift。',
      '把审计文档纳入治理会增加维护成本，但减少“看起来删了，实际还活着”的交互残留。',
      '首页 inline runtime 当前集中度高，便于一次性追踪，但也让局部改动更容易影响无关交互。'
    ],
    future: [
      '增加自动 listener inventory，按 source file / event type / selector 输出机器清单。',
      '用浏览器录制验证 /、/books/、/visuals/、/knowledge/、/projects/site-v2/、/search/ 的网络与 console。',
      '把 stale-path cleanup 加入常规维护：SiteHeader、legacy localStorage keys、duplicated search、legacy book routes。',
      '为每个 runtime owner 建立 source-of-authority 注释或测试。'
    ],
    related: ['frontend-runtime-convergence', 'runtime-architecture', 'reader-system', 'visual-system', 'knowledge-runtime', 'design-language']
  },
  {
    slug: 'frontend-runtime-convergence',
    title: 'Frontend Runtime Convergence',
    subtitle: '前端运行时必须从多头脚本收束成 Runtime Kernel。',
    thesis:
      'Frontend Runtime Convergence 把 MyBlog 当前的 Astro SSR、React islands、inline scripts、custom events、Pagefind、OpenList shell、Pinterest shell、localStorage cache 和 Runtime APIs 收束到一个显式的前端 Runtime Kernel 合同里，先统一 command、keyboard、overlay、drawer、focus 和 storage classification，再逐步迁移具体 owner。',
    status: 'forming',
    systems: ['Runtime Kernel', 'Legacy Inline Runtime', 'React Islands', 'Command Bus', 'Keyboard Layer', 'Overlay Stack', 'Drawer Intents', 'Focus Restore', 'Storage Classification', 'cmdk', 'Motion', 'Floating UI'],
    inspiration: ['Linear runtime discipline', 'Raycast command model', 'AFFiNE workspace runtime', 'Arc Browser layering', 'React Aria focus semantics'],
    rejected: [
      '继续新增自由 inline script，因为首页已经有大型 Inline Script Empire，局部补丁会扩大 hidden coupling。',
      '让 Ctrl/Cmd+K 继续由 Command Palette 和 fallback search 双重拥有，因为这是 Runtime Split Brain。',
      '继续用 window.dispatchEvent 作为长期 integration layer，因为事件名无类型、无 owner、无 fallback 合同。',
      '把 localStorage 新 key 写成 source of truth，因为它只能是 preference、cache、legacy migration 或临时本地 authority。',
      '只安装 Zustand、Radix、Vaul 或 React Flow 就声称升级，因为没有迁移 surface 和浏览器证据的依赖只能算 installed / not migrated。'
    ],
    runtime: [
      '规范入口是 README.md 与本 Architecture Codex 条目；前端运行时收束不再维护独立 docs 文档。',
      'Knowledge OS Core 拓扑固定为 Vault -> Projection -> Web Runtime -> State Services；新增层必须先证明执行消费者，否则不落地。',
      'P0 Web Runtime 包是 packages/runtime-kernel，当前 dependency-free，只定义 command、overlay、drawer 事件、runtime intent 类型和 storage key classification；apps/web/src/lib/runtime/bridge.ts 是第一条生产适配路径，把 React islands 的 action 统一转成 runtime:command / runtime:overlay-* / runtime:drawer-*；packages/runtime-kernel/src/storage.ts 是 canonical browser storage registry。',
      'React 组件层的投影入口是 apps/web Storybook：apps/web/.storybook 使用 @storybook/react-vite + @storybook/addon-vitest；11 个 domain-level colocated story files 覆盖 Web React islands、apps/web/src/components/ui primitives、apps/web/src/components/shadcn registry components、迁移后的展示组件、GitHub visualization、showcase、shared chrome 和 admin-next React console 组件，并用 MSW、fixture 和 Vite alias mock 隔离 OpenList、reader memory、reader runtime 等外部依赖；Storybook 只投影组件和交互，不拥有 OpenList、MySQL、content-index 或 runtime truth。',
      'React 化当前边界是组件层：apps/web/src/components 已迁出 Astro component 文件，页面/路由/布局 shell 仍由 Astro 负责；GitHubRuntimeSync 已从 Astro inline script 改为 React client island，但首页大型 inline runtime 仍需后续按 owner 迁移。',
      '当前没有 active runtime-migration.json、packages/runtime-overlay 或 packages/runtime-store；overlay、drawer、focus 和 Escape 的消费实现仍在 legacy inline runtime + React islands，但入口已经开始统一到 runtime intent。',
      '已删除无当前执行消费者的独立 contracts/*、packages/runtime-contract、packages/object-model 和 packages/design-system；真实合同回到 README、project.json、validators、public-data projection 和 TypeScript owner 文件。',
      '当前 active libraries 是 cmdk、motion 和 @floating-ui/react；Zustand、Radix UI primitives、Vaul、React Flow 已安装但尚未迁移任何 runtime owner。',
      'P1 已部分落地：HomeCommandPalette hydrate 后设置 html[data-home-command-ready="true"]；home inline Ctrl/Cmd+K fallback 只在该 ready 标记不存在时运行。',
      'HomeCommandPalette 的 search/openlist/pinterest action 已改由 runtime bridge 派发 runtime:command；BaseLayout 只保留 shell DOM 与模块入口，OpenList/Pinterest 的按钮、Escape 和 command 消费由 apps/web/src/lib/runtime/shell-overlays.ts 拥有，并通过 apps/web/src/lib/runtime/shell-runtime.ts 生成 runtime:overlay-open / runtime:overlay-close detail；旧 openlist-embed-open / pinterest-embed-open 只作为兼容桥保留。',
      '首页 inline runtime 把 search.open、reader.open、reader.close、home-search-open、reader-command、快捷键、URL 参数、sidebar memory 和 search-result click 收束成 runtime:overlay-* 或 runtime:drawer-*，并从 apps/web/src/lib/runtime/home-runtime.ts 注入 RUNTIME_EVENT_NAMES、LEGACY_RUNTIME_BRIDGES 和 intent detail builders，避免首页继续散落裸 runtime 事件字符串与 detail 结构；最终只有 search overlay 和 article drawer 的消费点调用真实 open/close 实现。',
      'Book Drawer Reader island 已同时监听 runtime:drawer-open / runtime:drawer-close drawer=book 和 legacy emptyinkpot:book-drawer-*；首页打开 book drawer 时先派发 runtime drawer intent，再派发 legacy bridge，避免 hydrate 时序丢事件。',
      'knowledgeStorageKeys、book storage keys、visual manifest cache 与 build-version reload keys 已开始引用 RUNTIME_STORAGE_KEYS；reading history、bookmarks、highlights、annotations、seals、stickers、book progress/location 被标记为 legacy-migration，reader theme / visual settings / book settings 是 preference，build version / book recent / visual manifest 是 cache。',
      'BaseLayout 与 HoverPreviewSystem 已把 content-settings-applied / runtime-folders-applied 收束到 runtime event registry，同时继续广播 legacy event 兼容旧消费者。',
      'tools/validate-frontend-runtime-contract.mjs 已加入 emptyinkpot-* literal registry guard：新 storage key 必须进入 packages/runtime-kernel/src/storage-keys.mjs，非 storage 事件必须在 allowlist 中说明。',
      'legacy bridge events 暂时允许：home-search-open、openlist-embed-open、pinterest-embed-open、reader-command、emptyinkpot:book-drawer-open、emptyinkpot:book-drawer-close。',
      '新增全局快捷键、overlay、drawer、custom event 或 localStorage key 前，必须同步更新本条目和 packages/runtime-kernel 的真实 registry。'
    ],
    tradeoffs: [
      '保留小 runtime registry 不会立刻减少源码中的 inline script，但能阻止新运行时继续散开，并给后续迁移提供验收边界。',
      '逐个 owner 迁移比大爆炸慢，但能保留现有首页、Reader、OpenList、Pinterest 和 Graph 的可达行为。',
      'Runtime Kernel 增加一个治理层，但它不拥有数据 truth，因此不会和 MySQL、OpenList、Directus、Meilisearch 或 Immich 抢 authority。',
      '保留 legacy bridge events 会短期留下重复路径，但比一次性删除 custom event 更不容易破坏用户交互。'
    ],
    future: [
      'P1 让 HomeCommandPalette 成为唯一 Ctrl/Cmd+K owner，把 fallback search 改成 runtime command。',
      'P2 把 OpenList shell、Pinterest shell、Article Drawer 和 Book Drawer 纳入统一 overlay stack 与 focus restore 规则。',
      '下一次真实 cutover 可以评估 Book Drawer shell -> Vaul，但必须先在代码里实现 owner 切换、浏览器证据和回滚路径；Reader memory / highlights 仍由 MySQL Runtime Truth 拥有。',
      'P3 在第一个 owner 迁移时引入 Zustand 或同级 store；优先迁移 overlay stack、command state 和 reader shell state。',
      'Graph 只有在 Projection types、search authority 和 drawer navigation 稳定后才迁移到 React Flow。',
      '生成 machine listener inventory，按 source file、event type、selector 和 owner 输出运行时清单。'
    ],
    related: ['frontend-runtime-archaeology', 'runtime-experience-layer', 'runtime-architecture', 'reader-system', 'visual-system', 'knowledge-runtime']
  },
  {
    slug: 'runtime-experience-layer',
    title: 'Runtime Experience Layer',
    subtitle: '缺的不是组件，而是统一且连续的运行时体验。',
    thesis:
      'Runtime Experience Layer 把 MyBlog 的 Drawer、Command、Reader、Visuals、Graph、OpenList Shell 和 Pinterest Shell 从多个 runtime patch 收束成统一的交互质感系统：Spatial Layer、Interactive Object、Continuous Surface、Command Runtime 和 Infinite Semantic Canvas。目标不是博客主题 polish，而是让网站像一个活着的系统。',
    status: 'forming',
    systems: ['Spatial Layer', 'Runtime Overlay', 'Interactive Object', 'Command Runtime', 'Continuous Surface', 'Infinite Semantic Canvas', 'Motion Tokens', 'Depth Scale', 'Focus Contract'],
    inspiration: ['Linear', 'Arc Browser', 'Cosmos', 'Immich Web', 'AFFiNE', 'Raycast', 'shadcn/ui', 'Radix UI', 'Vaul', 'tldraw'],
    rejected: [
      '继续以 button、card、hero 为主语加 UI，因为 MyBlog 当前缺的是 runtime coherence，不是组件数量。',
      '直接引入 Aceternity UI、Magic UI 或 React Bits 的通用炫酷特效，因为粒子、装饰光球、bokeh 和营销 hero 会破坏阅读产品方向。',
      '为了“上栈”安装或声明 shadcn/Radix/Vaul/React Flow，因为没有具体 surface migration 和浏览器证据的依赖只能算 installed / not migrated。',
      '让 Drawer、Search、OpenList、Pinterest、Graph 各自维护 z-index、motion、focus 和 overlay 规则，因为这会继续扩大多 runtime patch 感。'
    ],
    runtime: [
      '规范入口是 README.md 与本 Architecture Codex 条目；交互质感和 runtime coherence 不再维护独立 docs 文档。',
      'Theme tokens 留在 apps/web/src/styles/global.css：spacing、radius、font、color 和 motion 是当前需要的全部设计底座，不再保留独立 packages/design-system。',
      'P0 React primitive 层是 apps/web/src/components/ui：Button、IconButton、StatusBadge、MetricCard、Surface、EmptyState 采用 CVA、clsx、tailwind-merge、Radix Slot/Tooltip 和 lucide-react，消费 runtime token 并提供稳定组件 API；它不是数据 truth 或 runtime command owner。',
      '第一批生产组件消费者已经开始从手写 surface 收敛到 React primitives：ChartCard 使用 Surface 与 Button asChild 保留 chart-card 视觉合同，WorkbenchPageIntro 使用 Surface 与 MetricCard 渲染统计块，MetricCard 增加 valueFirst 以支持页面级指标的既有阅读顺序。',
      'apps/web/src/styles/global.css 暴露 --runtime-motion-*、--runtime-ease-*、--runtime-depth-*、--runtime-elevation-*、--runtime-focus-*、--runtime-surface-* 变量，后续 overlay / drawer / command / visual surface 必须复用。',
      'Storybook 是 React 体验投影面：preview 加载 apps/web global.css、admin-next globals.css 与 runtime token，并用 MSW + storybook-only fixture/mocks 隔离远端数据；当前 story inventory 包含 UI Primitives、Command、HoverPreview、BookCover、BookshelfGrid、RuntimeBookFeed、BookReader、PDF/EPUB reader、RuntimeBookDetail/Reader、EditIntakeWorkbench、shared site chrome、showcase cards、GitHub visualization 和 admin console 组件，并通过 npx vitest --project storybook run 执行交互与唯一 CssCheck 验证。',
      'P1 已部分落地：Home Command layer 和 fallback Knowledge Search layer 开始复用 runtime depth、surface、elevation 和 motion token。',
      'Motion Division 的 Motion for React 是 active animation library：apps/web/src/lib/motion.ts 是项目统一导入入口，从 motion/react 转出 motion、MotionConfig、AnimatePresence、LazyMotion、m、hooks 和类型；Storybook 的 Design System/Motion Runtime probe 验证它能在 React island 中渲染，后续复杂组件必须通过这个入口接入 motion token 与 reduced-motion 规则。',
      '当前 active libraries 是 cmdk、motion、@floating-ui/react、lucide-react、class-variance-authority、clsx、tailwind-merge 与 Radix Slot/Tooltip。',
      'shadcn/ui 已进入 active component substrate：apps/web/components.json 固定 new-york / neutral / lucide 配置，apps/web/src/components/shadcn/ui 存放通过 shadcn CLI source-generated 的 Button、Card、Dialog、Input、Textarea、Badge、Tabs、Table、Alert、Separator、Skeleton、Tooltip、Popover、Sheet、Command、DropdownMenu、Select、Switch 和 Checkbox；Design System/shadcn UI story 是 Storybook 组件库投影面，不替代 apps/web/src/components/ui 的 MyBlog primitives，也不拥有 runtime/data truth。',
      'Aceternity UI、Magic UI、React Bits 只作为 technique reference，不能直接导入通用发光、粒子、orb、bokeh 或营销 hero 效果。'
    ],
    tradeoffs: [
      '先沉淀 token 和术语不会立刻让 Drawer 变成 Vaul，但能让后续迁移拥有同一 motion、depth 和 focus 语言。',
      '禁止孤立炫技会牺牲短期视觉冲击，但保护 MyBlog 的阅读空间和知识系统气质。',
      '把 Card 改称 Interactive Object 会提高设计要求：hover、focus、open、reader continuity 都必须解释对象身份如何延续。',
      'Infinite Canvas 是未来方向，不应在 Graph authority、search authority 和 object contract 未稳定时抢先替换现有页面。'
    ],
    future: [
      'P1 将 Command Runtime 统一为唯一 Ctrl/Cmd+K owner，并把 command layer 使用 runtime depth / focus token。',
      'P2 将 Drawer/Search/OpenList/Pinterest 收束进统一 overlay stack，再评估 Radix/Vaul。',
      'P3 增加 Book Card -> Drawer -> Reader 的 object continuity motion。',
      'P4 研究 tldraw / React Flow / canvas runtime，把 visuals、knowledge 和 annotations 逐步推向 Infinite Semantic Canvas。',
      '只在出现第二个真实消费者时，才把 theme tokens 从 global.css 提升为共享包。'
    ],
    related: ['frontend-runtime-convergence', 'design-language', 'reader-system', 'visual-system', 'knowledge-runtime']
  },
  {
    slug: 'reader-system',
    title: 'Reader System',
    subtitle: '书籍不是文件入口，而是可阅读知识对象。',
    thesis:
      'Reader System 把 EPUB、PDF、阅读位置、高亮和抽屉体验收敛成一个长期常驻的阅读运行层，目标是接近现代阅读产品，而不是浏览器下载器。',
    status: 'active',
    systems: ['Book Drawer Reader', 'Reader Pool', 'Runtime Persistence', 'PDF.js', 'epub.js', 'Reader Memory', 'Public Edit Intake', 'BlockNote Spike'],
    inspiration: ['Readest', 'Apple Books', 'Kindle', '微信读书', 'Omnivore', 'BlockNote', 'Tiptap', 'ProseMirror', 'Hypothesis'],
    rejected: [
      'iframe 直接打开 OpenList 文件，因为它不能接入目录、阅读记忆、高亮和 Graph。',
      '点击后才加载完整 Reader Runtime，因为 PDF.js / EPUB.js 冷启动会把体感延迟全部压到用户点击之后。',
      '抽屉内 PDF 翻页控件，因为首页 drawer 的阅读体验必须像文章一样连续。'
    ],
    runtime: [
      'OpenList 只提供缓存后的 raw 字节；访客请求不能临时回源下载或解析。',
      'BookDrawerReader 是首页唯一常驻 reader island，维护最近 3 本 Reader Pool。',
      '原生 drawer 脚本必须把最近一次 book-open detail 缓存在 window.__emptyinkpotPendingBookDrawerOpen，避免 React island hydrate 晚于用户点击时丢事件。',
      'BookReader shell 保持轻量；PDF runtime 与 EPUB runtime 按 sourceType 拆包预热。',
      'hover / focus 意图阶段允许把目标书籍预挂进隐藏 Reader Pool；点击时复用已出生的 reader，而不是才创建 reader。',
      'PdfReader 只做 mode dispatch；drawer mode 进入独立 PdfDrawerReader，page mode 进入独立 PdfPageReader，避免条件 hooks 把两套 reader runtime 混在同一个组件生命周期里。',
      'PDF 在 drawer mode 不再走 react-pdf Document 组件，而是直接使用 pdfjs-dist + 自定义 PDFDataRangeTransport 接管 Range 请求；首个 768KB Range 分片同时作为 length probe 与 initialData，并把 transport 标记为 progressiveDone，避免 PDF.js 把首段当成未结束 full stream。',
      'PDF drawer direct runtime 不把 URL 交给 PDF.js；disableAutoFetch 必须保持 true，让 PDF.js 只请求解析第一页、xref 和 page tree 所需 Range，避免在文档 resolve 前把整本 PDF 拆成一串 206 拉完。',
      'PDF drawer 首屏不能等待浏览器端 PDF.js 文档 promise；服务端 /api/openlist/page 从已缓存 PDF 文件渲染指定页为真实页面 JPEG 并落盘，抽屉先展示缓存正文页，PDF.js 后台再接管连续 reader。',
      'PDF 页面缓存必须纳入导入管线：/api/openlist/pages/prewarm 在 files/prewarm 后批量准备前几页；访客继续向下滚动时 CachedPdfPageList 按批次请求后续页，每页只在服务端渲染一次，之后复用缓存。',
      'PDF 在 drawer mode 使用真实封面作为即时首屏，PDF.js direct runtime 在后台完成首页渲染后再淡入连续滚动正文。',
      '即时封面首屏由 Astro 静态模板直接输出缓存封面 URL，不能依赖 BookCover React island hydrate 后才出现。',
      'PDF 在 drawer mode 使用连续滚动多页和 IntersectionObserver 懒渲染，完整 reader 页面保留单页控制。',
      '/edit-intake/ 是可编辑 projection surface spike：BlockNote 只作为 MyBlog UI substrate，页面生成 public-edit-intake.v1 JSON，不直接写 DataBase CCG/CDM/AST。',
      'MyBlog 侧评论、高亮、rewrite_block 和 insert_asset_block 必须通过 DataBase public edit intake 边界；评论/高亮落 Annotation Graph overlay，真实内容修改进入 review 后的 Graph Edit Operation。'
    ],
    tradeoffs: [
      '常驻 Runtime 会占用更多前端内存，但换来二次打开和近场阅读的稳定体感。',
      'PDF 抽屉首屏先显示缓存真实封面不是伪造正文，而是避免 PDF.js 初始化期间出现空白；真正页面渲染完成后由 reader 接管。',
      '完整 reader 页面仍保留 react-pdf 兜底，首页 drawer 先切 direct PDF.js runtime；长期要评估 react-pdf-viewer 或同级成熟内核。',
      'MOBI 不在浏览器 reader 内硬解析，后续应在导入管线转 EPUB。'
    ],
    future: [
      '把 PDF worker 单例和 EPUB book object 缓存收敛为显式 Runtime Registry。',
      '后台导入阶段增加 Calibre 转换，把 MOBI 标准化为 EPUB reader asset。',
      '把目录、搜索、高亮和批注统一到 Knowledge Runtime。',
      '把 /edit-intake/ spike 接入真实 projection package anchorMap，输出 comment/highlight/rewrite_block/insert_asset_block/moderation fixtures。',
      '在 anchor/intake 边界稳定前，不引入 Yjs/Hocuspocus、Payload 或 Hypothesis storage 作为内容真源。'
    ],
    related: ['runtime-architecture', 'composable-service-stack', 'knowledge-runtime', 'design-language']
  },
  {
    slug: 'runtime-architecture',
    title: 'Runtime Architecture',
    subtitle: 'OpenList 是图书馆，MySQL 是目录与状态系统。',
    thesis:
      'MyBlog 的数据层不是单一数据库，也不是网盘目录展示，而是 GitHub、OpenList、MySQL 和浏览器缓存各司其职的混合运行时。',
    status: 'active',
    systems: ['OpenList Content Control Plane', 'Syncthing Hot Mirror', 'GitHub Content Layer', 'MySQL Runtime Layer', 'Static Astro Frontend'],
    inspiration: ['Obsidian vault', 'Syncthing', 'Readwise Reader', 'GitHub history', 'Plex media library'],
    rejected: [
      '把 EPUB/PDF/图片塞进 MySQL BLOB，因为文件系统和对象存储更适合大文件。',
      '把高亮和阅读进度放在 OpenList，因为文件层不能表达动态关系和查询。',
      '继续让 localStorage 做真源，因为多设备、搜索、Graph 和统计都需要服务端状态层。',
      '让 MyBlog 自己手工同步 Obsidian data/image，因为 Vault 文件同步应由成熟的 Syncthing / Obsidian Sync 层负责。'
    ],
    runtime: [
      'Syncthing 当前负责完整 Vault 文件同步：the facts-entry authoring vault 是唯一可编辑 authoring truth，the facts-entry Linux hot mirror 是 Linux runtime hot mirror，docs、image、.obsidian、canvas、PDF 和附件作为同一个 Vault 对待。',
      'OpenList 不再作为 Obsidian 写作同步入口；/夸克网盘/obsidian 是 retired legacy。当前热路径是 the facts-entry authoring vault -> Syncthing -> the facts-entry Linux hot mirror；公开内容入口是 the facts-entry OpenList public root/...。',
      '服务器 OpenList 本地挂载必须保持 the facts-entry OpenList local mount -> the facts-entry Linux hot mirror；admin-next OPENLIST_PUBLIC_ROOTS 必须保持 the facts-entry OpenList local mount,/腾讯云COS,/夸克网盘。禁止重新引入 /Vault 作为 active mount 或兼容根。',
      'OpenList 不能当服务器系统盘或热运行盘：数据库、node_modules、Astro dist、Pagefind、Syncthing hot mirror、/srv/myblog runtime、OpenList DB 和 systemd 服务都必须留在服务器本地文件系统。',
      'OpenList/COS/Quark 只能承担 public access、blob backend、cold archive 和 content address space；/srv/myblog/public-data/openlist-files 是可再生 reader 原件缓存，可用 npm run server:openlist-storage 显式审计和清理。',
      'GitHub 管 Markdown、项目 Wiki、静态 metadata 和可版本化内容。',
      'OpenList 管 EPUB、PDF、MOBI、图片、视频等原始文件。',
      'MySQL 管 reader_memory、reader_highlights，后续承接 annotations、stickers、seals、graph links。',
      '前台通过同域 /api/* 访问 runtime，不暴露数据库连接串、WebDAV 凭据或 OpenList 内部地址。'
    ],
    tradeoffs: [
      '混合架构比单体 CMS 复杂，但长期更适合个人知识基础设施。',
      'Syncthing 会让 Vault 同步独立于 MyBlog 发布节奏，但也要求把同步冲突、删除和附件路径交给成熟文件同步层处理。',
      '静态前台部署简单稳定，动态状态通过 admin-next API 补足。',
      '缓存必须基于 path + modified + size 失效，否则 OpenList 文件更新后会产生陈旧 reader asset。'
    ],
    future: [
      '统一 Knowledge Object 表，把书、文章、项目、视觉素材、高亮都纳入同一对象模型。',
      '把 Runtime API 合同写成可测试 schema，避免后续 UI 和数据层漂移。',
      '让导入任务成为显式 pipeline：scan -> index -> cover prewarm -> file prewarm -> normalize。',
      '把冷归档后端从夸克迁到 COS 时保持同一 OpenList content control plane identity，MyBlog 只改归档目标和索引配置，不改 authoring truth。'
    ],
    related: ['reader-system', 'content-pipeline', 'composable-service-stack', 'knowledge-runtime', 'collection-stack']
  },
  {
    slug: 'content-pipeline',
    title: 'Content Pipeline',
    subtitle: 'Obsidian 是写作母库，Runtime MarkdownObject 是唯一公开文章线。',
    thesis:
      'Content Pipeline 把 Vault 同步、写作、网页编辑、发布、运行时和文件层拆开：Syncthing / Obsidian Sync 负责把本机 Obsidian Vault 同步到 Linux /home/vault，OpenList 是统一公开内容入口，Runtime MarkdownObject Index 负责把可公开的 Obsidian Markdown 投影到 Feed / Reader / Search / Graph。Astro posts 不再作为公开文章系统。当前 Content Source Base 明确为 the facts-entry authoring vault = authoring truth，the facts-entry Linux hot mirror = server hot mirror，the facts-entry OpenList public root/docs = public content access layer，content-index.json = frontend projection index，Astro = UI shell。',
    status: 'forming',
    systems: ['Obsidian Authoring Truth', 'Syncthing', 'the facts-entry Linux hot mirror Hot Mirror', 'OpenList Content Control Plane', 'Runtime Content Index', 'MarkdownObject', 'Projection Layer', 'Git Mirror', 'Astro Content Collections', 'Pagefind Index'],
    inspiration: ['Syncthing', 'Obsidian Sync', 'TinaCMS', 'Decap CMS', 'Quartz 4', 'Flowershow', 'Logseq Publish', 'Obsidian Publish'],
    rejected: [
      '把 Obsidian Vault 直接当网站源，因为私人笔记、草稿、附件和碎片会混入公开站点。',
      '把 OpenList 当 CMS，因为它是文件层，不负责 slug、draft、SEO、RSS、标签和构建校验。',
      '把 MySQL 当文章正文真源，因为正文更适合 Git 版本控制，数据库应该承担运行时状态。',
      '用 MyBlog API 上传 data/image 来补 Obsidian 附件同步，因为这会制造第二套文件真源和删除冲突。',
      '从零重写 Quartz / Flowershow 已经覆盖的 Markdown compiler、wikilink、backlink、graph publish 和基础 digital garden search。',
      '同时接入 TinaCMS 和 Decap CMS，因为两个编辑面会制造并行写入路径和权限模型漂移。'
    ],
    runtime: [
      'Authoring Truth 是 Windows the facts-entry authoring vault；the facts-entry Linux hot mirror 只是 runtime hot mirror，对应完整 Obsidian Vault：docs、image、.obsidian、canvas、PDF 和附件必须一起同步。',
      'Vault 同步已进入 active 状态：Windows the facts-entry authoring vault 通过 Syncthing folder obsidian-vault 双向同步到 the facts-entry Linux hot mirror，两端 idle 且 needBytes=0。',
      'OpenList 是 content control plane / 统一公开内容入口和文件访问层，不是 CMS，不决定文章 existence；文章对象仍由 Runtime MarkdownObject projection 决定，公开来源链接必须使用 the facts-entry OpenList public root/docs/...。',
      'Authoring Truth 是本机 the facts-entry authoring vault；服务器 the facts-entry Linux hot mirror 是 Syncthing 热镜像和 projector 扫描输入；前端公开 source identity 必须走 the facts-entry OpenList public root/docs/...，不得展示 /home/vault 裸路径。',
      '网页编辑目标是 Git-backed / Vault-backed CMS：编辑提交必须回写同一个 Vault working copy，而不是创建数据库文章副本。',
      '文章真源已收束：public-data/runtime/content-index.json 是唯一公开文章 Runtime Projection Truth；旧 Astro posts collection 已移除，不再参与文章路由、RSS、Pagefind、分类、标签、专题或 Knowledge Graph。',
      'Quartz 4 / Flowershow 是 Markdown 与 Digital Garden 底座候选：MyBlog 可以吸收或接入它们的 transform / backlink / graph / search / publish 能力，但当前不整体替换 Astro Presentation Shell。',
      'Runtime Content Index 当前由 tools/build-runtime-content-index.mjs 生成：public-data/runtime/content-index.json 保留完整投影，apps/web/public/runtime/content-index.json 是前端构建 metadata index；正文、预渲染 html 和 toc 进入 apps/web/public/runtime/articles/*.json 单篇 detail payload。通用列表、首页、标签、分类、RSS 和 Graph 只能读 metadata；Reader Drawer 和 /posts/[slug]/ 才按 detailPath 读取单篇正文。',
      '当前进入 Stabilization Sprint：先稳定 Syncthing / Linux Vault、MarkdownObject schema 和 Quartz Runtime Layer；AppFlowy、Immich、Directus、Meilisearch 都保持 target / skeleton，不启动新 runtime。',
      'Runtime Feature Registry 当前由 public-data/runtime/features.json 和 apps/web/public/runtime/features.json 承载，只声明当前 active runtime surface 的 authority、truth、producer 与 consumers，不登记旧文章兼容系统。',
      '当前已实跑链路是 Obsidian local vault the facts-entry authoring vault -> Syncthing -> the facts-entry Linux hot mirror -> the facts-entry OpenList public root public file access -> server-side chokidar -> Runtime MarkdownObject Index -> facts-entry production site runtime/content-index.json -> SSE -> Feed / Reader refresh；Git mirror / TinaCMS / Decap CMS 仍是后续编辑面。',
      'Runtime projection 的核心链路是 scan the facts-entry Linux hot mirror/docs -> default include all public Markdown -> filter draft/private/published:false -> normalize -> MarkdownObject -> content-index.json -> /posts/[slug] -> Feed / Reader / Search / Graph projection。当前临时策略是“都显示”，后续再加细规则；kind 从 frontmatter 或路径派生，visibility 从 frontmatter/private/drafts 派生，wikilinks/assets/backlinks 进入 relations。Obsidian 内容变更不得触发 Astro build、Pagefind、scp 或全站 deploy。',
      'Frontend card contract：ArticleCard、首页 Runtime Feed、/posts/ 和 /posts/[slug]/ 的展示标签只读 MarkdownObject.card.chips；tags/categories 是搜索、分类、RSS 和 Graph metadata，不再由卡片组件临时派生展示标签。',
      'Markdown Presentation Truth 是 apps/web/src/lib/markdown/pipeline.ts 与 .prose-shell：Runtime MarkdownObject 使用 GFM table、Obsidian callout、table wrapper、rehype-pretty-code/Shiki、heading slug 和 prose typography。',
      '首页 / 是 Runtime MarkdownObject 的主发现面：所有当前 active runtime articles 必须进入 .home-feed-grid，作为和原首页一致的 .home-feed-card 小卡片，而不是只取前几篇、只生成详情页或只放到 /posts/。',
      '首页 runtime 抽屉只读取 metadata index 建立入口，打开阅读器后按 /runtime/articles/*.json 读取 article.html；浏览器端简易 Markdown renderer 不是 authority，不能重新引入为第二套正文渲染系统。',
      '/posts/[slug]/ 是唯一公开文章详情路由；它由 Runtime MarkdownObject metadata 生成，并按 detailPath 读取单篇正文 payload。',
      '/posts/ 页面只展示 Runtime MarkdownObject。',
      'Runtime 文章页的 metadata 采用 Editorial Metadata Line：日期 / 阅读时间 / 分类 / 标签以小字宽字距文本呈现，不使用 badge、chip 或按钮式标签。',
      'Normalize Layer 必须处理 frontmatter、slug、draft、Obsidian 双链、附件路径、标签归一化和公开资源迁移。',
      '文件夹路径生成 folderTags 与 collectionId；frontmatter tags 生成 explicitTags；finalTags 是两者去重合并。',
      'README 是项目合同真源；architectureCodex.ts 记录这套分层为什么存在以及后续维护边界。'
    ],
    tradeoffs: [
      '多一层 Publish Pipeline 会比直接同步慢一步，但换来公开边界、构建稳定性和隐私隔离。',
      '把 Vault 同步交给 Syncthing / Obsidian Sync 会减少自研成本，但 MyBlog 需要清楚区分“文件已同步”和“内容已发布”。',
      'Runtime Index 能让 Obsidian 同步内容更快进入 Feed，但必须继续过滤 draft/private/embed，避免把整个 Vault 裸露为公开站点。',
      '移除 Astro posts 公开入口会让新增文章 slug 需要下一次 Astro build 才产生静态页面，但换来唯一公开文章路由。',
      'TinaCMS 更适合现代可视化编辑，Decap CMS 更轻；P1 必须二选一，不能同时接入。',
      'Quartz / Flowershow 作为 substrate 比继续自研 Markdown/Graph 基础更稳，但本轮只吸收 Markdown rendering system，不整体替换前端、首页、Reader、OpenList 或视觉系统。'
    ],
    future: [
      'Syncthing / Linux Vault 文件真源层已完成首轮实跑验收；下一步不是启动 AppFlowy、Immich、Directus 或 Meilisearch，而是固化 MarkdownObject schema 与 Quartz Runtime Layer。',
      '固化 MarkdownObject schema：id、slug、sourcePath、visibility、relations、attachments、html、toc、projection 必须有稳定校验。',
      '建立 content-vault Git mirror 时必须以 the facts-entry authoring vault 或 the facts-entry Linux hot mirror 热镜像为源，不能从 retired legacy /夸克网盘/obsidian 回流。',
      '优先评估 TinaCMS 管理 content-vault 的 Markdown / MDX / JSON；Decap CMS 作为低成本备选。',
      '做 Markdown、backlink、graph 或 digital garden search 升级前，先评估 Quartz / Flowershow 能否作为底座或 transform provider。',
      '把 Runtime Content Index 接入 RSS、Pagefind、Knowledge Index 和 Graph 的统一对象读取层。',
      '让 features.json 成为文章、Store Runtime、Command Runtime、Graph Runtime 后续接入前的显式开关和 authority registry。',
      '增加内容发布校验：私有附件引用、未迁移 embed、敏感路径和重复 slug 直接阻断 runtime projection。',
      '让 Publish Pipeline 产出 Knowledge Object manifest，供 Graph、Search、Timeline 复用。',
      '把 folderTags 映射为 Collection / Topic，让 history/korea 这类路径自动生成稳定知识合集。'
    ],
    related: ['runtime-architecture', 'composable-service-stack', 'knowledge-runtime', 'reader-system']
  },
  {
    slug: 'composable-service-stack',
    title: 'Composable Service Stack',
    subtitle: 'MyBlog 是展示壳，不是全能后端。',
    thesis:
      'Composable Service Stack 把文件、媒体 AI、元数据后台、搜索和前台展示分给成熟服务：OpenList + COS 管大文件，Immich 管图片视频 AI，Directus 管人工 metadata overlay，Meilisearch 管动态检索，Astro/MyBlog 只负责阅读空间和知识展示。',
    status: 'forming',
    systems: ['OpenList + Tencent COS', 'Immich', 'Directus', 'Meilisearch', 'Astro Presentation Shell', 'admin-next Gateway'],
    inspiration: ['NAS storage stack', 'Google Photos / Immich', 'Headless CMS', 'Meilisearch', 'Plex media library', 'Digital asset management'],
    rejected: [
      '把 MyBlog 写成全能后端，因为媒体库、CMS、搜索引擎和对象存储都有成熟系统。',
      '把 OpenList 当 CMS 或 Obsidian 写作真源，因为它只适合 content control plane、文件访问、metadata/API/URL 抽象和大文件后端，不负责文章编辑 authority、metadata overlay、工作流、Graph 和搜索权威。',
      '继续让 Pagefind 承担动态实体搜索权威，因为 Pagefind 更适合构建期静态文档。',
      '把 Directus 或 Meilisearch 写成已部署事实，因为当前它们仍是 target runtime。',
      '把大文件放入 Directus / MySQL，因为 EPUB、PDF、图片和视频应留在 OpenList / COS。'
    ],
    runtime: [
      'OpenList + 腾讯云 COS 当前已作为 content control plane 下的大文件 / blob 后端验证：bucket myblog-media-1410041307，region ap-shanghai，挂载点 /腾讯云COS，验证对象 _verify/openlist-cos.txt。',
      'OpenList + server storage integration 当前 active：the facts-entry OpenList local mount 是 Local driver，root=the facts-entry Linux hot mirror，只作为 Linux hot mirror 的 public access identity；/腾讯云COS 与 /夸克网盘 是冷层和 blob backend；root disk 维护入口是 npm run server:openlist-storage。',
      'Immich 当前是 skeleton-installed-not-started：/srv/immich、.env、docker-compose.yml、check-readiness.sh 和 Nginx vhost 已存在，但 DNS、独立存储和 root disk 空间未满足启动条件。',
      'Directus 是 target-not-deployed structured content / metadata layer：近期承接 books、visuals、collections、knowledge_objects 的人工策展字段；AI-native publishing cutover 后可承接 articles、drafts、factpacks、citations、author_contracts、critic_reports 和 runtime_runs 的 Directus/Postgres truth；它不保存大文件原件。',
      'Meilisearch 是 target-not-deployed search runtime，后续索引 KnowledgeObject snapshot、OpenList file index、Directus metadata 和 Immich import snapshot；上线前 Pagefind 继续承担静态文章搜索。',
      'infra/composable-stack 提供 Directus + Meilisearch 的可复刻 Docker Compose skeleton、.env.example 和 check-readiness.sh；服务器侧已同步到 /srv/myblog/services/composable-stack/，但 .env 未创建、容器未启动，它是部署入口，不是已运行事实。',
      'Astro/MyBlog 当前是 presentation shell：组织 Feed、Drawer、Reader、Visual Collection、Graph 和公开路由，只消费 API、snapshot、manifest 和 Astro content collection；manifest 是 projection/cache，不是人工 metadata truth。',
      'apps/admin-next 只做 gateway、import pipeline、runtime cache、OpenList proxy、MySQL runtime bridge 和服务间 glue；不得扩张成完整 CMS、媒体库或搜索引擎。',
      'Dify 是 target-not-deployed AI workflow orchestrator，只负责 research、writer、critic、SEO、summary、prompt 和 agent workflow；Dify durable output 必须写回 Directus/Postgres，不能成为 CMS 或数据库。',
      'OpenList/COS 文件索引拥有书籍 existence authority；public-data/books/books-index.json 只保存 path / modified / size / sourceType / cover cache 输入；public-data/books/books.metadata.json 是 P0 editable metadata layer。build script 不得内联 const overlays，也不得让 manifest、localStorage 或 OpenList 决定 tags、description、status、collection。'
    ],
    tradeoffs: [
      '组合成熟服务会增加部署和观测复杂度，但避免在 MyBlog 内重复实现媒体库、CMS、搜索和对象存储。',
      'Directus / Meilisearch 引入后会多一层同步和索引延迟，但换来动态对象、人工策展和全文 / 语义搜索的稳定权威。',
      'MyBlog 保持展示壳会限制它直接写入所有状态，但这让前台部署简单、边界清晰，也更容易缓存。',
      'COS 能缓解 root disk 压力，但不能替代 Immich/Postgres 的数据库盘和热缓存卷。',
      'Compose skeleton 让后续部署更可复刻，但在 root disk 只有数 GB 可用时必须保持未启动。'
    ],
    future: [
      '部署 Directus 并建模 books、visuals、collections、knowledge_objects 的 metadata overlay，再按 AI-native publishing plan 迁移 articles、factpacks、citations、author_contracts、runtime_runs 和 critic_reports。',
      '部署 Meilisearch 并建立 KnowledgeObject snapshot index，逐步替代 Pagefind 对动态实体的缺口。',
      '建立 canonical file index：OpenList/COS scan -> normalized file objects -> Directus overlay -> Meilisearch index -> MyBlog snapshot。',
      '实现 Immich API importer，把 asset、album、tag、face、semantic metadata 导入 VisualCollection / KnowledgeObject snapshot。',
      '把 Search、Graph、Timeline 和 Drawer 的对象来源统一到 KnowledgeObject projection。'
    ],
    related: ['runtime-architecture', 'content-pipeline', 'object-layer', 'visual-system', 'knowledge-runtime', 'runtime-federation']
  },
  {
    slug: 'runtime-federation',
    title: 'Runtime Federation',
    subtitle: '克隆成熟系统角色，而不是重写底层引擎。',
    thesis:
      'Runtime Federation 把 MyBlog 定义为 Object Layer Glue 和 Projection Shell：Obsidian / Syncthing / OpenList / Quartz / Immich / Payload 或 Directus / Meilisearch 等成熟系统各自拥有权威，MyBlog 只做对象投影、关系语义、阅读空间和多客户端 Runtime 合同。同一原则也约束本地 workspace：多个 worktree 可以并存，但 build、deploy、PWA、runtime schema 和 OpenList authority 必须由 workspace capability 决定。',
    status: 'forming',
    systems: ['Obsidian', 'Syncthing', 'OpenList + COS / Quark', 'Quartz 4', 'Flowershow', 'Payload CMS', 'AppFlowy', 'Workspace Capability System', 'Deploy Guard', 'AFFiNE', 'Anytype', 'Immich', 'Paperless-ngx', 'Mihon', 'Read You', 'Directus', 'Meilisearch', 'MyBlog Object Layer Glue'],
    inspiration: ['Syncthing file truth sync', 'Quartz digital garden substrate', 'Flowershow Obsidian publish pipeline', 'Payload object and media admin', 'AppFlowy block runtime and collaboration', 'AFFiNE workspace runtime', 'Anytype object graph', 'Kubernetes namespace capability', 'Android permission manifest', 'AWS IAM', 'GitHub Actions environment protection', 'Immich media runtime', 'Paperless-ngx document objects', 'Mihon Android runtime', 'Read You feed runtime', 'Obsidian Remotely Save'],
    rejected: [
      '自写 Vault sync，因为实时文件同步和冲突处理应该交给 Syncthing / Obsidian Sync；OpenList / Quark / COS 只能承担 control plane、浏览和冷归档后端。',
      '自写 Markdown compiler、backlink、graph publish 和 Digital Garden 基础，因为 Quartz / Flowershow 已经是成熟底座候选。',
      '自写媒体服务器、缩略图、EXIF、AI tagging 和 embedding，因为 Immich 已经覆盖媒体 runtime 的主体职责。',
      '自写 CMS、搜索引擎、WebDAV、PDF engine、Android source/download/update runtime，因为这些都不是 MyBlog 的差异化价值。',
      '复制 AFFiNE / Anytype / Mihon / Read You 的 UI，因为 MyBlog 要学习系统边界和 authority，不是复制外观。',
      '把 Android 做成第二套业务宇宙，因为 Android 只能消费同一 Runtime API 和 KnowledgeObject graph。',
      '用“单 canonical workspace”禁止所有 worktree，因为真正问题不是 workspace 数量，而是旧 worktree 拥有了不该拥有的 deploy 行为。',
      '继续手工从任意目录 scp 到 the facts-entry production site root，因为这绕过了 workspace authority 和 deploy capability。'
    ],
    runtime: [
      '当前 active 链路是 Obsidian the facts-entry authoring vault -> Syncthing -> the facts-entry Linux hot mirror -> the facts-entry OpenList public root content control plane -> server-side Runtime MarkdownObject projection -> MyBlog Runtime API / Object Layer Glue -> Astro UI Shell / PWA-TWA / Android / Search / CLI / AI Agent。',
      '成熟替换优先级是 Syncthing、Quartz 4 / Flowershow、Meilisearch、Immich、Payload / Directus；新增功能前先判断能否由这些层接管，不再新增 watcher / scp / build-sync glue。',
      'Obsidian 拥有唯一 authoring truth；Syncthing 当前拥有 hot mirror sync；the facts-entry OpenList public root 拥有 content control plane identity，OpenList + COS / Quark 继续拥有 blob / cold archive backend。OpenList 不拥有文章写作 authority。',
      'Quartz 4 与 Flowershow 是 Obsidian Digital Garden substrate candidate：优先学习 / 复用 Markdown transform、wikilink、backlink、graph、folder/tag publish 和基础 search。',
      'Payload CMS 是 object / media admin reference：学习 object modeling、media layer、relation layer 和 admin architecture；AppFlowy / AppFlowy Cloud 是 Project Studio collaboration runtime target，不是当前运行依赖。',
      'Project Studio 的当前页面只允许作为 GitHub Workbench fallback：repo、issues、PR、commits、contributors、Wiki / Timeline write-back。AppFlowy 未部署前，不继续把 block editor、kanban、comments、presence 和权限系统手搓进 MyBlog。',
      'AppFlowy 的推荐部署边界是独立 `project.tengokukk.com`，MyBlog `/projects/[slug]/` 只在项目 frontmatter 配置 `appflowyUrl` 后嵌入 workspace；否则必须显示 target-not-deployed 状态。',
      '当前收束期不启动 AppFlowy：先完成 Linux Vault、MarkdownObject schema、Runtime Content Index 和 Quartz Runtime Layer。AppFlowy skeleton 只保留路线，不拥有当前 runtime authority。',
      'AFFiNE 与 Anytype 是 workspace runtime 和 object graph 的 reference only，不是当前运行依赖。',
      'Immich 是 Media Runtime 目标服务：当前 skeleton-not-started，不能写成已上线媒体库。',
      'Paperless-ngx 是 Document Object reference，核心启发是 file != document，文件只是载体，文档对象才拥有 metadata lifecycle。',
      'Mihon 和 Read You 是 Android / Feed Runtime reference，主要学习 source abstraction、cache、downloads、updates、offline feed 和 reading state。',
      'Directus、Dify 与 Meilisearch 仍是 target-not-deployed：Directus 负责 structured content / metadata truth，Dify 负责 AI workflow orchestration，Meilisearch 负责 dynamic object search。',
      'MyBlog 自己只写 Object Layer Glue、Runtime Schema、Projection Logic、Relation System、Knowledge Runtime Semantics 和 KnowledgeObject projection。',
      'workspace.manifest.json 是当前 workspace 的机器可读 authority 声明；workspaces/canonical.json、workspaces/experimental.json、workspaces/sandbox.json 是分级模板。',
      'tools/deploy-guard.mjs 在部署前检查 workspaceId、workspaceType、allowedRoots、deploymentAuthority 和 capabilities.canDeploy；.codex-runtime/worktrees/* 默认不能声明生产部署权。',
      'npm run deploy:site 是生产静态站点发布入口；它先运行 deploy guard，再 build，再上传 apps/web/dist 到 the facts-entry production site root.'
    ],
    tradeoffs: [
      'Runtime federation 增加部署、监控和接口治理成本，但避免把个人项目拖进自研同步器、媒体库、搜索引擎和移动端运行时的长期维护泥潭。',
      '成熟 Digital Garden 底座会限制局部定制，但能减少 Markdown/Graph/Search 基础设施维护，把精力留给 Runtime Feed、Reader、Visual 和对象投影。',
      '学习成熟项目的系统角色比直接 clone 代码慢一点，但能保护 MyBlog 的 authority 边界和视觉身份。',
      '多系统组合会有同步延迟和 failure mode，但每个系统拥有清楚 authority 后，比一个全能后端更容易排障和替换。',
      'reference-only 系统必须明确标注，否则文档会把“应该学习”误写成“已经依赖”。',
      'workspace capability 增加了发布前步骤，但能防止旧 worktree、实验分支或 AI 临时环境把生产站点回滚到早先版本。',
      'experimental worktree 仍可 build 和 preview，保留并行研发效率；上线必须把改动提升回拥有对应 capability 的 workspace。'
    ],
    future: [
      '把 Runtime Federation 加入 project.json 的 machine-readable contract，并要求新服务声明 authority、status、integration path、secret boundary 和 failure mode。',
      '为 workspace.manifest.json 增加 sync fingerprint：lastSyncedFrom、lastSyncedAt、baseCommit、syncAge 和 feature scope，部署前提示 stale workspace 风险。',
      '把 feature capability audit 接入 git diff，修改 PWA、Reader Runtime、OpenList authority 或 runtime schema 时自动检查 workspace 是否拥有对应 capability。',
      'Runtime API schema 暂时留在 apps/admin-next route owner 和 TypeScript types 中；只有出现第二个真实客户端后才恢复共享 contract 包。',
      '为 Projection types 增加 source provenance 字段，记录对象来自 OpenList、Directus、Immich、MySQL runtime 还是 Astro content collection。',
      '部署 Directus / Meilisearch 前先完成 disk readiness、secret boundary 和 rollback contract。',
      '评估 Quartz 4 的 transform / graph / backlink / hover preview 能力，优先替换自研 Markdown runtime 缺口而不是继续扩写本地 compiler。',
      '评估 Payload / Directus 在 metadata overlay 上的边界，二选一承担对象和媒体 admin，避免 MyBlog 继续扩成 full CMS。',
      'Native Android 只在 Runtime API 稳定后启动，且只实现 projection 与 local mirror，不实现第二套业务逻辑。'
    ],
    related: ['composable-service-stack', 'runtime-architecture', 'object-layer', 'projection-clients', 'visual-system', 'reader-system']
  },
  {
    slug: 'object-layer',
    title: 'Object Layer',
    subtitle: '文件只是载体，对象才是知识系统的基本单位。',
    thesis:
      'Object Layer 把 Markdown、EPUB、PDF、图片、项目、人物、时间线和阅读痕迹统一为 KnowledgeObject projection；OpenList/COS 管 blob，Directus / MySQL 管 metadata 与关系，MyBlog 只渲染对象的一种公开投影。',
    status: 'forming',
    systems: ['KnowledgeObject', 'BookObject', 'VisualObject', 'PersonObject', 'TimelineObject', 'Relation Graph', 'Projection Layer'],
    inspiration: ['Anytype Objects', 'AFFiNE local-first workspace', 'Paperless-ngx document objects', 'Obsidian Graph', 'Plex media objects'],
    rejected: [
      '把文件路径当长期对象 ID，因为文件会移动、重命名和迁移存储。对象 ID 必须稳定。',
      '让 Markdown 成为所有关系 authority，因为 Markdown 更适合作为 serialization format，不适合承载动态关系、状态和多源 metadata。',
      '把 OpenList/COS 变成知识数据库，因为对象存储只应该保存原件和派生缓存，不保存语义关系。',
      '让 MyBlog 页面成为真源，因为页面只是对象投影，不能反过来决定对象边界。'
    ],
    runtime: [
      'KnowledgeObject 是统一协议：id、type、title、summary、sources、relations、tags、createdAt、updatedAt、snapshotVersion。',
      'apps/web/src/lib/knowledge/objects.ts 是当前 MyBlog-native 对象投影层：RuntimeMarkdownObject、Astro notes/projects、OpenList books-index、music、visuals 和 GitHub repo 先转成 KnowledgeObject，再派生 KnowledgeSearchDoc、KnowledgeRelationSource 和 KnowledgeGraphNode。',
      'KnowledgeCollection 是对象进入 Surface 前的阅读上下文层：Object -> Collection -> ReadingSession -> View。首页 canonical shape 是 Runtime Surface v2：混合对象瀑布流、feed tabs、drawer peek、search、OpenList/Pinterest shell 和 runtime refresh 同时活着；Collection 只能作为 runtime lens 插入 feed，不能接管首页、不能变成 collection-only feed，也不能驱动 full route takeover。首页 Drawer 使用 .home-reader-session：当前文章正文是前景，集合标题只在 context rail 中弱化出现，TOC / 上一篇 / 下一篇是高密度导航；不得回退成 collection hero、stats、summary card、object card grid 或 .home-drawer-summary 卡片递归。/collections/ 与 /collections/[slug]/ 是备用 / permalink surface，不得替代首页 runtime surface；topic collection 只作为 metadata / search / Graph 维度；topic collections are dimensions, not static collection pages。',
      'BookObject 连接 openlist:// EPUB/PDF/MOBI、cover asset、author、topic、reader memory、highlight 和 collection；当前书籍由 apps/web/src/lib/books/staticManifest.ts 只读加载 books-index，再通过 bookToKnowledgeObject 进入 /data/knowledge-index.json 和 /knowledge Graph。',
      'VisualObject 连接 OpenList/COS/Immich/Pinterest preview、palette、mood、source URL、related books、related posts 和 graph node。',
      'PersonObject、TimelineObject、PlaceObject 和 TopicObject 是后续扩展的实体类型，不能被临时 tag 完全替代。',
      'OpenList/COS 只保存 blob 和 path；Directus 目标上承接人工 metadata overlay；MySQL runtime 承接阅读状态、关系、注释和动态事件。',
      'Meilisearch 目标索引 KnowledgeObject snapshot，而不是只索引 Markdown 正文；Pagefind 在 Meilisearch 部署前继续负责静态公开页面搜索。',
      'Astro/MyBlog 是 Projection Shell：Feed、Drawer、Reader、Graph、Visual Collection 和 Codex 页面都从对象 snapshot / content collection 渲染，不拥有对象真源。'
    ],
    tradeoffs: [
      '对象层会增加 schema 和同步成本，但能避免 books.metadata.json、visuals.ts、OpenList index、MySQL runtime 各自生成一套不可合并的 ID。',
      'Markdown 退回 serialization format 会降低“文件即一切”的简单感，但换来跨书籍、图片、项目、人物和阅读痕迹的稳定关系。',
      '早期可以先用 JSON manifest 表达 KnowledgeObject / KnowledgeCollection snapshot，等 Directus / Meilisearch 就绪后再升级为服务化对象索引。'
    ],
    future: [
      '定义 public-data/knowledge/knowledge-objects.schema.json，覆盖 BookObject、VisualObject、PostObject、ProjectObject、HighlightObject 和 KnowledgeCollection。',
      '从 books.metadata.json、visualCollections、OpenList index、reader_highlights 和 posts frontmatter 生成 KnowledgeObject snapshot。',
      '把 Graph、Search、Timeline 和 Drawer 的数据入口统一到 KnowledgeObject projection。',
      '用 Directus 管人工 metadata overlay，用 Meilisearch 管 object-first search，用 MySQL 管动态事件和关系。'
    ],
    related: ['runtime-architecture', 'knowledge-runtime', 'visual-system', 'composable-service-stack', 'runtime-federation']
  },
  {
    slug: 'projection-clients',
    title: 'Projection Clients',
    subtitle: '一个 Runtime，多个 Surface。',
    thesis:
      'Projection Clients 把 Web、PWA/TWA、Android Native、Search、CLI 和 AI Agent 都定义为同一套 Runtime/Object Graph 的不同投影；允许 UI 不同，但禁止复制业务逻辑、authority、解析、搜索和同步规则。',
    status: 'forming',
    systems: ['MyBlog Runtime API', 'KnowledgeObject Graph', 'Astro Web Projection', 'PWA / TWA', 'Android Compose Client', 'Local Runtime Cache'],
    inspiration: ['Immich mobile architecture', 'Mihon source/runtime model', 'Read You feed client', 'EhViewer runtime client patterns', 'Notion multi-client API'],
    rejected: [
      '把 Android 做成 WebView 套壳博客，因为它会把 App 降级成网页容器，无法承担离线、缓存、下载和原生阅读。',
      '让 Android 重新实现 OpenList、metadata、search、book existence、graph 和 sync 逻辑，因为这会制造第二套业务真相。',
      '在 Native App 初期直接重写全部 UI，因为当前 Web Runtime 和 Reader 仍在快速演化，过早分叉会拖慢 authority 收敛。',
      '把 PWA/TWA 写成终点，因为它只是低成本安装面，不替代后续真正的 native runtime client。'
    ],
    runtime: [
      '唯一真源层仍是 OpenList/COS、MySQL、Directus target、Meilisearch target、Immich target 和 KnowledgeObject graph。',
      'Runtime API 只能有一套：/api/feed、/api/books、/api/visuals、/api/search、/api/graph、/api/runtime/*。Web 和 Android 都消费同一套合同。',
      'Web 当前是 Astro Projection Shell；Android 未来只能是另一个 Projection Surface，不得拥有 book existence、metadata authority、OpenList parsing 或 search ranking authority。',
      'DataBase Gateway access is centralized in apps/admin-next/lib/database-gateway-client.mjs: it loads @emptyinkpot/database-gateway-generated-client when present and otherwise preserves the same Gateway HTTP contract. MyBlog code must not scatter raw DataBase route strings outside this adapter.',
      'Phase 1 已建立 apps/android-shell skeleton，并在 apps/web/public/manifest.webmanifest 与 apps/web/public/sw.js 提供 Web PWA surface：目标是 PWA + Bubblewrap / Trusted Web Activity，快速得到可安装 Android 包，更新仍随 Web Runtime 发布。',
      'Android TWA 现在由 tools/generate-android-twa.mjs 自动生成：npm run android:twa:validate 校验本地和线上 PWA、service worker 与 Digital Asset Links，npm run android:twa:generate 生成 .runtime/android-twa，npm run android:twa:build 生成未签名 APK/AAB，npm run android:twa:build:test-signed 生成本机测试签名 APK。',
      'apps/web/public/.well-known/assetlinks.json 是 TWA 信任声明；它必须匹配 apps/android-shell/twa.contract.json 的 packageId 和 SHA256 指纹，否则 Android 不能把 blog.tengokukk.com 交给可信 Web Activity。',
      'Phase 2 是 Runtime API 化：把 Feed、Books、Visuals、Search、Graph 明确成稳定 API 和 schema。',
      'Phase 3 才是 Kotlin + Compose Native Runtime Client：Compose UI、ViewModel + Flow、Ktor/Retrofit、Coil、Room、PdfRenderer / EPUB runtime、AppUpdater。',
      '已下线 packages/runtime-contract 和 packages/object-model；Web、Android、Search、CLI 或 AI Agent 出现第二个真实消费者前，共享合同不提前创建。',
      'Native 允许拥有 local runtime cache、离线阅读、图片预加载、后台下载、系统分享和本地数据库，但缓存只能 mirror runtime，不能成为上游 truth。',
      'PWA service worker 只缓存静态页面和 build assets，不拦截 /api/*、/openlist/*、/reader/openlist、/books/openlist 或 HTTP Range 请求，避免污染 Runtime API 与 EPUB/PDF reader bytes。',
      'npm run check:pwa 校验 manifest、标准图标尺寸、service worker 边界、BaseLayout 注册和 apps/android-shell/twa.contract.json；它已接入 npm run check。',
      '自动更新路线优先 GitHub Releases + AppUpdater；F-Droid repo 可作为开源分发后续选项。'
    ],
    tradeoffs: [
      'PWA/TWA 速度最快，但原生能力有限；适合当前 Runtime 尚未完全 API 化的阶段。',
      'Compose Native 体验上限更高，但只有在 Runtime API 稳定后才不会复制业务逻辑。',
      '本地 Room cache 能带来离线和速度，但必须有明确 invalidation 与 sync contract，避免 shadow authority。',
      '多 surface 会增加测试矩阵，但如果 Runtime 合同稳定，维护成本仍低于多套系统。'
    ],
    future: [
      '定义 /api/feed、/api/books、/api/visuals、/api/search、/api/graph 的 response schema 和 versioning。',
      '部署 Web PWA surface 后，用 Lighthouse / Chrome installability 检查线上 manifest、service worker scope、icon 和 standalone display。',
      '让 apps/android-shell 承接 Bubblewrap 配置，并在 installability 通过后生成 TWA 工程；CI 入口是 .github/workflows/android-twa.yml，生成物只作为 artifact 上传。',
      '建立 android-client target repo 或 apps/android 前，先冻结 Runtime API schema。',
      '为 Android native cache 定义 Room schema、sync watermark、etag/version 和 eviction policy。',
      '让 Web、Android、Search 和 AI Agent 都通过 KnowledgeObject projection 消费同一对象图。'
    ],
    related: ['runtime-architecture', 'object-layer', 'composable-service-stack', 'runtime-federation', 'reader-system', 'knowledge-runtime']
  },
  {
    slug: 'knowledge-runtime',
    title: 'Knowledge Runtime',
    subtitle: '阅读痕迹才是系统最有价值的动态资产。',
    thesis:
      'Knowledge Runtime 把高亮、批注、阅读记忆、印章、贴纸和 Graph 关系从 UI 状态提升为可查询、可回访、可连接的知识对象。',
    status: 'forming',
    systems: ['Reader Memory', 'Highlights', 'Annotations', 'Seals', 'Stickers', 'Knowledge Graph'],
    inspiration: ['Obsidian Graph', 'Readwise', 'Are.na channels', 'Arc Spaces'],
    rejected: [
      '把 Graph 当成装饰图，因为它应当成为导航系统而不是背景效果。',
      '把高亮只存颜色和文本，因为没有 anchor、对象关系和时间戳就无法进入检索与时间线。',
      '让每个内容类型各写一套状态模型，因为文章、书籍、项目和视觉素材需要互相连接。'
    ],
    runtime: [
      'reader_memory 记录 objectId、objectType、location、progress、updatedAt。',
      'reader_highlights 记录文本、颜色、note、anchor_json，并关联知识对象。',
      'Graph 当前由 KnowledgeObject 派生的静态内容元数据和关系构建，/data/knowledge-index.json、首页 knowledgeDocs、/knowledge graph relationSources 共享 apps/web/src/lib/knowledge/objects.ts；RuntimeMarkdownObject 的 wikilinks、backlinks、assets 会经 buildExplicitKnowledgeRelations 转成 linked / references 边，asset 节点在 /knowledge 限量展示以避免图谱过载。',
      'OpenList books-index 已进入 KnowledgeObject projection：bookToKnowledgeObject 保留 book:* drawerId、作者、分类、状态、sourceType、openlistPath 和 asset reference，让书籍同时参与搜索、Graph、Reader Drawer 和后续阅读记忆关系。',
      'localStorage 只保留设置、迁移前缓存和离线偏好，不再作为动态知识真源。'
    ],
    tradeoffs: [
      'P0 先只落 reader_memory 和 highlights，避免一次性迁移所有动态状态导致边界失控。',
      'Graph 自动生成能快速形成关系，但人工策展和阅读痕迹会提供更高质量的连接。',
      '高亮进入 Graph 会增加数据模型复杂度，但这是知识系统从展示走向理解的关键。'
    ],
    future: [
      '新增 annotations、stickers、seals、knowledge_links 表。',
      '做 Timeline：今天读了什么、标了什么、连接了什么。',
      '让每个 Graph 节点 hover / click 都能回到 Drawer 和具体阅读位置。'
    ],
    related: ['runtime-architecture', 'reader-system', 'visual-system']
  },
  {
    slug: 'visual-system',
    title: 'Visual System',
    subtitle: '视觉素材不是图片墙，而是 Visual Collection。',
    thesis:
      'Visual System 不把一张图当一个首页卡片，而是把无限来源收敛成有限 VisualCollection；Immich 承担媒体 ingest、AI tagging、embedding 和语义搜索，MyBlog 承担策展、关系、Graph 和阅读流入口。',
    status: 'forming',
    systems: ['Pinterest Visual Shell', 'Immich Media Runtime', 'Visual Collection System', 'Visual Bookmark Sync', 'Visual Material System', 'Palette', 'Seal', 'Sticker'],
    inspiration: ['Immich', 'Google Photos', 'Are.na Channels', 'Cosmos', 'Eagle', 'Milanote', 'Pinterest Board', 'museum catalog'],
    rejected: [
      '通用 SaaS 卡片网格，因为它会让视觉素材变成后台列表。',
      '一张图一个首页卡片，因为 Pinterest / Pixiv 级素材源是无限的，首页 Feed 必须有限。',
      '把 Pinterest 整个账号搬运到本地，因为用户不是 Pinterest 的 owner，Saved Pins、排序、反爬和平台会话都不该被 MyBlog 伪装成自己能控制的实时源。',
      '前端手写爬虫读取 Pinterest / Pixiv，因为外部账号、网络和原图体积都不应进入公开页面冷启动链路。',
      '把 Immich 当 Astro 组件或 /immich 子路径，因为它是独立媒体服务，必须部署在自己的域名根路径。',
      '自己训练图片识别模型，因为 Immich / CLIP / RAM++ 这类成熟系统已经覆盖基础识别和向量能力。',
      '默认开启 hover preview，因为用户已明确预览不是核心体验，应放到设置开关且默认关闭。',
      '大面积渐变和装饰圆点，因为它们不能解释素材本身。'
    ],
    runtime: [
      '当前 P0 真源是 apps/web/src/data/visuals.ts 内的 VisualCollection[]；visualItems 只作为兼容派生，不再是首页主模型。',
      '2026-05-07 之后的浏览层 canonical 方向是 Pinterest Visual Shell：全站导航和首页 Feed tabs 都在 OpenList 旁边提供 Pinterest 站内嵌入入口，由 BaseLayout 持有 embed layer；/visuals/ 只是视觉索引和策展页面，不再承担唯一入口。',
      'Pinterest full page 不能被完整 iframe：实测 Pinterest 返回 CSP frame-ancestors self，官方 embedUser 只是 marketing widget，会强插 Follow CTA、限制无限滚动和交互。全局 Pinterest 入口不得再使用 embedUser 冒充完整 Pinterest。',
      'Pinterest 入口必须是站内 Browser-session mirror Shell，不是外跳 profile / saved pins 链接，也不是新窗口。触发器是 [data-pinterest-embed-open]，关闭器是 [data-pinterest-close]。',
      'BaseLayout 的 Pinterest Shell 读取 /api/runtime/visuals/snapshot 的 Pinterest collections，在 MyBlog 自己的 Masonry board 里渲染；runtime 不可用时回退 public-data/visual-sources/visual-manifest.json 构建期镜像。',
      'MyBlog 不复制 Pinterest cookie、sessionStorage、localStorage auth blob 或 OAuth token；登录态只留在浏览器 profile 和 Pinterest 平台。官方 pinit.js 只允许用于 indexed pin 的 Save Button，不再用于全局 profile embed。',
      'Pinterest / Pixiv 账号接入由 tools/import-visual-sources.mjs 执行 bookmark sync：使用 .runtime/visual-import-browser-profile 的本机浏览器 profile，登录态只留在浏览器，不写入 JSON、README 或源码。',
      'public-data/visual-sources/sources.json 只记录非敏感 URL、标签、limit 和 collection metadata；public-data/visual-sources/visual-manifest.json 只记录收藏来源链接、平台预览图 URL 和公开 metadata。',
      '2026-05-07 之后的 backend mirror 方向是准实时索引：cron/manual trigger -> Pinterest API / Apify provider -> MySQL upsert visual_pins -> deleted_at diff -> deterministic partition -> /api/runtime/visuals/snapshot -> /visuals runtime hydrate。静态 visual-manifest.json 只作为构建期 fallback。',
      'MySQL runtime mirror 是 local visual index / cache，不是 Pinterest 的替代真相；它服务于搜索、Graph、贴纸、注释、断链兜底和 deterministic partition，实时浏览体验优先由 Pinterest Shell 承担。',
      'Runtime 表由 apps/admin-next/lib/runtime-db.js 管理：visual_sources、visual_pins、visual_sync_runs。visual_pins 使用 source_id + pin_id upsert，记录 first_seen_at、last_seen_at、deleted_at、position_index 和 downloaded=false。',
      '官方 Pinterest API provider 需要 PINTEREST_ACCESS_TOKEN 与 PINTEREST_BOARD_ID；未配置时同步器必须返回配置错误，不能回退成首屏 Playwright 抓取并声称全量。Pinterest 没有稳定 webhook，成熟形态是 1-10 分钟轮询 + diff。',
      'Apify provider 是 saved pins / profile / board 的快速镜像通道：Apify scheduled scraper 负责登录态和分页采集，MyBlog 只读取 dataset/task 最近一次成功输出，完整分页 upsert 到 visual_pins。provider_config_json 只存 datasetId/taskId 这类非敏感配置，APIFY_TOKEN 只放服务器环境变量。',
      '每次 sync 的完成条件不是“取到一屏”，而是 provider 当前分页结果读取完毕；本轮未出现的旧 pin 标记 deleted_at，前端 snapshot 只渲染 active pins。',
      '2026-05-07 当前运行状态：Pinterest / Saved Pins 已同步真实 pin 收藏，当前 manifest 为 25 条并拆成 4 个 partition collection；Pixiv 在专用 browser profile 中仍返回未登录/404，sync report 记录 syncedItems: 0，前端不展示登录页推荐图或 404 占位图。',
      '外部同步源必须进入 Visual Collection Partition：不要把 100 张图塞进一个大卡，也不要一图一卡。P0 按 partitionPattern 确定性拆成 [6, 4, 9, 12] 循环的 mini moodboard collection，后续 P2 才接 AI clustering / CLIP embedding。',
      'Collection card 顶部是非对称 mini moodboard 拼贴，通常用 3-4 张代表图表达这一组的视觉主题；board 内显示这一组的完整图片。导入器必须累积滚动过程中的可见条目，因为 Pinterest 会虚拟滚动并卸载旧 DOM。',
      'Immich 是首选 AI 媒体库运行时：负责图片 / 视频 ingest、时间线、人脸、物体识别、CLIP embedding、语义搜索、缩略图、EXIF 和视频关键帧；MyBlog 不重复实现这些底层能力。',
      'Immich 公共入口固定为 https://photos.blog.tengokukk.com/；当前站内只提供外部入口和架构合同，待 DNS、独立存储卷、Docker Compose 与 Nginx vhost 就绪后再启用服务。',
      'Immich 结果进入 MyBlog 的长期链路是 Immich API -> admin-next import -> MySQL / visual snapshot -> VisualCollection / Knowledge Object；前台不在访客请求里触发模型推理。',
      '首页视觉 Feed 按 collection 渲染代表图堆叠；/visuals/ 展示 collection card，点击后展开内部 board。',
      '当前阶段不下载原图、不生成本地图片副本；离线 thumbnail mirror 只能作为用户明确批准后的后续管线。',
      'Hover Preview 作为全站交互层保留，但由设置开关控制。',
      'Collection 必须携带 mood、sourceLabel、palette、coverImages、images 和 curationNote，而不是只展示图片。'
    ],
    tradeoffs: [
      'Collection 会牺牲单图曝光量，但换来首页密度、策展感和长期维护秩序。',
      '自动配色未来有价值，但必须基于真实图片分析，不使用固定 AI 味配色。',
      '前端只读 manifest 会让同步多一步，但避免每个访客承担外部抓取和账号会话成本。',
      '官方 Pinterest embed 牺牲了完全可控的 DOM 和排序，但换来合规、稳定和真实登录态；MyBlog 的增值点转向视觉壳、注释、聚类和 Graph。',
      '把 Immich 独立部署会增加运维成本，但避免 MyBlog 复刻媒体库、缩略图、AI 推理和向量索引。',
      '浮层统一 portal 能解决 overflow 裁剪，但默认关闭降低干扰。'
    ],
    future: [
      '在独立存储卷上部署 Immich，并把 photos.blog.tengokukk.com 反代到 Immich 根路径。',
      '通过 admin-next 消费 Immich API，把 album、asset、tag、embedding 结果写入 VisualCollection runtime snapshot。',
      '在平台预览图断链率不可接受时，再建立 OpenList + thumbnail mirror 的可选离线化任务。',
      '做 dual-save：Save to Pinterest 同时 Save to Visual Graph，Pinterest 负责公共收藏，MyBlog 负责审美记忆和知识关系。',
      '用 CLIP embedding 或同级图像特征做自动聚类，生成候选 collection。',
      '让图片主色生成 metadata 线、印章色和弱边界色。',
      '把视觉素材纳入 Unified Knowledge Object。',
      '让 Visual Collection 可以被文章、书籍高亮、项目 Room 和 Graph 引用。'
    ],
    related: ['design-language', 'knowledge-runtime', 'collection-stack', 'composable-service-stack']
  },
  {
    slug: 'design-language',
    title: 'Design Language',
    subtitle: '从网页组件转向出版物和阅读空间。',
    thesis:
      'MyBlog 的设计语言应靠排版、封面、留白、材质和目录信息形成气质，而不是靠 badge、chip、重边框和后台式控件。',
    status: 'active',
    systems: ['Editorial Metadata', 'Book Object', 'Drawer Reader', 'Publication Layout', 'Catalog Typography'],
    inspiration: ['Apple Books', 'Readest', 'Medium', 'Are.na', 'Arc', 'Readwise Reader'],
    rejected: [
      'shadcn / Bootstrap 风格 badge，因为标签应像目录信息而不是筛选按钮。',
      '书籍详情上下断裂的标题区，因为现代阅读产品用一体化 hero 组织封面、标题和摘要。',
      '电商卡片阴影，因为书封面需要物体感而不是商品卡漂浮感。'
    ],
    runtime: [
      'BaseLayout 不再渲染传统 SiteHeader；独立页面不显示 Vita Atramenti logo、站点副标题和完整顶部导航串。',
      '全局导航回到首页系统侧栏、Command Search、页面内 breadcrumb / action 与 footer，而不是每个页面重复一条 nav。',
      '书籍 drawer 使用 home-article-drawer--book 状态，外层 header 不重复显示书名。',
      'Book Hero 左侧是大封面 Book Object，右侧是标题、摘要、catalog metadata。',
      'Metadata 默认是小字号、弱色、字距、分隔符，不使用边框胶囊。',
      '/books/ 与 /books/openlist/ 使用 BaseLayout 的 barePage 模式隐藏 footer 并保留普通滚动文档流；/books/[id] 与 /reader/[id] 不再生成书籍实体页。'
    ],
    tradeoffs: [
      '出版物式排版更依赖真实内容质量，不能用 UI 装饰掩盖空内容。',
      '弱化按钮会降低“后台感”，但真正动作仍要保持清晰可点击。',
      '封面变大会提高视觉重心，但移动端必须控制尺寸避免挤压正文。'
    ],
    future: [
      '为 Reader、Book Detail、Collection、Graph 建立统一 typography scale。',
      '把精选、重要、核心改成 Seal，而不是分类 badge。',
      '建立术语表：Knowledge Runtime、Reader Pool、Book Object、Collection Stack。'
    ],
    related: ['runtime-experience-layer', 'reader-system', 'visual-system', 'composable-service-stack', 'collection-stack']
  },
  {
    slug: 'collection-stack',
    title: 'Collection Stack',
    subtitle: '书架不是网盘目录，而是知识策展空间。',
    thesis:
      'Collection Stack 用堆叠封面和主题聚合把多本相关书组织成知识专题，目标是让书架更像私人图书馆和档案馆，而不是文件列表。',
    status: 'active',
    systems: ['Bookshelf', 'Collection Card', 'Stacked Covers', 'Knowledge Topic'],
    inspiration: ['Apple Books Collections', 'Plex Collections', 'Are.na Channels', 'Calibre library'],
    rejected: [
      '完全平铺所有书，因为资料库增长后信息密度和策展感都会下降。',
      '把 Collection 等同文件夹，因为知识主题可以跨目录和来源聚合。',
      '展示过多封面，因为 Top 3 + count 更克制，也更接近成熟媒体库。'
    ],
    runtime: [
      'OpenList original 目录提供书源并决定哪些书存在；public-data/books/books-index.json 是可再生文件索引投影，public-data/books/books.metadata.json 只提供 keyed metadata layer，不能把 OpenList 已删除的书重新带回 UI。',
      '当前 `/books/` 与首页 Feed 默认一书一卡：books-index.json 返回多少本具体书，就渲染多少张具体书卡；前台不得在访客请求里 live-list OpenList。',
      'Collection 是后续 Knowledge Topic 视图，不再替代默认书籍清单，也不能让具体书籍在主书架里消失。'
    ],
    tradeoffs: [
      '自动聚类可以减少维护，但早期人工 collection 更可靠。',
      '堆叠封面需要真实封面缓存完整，否则视觉质量受封面覆盖率影响。',
      'Collection 提高策展感，但也需要后续 Graph、Timeline 和 Related Topic 承接。'
    ],
    future: [
      '根据书名、作者、标签和路径自动建议 Collection。',
      '为历史类 Collection 增加 Timeline 和地图视角。',
      '让 Collection 进入 Knowledge Graph，成为 Room / Topic 节点。'
    ],
    related: ['reader-system', 'runtime-architecture', 'design-language']
  }
];

export const architectureCodexGlossary = [
  {
    term: 'Runtime Migration Sprint',
    definition: '历史阶段名；当前已从主架构下线，不再有 runtime-migration.json 机器真源。后续真实 cutover 必须由具体 surface 代码和浏览器证据证明。'
  },
  {
    term: 'Authority Cutover',
    definition: '把某个 runtime surface 的事件、状态、focus、Escape 和渲染 owner 从 legacy owner 切到目标 owner 的过程；依赖安装不算 cutover。'
  },
  {
    term: 'Reader Pool',
    definition: '首页常驻的最近阅读器集合，关闭抽屉时隐藏但不销毁最近 3 本书的 reader runtime。'
  },
  {
    term: 'Frontend Runtime Archaeology',
    definition: '按用户行为追踪 DOM、事件、状态、hydration、网络、动画、authority 和 fallback 的前端审计方法，不等同于组件树说明。'
  },
  {
    term: 'Runtime Kernel',
    definition: '前端 command、overlay、drawer 事件和 storage classification 的小型 registry；当前入口是 packages/runtime-kernel。'
  },
  {
    term: 'Runtime Experience Layer',
    definition: '统一 Drawer、Command、Reader、Visuals 和 Graph 的体验约束；当前入口是 README.md、Architecture Codex、global.css tokens 与 React primitives。'
  },
  {
    term: 'Spatial Layer',
    definition: '保留上下文的运行时层级，例如 drawer 或 shell 打开时背景被压低但仍保持空间关系。'
  },
  {
    term: 'Interactive Object',
    definition: '把卡片视为可延续的对象，而不是装饰容器；对象应从 card 到 drawer 到 reader 保持身份连续性。'
  },
  {
    term: 'Runtime Split Brain',
    definition: '同一个用户意图由多个 runtime owner 同时解释或兜底，例如 Ctrl/Cmd+K 同时存在 Command Palette 和 fallback search authority。'
  },
  {
    term: 'Knowledge Runtime',
    definition: '负责阅读记忆、高亮、批注、印章、贴纸和关系的动态状态层。'
  },
  {
    term: 'Book Object',
    definition: '把封面作为实体书物件处理的视觉规则，强调尺度、书脊、材质和低透明阴影。'
  },
  {
    term: 'Collection Stack',
    definition: '用 Top 3 堆叠封面表达知识主题或馆藏合集，而不是展示普通文件夹。'
  },
  {
    term: 'Immich Media Runtime',
    definition: '独立部署的 AI 媒体库服务，负责图片 / 视频索引、人脸、物体识别、CLIP embedding、语义搜索、缩略图和时间线；MyBlog 只消费其结果并组织成 Visual Collection。'
  },
  {
    term: 'Editorial Metadata',
    definition: '像出版物目录一样展示分类、格式、年代和主题的小字信息线，不使用 chip 或 badge。'
  },
  {
    term: 'Authoring Truth',
    definition: '写作母库真源；当前唯一真源是 the facts-entry authoring vault，服务器 the facts-entry Linux hot mirror 只是 Syncthing 热镜像。'
  },
  {
    term: 'OpenList Public Content Access',
    definition: '公开内容访问层；Runtime MarkdownObject 的 openlistPath/openlistUrl 必须指向 the facts-entry OpenList public root/...，前端不得把 /home/vault 热镜像裸路径展示为 source。'
  },
  {
    term: 'Publishing Truth',
    definition: '历史术语；当前公开文章只以 public-data/runtime/content-index.json 的 Runtime MarkdownObject 为 active article truth。'
  },
  {
    term: 'Publish Pipeline',
    definition: '从 Obsidian 原稿到 Astro 发布稿的规范化链路，负责过滤、补 frontmatter、解析双链、迁移附件和写入 content collection。'
  },
  {
    term: 'Vault-backed CMS',
    definition: '网页编辑回写同一个 Git 化 Obsidian Vault working copy 的 CMS 形态；TinaCMS 优先，Decap CMS 为轻量备选。'
  },
  {
    term: 'Composable Service Stack',
    definition: '把文件存储、AI 媒体库、metadata 后台、搜索引擎和前台展示分给成熟服务的架构；MyBlog 只做 presentation shell。'
  },
  {
    term: 'Metadata Overlay',
    definition: '覆盖在文件真源之上的人工策展和结构化信息层；目标服务是 Directus，大文件仍留在 OpenList / COS。'
  },
  {
    term: 'Presentation Shell',
    definition: '只负责 Feed、Drawer、Reader、Graph、Visual Collection 和公开路由展示的前台壳，不承担 CMS、媒体库或搜索引擎职责。'
  },
  {
    term: 'Search Runtime',
    definition: '负责动态对象、OpenList 文件索引、Directus metadata 和 Immich 导入结果检索的搜索服务；目标服务是 Meilisearch。'
  },
  {
    term: 'Content Infrastructure Reduction',
    definition: '将自研 content-index、watcher、RSS/build race、search 和 deploy glue 收束到 Quartz、Contentlayer、Meilisearch、Coolify 等成熟底座候选上的减法路线；候选系统未接入前不得写成 active。'
  },
  {
    term: 'folderTags',
    definition: '由 Vault 文件夹路径派生的分类标签，例如 history/korea 生成 history 与 korea，并映射到 Collection / Topic。'
  }
];

export function getCodexHref(slug: string) {
  return withBase(`/codex/${slug}/`);
}
// Runtime content path facts: obsidian-vault syncs to the facts-entry Linux hot mirror; OpenList content control plane is the facts-entry OpenList public root; local OpenList mount is the facts-entry OpenList local mount.
