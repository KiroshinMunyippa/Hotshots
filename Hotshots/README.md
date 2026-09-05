# HotShots

A cocktail companion app: dashboard, recipe creation, community explore with ratings, bar inventory, favourites, and an account with email/password sign-in.

## Architecture

- **Frontend**: static HTML/CSS/JS (`index.html`, `app.js`, `styles.css`), served by Vercel with no build step.
- **Accounts database** (its own Supabase project): Supabase Auth (`auth.users`) plus a `profiles` table with `subscription_plan` / `subscription_status` / `stripe_customer_id` fields, ready for a subscription to be wired in later.
- **App data database** (a second, separate Supabase project): `recipes`, `recipe_ingredients`, `recipe_instructions`, `recipe_ratings`, `inventory_items`.
- **API**: Vercel serverless functions under `/api`. They verify the caller's Supabase session against the Accounts project, then read/write the App Data project using its service-role key.

Two separate Supabase projects means Postgres can't enforce a foreign key from a recipe's `author_id` to a row in the other database — there's no such thing as a cross-database foreign key. That's why the App Data project's tables have Row Level Security turned on with **no policies**: the anon key gets nothing, and only the `/api` functions (holding the service-role key) can touch the data, checking ownership in code instead of at the database level.

## One-time setup

1. **Create two Supabase projects**: one named something like `hotshots-accounts`, one `hotshots-appdata`.
2. In `hotshots-accounts`, open the SQL editor and run `db/accounts-schema.sql`.
   - In **Authentication → Providers**, email/password is on by default. In **Authentication → Settings**, turn "Confirm email" off if you want new accounts to be usable immediately (handy for testing); leave it on for production.
3. In `hotshots-appdata`, open the SQL editor and run `db/appdata-schema.sql`.
4. Fill in `config.js` with the **Accounts** project's URL and anon/public key (Project Settings → API). These are safe to expose in the browser.
5. `npm install` (installs `@supabase/supabase-js` for the API functions).

## Environment variables (Vercel)

Set these in the Vercel project (Settings → Environment Variables) — none of them go in `config.js` or anywhere else in the frontend:

| Variable | From |
|---|---|
| `SUPABASE_ACCOUNTS_URL` | Accounts project → Project Settings → API → Project URL |
| `SUPABASE_ACCOUNTS_ANON_KEY` | Accounts project → Project Settings → API → anon/public key |
| `SUPABASE_APPDATA_URL` | App Data project → Project Settings → API → Project URL |
| `SUPABASE_APPDATA_SERVICE_KEY` | App Data project → Project Settings → API → **service_role** key (secret — server-side only) |

## Run it locally

```sh
npm install
npx vercel dev
```

`vercel dev` runs the static frontend and the `/api` functions together on one port, which matters here since `app.js` calls `/api/...` on the same origin.

## Deploy

```sh
npx vercel
```

or connect the repo in the Vercel dashboard. Add the four environment variables above in the Vercel project before the first deploy that needs them to work.

## What's still local

Favourites and the "drinks made today" log stay in browser `localStorage` for now, same as theme and notification preferences — they didn't need a database for this round. Recipes, ratings, and bar inventory now live in Supabase and sync across devices once you're signed in.
