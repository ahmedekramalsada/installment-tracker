import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  console.error('   Create a project at https://supabase.com and add the credentials to .env')
  process.exit(1)
}

// Service role client — bypasses RLS, used for server-side operations
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Helper: create a Supabase client scoped to a user's JWT
export function createSupabaseClient(userToken: string): SupabaseClient {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    },
  })
}

console.log('✅ Supabase connected:', SUPABASE_URL)

export default supabaseAdmin
