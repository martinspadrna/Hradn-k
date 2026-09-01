import { createClient } from '@supabase/supabase-js'

// The publishable/anon key is safe to use in the browser.
// A Vercel deployment can use the environment variable, while the fallback
// keeps the demo deployment from becoming a blank page when the variable
// hasn't been configured yet.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cgshssdjgzzuprlwnabl.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_v7jeuZC-MNUEO5nfE5xcUQ_Pu9pT-X_'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
