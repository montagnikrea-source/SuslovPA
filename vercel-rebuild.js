// Force Vercel rebuild with new timestamp
module.exports = {
  buildId: Date.now(),
  timestamp: new Date().toISOString()
};
