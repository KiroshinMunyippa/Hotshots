// Public, browser-facing config. The anon key is safe to expose -- it is
// meant for client-side use and is restricted by Row Level Security on the
// Accounts project (see db/accounts-schema.sql). Fill these in from your
// Accounts Supabase project: Project Settings -> API.
export const SUPABASE_ACCOUNTS_URL = 'https://qwtqeldoltafiutuanjt.supabase.co';
export const SUPABASE_ACCOUNTS_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dHFlbGRvbHRhZml1dHVhbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTczNTQsImV4cCI6MjEwNDE5MzM1NH0.G4r8D5RnpL01f9uoEbU1n-aKtDoWXvVHes4VxOCPeak';

// Leave blank to call the /api functions on the same domain the app is
// served from (the normal case once this is deployed on Vercel).
export const API_BASE = '';
