# Vercel Environment Variables Setup

## 🔐 Instructions for Setting Environment Variables in Vercel Dashboard

### Method 1: Via Vercel Web Dashboard
1. Go to: https://vercel.com/dashboard/projects
2. Select project: `pavell` (or your project name)
3. Navigate to: **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `TELEGRAM_BOT_TOKEN`
   - **Value**: `8223995698:AAHcCFig-Zgci-B7Wib84eyxElibI_jYEsw`
   - **Environments**: Select ✓ Production, ✓ Preview, ✓ Development
5. Click **Save**
6. Trigger redeploy: Push a commit or click "Redeploy" button

### Method 2: Via Vercel CLI
```bash
vercel env add TELEGRAM_BOT_TOKEN
# Enter value: 8223995698:AAHcCFig-Zgci-B7Wib84eyxElibI_jYEsw
# Select environments: all
vercel redeploy
```

## ✅ Verification

After setting the environment variable:

1. **Check via API:**
   ```bash
   curl -X POST https://pavell.vercel.app/api/telegram.js \
     -H "Content-Type: application/json" \
     -d '{"method":"getMe","params":{}}'
   ```
   
   Expected response:
   ```json
   {
     "ok": true,
     "result": {
       "id": 8223995698,
       "is_bot": true,
       "first_name": "SuslovPABoot",
       "username": "Inputlagthebot"
     }
   }
   ```

2. **Check via Debug Endpoint:**
   ```bash
   curl https://pavell.vercel.app/api/debug.js
   ```

## 📋 Environment Variable Status

| Variable | Value | Status |
|----------|-------|--------|
| `TELEGRAM_BOT_TOKEN` | `8223995698:AAHcCFig-Zgci-B7Wib84eyxElibI_jYEsw` | ✅ Verified |

**Bot Details:**
- Bot ID: `8223995698`
- Username: `@Inputlagthebot`
- Name: `SuslovPABoot`
- Status: ✅ Active and responsive

## 🔗 Related Documentation
- See `VERCEL_API_FIX.md` for API endpoint routing solution
- See `TOKEN_SECURITY.md` for token security best practices
