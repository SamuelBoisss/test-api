const { scrapeAll } = require('../lib/scraper');
const { saveData, loadData, mergeContests } = require('../lib/storage');

module.exports = async function handler(req, res) {
  // Vérifier que c'est bien un appel cron de Vercel
  const authHeader = req.headers.authorization;
  
  // En production, vérifier le secret CRON_SECRET
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  console.log('🚀 Starting scheduled scrape...');
  const startTime = Date.now();

  try {
    // Scraper toutes les sources
    const results = await scrapeAll();
    
    // Charger les données existantes
    const existing = loadData();
    
    // Fusionner avec les nouveaux résultats
    const merged = mergeContests(existing.contests || [], results.contests);
    
    // Sauvegarder
    const data = {
      contests: merged,
      scrapedAt: new Date().toISOString(),
      total: merged.length,
      lastScrape: {
        duration: Date.now() - startTime,
        found: results.contests.length,
        errors: results.errors,
      },
    };
    
    saveData(data);

    console.log(`✅ Scrape completed in ${Date.now() - startTime}ms`);
    console.log(`   Found: ${results.contests.length} new contests`);
    console.log(`   Total: ${merged.length} contests`);

    return res.status(200).json({
      success: true,
      message: 'Scrape completed',
      stats: {
        duration: Date.now() - startTime,
        found: results.contests.length,
        total: merged.length,
        errors: results.errors.length,
      },
    });
  } catch (error) {
    console.error('❌ Scrape failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
