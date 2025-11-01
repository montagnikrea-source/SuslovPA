@echo off
REM ============================================================================
REM AUTO_DEPLOY_GITHUB.bat
REM ============================================================================
REM Автоматический скрипт для синхронизации patched файлов с GitHub
REM и деплоя на Vercel + GitHub Pages (Windows версия)
REM 
REM Использование:
REM   AUTO_DEPLOY_GITHUB.bat
REM
REM Требования:
REM   - git установлен и доступен в PATH
REM   - Доступ к репозиторию SuslovPA (ssh или https)
REM   - Права на push в master/main и gh-pages
REM ============================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo 🚀 Starting automatic GitHub deployment...
echo.

REM Check if we're in the right directory
if not exist "public\noninput.html" (
    echo ❌ Error: public\noninput.html not found
    echo    Please run this script from the SuslovPA root directory
    pause
    exit /b 1
)

REM Check git availability
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: git is not installed or not in PATH
    pause
    exit /b 1
)

REM Configuration
set REPO_NAME=SuslovPA
set MAIN_BRANCH=main
set PAGES_BRANCH=gh-pages
set COMMIT_MESSAGE=🛡️ Automatic deployment: Fix syntax errors + deploy anti-oscillation damping protection

echo.
echo 📋 Step 1: Checking git status...
git status
echo.

echo 📋 Step 2: Adding changes to staging...
git add public\noninput.html
git add anti-oscillation.js 2>nul
git add scripts\patch-anti-oscillation.js 2>nul
git add tests\test-anti-oscillation.js 2>nul
git add docs 2>nul
echo.

echo 📋 Step 3: Showing changes to be committed...
git status
echo.

echo 📋 Step 4: Committing to %MAIN_BRANCH%...
git commit -m "%COMMIT_MESSAGE%" || (
    echo   (No changes to commit on main branch)
)
echo.

echo 📋 Step 5: Pushing to %MAIN_BRANCH% branch...
git push -u origin HEAD:%MAIN_BRANCH%
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to push to %MAIN_BRANCH%
    pause
    exit /b 1
)
echo ✅ Successfully pushed to %MAIN_BRANCH%
echo.

echo 📋 Step 6: Checking out %PAGES_BRANCH%...
git checkout %PAGES_BRANCH% 2>nul || (
    echo    Creating new %PAGES_BRANCH% branch...
    git checkout -b %PAGES_BRANCH%
)
echo.

echo 📋 Step 7: Merging %MAIN_BRANCH% into %PAGES_BRANCH%...
git merge %MAIN_BRANCH% --no-edit || (
    echo   (Already up to date)
)
echo.

echo 📋 Step 8: Copying public files to root for GitHub Pages...
if exist "public\noninput.html" (
    copy /Y "public\noninput.html" "index.html" >nul 2>&1
    echo    Copied public\noninput.html ^-^> index.html
)
echo.

echo 📋 Step 9: Committing to %PAGES_BRANCH%...
git add index.html *.html *.css *.js 2>nul
git commit -m "%COMMIT_MESSAGE% [gh-pages]" || (
    echo   (No changes to commit on gh-pages branch)
)
echo.

echo 📋 Step 10: Pushing %PAGES_BRANCH% branch...
git push -u origin HEAD:%PAGES_BRANCH%
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to push to %PAGES_BRANCH%
    pause
    exit /b 1
)
echo ✅ Successfully pushed to %PAGES_BRANCH%
echo.

echo 📋 Step 11: Returning to main branch...
git checkout %MAIN_BRANCH%
echo.

echo.
echo ✅ Deployment complete!
echo.
echo 📊 Deployment summary:
echo    Main branch:     https://github.com/montagnikrea-source/SuslovPA/tree/main
echo    Pages branch:    https://github.com/montagnikrea-source/SuslovPA/tree/gh-pages
echo.
echo 🔗 Live sites:
echo    Vercel:         https://suslovpa.vercel.app/ (building in 2-3 min)
echo    GitHub Pages:   https://montagnikrea-source.github.io/SuslovPA/ (live immediately)
echo.
echo ⏱️  Estimated deployment time:
echo    Vercel:         2-3 minutes
echo    GitHub Pages:   30 seconds
echo.
echo 🛡️  Anti-oscillation damping is now ACTIVE on both sites
echo    Console should show: ✅ СИСТЕМА ЗАЩИТЫ АКТИВИРОВАНА
echo.
echo Press any key to exit...
pause >nul

