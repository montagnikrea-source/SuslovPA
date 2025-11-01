#!/bin/bash
# ============================================================================
# AUTO_DEPLOY_GITHUB.sh
# ============================================================================
# Автоматический скрипт для синхронизации patched файлов с GitHub
# и деплоя на Vercel + GitHub Pages
# 
# Использование:
#   bash AUTO_DEPLOY_GITHUB.sh
#
# Требования:
#   - git и GitHub CLI установлены
#   - Доступ к репозиторию SuslovPA (ssh или https)
#   - Права на push в master/main и gh-pages
# ============================================================================

set -e  # Exit on error

echo "🚀 Starting automatic GitHub deployment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_NAME="SuslovPA"
MAIN_BRANCH="main"
PAGES_BRANCH="gh-pages"
COMMIT_MESSAGE="🛡️ Automatic deployment: Fix syntax errors + deploy anti-oscillation damping protection"

# Check if we're in the right directory
if [ ! -f "public/noninput.html" ]; then
    echo -e "${RED}❌ Error: public/noninput.html not found${NC}"
    echo "    Please run this script from the SuslovPA root directory"
    exit 1
fi

# Check git availability
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Error: git is not installed${NC}"
    exit 1
fi

# Verify we're in a git repo
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Not a git repository. Initializing...${NC}"
    git init
    git remote add origin "git@github.com:montagnikrea-source/SuslovPA.git" 2>/dev/null || \
    git remote add origin "https://github.com/montagnikrea-source/SuslovPA.git"
fi

echo -e "${BLUE}📋 Step 1: Checking git status...${NC}"
git status

echo ""
echo -e "${BLUE}📋 Step 2: Adding changes to staging...${NC}"
git add public/noninput.html
git add anti-oscillation.js 2>/dev/null || true
git add scripts/patch-anti-oscillation.js 2>/dev/null || true
git add tests/test-anti-oscillation.js 2>/dev/null || true
git add docs/ 2>/dev/null || true
git status

echo ""
echo -e "${BLUE}📋 Step 3: Committing to ${MAIN_BRANCH}...${NC}"
git commit -m "$COMMIT_MESSAGE" || echo "No changes to commit on main branch"

echo ""
echo -e "${BLUE}📋 Step 4: Pushing to ${MAIN_BRANCH} branch...${NC}"
if git push -u origin HEAD:$MAIN_BRANCH; then
    echo -e "${GREEN}✅ Successfully pushed to $MAIN_BRANCH${NC}"
else
    echo -e "${RED}❌ Failed to push to $MAIN_BRANCH${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Step 5: Building gh-pages branch...${NC}"
# Create/update gh-pages branch from main
if git show-ref --verify --quiet refs/heads/$PAGES_BRANCH; then
    echo "Branch $PAGES_BRANCH exists, checking out..."
    git checkout $PAGES_BRANCH
    git merge $MAIN_BRANCH --no-edit || true
else
    echo "Creating new $PAGES_BRANCH branch..."
    git checkout -b $PAGES_BRANCH
fi

echo ""
echo -e "${BLUE}📋 Step 6: Copying public/ files to root for GitHub Pages...${NC}"
# Copy public directory content to root for GitHub Pages
if [ -d "public" ]; then
    cp -v public/noninput.html index.html 2>/dev/null || true
    cp -v public/*.css . 2>/dev/null || true
    cp -v public/*.js . 2>/dev/null || true
    git add index.html *.css *.js 2>/dev/null || true
fi

echo ""
echo -e "${BLUE}📋 Step 7: Committing to ${PAGES_BRANCH}...${NC}"
git commit -m "$COMMIT_MESSAGE [gh-pages]" || echo "No changes to commit on gh-pages branch"

echo ""
echo -e "${BLUE}📋 Step 8: Pushing ${PAGES_BRANCH} branch...${NC}"
if git push -u origin HEAD:$PAGES_BRANCH; then
    echo -e "${GREEN}✅ Successfully pushed to $PAGES_BRANCH${NC}"
else
    echo -e "${RED}❌ Failed to push to $PAGES_BRANCH${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📋 Step 9: Returning to main branch...${NC}"
git checkout $MAIN_BRANCH

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 Deployment summary:"
echo "   Main branch:     https://github.com/montagnikrea-source/SuslovPA/tree/main"
echo "   Pages branch:    https://github.com/montagnikrea-source/SuslovPA/tree/gh-pages"
echo ""
echo "🔗 Live sites:"
echo "   Vercel:         https://suslovpa.vercel.app/ (building in 2-3 min)"
echo "   GitHub Pages:   https://montagnikrea-source.github.io/SuslovPA/ (live immediately)"
echo ""
echo "⏱️  Estimated deployment time:"
echo "   Vercel:         2-3 minutes"
echo "   GitHub Pages:   30 seconds"
echo ""
echo "🛡️  Anti-oscillation damping is now ACTIVE on both sites"
echo "   Console should show: ✅ СИСТЕМА ЗАЩИТЫ АКТИВИРОВАНА"
echo ""

