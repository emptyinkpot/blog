const SDK_PACKAGE = '@emptyinkpot/database-gateway-generated-client';
const DEFAULT_ACTOR = 'myblog-runtime';

let sdkPromise = null;

export function getDataBaseGatewayConfig() {
  const baseUrl = process.env.MYBLOG_DATABASE_GATEWAY_URL || process.env.DATABASE_GATEWAY_URL || '';
  const apiKey = process.env.MYBLOG_DATABASE_GATEWAY_API_KEY || process.env.DATABASE_GATEWAY_API_KEY || '';
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    apiKey
  };
}

export function hasDataBaseGatewayConfig() {
  return Boolean(getDataBaseGatewayConfig().baseUrl);
}

export async function databaseGatewayFetch(path, options = {}) {
  const config = requireDataBaseGatewayConfig();
  return fetchGatewayJson(path, {
    ...options,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey
  });
}

export async function projectObsidianMarkdown(envelope, { idempotencyKey } = {}) {
  const sdk = await loadSdkClient();
  if (sdk?.raw?.projectObsidianMarkdown) {
    return callSdk(() =>
      sdk.raw.projectObsidianMarkdown({
        xDataBaseIdempotencyKey: requireIdempotencyKey(idempotencyKey, 'projectObsidianMarkdown'),
        gatewayWriteEnvelope: envelope
      })
    );
  }

  return databaseGatewayFetch('/writes/project-obsidian-markdown', {
    method: 'POST',
    headers: {
      'X-DataBase-Idempotency-Key': requireIdempotencyKey(idempotencyKey, 'projectObsidianMarkdown')
    },
    body: JSON.stringify(envelope)
  });
}

export async function getMyBlogReaderMemory(query = {}) {
  const sdk = await loadSdkClient();
  const params = compact({
    objectId: query.objectId,
    limit: numberOrUndefined(query.limit)
  });
  if (sdk?.raw?.getMyBlogReaderMemory) {
    return callSdk(() => sdk.raw.getMyBlogReaderMemory(params));
  }

  return databaseGatewayFetch(`/myblog/runtime/reader/memory${toQuery(params)}`);
}

export async function upsertMyBlogReaderMemory(payload) {
  const sdk = await loadSdkClient();
  if (sdk?.raw?.upsertMyBlogReaderMemory) {
    return callSdk(() => sdk.raw.upsertMyBlogReaderMemory({ myBlogReaderMemoryUpsertRequest: payload }));
  }

  return databaseGatewayFetch('/myblog/runtime/reader/memory', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function listMyBlogReaderHighlights(query = {}) {
  const sdk = await loadSdkClient();
  const params = compact({
    objectId: query.objectId,
    articleId: query.articleId,
    limit: numberOrUndefined(query.limit)
  });
  if (sdk?.raw?.listMyBlogReaderHighlights) {
    return callSdk(() => sdk.raw.listMyBlogReaderHighlights(params));
  }

  return databaseGatewayFetch(`/myblog/runtime/reader/highlights${toQuery(params)}`);
}

export async function upsertMyBlogReaderHighlight(payload) {
  const sdk = await loadSdkClient();
  if (sdk?.raw?.upsertMyBlogReaderHighlight) {
    return callSdk(() => sdk.raw.upsertMyBlogReaderHighlight({ myBlogReaderHighlightUpsertRequest: payload }));
  }

  return databaseGatewayFetch('/myblog/runtime/reader/highlights', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getMyBlogVisualSnapshot() {
  const sdk = await loadSdkClient();
  if (sdk?.raw?.getMyBlogVisualSnapshot) {
    return callSdk(() => sdk.raw.getMyBlogVisualSnapshot());
  }

  return databaseGatewayFetch('/myblog/runtime/visuals/snapshot');
}

export async function recordMyBlogVisualSyncResult(payload) {
  const sdk = await loadSdkClient();
  if (sdk?.raw?.recordMyBlogVisualSyncResult) {
    return callSdk(() => sdk.raw.recordMyBlogVisualSyncResult({ myBlogVisualSyncResultRequest: payload }));
  }

  return databaseGatewayFetch('/myblog/runtime/visuals/sync-result', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getOpenListTargetFile(targetId, payload) {
  const sdk = await loadSdkClient();
  if (sdk?.raw?.getOpenListTargetFile) {
    return callSdk(() =>
      sdk.raw.getOpenListTargetFile({
        id: targetId,
        getOpenListTargetFileRequest: payload
      })
    );
  }

  return databaseGatewayFetch(`/openlist/targets/${encodeURIComponent(targetId)}/get`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function listOpenListTargetFiles(targetId, payload) {
  const sdk = await loadSdkClient();
  if (sdk?.raw?.listOpenListTargetFiles) {
    return callSdk(() =>
      sdk.raw.listOpenListTargetFiles({
        id: targetId,
        listOpenListTargetFilesRequest: payload
      })
    );
  }

  return databaseGatewayFetch(`/openlist/targets/${encodeURIComponent(targetId)}/list`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getOpenListFile(payload) {
  const sdk = await loadSdkClient();
  if (sdk?.raw?.getOpenListFile) {
    return callSdk(() => sdk.raw.getOpenListFile({ getOpenListFileRequest: payload }));
  }

  return databaseGatewayFetch('/openlist/fs/get', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function listOpenListFiles(payload) {
  const sdk = await loadSdkClient();
  if (sdk?.raw?.listOpenListFiles) {
    return callSdk(() => sdk.raw.listOpenListFiles({ listOpenListFilesRequest: payload }));
  }

  return databaseGatewayFetch('/openlist/fs/list', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function loadSdkClient() {
  if (!sdkPromise) sdkPromise = resolveSdkClient();
  return sdkPromise;
}

async function resolveSdkClient() {
  const config = getDataBaseGatewayConfig();
  if (!config.baseUrl) return null;

  try {
    const sdkModule = await import(/* webpackIgnore: true */ SDK_PACKAGE);
    const createDatabaseClient = sdkModule.createDatabaseClient || sdkModule.default?.createDatabaseClient;
    if (typeof createDatabaseClient !== 'function') return null;
    return createDatabaseClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      actor: process.env.MYBLOG_DATABASE_GATEWAY_ACTOR || DEFAULT_ACTOR,
      fetchApi: fetch
    });
  } catch (error) {
    if (isMissingSdk(error)) return null;
    throw error;
  }
}

async function callSdk(operation) {
  try {
    return await operation();
  } catch (error) {
    throw await normalizeSdkError(error);
  }
}

async function normalizeSdkError(error) {
  const response = error?.response;
  if (!response) return error;

  let body = null;
  try {
    const text = await response.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  const message = body?.message || body?.error || `DataBase Gateway request failed: ${response.status}`;
  const normalized = new Error(message);
  normalized.status = response.status;
  normalized.body = body;
  return normalized;
}

function requireDataBaseGatewayConfig() {
  const config = getDataBaseGatewayConfig();
  if (!config.baseUrl) {
    throw new Error('MYBLOG_DATABASE_GATEWAY_URL is not configured.');
  }
  return config;
}

async function fetchGatewayJson(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', headers.get('Accept') || 'application/json');
  if (options.apiKey && !headers.has('X-DataBase-Api-Key')) {
    headers.set('X-DataBase-Api-Key', options.apiKey);
  }

  const hasBody = options.body != null;
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${options.baseUrl}${path}`, {
    ...options,
    headers,
    cache: 'no-store'
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message = body?.message || body?.error || `DataBase Gateway request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

function requireIdempotencyKey(idempotencyKey, operation) {
  if (!idempotencyKey) throw new Error(`DataBase Gateway ${operation} requires an idempotency key.`);
  return idempotencyKey;
}

function toQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''));
}

function numberOrUndefined(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isMissingSdk(error) {
  return error?.code === 'ERR_MODULE_NOT_FOUND' || /Cannot find package/.test(String(error?.message || ''));
}
