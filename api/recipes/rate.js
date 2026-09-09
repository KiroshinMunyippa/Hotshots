import { verifyUser } from '../../../lib/verifyUser.js';
import { appData } from '../../../lib/appData.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const user = await verifyUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in required' });
  if (user.is_anonymous) return res.status(403).json({ error: 'Create an account to give a HotShot Score' });

  const value = Number((req.body || {}).rating);
  if (!value || value < 1 || value > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  const recipeId = req.query.id;

  const { error } = await appData.from('recipe_ratings').upsert({
    recipe_id: recipeId,
    user_id: user.id,
    rating: value,
    updated_at: new Date().toISOString(),
  });
  if (error) return res.status(500).json({ error: error.message });

  const { data: ratings, error: fetchError } = await appData
    .from('recipe_ratings')
    .select('rating')
    .eq('recipe_id', recipeId);
  if (fetchError) return res.status(500).json({ error: fetchError.message });

  const total = ratings.reduce((sum, r) => sum + r.rating, 0);
  return res.status(200).json({ total, count: ratings.length });
}
