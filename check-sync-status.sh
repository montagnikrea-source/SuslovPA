#!/bin/bash

# Быстрая проверка статуса файлов для синхронизации
# Использование: bash check-sync-status.sh

echo "🔍 Checking Anti-Oscillation Protection Files Status"
echo "=================================================="
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверяемые файлы
files=(
  "anti-oscillation.js"
  "public/noninput.html"
  "ANTI_OSCILLATION_GUIDE.md"
  "SYNC_INSTRUCTIONS.md"
  "tests/test-anti-oscillation.js"
  "scripts/patch-anti-oscillation.js"
)

echo "📦 Checking file existence:"
echo ""

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    size=$(du -h "$file" | cut -f1)
    lines=$(wc -l < "$file" 2>/dev/null || echo "N/A")
    printf "${GREEN}✅${NC} %-45s %8s  %6s lines\n" "$file" "$size" "$lines"
  else
    printf "${RED}❌${NC} %-45s MISSING\n" "$file"
  fi
done

echo ""
echo "=================================================="
echo ""

# Проверить что anti-oscillation.js содержит OscillationDamper
echo "🔎 Checking OscillationDamper class presence:"
echo ""

if grep -q "class OscillationDamper" anti-oscillation.js 2>/dev/null; then
  printf "${GREEN}✅${NC} OscillationDamper class found in anti-oscillation.js\n"
else
  printf "${RED}❌${NC} OscillationDamper class NOT found in anti-oscillation.js\n"
fi

if grep -q "this.damper = new OscillationDamper" public/noninput.html 2>/dev/null; then
  printf "${GREEN}✅${NC} Damper instantiation found in public/noninput.html\n"
else
  printf "${RED}❌${NC} Damper instantiation NOT found in public/noninput.html\n"
fi

echo ""
echo "=================================================="
echo ""

# Git status
echo "📊 Git Status:"
echo ""

if git rev-parse --git-dir > /dev/null 2>&1; then
  printf "${GREEN}✅${NC} Git repository detected\n"
  echo ""
  
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  printf "   Current branch: ${YELLOW}$current_branch${NC}\n"
  
  # Проверить статус ветки main
  if git rev-parse origin/main > /dev/null 2>&1; then
    printf "${GREEN}✅${NC} Remote 'origin/main' exists\n"
  else
    printf "${RED}❌${NC} Remote 'origin/main' NOT found\n"
  fi
  
  # Проверить статус ветки gh-pages
  if git rev-parse origin/gh-pages > /dev/null 2>&1; then
    printf "${GREEN}✅${NC} Remote 'origin/gh-pages' exists\n"
  else
    printf "${RED}❌${NC} Remote 'origin/gh-pages' NOT found\n"
  fi
  
  echo ""
  echo "   Recent commits:"
  git log --oneline -3 | sed 's/^/   /'
else
  printf "${RED}❌${NC} Not a git repository\n"
fi

echo ""
echo "=================================================="
echo ""

# Проверить тесты
echo "🧪 Test Status:"
echo ""

if [ -f "tests/test-anti-oscillation.js" ]; then
  if command -v node &> /dev/null; then
    printf "${YELLOW}ℹ${NC}  To run tests: node tests/test-anti-oscillation.js\n"
  else
    printf "${YELLOW}ℹ${NC}  Node.js not found in PATH\n"
  fi
else
  printf "${RED}❌${NC} Test file not found\n"
fi

echo ""
echo "=================================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Copy new files from container to your Windows local copy"
echo "2. On Windows (PowerShell):"
echo "   cd [your-repo-path]"
echo "   git checkout main"
echo "   git pull origin main"
echo "   git add -A"
echo "   git commit -m 'feat: add anti-oscillation protection'"
echo "   git push origin main"
echo ""
echo "3. Then switch to gh-pages and repeat"
echo "   git checkout gh-pages"
echo "   git pull origin gh-pages"
echo "   git add -A"
echo "   git commit -m 'chore: update with anti-oscillation'"
echo "   git push origin gh-pages"
echo ""
echo "=================================================="
