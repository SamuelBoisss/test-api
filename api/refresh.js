const { scrapeAll } = require('../lib/scraper');
const { saveData, loadData, mergeContests } = require('../lib/storage');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔄 Manual scrape triggered...');
  const startTime = Date.now();

  try {
    const results = await scrapeAll();
    const existing = loadData();
    const merged = mergeContests(existing.contests || [], results.contests);
    
    const data = {
      contests: merged,
      scrapedAt: new Date().toISOString(),
      total: merged.length,
    };
    
    saveData(data);

    return res.status(200).json({
      success: true,
      stats: {
        duration: Date.now() - startTime,
        found: results.contests.length,
        total: merged.length,
      },
      data: {
        contests: merged.slice(0, 20), // Retourner les 20 premiers
        scrapedAt: data.scrapedAt,
      },
    });
  } catch (error) {
    console.error('Scrape error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
