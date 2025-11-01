#!/usr/bin/env bash
set -euo pipefail

# Safe sync script: sync contents of public/ into gh-pages branch with backup
# Run this from repository root where .git exists and you have push rights.

if [ ! -d .git ]; then
  echo "ERROR: This directory is not a git repository (no .git). Run this script inside a cloned repo." >&2
  exit 2
fi

ORIGIN=${1:-origin}
GH_PAGES_BRANCH=${2:-gh-pages}
BACKUP_BRANCH="gh-pages-backup-$(date +%Y%m%d%H%M%S)"
TEMP_BRANCH="sync-gh-pages-$(date +%Y%m%d%H%M%S)"

echo "Remote origin: $ORIGIN"

echo "Fetching remote branches..."
git fetch $ORIGIN $GH_PAGES_BRANCH || true

echo "Creating remote backup branch: $BACKUP_BRANCH (from $GH_PAGES_BRANCH)..."
# create local backup branch from remote gh-pages (if exists)
if git show-ref --verify --quiet refs/remotes/$ORIGIN/$GH_PAGES_BRANCH; then
  git branch --force $BACKUP_BRANCH $ORIGIN/$GH_PAGES_BRANCH
  git push $ORIGIN $BACKUP_BRANCH
  echo "Backup branch pushed: $BACKUP_BRANCH"
else
  echo "No remote $GH_PAGES_BRANCH found; creating empty backup branch locally: $BACKUP_BRANCH"
  git checkout --orphan $BACKUP_BRANCH
  git rm -rf . || true
  touch .empty
  git add .empty
  git commit -m "backup empty gh-pages baseline"
  git push $ORIGIN $BACKUP_BRANCH
  git checkout -
fi

# Create temp branch from remote gh-pages (or from current HEAD)
if git show-ref --verify --quiet refs/remotes/$ORIGIN/$GH_PAGES_BRANCH; then
  git checkout -b $TEMP_BRANCH $ORIGIN/$GH_PAGES_BRANCH
else
  echo "Remote branch $GH_PAGES_BRANCH not found; creating $TEMP_BRANCH from current HEAD"
  git checkout -b $TEMP_BRANCH
fi

# Remove tracked files but keep .git
git rm -rf . || true
# Copy public/* into root
if [ ! -d public ]; then
  echo "ERROR: public/ directory not found. Nothing to sync." >&2
  exit 3
fi

# Use rsync to copy while preserving dotfiles inside public
rsync -a --delete public/ ./

# Ensure there's something to commit
git add -A
if git diff --cached --quiet; then
  echo "No changes to commit (public/ identical to gh-pages). Exiting."
  exit 0
fi

git commit -m "chore(pages): sync public/ → gh-pages (auto)"

echo "Pushing $TEMP_BRANCH -> $ORIGIN/$GH_PAGES_BRANCH (force-with-lease) ..."
git push $ORIGIN $TEMP_BRANCH:$GH_PAGES_BRANCH --force-with-lease

echo "Cleanup: switch back to main branch"
# switch back to previous branch (if exists)
prev=$(git rev-parse --abbrev-ref @{u} 2>/dev/null || true) || true
# try to checkout main or restore previous HEAD
if git show-ref --verify --quiet refs/heads/main; then
  git checkout main || true
else
  git checkout -
fi

echo "Sync complete. Remote gh-pages updated. Backup branch: $BACKUP_BRANCH"

echo "Next steps: wait a few minutes and then verify pages at https://montagnikrea-source.github.io/SuslovPA/"

echo "You can remove the temporary branch locally: git branch -D $TEMP_BRANCH (optional)"
