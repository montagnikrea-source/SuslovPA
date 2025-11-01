// Vercel API Handler for Page Visit Counter
// Manages real visit count tracking

// In-memory storage (persists during deployment period)
let visitCounter = {
  count: 1215, // Starting value
  lastReset: new Date(),
  visits: [] // Track individual visits
};

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

  const action = req.query.action || req.body?.action;

  // GET - Retrieve current count
  if (req.method === 'GET' || (req.method === 'POST' && action === 'get')) {
    return res.status(200).json({
      ok: true,
      count: visitCounter.count,
      lastReset: visitCounter.lastReset,
      timestamp: new Date(),
      visits: visitCounter.visits.slice(-10) // Last 10 visits
    });
  }

  // POST - Increment counter
  if (req.method === 'POST' && (action === 'increment' || action === 'visit')) {
    const { source = 'direct', referrer = 'none', userId = null } = req.body || {};
    
    // Increment counter
    visitCounter.count++;
    
    // Record visit details
    const visitRecord = {
      timestamp: new Date(),
      count: visitCounter.count,
      source,
      referrer,
      userId,
      ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown'
    };
    
    visitCounter.visits.push(visitRecord);
    
    // Keep only last 100 visits in memory
    if (visitCounter.visits.length > 100) {
      visitCounter.visits.shift();
    }
    
    console.log(`[Counter] Visit #${visitCounter.count} - Source: ${source}`);
    
    return res.status(200).json({
      ok: true,
      count: visitCounter.count,
      message: `Visit recorded. Total: ${visitCounter.count}`,
      visit: visitRecord
    });
  }

  // POST - Get stats
  if (req.method === 'POST' && action === 'stats') {
    const now = new Date();
    const lastHour = visitCounter.visits.filter(v => 
      (now - new Date(v.timestamp)) < 3600000
    );
    
    return res.status(200).json({
      ok: true,
      totalCount: visitCounter.count,
      visitsLastHour: lastHour.length,
      lastReset: visitCounter.lastReset,
      timestamp: now,
      topSources: getTopSources(visitCounter.visits)
    });
  }

  // POST - Reset counter (admin only)
  if (req.method === 'POST' && action === 'reset') {
    const { adminToken } = req.body || {};
    
    // Simple admin check (in production use proper auth)
    if (adminToken !== 'admin-token-123') {
      return res.status(403).json({
        ok: false,
        error: 'Unauthorized'
      });
    }
    
    const oldCount = visitCounter.count;
    visitCounter.count = 0;
    visitCounter.lastReset = new Date();
    visitCounter.visits = [];
    
    console.log(`[Counter] Reset from ${oldCount} to 0`);
    
    return res.status(200).json({
      ok: true,
      message: `Counter reset from ${oldCount} to 0`,
      newCount: 0
    });
  }

  return res.status(400).json({
    ok: false,
    error: 'Invalid action',
    supportedActions: ['get', 'increment', 'visit', 'stats', 'reset']
  });
}

// Helper function to get top sources
function getTopSources(visits) {
  const sources = {};
  visits.forEach(v => {
    sources[v.source] = (sources[v.source] || 0) + 1;
  });
  
  return Object.entries(sources)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([source, count]) => ({ source, count }));
}
