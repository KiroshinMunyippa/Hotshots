import { verifyUser } from '../../lib/verifyUser.js';
import { appData } from '../../lib/appData.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }

  // Verified with the caller's OWN token -- which must still be the guest's
  // anonymous session at this point, proving these recipes are really theirs
  // to hand off. There's deliberately no other way to move a recipe's
  // ownership.
  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in required' });
  if (!user.is_anonymous) return res.status(400).json({ error: 'Only a guest session can hand off recipes' });

  const { newUserId } = req.body || {};
  if (!newUserId) return res.status(400).json({ error: 'Missing newUserId' });

  const { error } = await appData.from('recipes').update({ author_id: newUserId }).eq('author_id', user.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}