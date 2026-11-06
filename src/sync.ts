import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { db, type Row, type TableName } from './db'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null = local-only mode: no backend configured, or VITE_LOCAL_ONLY=1 for testing without touching real data. */
const localOnly = import.meta.env.VITE_LOCAL_ONLY === '1'
export const supabase: SupabaseClient | null = url && key && !localOnly ? createClient(url, key) : null

const TABLES: TableName[] = ['lists', 'items', 'recipes']

/** Write locally first, then queue for the server. UI never waits on the network. */
export async function save<T extends Row>(table: TableName, row: T) {
  const r = { ...row, updated_at: new Date().toISOString() }
  await db.transaction('rw', db.table(table), db.outbox, async () => {
    await db.table(table).put(r)
    await db.outbox.put({ key: `${table}:${r.id}`, table, row: r })
  })
  requestSync()
}

let running: Promise<void> | null = null
let again = false

export function requestSync() {
  if (!supabase || !navigator.onLine) return
  if (running) {
    again = true
    return
  }
  running = syncOnce()
    .catch((e) => console.warn('sync failed', e))
    .finally(() => {
      running = null
      if (again) {
        again = false
        requestSync()
      }
    })
}

async function syncOnce() {
  if (!supabase) return
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return

  // 1. Push: one upsert per table. The server trigger keeps whichever version is newer.
  const pending = await db.outbox.toArray()
  for (const table of TABLES) {
    const rows = pending.filter((p) => p.table === table)
    if (!rows.length) continue
    const { error } = await supabase.from(table).upsert(rows.map((p) => p.row))
    if (error) throw error
    // Only clear entries that weren't edited again while we were uploading.
    await db.transaction('rw', db.outbox, async () => {
      for (const p of rows) {
        const cur = await db.outbox.get(p.key)
        if (cur && cur.row.updated_at === p.row.updated_at) await db.outbox.delete(p.key)
      }
    })
  }

  // 2. Pull everything the server changed since our cursor (server-stamped `synced_at`).
  for (const table of TABLES) {
    const cursorKey = `cursor:${table}`
    const cursor = (await db.meta.get(cursorKey))?.value ?? '1970-01-01T00:00:00Z'
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gt('synced_at', cursor)
      .order('synced_at')
      .limit(1000)
    if (error) throw error
    if (!data?.length) continue
    await db.transaction('rw', db.table(table), db.outbox, db.meta, async () => {
      for (const { synced_at: _s, ...remote } of data) {
        if (await db.outbox.get(`${table}:${remote.id}`)) continue // local edit pending wins until pushed
        await db.table(table).put(remote)
      }
      await db.meta.put({ key: cursorKey, value: data[data.length - 1].synced_at })
    })
  }
}

/** Sync on open, on return to foreground, on reconnect, and on realtime pings. */
export function startSync() {
  if ('storage' in navigator && navigator.storage.persist) navigator.storage.persist().catch(() => {})
  if (!supabase) return
  requestSync()
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && requestSync())
  window.addEventListener('online', requestSync)
  supabase.auth.onAuthStateChange(() => requestSync())
  const ch = supabase.channel('changes')
  for (const table of TABLES) ch.on('postgres_changes', { event: '*', schema: 'public', table }, requestSync)
  ch.subscribe()
}
