// Vercel API Handler for Telegram updates
// This handles GET/POST requests to /api/telegram/updates

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get limit from query params
  const limit = req.query.limit || 100;
  
  console.log(`[Telegram Updates] Fetching up to ${limit} updates`);

  // Return empty updates (no new messages)
  const response = {
    ok: true,
    result: [
      // Simulated update for testing
      {
        update_id: 123456789,
        message: {
          message_id: 1,
          date: Math.floor(Date.now() / 1000),
          chat: { id: -1001234567890, type: 'supergroup', title: 'SuslovPA' },
          from: { id: 123456789, is_bot: false, first_name: 'User' },
          text: 'Hello from Telegram!',
        }
      }
    ]
  };

  res.status(200).json(response);
}
