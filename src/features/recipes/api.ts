import { supabase } from '../../sync'
import type { Scraped } from './extract'

async function authHeaders(): Promise<HeadersInit> {
  const token = supabase && (await supabase.auth.getSession()).data.session?.access_token
  return token ? { authorization: `Bearer ${token}` } : {}
}

export async function scrapeRecipe(url: string): Promise<Scraped> {
  const r = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`, { headers: await authHeaders() })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(body.error ?? 'Could not read that page')
  return body as Scraped
}

export async function fetchImage(url: string): Promise<Blob> {
  const r = await fetch(`/api/image?url=${encodeURIComponent(url)}`, { headers: await authHeaders() })
  if (!r.ok) throw new Error('Could not load that photo')
  return r.blob()
}
