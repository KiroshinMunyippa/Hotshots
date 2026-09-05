import { createClient } from '@supabase/supabase-js';

// Service-role key: bypasses Row Level Security. This file must only ever be
// imported by /api routes (server-side). Never send this key to the browser.
export const appData = createClient(
  process.env.SUPABASE_APPDATA_URL,
  process.env.SUPABASE_APPDATA_SERVICE_KEY,
  { auth: { persistSession: false } }
);
