import { verifyUser } from '../../lib/verifyUser.js';
import { appData } from '../../lib/appData.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') { res.setHeader('Allow', 'DELETE'); return res.status(405).end(); }
  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in required' });

  const { error } = await appData.from('inventory_items').delete().eq('id', req.query.id).eq('user_id', user.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).end();
}
