#!/bin/bash

# Quick test script to verify telemetry fix is in place

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           TELEMETRY AUTO-START FIX - VERIFICATION              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🔍 Checking if fix is applied to all files..."
echo ""

FIXED=0
TOTAL=4

check_file() {
    local file=$1
    local name=$2
    
    echo -n "📄 $name... "
    
    if [ ! -f "$file" ]; then
        echo "❌ FILE NOT FOUND"
        return 1
    fi
    
    if grep -q "АВТОМАТИЧЕСКИЙ ЗАПУСК loop()" "$file"; then
        echo "✅ FIXED"
        FIXED=$((FIXED + 1))
        return 0
    else
        echo "❌ NOT FIXED"
        return 1
    fi
}

check_file "/workspaces/SuslovPA/noninput.html" "Desktop (noninput.html)"
check_file "/workspaces/SuslovPA/noninput-mobile.html" "Mobile (noninput-mobile.html)"
check_file "/workspaces/SuslovPA/public/noninput.html" "Public Desktop (public/noninput.html)"
check_file "/workspaces/SuslovPA/public/noninput-mobile.html" "Public Mobile (public/noninput-mobile.html)"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📊 Status: $FIXED/$TOTAL files fixed"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ $FIXED -eq 4 ]; then
    echo "✅ SUCCESS: All files have been fixed!"
    echo ""
    echo "🚀 Deployment Information:"
    echo "  • GitHub: Changes pushed to main branch"
    echo "  • GitHub Pages: Auto-deploying (wait ~1 minute)"
    echo "  • Vercel: Auto-deploying (wait ~2-5 minutes)"
    echo ""
    echo "🧪 How to Test:"
    echo "  1. Wait for deployment to complete"
    echo "  2. Open: https://montagnikrea-source.github.io/noninput.html"
    echo "  3. Press F12 to open DevTools → Console"
    echo "  4. Look for '[INIT] Starting telemetry loop' message"
    echo "  5. Watch for [SET-T] and [SET-W] logs every 160ms"
    echo "  6. Verify sliders and telemetry values update in real-time"
    echo ""
    echo "📋 Monitoring Dashboard:"
    echo "  Open: https://montagnikrea-source.github.io/telemetry-monitor.html"
    echo ""
    exit 0
else
    echo "❌ FAILURE: Not all files have been fixed"
    echo "   Expected: 4/4 files"
    echo "   Found: $FIXED/4 files"
    echo ""
    echo "Please check the files and apply the fix manually."
    echo ""
    exit 1
fi
