
module.exports = async function handler(req, res) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method Not Allowed' });
	}
	try {
		const botToken = process.env.TELEGRAM_BOT_TOKEN;
		if (!botToken) {
			return res.status(500).json({ success: false, error: 'Server misconfigured: TELEGRAM_BOT_TOKEN is not set' });
		}
		// Parse query parameters
		const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
		const limit = url.searchParams.get('limit') || '100';
		const timeout = url.searchParams.get('timeout') || '5';
		const telegramUrl = `https://api.telegram.org/bot${botToken}/getUpdates?offset=0&limit=${limit}&allowed_updates=message`;
		const response = await fetch(telegramUrl, {
			method: 'GET',
			timeout: (parseInt(timeout) + 5) * 1000
		});
		const data = await response.json();
		return res.status(response.status).json(data);
	} catch (error) {
		return res.status(500).json({ ok: false, error: error.message });
	}
}
