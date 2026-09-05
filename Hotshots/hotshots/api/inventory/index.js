import { verifyUser } from '../../lib/verifyUser.js';
import { appData } from '../../lib/appData.js';

export default async function handler(req, res) {
  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in required' });

  if (req.method === 'GET') {
    const { data, error } = await appData.from('inventory_items').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ items: data });
  }

  if (req.method === 'POST') {
    const { name, type, amount } = req.body || {};
    if (!name || !amount) return res.status(400).json({ error: 'Name and amount are required' });
    const { data, error } = await appData.from('inventory_items').insert({
      user_id: user.id, name, type: type || 'Other', amount
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ item: data });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
