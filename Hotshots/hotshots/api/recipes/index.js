import { verifyUser } from '../../lib/verifyUser.js';
import { appData } from '../../lib/appData.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: 'Sign in required' });

    const { data: recipes, error } = await appData
      .from('recipes')
      .select('*, recipe_ingredients(*), recipe_instructions(*)')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const visible = recipes.filter(r => r.is_shared || r.author_id === user.id);
    const ids = visible.map(r => r.id);
    const { data: ratings } = ids.length
      ? await appData.from('recipe_ratings').select('recipe_id, rating').in('recipe_id', ids)
      : { data: [] };
    const ratingMap = {};
    (ratings || []).forEach(r => {
      const bucket = ratingMap[r.recipe_id] || { total: 0, count: 0 };
      bucket.total += r.rating; bucket.count += 1; ratingMap[r.recipe_id] = bucket;
    });

    const shaped = visible.map(r => ({
      id: r.id, name: r.name, category: r.category, description: r.description, abv: r.abv,
      shared: r.is_shared, authorId: r.author_id,
      ingredients: (r.recipe_ingredients || []).sort((a, b) => a.sort_order - b.sort_order).map(i => ({ name: i.name, amount: i.amount, unit: i.unit })),
      instructions: (r.recipe_instructions || []).sort((a, b) => a.step_number - b.step_number).map(i => i.instruction),
      rating: ratingMap[r.id] || { total: 0, count: 0 }
    }));
    return res.status(200).json({ recipes: shaped });
  }

  if (req.method === 'POST') {
    const user = await verifyUser(req);
    if (!user) return res.status(401).json({ error: 'Sign in required' });
    const { name, category, abv, description, shared, ingredients = [], instructions = [] } = req.body || {};
    if (!name || !category || !ingredients.length || !instructions.length) {
      return res.status(400).json({ error: 'Missing required recipe fields' });
    }
    const { data: recipe, error } = await appData.from('recipes').insert({
      author_id: user.id, name, category, description: description || null, abv: abv || null, is_shared: shared !== false
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });

    await appData.from('recipe_ingredients').insert(
      ingredients.map((i, index) => ({ recipe_id: recipe.id, name: i.name, amount: i.amount || null, unit: i.unit || null, sort_order: index }))
    );
    await appData.from('recipe_instructions').insert(
      instructions.map((step, index) => ({ recipe_id: recipe.id, step_number: index + 1, instruction: step }))
    );
    return res.status(201).json({ id: recipe.id });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
