# Tutorial — from your laptop to the live website

> ## ⚠ The deployment half of this document is out of date
>
> This was written when the plan was to host on Vercel, where `git push`
> triggers a build automatically. **Production now runs on a VPS behind
> Cloudflare, and pushing to GitHub deploys nothing.** A push backs your code
> up; the live site does not change until you SSH into the VPS and run the
> deploy sequence yourself.
>
> - **To deploy → [TUTOR.md § C](./TUTOR.md#c--vps-deployment).** There is one
>   rule that matters most: **stop the app before you build.** Building while it
>   runs silently serves stale or unstyled pages.
> - **To run the site day to day** — Cloudflare, Cloudinary, the admin panel,
>   SEO, Search Console, analytics, troubleshooting → **[TUTOR.md](./TUTOR.md)**.
>
> **What is still correct here:** everything about Git itself — committing,
> pushing, branches, what must never be committed, and the fact that content
> changes made in `/admin` never need Git at all. Read it for that. Ignore
> "Step 2 · Connect Vercel" and any claim that a push makes the site live.

A practical, step-by-step guide to getting code out of this folder, onto GitHub,
and onto the internet. Written for someone who does not use Git every day.

For the one-time infrastructure setup (Neon, Cloudinary, DNS, analytics) see
[DEPLOYMENT.md](DEPLOYMENT.md). This document is about the **Git workflow**.

- [The mental model](#the-mental-model)
- [Step 1 · Get the project onto GitHub](#step-1--get-the-project-onto-github)
- [Step 2 · Connect Vercel](#step-2--connect-vercel)
- [Step 3 · The everyday loop](#step-3--the-everyday-loop)
- [What must never go into Git](#what-must-never-go-into-git)
- [Content changes do not need Git](#content-changes-do-not-need-git)
- [Troubleshooting](#troubleshooting)
- [Command reference](#command-reference)

---

## The mental model

Your project lives in three places. Understanding this makes every error message
below obvious.

> **The diagram below describes the old Vercel plan.** On the VPS the third
> arrow is not automatic — it is you, running the deploy sequence over SSH:
>
> ```
>   YOUR LAPTOP ──git push──► GITHUB ──✋ MANUAL: ssh + stop/build/start──► VPS
> ```

```
   ┌───────────────┐   git push    ┌───────────────┐  auto-build  ┌───────────────┐
   │  YOUR LAPTOP  │ ────────────► │    GITHUB     │ ───────────► │    VERCEL     │
   │               │               │               │              │  (the live    │
   │  you edit     │               │  the backup   │              │   website)    │
   │  code here    │               │  + history    │              │               │
   └───────────────┘               └───────────────┘              └───────────────┘
                                                                         │
                                                                         ▼
                                                            ┌────────────────────────┐
                                                            │  NEON (database)       │
                                                            │  CLOUDINARY (images)   │
                                                            │  — shared by both      │
                                                            └────────────────────────┘
```

Three things follow from this picture:

1. **Editing a file on your laptop changes nothing on the website.** It has to be
   committed, pushed, and rebuilt.
2. **The database and images are not in Git.** They live in Neon and Cloudinary,
   and both your laptop and the live site talk to the *same* ones. Changing a
   banner in the admin panel changes it everywhere immediately, with no push.
3. **`.env` is not in Git either** — deliberately. Vercel gets its own copy, set
   by hand once. See [What must never go into Git](#what-must-never-go-into-git).

### Git in three words

| Word | What it means |
| --- | --- |
| **add** | "Include this file in my next save." Git ignores files you have not added. |
| **commit** | "Save this snapshot, with a note about what changed." Still only on your laptop. |
| **push** | "Send my saved snapshots to GitHub." Now other people (and Vercel) can see them. |

The mistake almost everyone makes at the start is stopping after **commit** and
wondering why GitHub looks empty — or, as happened here, adding one file instead
of all of them.

---

## Step 1 · Get the project onto GitHub

**This is where you are right now.** Your GitHub repo currently holds 17 files —
the empty Next.js starter. The 459 files that are the actual project are still
only on your laptop.

Open PowerShell in the project folder and run these one at a time.

### 1.1 — See what Git is currently ignoring

```powershell
git status
```

Everything under **"Untracked files"** is invisible to Git. That is why it never
reached GitHub.

### 1.2 — Add everything

```powershell
git add -A
```

`-A` means *all* — new files, changed files, and deleted files. This is the step
that was missed. `git add README.md` adds one file and nothing else.

### 1.3 — Check before you save

```powershell
git status
```

You should now see a long list under **"Changes to be committed"**.

**Look for one thing:** there must be **no `.env`** anywhere in that list. If you
see it, stop and tell me — do not commit. (I have checked your `.gitignore` and
it is correctly excluded, so this should not happen. Checking anyway is a good
habit, because a secret pushed to GitHub is public forever, even if you delete it
afterwards.)

### 1.4 — Commit

```powershell
git commit -m "FLAZZ GROUP: CMS, blog, analytics, RBAC"
```

The text after `-m` is the message. Write what changed, so that six months from
now you can tell your commits apart. "first commit" four times over tells you
nothing.

### 1.5 — Push

```powershell
git push
```

### 1.6 — Confirm

Open `https://github.com/flazzgroup-dev-mocha/flazzgroup` in a browser. You
should see `src/`, `prisma/`, `scripts/`, `docs/` and the `.md` files.

If you only see `package.json` and a few config files, the `git add -A` did not
happen. Go back to 1.2.

You can also check from the terminal:

```powershell
git ls-tree -r HEAD --name-only | Measure-Object -Line
```

Around **459** is right. **17** means it did not work.

---

## Step 2 · Connect Vercel

Once, at the beginning.

1. Go to [vercel.com/new](https://vercel.com/new) and sign in **with GitHub**
2. **Import** the `flazzgroup` repository
3. Framework preset will say **Next.js** — leave everything on its default
4. **Do not click Deploy yet.** Open **Environment Variables** first and add all
   nine required values from your local `.env`:

   ```
   DATABASE_URL              DIRECT_URL              AUTH_SECRET
   ADMIN_EMAIL               ADMIN_PASSWORD          CLOUDINARY_CLOUD_NAME
   CLOUDINARY_API_KEY        CLOUDINARY_API_SECRET   NEXT_PUBLIC_SITE_URL
   ```

   Your `.env` file is the only place these exist — Git does not have them. Open
   it in your editor and copy each value across.

5. Click **Deploy**

> The build reads the database, so a wrong `DATABASE_URL` makes the build
> **fail** rather than deploy a broken site. That is the safe outcome, but it
> does mean the variables have to be right before the first deploy.

After it succeeds, go to **Settings → Functions → Region** and pick
**Singapore (sin1)**, to sit next to your Neon database. Then redeploy once.

The rest of the first-time setup — domain, DNS, migrations, seeding — is in
[DEPLOYMENT.md](DEPLOYMENT.md) §5–§7.

---

## Step 3 · The everyday loop

From now on, every code change follows the same four commands.

```powershell
# 1. Make your change in the editor, then check it locally
npm run dev
#    open http://localhost:3000 and confirm it looks right

# 2. See what you changed
git status

# 3. Save it
git add -A
git commit -m "describe what you changed"

# 4. Send it
git push
```

**That is it.** Vercel watches the repository. Within a few seconds of the push
it starts a build, and two to three minutes later the change is live. You can
watch it happen at [vercel.com](https://vercel.com) → your project →
**Deployments**.

### Before pushing anything substantial

Run the same checks the build will run, so you find problems on your laptop
instead of in production:

```powershell
npx tsc --noEmit     # types
npx next lint        # lint
npm run build        # the real production build
```

If `npm run build` succeeds locally, it will almost certainly succeed on Vercel.

### If you changed the database schema

A change to `prisma/schema.prisma` needs a migration, and migrations do **not**
run automatically on deploy:

```powershell
npx prisma migrate dev --name describe_the_change   # creates it locally
git add -A
git commit -m "add <the change>"
git push

# then, with production credentials in .env:
npm run db:migrate                                  # applies it to production
```

Apply the migration to production **before or immediately after** the deploy
finishes. New code expecting a column that does not exist yet will throw.

---

## What must never go into Git

| Never commit | Why | Already protected? |
| --- | --- | --- |
| `.env` | Database password, `AUTH_SECRET`, Cloudinary secret | ✅ `.gitignore` line 34 |
| `node_modules/` | Hundreds of MB, rebuilt by `npm install` | ✅ |
| `.next/` | Build output, rebuilt every deploy | ✅ |
| `var/` | Local scratch | ✅ |

All four are already in `.gitignore`, so `git add -A` skips them automatically.
You do not have to be careful — but glance at `git status` before committing
anyway.

**If you ever do commit a secret by accident:** treat it as leaked. Deleting the
file in a later commit does not help, because the old commit still contains it
and anyone can read it. Rotate the credential immediately — new database
password in Neon, new `AUTH_SECRET`, new Cloudinary API secret — then update
Vercel.

---

## Content changes do not need Git

This trips people up, so it is worth being explicit.

| Change | Needs a push? |
| --- | --- |
| Adding a blog article | ❌ No — admin panel, live immediately |
| Uploading a banner | ❌ No |
| Editing prices, FAQ, brands, payment methods | ❌ No |
| Changing site title, SEO text, analytics IDs | ❌ No |
| Adding or removing an admin account | ❌ No |
| Changing the *design* of a section | ✅ Yes — that is code |
| Adding a new field to a form | ✅ Yes |
| Fixing a bug | ✅ Yes |

Everything the owner edits day to day lives in the database. That was the point
of building the CMS — you should almost never need Git to run the site.

---

## Troubleshooting

### `Permission to …/flazzgroup.git denied to <username>` (403)

You are signed in to Git as the wrong GitHub account. The repo belongs to
`flazzgroup-dev-mocha`; if your saved credentials are for a different user, GitHub
refuses.

```powershell
cmdkey /delete:git:https://github.com
git push
```

That clears the saved login and makes Git ask again. Sign in as the account that
owns the repo.

Alternatively: ask the repo owner to add your account under
**repo → Settings → Collaborators**.

### `no changes added to commit`

You ran `git commit` without `git add`. Git only commits what you have added:

```powershell
git add -A
git commit -m "your message"
```

### GitHub shows only a few files

Same cause. `git add -A`, commit, push. Verify with:

```powershell
git ls-tree -r HEAD --name-only | Measure-Object -Line
```

### `Updates were rejected because the remote contains work that you do not have`

Someone (or you, on another machine) pushed something you do not have yet.

```powershell
git pull --rebase
git push
```

### `error: remote origin already exists`

Harmless — the remote is already set up. Skip `git remote add` and just push. To
check where it points:

```powershell
git remote -v
```

### The build failed on Vercel

Open **Vercel → Deployments → the failed one → Build Logs** and read the first
error, not the last. Most common causes:

| Message | Cause |
| --- | --- |
| `P1001 Can't reach database server` | `DATABASE_URL` missing or wrong in Vercel |
| `Type error: …` | Would have been caught by `npx tsc --noEmit` locally |
| `Module not found` | A file was not committed — check `git status` |

The previous deployment stays live while a build fails, so a failed build never
takes the site down.

### I pushed something broken

Do not panic and do not try to fix it under pressure. Roll back first:

**Vercel → Deployments →** find the last working one **→ ⋯ → Promote to
Production.** It is instant, with no rebuild. Then fix the problem calmly and
push again.

### I am locked out of the admin panel

With production credentials in `.env`:

```powershell
npm run db:seed
```

This restores the `ADMIN_EMAIL` account as an active Super Admin with the
password from `ADMIN_PASSWORD`. It is safe to run any time — it never overwrites
content you have edited.

---

## Command reference

Print this bit.

```powershell
# ── everyday ──────────────────────────────────────────────
npm run dev                     # run locally at localhost:3000
git status                      # what have I changed?
git add -A                      # stage everything
git commit -m "message"         # save a snapshot
git push                        # send it to GitHub → deploys automatically

# ── before pushing something big ──────────────────────────
npx tsc --noEmit                # type check
npx next lint                   # lint
npm run build                   # full production build

# ── database ──────────────────────────────────────────────
npm run db:migrate              # apply migrations to production
npm run db:seed                 # restore admin account / starter content
npm run db:studio               # browse the database in a browser

# ── checks ────────────────────────────────────────────────
npm run media:check             # verify Cloudinary end to end
git log --oneline -10           # recent history
git remote -v                   # where does push go?
```

### The order that matters

```
edit  →  npm run dev  →  npm run build  →  git add -A  →  git commit  →  git push
                                                                            │
                                                              Vercel builds ▼
                                                                          live
```
