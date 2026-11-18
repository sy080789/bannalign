import { supabase } from './sync'

/** Display names for the two members (emails match `members` in supabase/schema.sql). */
const NAMES: Record<string, string> = {
  'stephenpkyeung@gmail.com': 'Stephen',
  'amandaspickles@gmail.com': 'Amanda',
}

/** Who is using this phone, for logs like "Watered by Amanda". Empty in local-only mode. */
export async function whoAmI(): Promise<string> {
  const email = supabase ? (await supabase.auth.getSession()).data.session?.user.email : undefined
  if (!email) return ''
  return NAMES[email.toLowerCase()] ?? email.split('@')[0]
}
