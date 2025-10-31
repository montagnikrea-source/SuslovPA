
module.exports = async function handler(req, res) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method Not Allowed' });
	}
	try {
		const { method, params } = req.body;
		if (!method) {
			return res.status(400).json({ ok: false, error: 'method parameter required' });
		}
		const botToken = process.env.TELEGRAM_BOT_TOKEN;
		if (!botToken) {
			return res.status(500).json({ ok: false, error: 'Server misconfigured: TELEGRAM_BOT_TOKEN is not set' });
		}
		const telegramUrl = `https://api.telegram.org/bot${botToken}/${method}`;
		const response = await fetch(telegramUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'SuslovPA-Telegram-Proxy/1.0'
			},
			body: JSON.stringify(params || {})
		});
		const data = await response.json();
		return res.status(response.status).json(data);
	} catch (error) {
		return res.status(500).json({ ok: false, error_code: 500, description: error.message });
	}
}
