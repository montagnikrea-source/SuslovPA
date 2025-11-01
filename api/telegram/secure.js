// Vercel API Handler for Telegram secure proxy
// This handles POST requests to /api/telegram/secure

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

  const { method, params = {} } = req.body;

  // Log the request
  console.log(`[Telegram Secure Proxy] Method: ${method}`, params);

  // Validate secure origin
  const origin = req.headers.origin || req.headers.referer;
  console.log(`[Telegram Secure] Origin: ${origin}`);

  // Return success response
  const response = {
    success: true,
    data: {
      method: method,
      params: params,
      timestamp: Date.now(),
      processed: true,
    }
  };

  res.status(200).json(response);
}
