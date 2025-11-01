// Vercel API Handler for sending Telegram messages
// This handles POST requests to /api/telegram/send

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chat_id, text, parse_mode } = req.body;

  if (!chat_id || !text) {
    return res.status(400).json({ 
      ok: false, 
      error_code: 400, 
      description: 'Missing chat_id or text' 
    });
  }

  console.log(`[Telegram Send] Message to ${chat_id}: ${text.substring(0, 50)}...`);

  // Simulate successful message send
  const response = {
    ok: true,
    result: {
      message_id: Math.floor(Math.random() * 1000000),
      date: Math.floor(Date.now() / 1000),
      chat: { id: chat_id, type: 'supergroup' },
      from: { id: 123456789, is_bot: true, first_name: 'SuslovPA Bot' },
      text: text,
      parse_mode: parse_mode || 'HTML'
    }
  };

  res.status(200).json(response);
}
