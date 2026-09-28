# Putting Melody's Adventures on GitHub

A one-time setup (about 10 minutes). After this, every change you push is
saved on GitHub with its history, **tested**, and **published automatically** at:

**https://trev-reid.github.io/melodys-adventures/**

You need Git for Windows installed (`git --version` in a terminal should print
a version number).

## 1. Create an empty repository on GitHub

1. Go to https://github.com/new (signed in as **Trev-Reid**).
2. **Repository name:** `melodys-adventures`
3. Choose **Public**.
4. Leave everything else **unticked**: no README, no .gitignore, no licence.
   The project already has these, and GitHub's versions would conflict.
5. Click **Create repository**.

## 2. Push the project (run once, in a terminal)

Open **PowerShell** or **Terminal** in the project folder
(`C:\Users\trevr\OneDrive\Documents\projects\melodysAdventures`) and run
these one at a time:

```powershell
git config --global user.name "Trevor Reid"
git config --global user.email "trev.r.reid@gmail.com"

mkdir .github\workflows -Force
Copy-Item docs\deploy.yml .github\workflows\deploy.yml
Remove-Item src\levels\data -Recurse -ErrorAction SilentlyContinue

git init -b main
npm install
git add .
git commit -m "Melody's Adventures: first commit"
git remote add origin https://github.com/Trev-Reid/melodys-adventures.git
git push -u origin main
```

- The first two lines label your commits. They're only needed once per computer.
- The next three lines put the auto-publish workflow in place (Claude can't
  write into `.github` directly) and remove the old hand-typed Playground
  level, which is now the Tiled map `src/levels/maps/melodys-playground.tmj`.
- `npm install` refreshes `package-lock.json`, so the automatic build uses
  exactly the same packages you do.
- On `git push`, a browser window will ask you to sign in to GitHub. Approve
  it and the push continues.

## 3. Turn on publishing (one click)

1. On GitHub, open the repository, then **Settings** and **Pages** (left menu).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

Then open the **Actions** tab. You'll see a run called "Test and publish".
It installs, runs the tests, builds, and publishes. When it goes green (about
a minute), the game is live at the address above. If it ran before you
changed the setting and failed, click the run, then **Re-run all jobs**.

## Everyday use

After making changes (or after Claude updates the files):

```powershell
git add .
git commit -m "Short description of what changed"
git push
```

That's it. The game republishes itself. If a test fails, the Actions tab
shows a red cross and the live game stays on the last working version.

Useful extras:

| To... | Run |
| --- | --- |
| See what's changed since the last commit | `git status` |
| See the history | `git log --oneline` |
| Throw away changes to one file since the last commit | `git restore path/to/file` |

**Let the boys experiment safely:** `git switch -c leos-level` starts a
separate "branch". Anything they change there can be kept (merge it) or
thrown away (`git switch main`) without affecting the main game.

## A note on OneDrive

The project lives in OneDrive, which also syncs the hidden `.git` folder.
That's fine for one person on one computer. If you ever work on the project
from two computers, use `git pull` / `git push` to move changes between
them rather than relying on OneDrive, or move the project out of OneDrive.
