import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Only signed-in household members may use these endpoints (otherwise they're an open proxy). */
export async function requireAuth(req: Request): Promise<Response | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null // local dev without a backend
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Sign in required' }, 401)
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, authorization: auth } })
  return r.ok ? null : json({ error: 'Sign in required' }, 401)
}

function privateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase()
    if (v.startsWith('::ffff:')) return privateIp(v.slice(7))
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')
  }
  const [a, b] = ip.split('.').map(Number)
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
}

/** Blocks anything but public http(s) hosts, including DNS names that resolve to private addresses. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http(s) links are supported')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addrs = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address)
  if (!addrs.length || addrs.some(privateIp)) throw new Error('That address is not allowed')
  return url
}

// Identify honestly. Sites that block automated readers get a graceful "paste it instead" in the app — we don't evade bot checks.
const UA = 'Mozilla/5.0 (compatible; bannalign/1.0; personal recipe saver)'

export class BlockedError extends Error {}

/** fetch with a timeout, a size cap, and every redirect hop re-checked. */
export async function safeFetch(raw: string, maxBytes: number): Promise<{ res: Response; body: Uint8Array; url: string }> {
  let url = (await assertPublicUrl(raw)).href
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000), headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
      },
    })
    const loc = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && loc) {
      url = (await assertPublicUrl(new URL(loc, url).href)).href
      continue
    }
    if (res.status === 401 || res.status === 403 || res.status === 429) throw new BlockedError('blocked')
    if (!res.ok) throw new Error(`The site responded with ${res.status}`)
    const reader = res.body?.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > maxBytes) {
        await reader.cancel()
        throw new Error('That page is too large')
      }
      chunks.push(value)
    }
    const body = new Uint8Array(size)
    let off = 0
    for (const c of chunks) {
      body.set(c, off)
      off += c.length
    }
    return { res, body, url }
  }
  throw new Error('Too many redirects')
}
