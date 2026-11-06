import { json, requireAuth, safeFetch } from './_lib/guard.js'

/** GET /api/image?url=… → the image bytes, so the phone can resize and upload it (sites block cross-origin reads). */
export async function GET(req: Request): Promise<Response> {
  const denied = await requireAuth(req)
  if (denied) return denied
  const target = new URL(req.url).searchParams.get('url')
  if (!target) return json({ error: 'Missing url' }, 400)
  try {
    const { res, body } = await safeFetch(target, 8_000_000)
    const type = res.headers.get('content-type') ?? ''
    if (!type.startsWith('image/')) return json({ error: 'Not an image' }, 422)
    return new Response(body, { headers: { 'content-type': type, 'cache-control': 'private, max-age=3600' } })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Could not load image' }, 422)
  }
}
