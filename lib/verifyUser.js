import { createClient } from '@supabase/supabase-js';

// Verifying a token only needs a project URL + anon key (not the service key) --
// this client is only ever used to ask "is this a valid Accounts-project token,
// and whose is it?", never to read or write data.
const accounts = createClient(process.env.SUPABASE_ACCOUNTS_URL, process.env.SUPABASE_ACCOUNTS_ANON_KEY);

export async function verifyUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const { data, error } = await accounts.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
