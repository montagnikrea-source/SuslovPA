# Vercel Deployment Guide for Telegram Chat

This guide explains how to deploy the API backend to Vercel and configure it to work with the GitHub Pages frontend.

## Prerequisites

1. A Vercel account (https://vercel.com)
2. A Telegram Bot Token (get from @BotFather on Telegram)
3. The repository cloned or accessible to Vercel

## Step 1: Set Up Vercel Project

1. Go to https://vercel.com and sign in
2. Click "Add New..." → "Project"
3. Import your Git repository (GitHub, GitLab, or Bitbucket)
4. Select the repository: `montagnikrea-source/SuslovPA`

## Step 2: Configure Environment Variables

**CRITICAL:** You must set the `TELEGRAM_BOT_TOKEN` environment variable for the chat to work.

### In Vercel Dashboard:

1. Go to your project in Vercel
2. Click on "Settings" tab
3. Click on "Environment Variables" in the left sidebar
4. Add the following variable:

| Name | Value | Environment |
|------|-------|-------------|
| `TELEGRAM_BOT_TOKEN` | `<your-bot-token>` | Production, Preview, Development |

**Example Token Format:** `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890`

### How to Get a Telegram Bot Token:

1. Open Telegram and search for `@BotFather`
2. Send the command `/newbot` or `/mybots` to view existing bots
3. Follow the instructions to create a bot or get token for existing bot
4. Copy the token provided by BotFather
5. Paste it into the Vercel environment variable

### Optional Environment Variables:

| Name | Value | Description |
|------|-------|-------------|
| `TELEGRAM_CHAT_ID` | `@noninput` | The Telegram channel/chat ID (default: @noninput) |
| `NODE_ENV` | `production` | Set to production for production deployment |

## Step 3: Deploy

1. After setting environment variables, click "Deploy" in Vercel
2. Wait for the deployment to complete
3. Note the deployment URL (e.g., `https://your-project.vercel.app`)

## Step 4: Verify API Endpoints

Test the following endpoints to ensure they're working:

### 1. Health Check
```bash
curl https://pavell.vercel.app/api/
```
Expected response:
```json
{"ok":true,"message":"API работает!"}
```

### 2. Telegram Token Endpoint
```bash
curl -H "Origin: https://montagnikrea-source.github.io" \
     https://pavell.vercel.app/api/auth/telegram-token
```
Expected response:
```json
{"ok":true,"token":"<your-token>"}
```

### 3. Telegram Updates
```bash
curl https://pavell.vercel.app/api/telegram/updates
```
Expected response:
```json
{"ok":true,"result":[...]}
```

## Step 5: Configure Frontend (GitHub Pages)

The frontend HTML file (`noninput.html`) is already configured to use the Vercel API:

- For localhost: `http://localhost:3000/api/`
- For GitHub Pages: `https://pavell.vercel.app/api/`

The code automatically detects the environment and uses the correct endpoint.

## Troubleshooting

### Issue: "Token not configured on server"
**Solution:** Make sure `TELEGRAM_BOT_TOKEN` is set in Vercel environment variables and redeploy.

### Issue: "Unauthorized origin" error
**Solution:** The allowed origins are:
- `https://pavell.vercel.app`
- `https://montagnikrea-source.github.io`
- `http://localhost:3000`
- `http://localhost:8000`

If you're accessing from a different domain, update the `allowedOrigins` array in `/api/auth/telegram-token.js`.

### Issue: CORS errors
**Solution:** The Vercel configuration already includes CORS headers. Make sure:
1. The API is deployed to Vercel
2. You're accessing from an allowed origin
3. Browser cache is cleared (Ctrl+Shift+R)

### Issue: 404 errors on API endpoints
**Solution:** 
1. Check that all API files are present in the `api/` directory
2. Verify the `vercel.json` rewrites are correct
3. Redeploy the project

## Step 6: GitHub Pages Deployment

The GitHub Pages deployment serves the static HTML files. To deploy:

1. Make sure the repository has GitHub Pages enabled
2. Set the source to deploy from the main/master branch
3. The site will be available at `https://montagnikrea-source.github.io/SuslovPA/`

### GitHub Pages Settings:

1. Go to repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` or `master` / `root` directory
4. Save

## Testing the Complete Setup

1. Open `https://montagnikrea-source.github.io/SuslovPA/noninput.html` in your browser
2. Open browser console (F12)
3. Check for successful connection messages:
   - `✅ Токен получен с сервера`
   - `🔄 Запуск Telegram polling с интервалом 5000 мс`
4. Send a message in the web chat
5. Check your Telegram channel to see if the message appears
6. Send a message in Telegram channel
7. Wait 5 seconds and check if it appears in the web chat

## Security Notes

- ⚠️ Never commit the `TELEGRAM_BOT_TOKEN` to the repository
- ⚠️ Always use environment variables for sensitive data
- ⚠️ The token is fetched securely from the server, never exposed in client code
- ⚠️ CORS is configured to only allow specific origins

## Support

If you encounter issues:
1. Check Vercel logs: Project → Deployments → Select deployment → View Function Logs
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Ensure bot has permissions to post in the Telegram channel

## Architecture Overview

```
┌─────────────────────────────────┐
│   GitHub Pages (Frontend)       │
│   https://montagnikrea-source.  │
│   github.io/SuslovPA/            │
└────────────┬────────────────────┘
             │
             │ HTTPS Requests
             ▼
┌─────────────────────────────────┐
│   Vercel API (Backend)          │
│   https://pavell.vercel.app/api/│
│   - /api/auth/telegram-token    │
│   - /api/telegram/updates       │
│   - /api/telegram               │
└────────────┬────────────────────┘
             │
             │ Bot API Requests
             ▼
┌─────────────────────────────────┐
│   Telegram Bot API              │
│   https://api.telegram.org/     │
└─────────────────────────────────┘
```

## Update Process

When you need to update the code:

1. Make changes to the code
2. Commit and push to GitHub
3. Vercel will automatically redeploy the API (if connected to Git)
4. GitHub Pages will automatically update the frontend
5. No manual deployment needed!
