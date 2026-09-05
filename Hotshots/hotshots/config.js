// Public, browser-facing config. The anon key is safe to expose -- it is
// meant for client-side use and is restricted by Row Level Security on the
// Accounts project (see db/accounts-schema.sql). Fill these in from your
// Accounts Supabase project: Project Settings -> API.
export const SUPABASE_ACCOUNTS_URL = 'https://YOUR-ACCOUNTS-PROJECT.supabase.co';
export const SUPABASE_ACCOUNTS_ANON_KEY = 'YOUR-ACCOUNTS-ANON-KEY';

// Leave blank to call the /api functions on the same domain the app is
// served from (the normal case once this is deployed on Vercel).
export const API_BASE = '';
