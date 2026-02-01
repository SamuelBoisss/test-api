const { loadData } = require('../lib/storage');
const { SOURCES } = require('../lib/scraper');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const data = loadData();
  
  return res.status(200).json({
    status: 'ok',
    version: '1.0.0',
    sources: Object.keys(SOURCES).length,
    contests: data.total || 0,
    lastScrape: data.scrapedAt || null,
    isFallback: data.isFallback || false,
    endpoints: {
      contests: '/api/contests',
      refresh: '/api/refresh (POST)',
      health: '/api/health',
    },
  });
};
