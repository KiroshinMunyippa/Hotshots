import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_ACCOUNTS_URL, SUPABASE_ACCOUNTS_ANON_KEY, API_BASE } from './config.js';

const supabase = createClient(SUPABASE_ACCOUNTS_URL, SUPABASE_ACCOUNTS_ANON_KEY);

const categoryColours = { Classic: '#d47750', Fruity: '#e89a99', Strong: '#8d6954', Sweet: '#e5ae61', Sour: '#a2bd75' };
const ingredientTypes = [
  { type: 'Spirit', icon: '◈', colour: '#435b41' },
  { type: 'Beer', icon: '◎', colour: '#8a6d3b' },
  { type: 'Cordial', icon: '◌', colour: '#9b7653' },
  { type: 'Other', icon: '✦', colour: '#5c6a53' }
];
const ingredientTypeMeta = (type) => ingredientTypes.find(t => t.type === type) || ingredientTypes[ingredientTypes.length - 1];

const seedDrinks = [
  { id: 'negroni', name: 'Smoked Negroni', category: 'Classic', description: 'Bitter, bright, and a little smoky.', abv: 24, shared: true,
    ingredients: [{ name: 'Gin', amount: 30, unit: 'ml' }, { name: 'Sweet vermouth', amount: 30, unit: 'ml' }, { name: 'Campari', amount: 30, unit: 'ml' }],
    instructions: ['Add all ingredients to a mixing glass with ice.', 'Stir until very cold.', 'Strain over one large cube and finish with an orange peel.'] },
  { id: 'paloma', name: 'Grapefruit Paloma', category: 'Fruity', description: 'Zesty, fizzy, effortless.', abv: 12, shared: true,
    ingredients: [{ name: 'Tequila', amount: 45, unit: 'ml' }, { name: 'Grapefruit soda', amount: 90, unit: 'ml' }, { name: 'Lime juice', amount: 15, unit: 'ml' }],
    instructions: ['Salt the rim of a tall glass.', 'Fill with ice and add tequila and lime juice.', 'Top with grapefruit soda and stir gently.'] },
  { id: 'espresso', name: 'Espresso Martini', category: 'Strong', description: 'Bittersweet and wide awake.', abv: 18, shared: true,
    ingredients: [{ name: 'Vodka', amount: 45, unit: 'ml' }, { name: 'Coffee liqueur', amount: 20, unit: 'ml' }, { name: 'Fresh espresso', amount: 30, unit: 'ml' }],
    instructions: ['Shake all ingredients hard with ice.', 'Double strain into a chilled coupe.', 'Garnish with three coffee beans.'] },
  { id: 'cucumber', name: 'Cucumber Cooler', category: 'Sour', description: 'Garden-fresh and crisp.', abv: 9, shared: true,
    ingredients: [{ name: 'Gin', amount: 40, unit: 'ml' }, { name: 'Cucumber', amount: 3, unit: 'slices' }, { name: 'Lime juice', amount: 20, unit: 'ml' }, { name: 'Soda water', amount: 60, unit: 'ml' }],
    instructions: ['Muddle cucumber in a shaker.', 'Add gin, lime, and ice; shake well.', 'Strain into a glass with ice and top with soda.'] },
  { id: 'sunset', name: 'Sunset Sour', category: 'Sweet', description: 'A gentle sweet finish.', abv: 14, shared: false,
    ingredients: [{ name: 'Bourbon', amount: 45, unit: 'ml' }, { name: 'Orange juice', amount: 30, unit: 'ml' }, { name: 'Grenadine', amount: 10, unit: 'ml' }],
    instructions: ['Shake bourbon and orange juice with ice.', 'Strain into a glass over fresh ice.', 'Slowly pour grenadine down the side.'] }
];
const seedRatings = { negroni: { total: 42, count: 10 }, paloma: { total: 33, count: 8 }, espresso: { total: 27, count: 6 }, cucumber: { total: 12, count: 3 } };
const seedInventory = [
  { id: 'gin', name: 'London Dry Gin', amount: '260 ml left', type: 'Spirit' },
  { id: 'lime', name: 'Fresh limes', amount: '6 pieces', type: 'Other' },
  { id: 'campari', name: 'Campari', amount: '180 ml left', type: 'Spirit' },
  { id: 'syrup', name: 'Simple syrup', amount: '120 ml left', type: 'Cordial' },
  { id: 'soda', name: 'Soda water', amount: '4 cans', type: 'Other' }
];

const readStore = (key, fallback) => { try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) : fallback; } catch { return fallback; } };
const writeStore = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const state = {
  tab: 'summary', filter: 'All', recipeId: null, authMode: 'signin', authError: '',
  draftIngredients: [], draftIngredientType: 'Spirit',
  notifications: readStore('hotshots-notifications', true),
  theme: readStore('hotshots-theme', 'system'),
  favourites: readStore('hotshots-favourites', []),
  logs: readStore('hotshots-logs', []),
  session: null, profile: null, guest: false, guestRatings: {}, userRatingCache: {}, drinks: [], inventory: [], loading: false
};

const $ = (selector, root = document) => root.querySelector(selector);
const view = $('#view');
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);
const displayDate = () => new Intl.DateTimeFormat('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
const showToast = (message) => { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800); };
const drinksToday = () => state.logs.filter(log => new Date(log.madeAt).toDateString() === new Date().toDateString());
const ingredientName = (ingredient) => typeof ingredient === 'string' ? ingredient : ingredient.name;
const ingredientPreview = (drink, count = 2) => drink.ingredients.slice(0, count).map(ingredientName).join(' + ');
const measurement = (ingredient) => [ingredient.amount, ingredient.unit].filter(Boolean).join(' ') || 'To taste';
const ratingFor = (id) => (state.drinks.find(d => d.id === id) || {}).rating || { total: 0, count: 0 };
const ratingText = (id) => { const rating = ratingFor(id); return rating.count ? `${(rating.total / rating.count).toFixed(1)} / 5 · ${rating.count} ratings` : 'No ratings yet'; };
const ratingShort = (id) => { const rating = ratingFor(id); return rating.count ? `${(rating.total / rating.count).toFixed(1)} (${rating.count})` : 'New'; };
const strengthFor = (drink) => (drink.abv || 0) >= 22 ? 'Strong' : (drink.abv || 0) >= 14 ? 'Balanced' : 'Light';
const strengthText = (drink) => `${strengthFor(drink)} · ~${drink.abv || 0}% ABV`;
const initials = () => (state.profile?.display_name || state.session?.user?.email || '?').slice(0, 2).toUpperCase();

function applyTheme() {
  const resolved = state.theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : state.theme;
  document.body.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = resolved === 'light' ? '#e8eee4' : '#10120f';
}

async function authFetch(path, options = {}) {
  const token = state.session?.access_token;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(body.error || 'Something went wrong');
  return body;
}

async function loadRecipes() {
  const { recipes } = await authFetch('/api/recipes');
  state.drinks = recipes.map(r => ({ ...r, colour: categoryColours[r.category] || '#8d6954', favourite: state.favourites.includes(r.id) }));
}
async function loadInventory() {
  const { items } = await authFetch('/api/inventory');
  state.inventory = items.map(item => ({ ...item, ...ingredientTypeMeta(item.type) }));
}
async function loadProfile() {
  const { data } = await supabase.from('profiles').select('*').eq('id', state.session.user.id).single();
  state.profile = data;
}
async function bootstrapData() {
  state.loading = true; render();
  try { await Promise.all([loadRecipes(), loadInventory(), loadProfile()]); }
  catch (err) { showToast(err.message); }
  state.loading = false; render();
}

function loadGuestData() {
  state.guestRatings = readStore('guest-ratings', seedRatings);
  state.drinks = readStore('guest-drinks', seedDrinks).map(d => ({ ...d, colour: categoryColours[d.category] || '#8d6954', favourite: state.favourites.includes(d.id), rating: state.guestRatings[d.id] || { total: 0, count: 0 } }));
  state.inventory = readStore('guest-inventory', seedInventory).map(item => ({ ...item, ...ingredientTypeMeta(item.type) }));
}
const saveGuestDrinks = () => writeStore('guest-drinks', state.drinks);
const saveGuestInventory = () => writeStore('guest-inventory', state.inventory);
const saveGuestRatings = () => writeStore('guest-ratings', state.guestRatings);

function ratingControl(drink) {
  const current = state.userRatingCache?.[drink.id];
  return `<div class="rating-control" aria-label="Rate ${escapeHtml(drink.name)}">${[1, 2, 3, 4, 5].map(value => `<button class="rating-star ${current >= value ? 'selected' : ''}" data-rate="${drink.id}" data-value="${value}" aria-label="Rate ${value} out of 5">★</button>`).join('')}</div>`;
}

function drinkCard(drink, variant = 'rail', showRemove = false) {
  if (variant === 'discover') return `
    <article class="discover-card recipe-card" data-view-recipe="${drink.id}">
      <div class="art" style="--drink-color:${drink.colour}"></div>
      <span class="label">${drink.category}</span>
      <button class="like ${drink.favourite ? 'is-favourite' : ''}" data-favourite="${drink.id}" aria-label="Toggle favourite">${drink.favourite ? '♥' : '♡'}</button>
      <h3>${escapeHtml(drink.name)}</h3>
      <p>${escapeHtml(drink.description || ingredientPreview(drink))}</p>
      <small class="strength-badge">${strengthText(drink)}</small>
      <small class="rating-summary">★ ${ratingText(drink.id)}</small>
      <button class="card-action" data-view-recipe="${drink.id}">View recipe →</button>
      ${showRemove ? `<button class="card-action remove-saved" data-favourite="${drink.id}">Remove ×</button>` : ratingControl(drink)}
    </article>`;
  return `
    <article class="drink-card">
      <div class="drink-glow" style="background:${drink.colour}"></div>
      <span class="label">${drink.category}${drink.shared ? '' : ' · private'}</span>
      <strong>${escapeHtml(drink.name)}</strong>
      <small>${escapeHtml(ingredientPreview(drink))}</small>
      <small class="drink-strength">${strengthText(drink)}</small>
      <div class="drink-card-footer"><span class="community-rating">★ ${ratingShort(drink.id)}</span><button class="like ${drink.favourite ? 'is-favourite' : ''}" data-favourite="${drink.id}" aria-label="Toggle favourite">${drink.favourite ? '♥' : '♡'}</button></div>
    </article>`;
}

function renderAuth() {
  const isSignup = state.authMode === 'signup';
  view.innerHTML = `
    <p class="eyebrow">${isSignup ? 'Create your account' : 'Welcome back'}</p>
    <h1 class="page-title">${isSignup ? 'Join<br>HotShots.' : 'Sign in to<br>your bar.'}</h1>
    <p class="page-subtitle">${isSignup ? 'Create an account to save recipes, ratings, and your bar across devices.' : 'Sign in to pick up your recipes and bar where you left off.'}</p>
    <form class="form-card" id="auth-form">
      ${isSignup ? `<div class="field"><label for="auth-name">Display name</label><input id="auth-name" name="displayName" required maxlength="40" placeholder="e.g. Kiroshin"></div>` : ''}
      <div class="field"><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" required placeholder="you@example.com" autocomplete="email"></div>
      <div class="field"><label for="auth-password">Password</label><input id="auth-password" name="password" type="password" required minlength="6" placeholder="At least 6 characters" autocomplete="${isSignup ? 'new-password' : 'current-password'}"></div>
      ${state.authError ? `<p class="auth-error">${escapeHtml(state.authError)}</p>` : ''}
      <button class="primary-button" type="submit">${isSignup ? 'Create account' : 'Sign in'}</button>
    </form>
    <button class="secondary-button auth-guest-button" id="continue-guest" type="button">Continue as guest</button>
    <p class="page-subtitle" style="margin-top:16px">${isSignup ? 'Already have an account?' : 'New here?'} <button class="text-link" id="auth-toggle" type="button">${isSignup ? 'Sign in' : 'Create one'}</button></p>`;
}

function renderLoading() {
  view.innerHTML = `<p class="eyebrow">One sec</p><h1 class="page-title">Loading your<br>bar.</h1>`;
}

function renderSummary() {
  const recent = state.drinks.slice(0, 3);
  const made = drinksToday();
  const shared = state.drinks.filter(drink => drink.shared).length;
  view.innerHTML = `
    <p class="eyebrow">${displayDate()}</p>
    <section class="today-card">
      <div class="stat-chip"><strong>${state.drinks.length}</strong><span>recipes</span></div>
      <span class="label">Your next pour</span>
      <h1>Make something worth remembering.</h1>
      <p>We found ${state.drinks.length} drinks waiting in your bar.</p>
      <div class="today-actions"><button class="primary-button" data-nav="explore">Choose a drink</button><button class="secondary-button" data-nav="create">Create mine</button></div>
    </section>
    <div class="section-head"><h2>Recent creations</h2><button class="text-link" data-nav="favourites">See saved</button></div>
    <div class="drink-rail">${recent.map(drink => drinkCard(drink)).join('')}</div>
    <div class="section-head"><h2>Today at a glance</h2></div>
    <div class="metric-grid">
      <div class="metric"><strong>${made.length}</strong><span>drinks made</span></div>
      <div class="metric"><strong>${shared}</strong><span>shared recipes</span></div>
      <div class="metric"><strong>${state.inventory.length}</strong><span>ingredients</span></div>
    </div>
    <div class="section-head"><h2>Small bartender tip</h2></div>
    <aside class="tip-card"><div class="tip-icon">✦</div><div><h3>Chill the glass, not just the drink.</h3><p>A cold glass preserves dilution and makes every first sip brighter.</p></div></aside>`;
}

function draftIngredientRows() {
  if (!state.draftIngredients.length) return '<p class="empty-ingredient-note">Add each ingredient with the amount you use.</p>';
  return state.draftIngredients.map((ingredient, index) => `<div class="draft-ingredient"><span><strong>${escapeHtml(ingredient.name)}</strong><small>${escapeHtml(measurement(ingredient))}</small></span><button type="button" data-remove-draft="${index}" aria-label="Remove ${escapeHtml(ingredient.name)}">×</button></div>`).join('');
}
function updateDraftIngredientRows() { const list = $('#draft-ingredient-list'); if (list) list.innerHTML = draftIngredientRows(); }

function renderCreate() {
  view.innerHTML = `
    <p class="eyebrow">Your recipe, your rules</p>
    <h1 class="page-title">Create a<br>new pour.</h1>
    <p class="page-subtitle">Build the recipe exactly as you make it, then decide whether to keep it private or share it.</p>
    <form class="form-card" id="create-form">
      <div class="field"><label for="drink-name">Recipe name</label><input id="drink-name" name="name" required maxlength="38" placeholder="e.g. Sunday Heat" autocomplete="off"></div>
      <div class="field"><label>Style</label><div class="pills" id="category-pills">${['Classic', 'Fruity', 'Strong', 'Sweet', 'Sour'].map((category, index) => `<button type="button" class="pill ${index === 0 ? 'selected' : ''}" data-category="${category}">${category}</button>`).join('')}</div><input type="hidden" name="category" value="Classic"></div>
      <div class="field"><label>Estimated strength</label><div class="pills" id="strength-pills">${[{ label: 'Light', abv: 8 }, { label: 'Balanced', abv: 16 }, { label: 'Strong', abv: 24 }].map((strength, index) => `<button type="button" class="pill strength-pill ${index === 1 ? 'selected' : ''}" data-abv="${strength.abv}">${strength.label} · ${strength.abv}%</button>`).join('')}</div><input type="hidden" name="abv" value="16"><small class="field-help">An approximate alcohol-by-volume guide for people viewing your recipe.</small></div>
      <div class="field"><label>Ingredients & measurements</label><div id="draft-ingredient-list" class="draft-ingredient-list">${draftIngredientRows()}</div><div class="ingredient-adder"><input id="ingredient-name" placeholder="Ingredient" maxlength="35" aria-label="Ingredient name"><input id="ingredient-amount" type="number" min="0.1" step="0.1" placeholder="Amount" aria-label="Ingredient amount"><input id="ingredient-unit" placeholder="ml, oz, dash" maxlength="12" aria-label="Ingredient unit"><button type="button" id="add-custom-ingredient" aria-label="Add ingredient">+</button></div></div>
      <div class="field"><label for="instructions">Instructions</label><textarea id="instructions" name="instructions" required maxlength="700" placeholder="1. Add the ingredients to a shaker with ice.&#10;2. Shake until chilled.&#10;3. Strain and garnish."></textarea><small class="field-help">Put each step on a new line.</small></div>
      <div class="field"><label for="notes">Tasting note <span style="text-transform:none;letter-spacing:0">(optional)</span></label><textarea id="notes" name="notes" maxlength="110" placeholder="Crisp, citrusy, a little dangerous..."></textarea></div>
      <label class="share-control"><input type="checkbox" name="shared" checked><span><strong>Share on Explore</strong><small>Other HotShots users can make and rate this recipe.</small></span><i></i></label>
      <button class="primary-button" type="submit">Save recipe</button>
    </form>`;
}

function renderExplore() {
  const categories = ['All', 'Classic', 'Fruity', 'Strong', 'Sweet', 'Sour'];
  const publicDrinks = state.drinks.filter(drink => drink.shared);
  const drinks = state.filter === 'All' ? publicDrinks : publicDrinks.filter(drink => drink.category === state.filter);
  view.innerHTML = `
    <p class="eyebrow">Fresh ideas, shared by the community</p>
    <h1 class="page-title">Find your<br>next favourite.</h1>
    <p class="page-subtitle">Discover recipes, follow the method, and leave a rating after you make one.</p>
    <div class="filter-row">${categories.map(category => `<button class="pill ${state.filter === category ? 'selected' : ''}" data-filter="${category}">${category}</button>`).join('')}</div>
    ${drinks.length ? `<div class="discover-grid">${drinks.map(drink => drinkCard(drink, 'discover')).join('')}</div>` : `<section class="empty-state"><i>✦</i><h3>No shared recipes here yet</h3><p>Be the first to share a ${state.filter.toLowerCase()} drink with the community.</p><button class="primary-button" data-nav="create">Create a recipe</button></section>`}`;
}

function renderRecipeDetail() {
  const drink = state.drinks.find(item => item.id === state.recipeId);
  if (!drink) { state.recipeId = null; return renderExplore(); }
  view.innerHTML = `
    <button class="text-link back-link" data-back-explore>← Back to explore</button>
    <section class="recipe-detail">
      <span class="label">${drink.category} · community recipe</span>
      <h1 class="page-title">${escapeHtml(drink.name)}</h1>
      <p class="recipe-description">${escapeHtml(drink.description || 'A community-made recipe worth trying.')}</p>
      <p class="recipe-strength"><span>Strength</span>${strengthText(drink)}</p>
      <div class="recipe-rating"><span>★ ${ratingText(drink.id)}</span>${ratingControl(drink)}</div>
      <div class="recipe-detail-section"><h2>Ingredients</h2><ul class="recipe-ingredients">${drink.ingredients.map(ingredient => `<li><span>${escapeHtml(ingredient.name)}</span><strong>${escapeHtml(measurement(ingredient))}</strong></li>`).join('')}</ul></div>
      <div class="recipe-detail-section"><h2>Method</h2><ol class="recipe-method">${drink.instructions.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol></div>
      <div class="recipe-detail-actions"><button class="primary-button" data-make="${drink.id}">I made this</button><button class="secondary-button ${drink.favourite ? 'saved-button' : ''}" data-favourite="${drink.id}">${drink.favourite ? '♥ Saved' : '♡ Save recipe'}</button></div>
    </section>`;
}

function renderBar() {
  const coverage = Math.min(100, Math.round((state.inventory.length / 8) * 100));
  view.innerHTML = `
    <p class="eyebrow">Your stocked essentials</p>
    <h1 class="page-title">Your bar,<br>at a glance.</h1>
    <p class="page-subtitle">Keep what you have close. We’ll work out what you can make.</p>
    <section class="bar-hero"><div class="bar-hero-top"><div><span class="label">Bar coverage</span><h2>You can make ${Math.min(state.drinks.length, state.inventory.length + 1)} great drinks right now.</h2></div><div class="ring"><span>${coverage}%</span></div></div><div class="progress"><span style="width:${coverage}%"></span></div><small>${state.inventory.length} ingredients organised in your bar</small></section>
    <div class="section-head"><h2>Add to your bar</h2></div>
    <form class="form-card" id="inventory-form">
      <div class="field"><label for="inventory-name">Ingredient name</label><input id="inventory-name" name="name" required maxlength="40" placeholder="e.g. Aperol" autocomplete="off"></div>
      <div class="field"><label>Type</label><div class="pills" id="ingredient-type-pills">${ingredientTypes.map((t, index) => `<button type="button" class="pill ${state.draftIngredientType === t.type ? 'selected' : ''}" data-ingredient-type="${t.type}">${t.type}</button>`).join('')}</div><input type="hidden" name="type" value="${state.draftIngredientType}"></div>
      <div class="field"><label for="inventory-amount">Amount</label><input id="inventory-amount" name="amount" required maxlength="24" placeholder="e.g. 500 ml left, 6 cans"></div>
      <button class="primary-button" type="submit">Add to bar</button>
    </form>
    <div class="section-head"><h2>Inventory</h2></div>
    <div class="inventory-list">${state.inventory.map(item => `<article class="inventory-item"><div class="inventory-symbol" style="--item-color:${item.colour}">${item.icon}</div><div><strong>${escapeHtml(item.name)}</strong><span>${item.type ? escapeHtml(item.type) + ' · ' : ''}${escapeHtml(item.amount)}</span></div><button data-remove-ingredient="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">×</button></article>`).join('')}</div>`;
}

function renderFavourites() {
  const favourites = state.drinks.filter(drink => drink.favourite);
  view.innerHTML = `
    <p class="eyebrow">The ones you keep coming back to</p>
    <h1 class="page-title">Saved<br>for a reason.</h1>
    <p class="page-subtitle">Your personal collection of reliably excellent drinks.</p>
    ${favourites.length ? `<div class="discover-grid">${favourites.map(drink => drinkCard(drink, 'discover', true)).join('')}</div>` : `<section class="empty-state"><i>♡</i><h3>Nothing saved yet</h3><p>Tap the heart on a drink you’d want to make again.</p><button class="primary-button" data-nav="explore">Explore recipes</button></section>`}`;
}

function renderAccount() {
  const made = state.logs.length;
  if (state.guest) {
    view.innerHTML = `
      <p class="eyebrow">Browsing as a guest</p>
      <h1 class="page-title">Your bar,<br>this device only.</h1>
      <p class="page-subtitle">Guest recipes and inventory stay on this device. Create an account to sync everything across devices.</p>
      <section class="profile-card"><div class="profile-person"><div class="big-avatar">GU</div><div><h2>Guest</h2><p>Not signed in</p></div></div><div class="profile-tag">✦ Local only</div></section>
      <div class="section-head"><h2>Your progress</h2></div><div class="metric-grid"><div class="metric"><strong>${made}</strong><span>drinks made</span></div><div class="metric"><strong>${state.drinks.filter(d => d.favourite).length}</strong><span>saved recipes</span></div><div class="metric"><strong>${state.inventory.length}</strong><span>ingredients</span></div></div>
      <div class="section-head"><h2>Settings</h2></div>
      <section class="settings">
        <div class="appearance-setting"><span><strong>Appearance</strong><small>Choose a look or match your device.</small></span><div class="theme-options">${['system', 'light', 'dark'].map(mode => `<button class="theme-option ${state.theme === mode ? 'selected' : ''}" data-theme-mode="${mode}">${mode}</button>`).join('')}</div></div>
        <button class="setting" id="toggle-notifications"><span><strong>Pour reminders</strong><span>Gentle ideas for your next drink</span></span><i class="switch ${state.notifications ? 'on' : ''}"><i></i></i></button>
        <button class="setting" data-nav="bar"><span><strong>Manage my bar</strong><span>Ingredients and quantity</span></span><em>›</em></button>
        <button class="setting" id="reset-local"><span><strong>Reset guest bar</strong><span>Clear everything and start over on this device</span></span><em>›</em></button>
        <button class="setting" id="exit-guest"><span><strong>Create an account or sign in</strong><span>Save your recipes and bar to the cloud</span></span><em>›</em></button>
      </section>`;
    return;
  }
  const plan = state.profile?.subscription_plan || 'free';
  view.innerHTML = `
    <p class="eyebrow">Your HotShots account</p>
    <h1 class="page-title">A good<br>taste profile.</h1>
    <p class="page-subtitle">Your bar, recipes, and progress — all in one place.</p>
    <section class="profile-card"><div class="profile-person"><div class="big-avatar">${initials()}</div><div><h2>${escapeHtml(state.profile?.display_name || 'HotShots member')}</h2><p>${escapeHtml(state.profile?.email || state.session?.user?.email || '')}</p></div></div><div class="profile-tag">✦ ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan</div></section>
    <div class="section-head"><h2>Your progress</h2></div><div class="metric-grid"><div class="metric"><strong>${made}</strong><span>drinks made</span></div><div class="metric"><strong>${state.drinks.filter(d => d.favourite).length}</strong><span>saved recipes</span></div><div class="metric"><strong>${state.drinks.filter(d => d.shared).length}</strong><span>shared recipes</span></div></div>
    <div class="section-head"><h2>Settings</h2></div>
    <section class="settings">
      <div class="appearance-setting"><span><strong>Appearance</strong><small>Choose a look or match your device.</small></span><div class="theme-options">${['system', 'light', 'dark'].map(mode => `<button class="theme-option ${state.theme === mode ? 'selected' : ''}" data-theme-mode="${mode}">${mode}</button>`).join('')}</div></div>
      <button class="setting" id="toggle-notifications"><span><strong>Pour reminders</strong><span>Gentle ideas for your next drink</span></span><i class="switch ${state.notifications ? 'on' : ''}"><i></i></i></button>
      <button class="setting" data-nav="bar"><span><strong>Manage my bar</strong><span>Ingredients and quantity</span></span><em>›</em></button>
      <button class="setting" id="reset-local"><span><strong>Reset device data</strong><span>Clear saved favourites and drink log on this device</span></span><em>›</em></button>
      <button class="setting" id="sign-out"><span><strong>Sign out</strong><span>${escapeHtml(state.session?.user?.email || '')}</span></span><em>›</em></button>
    </section>`;
}

const renderers = { summary: renderSummary, create: renderCreate, explore: renderExplore, bar: renderBar, favourites: renderFavourites, account: renderAccount };
function positionNavGlide(instant = false) {
  const dock = $('.bottom-dock'); const glide = $('.nav-glide'); const active = dock?.querySelector('.nav-item.active');
  if (!dock || !glide || !active) return;
  if (instant) glide.style.transition = 'none';
  glide.style.width = `${active.offsetWidth}px`;
  glide.style.transform = `translateX(${active.offsetLeft}px)`;
  if (instant) requestAnimationFrame(() => { glide.style.transition = ''; });
}
function render() {
  const dock = $('.bottom-dock');
  if (!state.session && !state.guest) { if (dock) dock.style.display = 'none'; return renderAuth(); }
  let becameVisible = false;
  if (dock) { becameVisible = dock.style.display === 'none'; dock.style.display = ''; }
  if (state.loading) return renderLoading();
  if (state.tab === 'explore' && state.recipeId) renderRecipeDetail(); else renderers[state.tab]();
  document.querySelectorAll('.bottom-dock [data-nav]').forEach(button => button.classList.toggle('active', button.dataset.nav === state.tab));
  positionNavGlide(becameVisible);
}
function go(tab) { state.tab = tab; state.recipeId = null; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function toggleFavourite(id) {
  const drink = state.drinks.find(item => item.id === id); if (!drink) return;
  drink.favourite = !drink.favourite;
  state.favourites = drink.favourite ? [...state.favourites, id] : state.favourites.filter(f => f !== id);
  writeStore('hotshots-favourites', state.favourites);
  render(); showToast(drink.favourite ? `${drink.name} saved to favourites` : `${drink.name} removed from saved`);
}
function logDrink(id) {
  const drink = state.drinks.find(item => item.id === id); if (!drink) return;
  state.logs.unshift({ drinkId: id, madeAt: new Date().toISOString() });
  writeStore('hotshots-logs', state.logs);
  showToast(`${drink.name} logged for today`); go('summary');
}
async function rateDrink(id, value) {
  state.userRatingCache[id] = value;
  if (state.guest) {
    const bucket = state.guestRatings[id] || { total: 0, count: 0 };
    state.guestRatings[id] = { total: bucket.total + value, count: bucket.count + 1 };
    saveGuestRatings();
    const drink = state.drinks.find(d => d.id === id); if (drink) drink.rating = state.guestRatings[id];
    render(); return showToast(`You rated this recipe ${value} out of 5`);
  }
  try {
    const { total, count } = await authFetch(`/api/recipes/${id}/rate`, { method: 'POST', body: JSON.stringify({ rating: value }) });
    const drink = state.drinks.find(d => d.id === id); if (drink) drink.rating = { total, count };
    render(); showToast(`You rated this recipe ${value} out of 5`);
  } catch (err) { showToast(err.message); }
}

document.addEventListener('click', event => {
  const nav = event.target.closest('[data-nav]'); if (nav) return go(nav.dataset.nav);
  const fav = event.target.closest('[data-favourite]'); if (fav) return toggleFavourite(fav.dataset.favourite);
  const rate = event.target.closest('[data-rate]'); if (rate) return rateDrink(rate.dataset.rate, Number(rate.dataset.value));
  const make = event.target.closest('[data-make]'); if (make) return logDrink(make.dataset.make);
  const detail = event.target.closest('[data-view-recipe]'); if (detail) { state.recipeId = detail.dataset.viewRecipe; return render(); }
  if (event.target.closest('[data-back-explore]')) { state.recipeId = null; return renderExplore(); }
  const filter = event.target.closest('[data-filter]'); if (filter) { state.filter = filter.dataset.filter; return renderExplore(); }
  const category = event.target.closest('[data-category]'); if (category) { document.querySelectorAll('[data-category]').forEach(pill => pill.classList.toggle('selected', pill === category)); $('input[name="category"]').value = category.dataset.category; return; }
  const strength = event.target.closest('[data-abv]'); if (strength) { document.querySelectorAll('[data-abv]').forEach(pill => pill.classList.toggle('selected', pill === strength)); $('input[name="abv"]').value = strength.dataset.abv; return; }
  const ingredientType = event.target.closest('[data-ingredient-type]'); if (ingredientType) { document.querySelectorAll('[data-ingredient-type]').forEach(pill => pill.classList.toggle('selected', pill === ingredientType)); state.draftIngredientType = ingredientType.dataset.ingredientType; $('input[name="type"]').value = state.draftIngredientType; return; }
  const theme = event.target.closest('[data-theme-mode]'); if (theme) { state.theme = theme.dataset.themeMode; writeStore('hotshots-theme', state.theme); applyTheme(); return renderAccount(); }
  const removeDraft = event.target.closest('[data-remove-draft]'); if (removeDraft) { state.draftIngredients.splice(Number(removeDraft.dataset.removeDraft), 1); return updateDraftIngredientRows(); }
  if (event.target.closest('#add-custom-ingredient')) {
    const name = $('#ingredient-name').value.trim(); const amount = $('#ingredient-amount').value.trim(); const unit = $('#ingredient-unit').value.trim();
    if (!name || !amount || !unit) return showToast('Add an ingredient, amount, and unit first.');
    state.draftIngredients.push({ name, amount, unit }); updateDraftIngredientRows(); $('#ingredient-name').value = ''; $('#ingredient-amount').value = ''; $('#ingredient-unit').value = ''; $('#ingredient-name').focus(); return;
  }
  const remove = event.target.closest('[data-remove-ingredient]');
  if (remove) {
    const id = remove.dataset.removeIngredient; const item = state.inventory.find(i => i.id === id);
    if (state.guest) { state.inventory = state.inventory.filter(i => i.id !== id); saveGuestInventory(); renderBar(); return showToast(`${item?.name || 'Item'} removed from your bar`); }
    authFetch(`/api/inventory/${id}`, { method: 'DELETE' })
      .then(() => { state.inventory = state.inventory.filter(i => i.id !== id); renderBar(); showToast(`${item?.name || 'Item'} removed from your bar`); })
      .catch(err => showToast(err.message));
    return;
  }
  if (event.target.closest('#toggle-notifications')) { state.notifications = !state.notifications; writeStore('hotshots-notifications', state.notifications); renderAccount(); return showToast(state.notifications ? 'Pour reminders are on' : 'Pour reminders are off'); }
  if (event.target.closest('#reset-local')) {
    const message = state.guest
      ? 'Reset your guest bar back to the starter recipes and ingredients? This clears everything on this device.'
      : 'Clear favourites and your drink log on this device? Your account, recipes, and bar in the cloud are not affected.';
    if (!window.confirm(message)) return;
    state.favourites = []; state.logs = []; writeStore('hotshots-favourites', []); writeStore('hotshots-logs', []);
    if (state.guest) {
      state.guestRatings = JSON.parse(JSON.stringify(seedRatings));
      state.drinks = seedDrinks.map(d => ({ ...d, colour: categoryColours[d.category] || '#8d6954', favourite: false, rating: state.guestRatings[d.id] || { total: 0, count: 0 } }));
      state.inventory = seedInventory.map(item => ({ ...item, ...ingredientTypeMeta(item.type) }));
      saveGuestDrinks(); saveGuestInventory(); saveGuestRatings();
    } else {
      state.drinks.forEach(d => d.favourite = false);
    }
    renderAccount(); showToast(state.guest ? 'Guest bar reset' : 'Device data cleared');
    return;
  }
  if (event.target.closest('#sign-out')) return supabase.auth.signOut();
  if (event.target.closest('#continue-guest')) { state.guest = true; loadGuestData(); return render(); }
  if (event.target.closest('#exit-guest')) { state.guest = false; state.drinks = []; state.inventory = []; return render(); }
  if (event.target.closest('#auth-toggle')) { state.authMode = state.authMode === 'signup' ? 'signin' : 'signup'; state.authError = ''; return renderAuth(); }
});

document.addEventListener('submit', event => {
  if (event.target.id === 'auth-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    const email = form.get('email').trim();
    const password = form.get('password');
    const displayName = form.get('displayName')?.trim();
    state.authError = '';
    const action = state.authMode === 'signup'
      ? supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } })
      : supabase.auth.signInWithPassword({ email, password });
    action.then(({ error, data }) => {
      if (error) { state.authError = error.message; return renderAuth(); }
      if (state.authMode === 'signup' && !data.session) showToast('Check your email to confirm your account.');
    });
    return;
  }

  if (event.target.id === 'inventory-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    const name = form.get('name').trim(); const type = form.get('type'); const amount = form.get('amount').trim();
    if (!name || !amount) return showToast('Add a name and amount first.');
    if (state.guest) {
      state.inventory.unshift({ id: `item-${Date.now()}`, name, type, amount, ...ingredientTypeMeta(type) });
      saveGuestInventory(); state.draftIngredientType = 'Spirit'; renderBar(); showToast(`${name} added to your bar`);
      return;
    }
    authFetch('/api/inventory', { method: 'POST', body: JSON.stringify({ name, type, amount }) })
      .then(({ item }) => { state.inventory.unshift({ ...item, ...ingredientTypeMeta(item.type) }); state.draftIngredientType = 'Spirit'; renderBar(); showToast(`${name} added to your bar`); })
      .catch(err => showToast(err.message));
    return;
  }

  if (event.target.id !== 'create-form') return;
  event.preventDefault();
  const form = new FormData(event.target); const name = form.get('name').trim(); const instructions = form.get('instructions').split('\n').map(step => step.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);
  if (!state.draftIngredients.length) return showToast('Add at least one measured ingredient.');
  if (!instructions.length) return showToast('Add at least one instruction step.');
  const payload = { name, category: form.get('category'), abv: Number(form.get('abv')), ingredients: state.draftIngredients, instructions, shared: form.get('shared') === 'on', description: form.get('notes').trim() || undefined };
  if (state.guest) {
    const drink = { id: `drink-${Date.now()}`, ...payload, colour: categoryColours[payload.category] || '#8d6954', favourite: false, rating: { total: 0, count: 0 } };
    state.drinks.unshift(drink); saveGuestDrinks(); state.draftIngredients = [];
    go('summary'); showToast(payload.shared ? `${name} is now live on Explore` : `${name} saved privately to your bar`);
    return;
  }
  authFetch('/api/recipes', { method: 'POST', body: JSON.stringify(payload) })
    .then(async () => { state.draftIngredients = []; await loadRecipes(); go('summary'); showToast(payload.shared ? `${name} is now live on Explore` : `${name} saved privately to your bar`); })
    .catch(err => showToast(err.message));
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (state.theme === 'system') applyTheme(); });
window.addEventListener('resize', () => positionNavGlide(true));

supabase.auth.onAuthStateChange((_event, newSession) => {
  const wasSignedIn = Boolean(state.session);
  state.session = newSession;
  if (newSession) { state.guest = false; if (!wasSignedIn) return bootstrapData(); }
  if (!newSession && !state.guest) { state.drinks = []; state.inventory = []; state.profile = null; state.tab = 'summary'; render(); }
});

applyTheme();
render();
