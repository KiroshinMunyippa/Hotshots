# Getting HotShots working — step by step

This is the practical walkthrough: from the unzipped folder to a live app on Vercel with two Supabase databases behind it. `README.md` explains the architecture; this page is just "do this, then this."

## 0. What you need first

- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account
- A [GitHub](https://github.com) account
- [Node.js](https://nodejs.org) installed (for `npm install` and testing locally)

## 1. Put the project on GitHub

1. Unzip the folder you downloaded.
2. Create a new, empty repository on GitHub (don't add a README there — you already have one).
3. In the unzipped folder:
   ```sh
   git init
   git add .
   git commit -m "HotShots"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```

## 2. Create the Accounts Supabase project

1. In Supabase, click **New project**, name it something like `hotshots-accounts`.
2. Once it's ready, open the **SQL Editor**, paste in the contents of `db/accounts-schema.sql` from this project, and run it.
3. Go to **Authentication → Settings**. For quick testing, turn **Confirm email** off (so new accounts work instantly). Turn it back on before you actually launch.
4. Go to **Project Settings → API**. You'll need two values from this page in a minute: the **Project URL** and the **anon public** key.

## 3. Create the App Data Supabase project

1. Click **New project** again, name it `hotshots-appdata`. This is a completely separate project from the Accounts one.
2. Open its **SQL Editor**, paste in `db/appdata-schema.sql`, and run it.
3. Go to **Project Settings → API**. You'll need the **Project URL** and the **service_role** key (this one is secret — never put it in `config.js` or any frontend file).

## 4. Fill in the public config

Open `config.js` in the project and replace the two placeholder values with the Accounts project's URL and anon key from step 2.4:

```js
export const SUPABASE_ACCOUNTS_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ACCOUNTS_ANON_KEY = 'eyJ...';
```

Commit and push this change.

## 5. Try it locally (optional but recommended)

```sh
npm install
npx vercel dev
```

The first time, `vercel dev` will ask you to log in and link a project — follow the prompts. When it says it's ready, open the printed local URL. You should see the sign-in screen with **Sign in**, **Create one**, and **Continue as guest**. Try "Continue as guest" first — it works entirely offline with sample drinks, so it's a fast way to check the UI without touching Supabase yet.

To test real accounts locally, create a `.env` file in the project root (this file should never be committed) with:

```
SUPABASE_ACCOUNTS_URL=https://xxxxxxxx.supabase.co
SUPABASE_ACCOUNTS_ANON_KEY=eyJ...
SUPABASE_APPDATA_URL=https://yyyyyyyy.supabase.co
SUPABASE_APPDATA_SERVICE_KEY=eyJ...
```

then restart `vercel dev`. Sign up with a real email, create a recipe, add something to your bar, and confirm it's still there after a refresh.

## 6. Deploy on Vercel

1. In the Vercel dashboard, click **Add New → Project**, and import the GitHub repo you pushed in step 1.
2. Before the first deploy, open **Settings → Environment Variables** and add all four:
   - `SUPABASE_ACCOUNTS_URL`
   - `SUPABASE_ACCOUNTS_ANON_KEY`
   - `SUPABASE_APPDATA_URL`
   - `SUPABASE_APPDATA_SERVICE_KEY`
3. Deploy. Vercel will give you a live URL (something like `hotshots.vercel.app`).

## 7. Sanity-check the live site

- Open the live URL. You should land on the sign-in / sign-up / guest prompt.
- Sign up with a real email (or sign in if you already tested one).
- Create a recipe, mark it shared, and check it shows up under Explore.
- Add an ingredient to My Bar, then remove it, and confirm both work.
- Rate a recipe, favourite it, then go to Saved and use the **Remove** button on the card.
- Toggle **Appearance** between light and dark in Account and confirm the text stays fully readable in both.
- Switch between the bottom tabs and watch the highlight glide between them.

## Troubleshooting

- **"Sign in required" errors in the browser console** — usually means `config.js` still has the placeholder values, or you're testing locally without a `.env` file.
- **Sign-up seems to do nothing** — check whether "Confirm email" is on in the Accounts project; if so, check the inbox (or spam folder) for the confirmation link.
- **Recipes or bar items don't save** — double-check the four environment variables in Vercel are exactly right, especially that `SUPABASE_APPDATA_SERVICE_KEY` is the **service_role** key, not the anon key.
- **Everything works locally but not on Vercel** — the environment variables are set per-project in Vercel and won't carry over from your local `.env` file; make sure they're added in the dashboard too.
