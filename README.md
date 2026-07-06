# The Inbox — AI-First Mindset Assessment

A single-mechanic game that scores 4 subconstructs of "AI-first mindset":
automation-seeking, judgment (knowing what *not* to delegate), critical
evaluation of AI output, and error-recovery quality.

See `tasks.js` for the task content and flaw logic, `scoring.js` for how
subscores are computed, and `game.js` for the game loop itself.

## What this is (and isn't) yet

This is a working game with plausible, defensible scoring logic — not yet a
*validated* assessment. Before you rely on scores for real decisions, pilot
it against a group whose AI-first behavior you can independently judge
(e.g. manager ratings, or existing Jombay competency scores for the same
people) and check that game scores actually track those ratings.

## Setup (about 15 minutes)

### 1. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New project (free tier is fine).
2. Once created, go to **Project Settings → API** and copy:
   - Project URL
   - `anon` `public` key
3. Open `config.js` in this repo and paste both values in.

### 2. Create the database table
1. In Supabase, go to **SQL Editor → New query**.
2. Paste the contents of `supabase-schema.sql` and run it.
   This creates the `sessions` table and locks it down with Row Level
   Security so each player can only see their own results.

### 3. Enable email login
1. In Supabase, go to **Authentication → Providers** and make sure **Email**
   is enabled (it is by default).
2. Under **Authentication → URL Configuration**, add the URL you'll deploy
   to on GitHub Pages (e.g. `https://yourusername.github.io/ai-first-inbox/`)
   as a **Redirect URL** — otherwise the magic link won't return players
   to the right place.

### 4. Push to GitHub and enable Pages
```bash
git init
git add .
git commit -m "Initial commit: The Inbox"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/ai-first-inbox.git
git push -u origin main
```
Then on GitHub: **Settings → Pages → Source: Deploy from branch → main → / (root)**.
Your game will be live at `https://YOUR-USERNAME.github.io/ai-first-inbox/`.

### 5. Try it
Open the URL, sign in with your own email, play through, and check
**Supabase → Table Editor → sessions** to confirm a row was written with
your decisions and subscores.

## Viewing results across players

There's now an admin dashboard at `admin.html`. It's a separate page
(`https://YOUR-USERNAME.github.io/ai-first-inbox/admin.html`) with its own
login — anyone can sign in, but only accounts listed in the `admins` table
can actually see data. That table and the access-control function are
created by `supabase-schema.sql`.

**To give yourself access:**
1. Log in once at either the game page or `admin.html` with your own email
   (this creates your account).
2. In Supabase, go to **Authentication → Users** and copy your user's `id`.
3. In **SQL Editor**, run:
   ```sql
   insert into public.admins (user_id) values ('paste-your-id-here');
   ```
4. Reload `admin.html` and sign in again — you'll now see a table of every
   completed session, with a **Report** button per row.

The dashboard shows player email, completion time, the 4 subscores, and
time used. To add more admins, repeat step 3 with their user id.

## Downloading reports

Every session — whether viewed from the admin dashboard or from a player's
own results screen right after playing — can be downloaded as a one-page
PDF (via `report.js`, using jsPDF, entirely client-side, no server
involved). It includes the 4 subscores and a task-by-task breakdown of what
was delegated, what flaws were caught or missed, and how they were
resolved.

## Editing the content

- **Add/change tasks**: edit `tasks.js`. Keep the `class` field accurate
  (`"appropriate"` or `"inappropriate"`) since scoring depends on it.
- **Change timing/difficulty**: `CONFIG` at the bottom of `tasks.js`.
- **Change scoring weights**: `scoring.js`, specifically `recoveryWeights`.
