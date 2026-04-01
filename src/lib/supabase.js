import { createClient } from '@supabase/supabase-js'

// Project URL from Supabase dashboard → Settings → API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

// Anon public key — safe to expose in the browser
// Never use the service_role key here
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabase = createClient(url, key)
window.supabase = supabase  // add this temporarily
