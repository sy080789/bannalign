// .js extensions are required: Vercel runs these as native ES modules (package.json "type": "module").
import { extractRecipe } from '../src/features/recipes/extract.js'
import { BlockedError, json, requireAuth, safeFetch } from './_lib/guard.js'

/** GET /api/scrape?url=… → { name, image, ingredients[], steps[], servings, total_time } */
export async function GET(req: Request): Promise<Response> {
  const denied = await requireAuth(req)
  if (denied) return denied
  const target = new URL(req.url).searchParams.get('url')
  if (!target) return json({ error: 'Missing url' }, 400)
  try {
    const { body, url } = await safeFetch(target, 4_000_000)
    return json(extractRecipe(new TextDecoder().decode(body), url))
  } catch (e) {
    if (e instanceof BlockedError) return json({ error: 'blocked' }, 422)
    return json({ error: e instanceof Error ? e.message : 'Could not read that page' }, 422)
  }
}
