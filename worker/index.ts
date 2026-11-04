/**
 * Cloudflare Workers 入口
 *
 * 职责：
 * 1. 静态资源（dist 产物）由 Workers Static Assets 托管，SPA 路由回退到 index.html
 * 2. /api/favicon/:domain.png  -> 抓取并缓存站点图标（替代原 koa 服务的 favicon 中间件）
 * 3. /api/sync、/api/sync/:id  -> 数据同步（替代原 koa 服务，需要绑定 KV 命名空间 MOON_KV）
 */

interface Env {
  /** 静态资源绑定（wrangler.jsonc 中 assets.binding） */
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  /** 同步数据存储，未绑定时同步功能自动降级为不可用 */
  MOON_KV?: KVNamespace
  /** 图标抓取来源：google | 0x3 */
  FAVICON_SOURCE?: string
  /** 图标请求尺寸 */
  FAVICON_SIZE?: string
  /** 同步 ID 加盐值 */
  DATA_SALT?: string
}

interface KVNamespace {
  get: (key: string, type?: 'text' | 'json') => Promise<any>
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>
}

/** 类型不可用时的最小执行上下文声明 */
interface Ctx {
  waitUntil: (promise: Promise<unknown>) => void
}

const FAVICON_TTL = 60 * 60 * 24 * 7
/** 未取到图标时的边缘缓存时间，避免每次打开页面都重新抓取 */
const FAVICON_MISS_TTL = 60 * 60
const ID_REG = /^\w{5,64}$/

/**
 * 第三方接口在「查不到图标」时返回的通用占位图指纹。
 * 这类图片能正常加载但没有任何辨识度，需要当成失败处理，交给前端渲染首字母。
 * - 0x3: 一枚灰色链条 SVG（794 字节）
 */
const PLACEHOLDER_DIGESTS = new Set([
  'b1db10a3aa6d652072cecf2095a8c221f262c6ae5cdc33bd42ad9bd7c60a2d58',
])

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: CORS_HEADERS })

    // favicon: /api/favicon/example.com.png 或 /favicon/example.com.png
    const faviconMatch = url.pathname.match(/^\/(?:api\/)?favicon\/([^/]+?)\.png$/)
    if (faviconMatch)
      return handleFavicon(request, faviconMatch[1], env, ctx)

    if (url.pathname === '/api/sync' || url.pathname.startsWith('/api/sync/'))
      return handleSync(request, url, env)

    return env.ASSETS.fetch(request)
  },
}

/* ------------------------------ favicon ------------------------------ */

async function handleFavicon(request: Request, domain: string, env: Env, ctx: Ctx): Promise<Response> {
  if (!/^[\w.-]+$/.test(domain))
    return json({ code: -1, msg: 'bad domain' }, 400)

  const edgeCache = (caches as unknown as { default: Cache }).default
  const cacheKey = new Request(`https://moon.internal/favicon/${domain}.png`, { method: 'GET' })
  const cached = await edgeCache.match(cacheKey)
  if (cached)
    return cached

  const image = await fetchFavicon(domain, env)
  if (!image) {
    // 返回 404，让前端渲染首字母占位图
    ctx.waitUntil(edgeCache.put(cacheKey, notFound(`public, max-age=${FAVICON_MISS_TTL}`)))
    return notFound('no-store')
  }

  const response = new Response(image.body, {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': `public, max-age=${FAVICON_TTL}, immutable`,
      ...CORS_HEADERS,
    },
  })

  ctx.waitUntil(edgeCache.put(cacheKey, response.clone()))
  return response
}

async function fetchFavicon(domain: string, env: Env): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const size = env.FAVICON_SIZE || '64'
  const source = env.FAVICON_SOURCE || 'google'

  const candidates: string[] = []
  if (source !== '0x3')
    candidates.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`)
  if (source !== 'google')
    candidates.push(`https://0x3.com/icon?host=${domain}`)
  candidates.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`)

  for (const candidate of candidates) {
    const result = await fetchImage(candidate)
    if (result)
      return result
  }

  // 兜底：解析站点 HTML 中的 <link rel="icon">
  const iconUrl = await findIconFromHtml(domain)
  if (iconUrl)
    return fetchImage(iconUrl)

  return null
}

async function fetchImage(url: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MoonFavicon/1.0)' },
      signal: AbortSignal.timeout(5000),
    })
    const contentType = response.headers.get('content-type') || ''
    if (!response.ok || !contentType.startsWith('image'))
      return null

    const body = await response.arrayBuffer()
    // 小于 128 字节基本是 1x1 占位图，视为未取到
    if (body.byteLength < 128)
      return null
    if (await isPlaceholder(body))
      return null

    return { body, contentType }
  }
  catch {
    return null
  }
}

async function isPlaceholder(body: ArrayBuffer): Promise<boolean> {
  const digest = await crypto.subtle.digest('SHA-256', body)
  const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
  return PLACEHOLDER_DIGESTS.has(hex)
}

async function findIconFromHtml(domain: string): Promise<string | null> {
  try {
    const response = await fetch(`https://${domain}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MoonFavicon/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok)
      return null

    const html = (await response.text()).slice(0, 100_000)
    const matches = [...html.matchAll(/<link[^>]+rel=["']?[^"'>]*icon[^>]*>/gi)]
    for (const match of matches) {
      const href = match[0].match(/href=["']([^"']+)["']/i)?.[1]
      if (!href)
        continue
      try {
        return new URL(href, response.url || `https://${domain}`).toString()
      }
      catch {
        continue
      }
    }
    return null
  }
  catch {
    return null
  }
}

/* ------------------------------- sync -------------------------------- */

async function handleSync(request: Request, url: URL, env: Env): Promise<Response> {
  if (!env.MOON_KV)
    return json({ code: -1, msg: '同步服务未启用：请在 Cloudflare 中绑定 KV 命名空间 MOON_KV', data: null })

  if (request.method === 'POST' && url.pathname === '/api/sync') {
    const body = (await request.json().catch(() => null)) as
      | { id?: string; secretId?: string; data?: { data?: unknown; settings?: unknown } }
      | null

    if (!body)
      return json({ code: -1, msg: 'illegal body', data: null })

    const { id, secretId, data } = body
    if (secretId && secretId.length !== 64)
      return json({ code: -1, msg: 'illegal secretId', data: null })
    if (!id || !ID_REG.test(id))
      return json({ code: -1, msg: `illegal id: ${id}`, data: null })
    if (!data?.data || !data.settings)
      return json({ code: -1, msg: 'illegal data', data: null })

    const key = secretId || await encryptId(id, env.DATA_SALT)
    await env.MOON_KV.put(key, JSON.stringify(data))
    return json({ code: 0, msg: 'ok', data: { id: key } })
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/sync/')) {
    const id = decodeURIComponent(url.pathname.slice('/api/sync/'.length))
    if (!ID_REG.test(id))
      return json({ code: -1, msg: `illegal id: ${id}`, data: null })

    const key = id.length < 64 ? await encryptId(id, env.DATA_SALT) : id
    const stored = await env.MOON_KV.get(key, 'text')
    if (!stored)
      return json({ code: -1, msg: `id not exist: ${id}`, data: null })

    return json({ code: 0, msg: 'ok', data: { data: JSON.parse(stored), id: key } })
  }

  return json({ code: -1, msg: 'not found', data: null }, 404)
}

async function encryptId(id: string, salt = 'SALT') {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id + salt))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

/* ------------------------------ helpers ------------------------------ */

function notFound(cacheControl: string) {
  return new Response('favicon not found', {
    status: 404,
    headers: { 'Cache-Control': cacheControl, ...CORS_HEADERS },
  })
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  })
}
