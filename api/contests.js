const { loadData } = require('../lib/storage');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const data = loadData();
    
    // Paramètres de filtrage
    const { country, category, minValue, limit } = req.query;
    
    let contests = data.contests || [];
    
    // Filtrer par pays
    if (country && country !== 'all') {
      contests = contests.filter(c => c.country === country.toUpperCase());
    }
    
    // Filtrer par catégorie
    if (category && category !== 'all') {
      contests = contests.filter(c => c.category === category);
    }
    
    // Filtrer par valeur minimum
    if (minValue) {
      contests = contests.filter(c => c.value >= parseInt(minValue));
    }
    
    // Limiter le nombre de résultats
    if (limit) {
      contests = contests.slice(0, parseInt(limit));
    }
    
    // Calculer les stats
    const stats = {
      total: contests.length,
      totalValue: contests.reduce((s, c) => s + (c.value || 0), 0),
      byCountry: {
        FR: contests.filter(c => c.country === 'FR').length,
        INT: contests.filter(c => c.country === 'INT').length,
      },
      byCategory: {},
    };
    
    contests.forEach(c => {
      stats.byCategory[c.category] = (stats.byCategory[c.category] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      data: {
        contests,
        stats,
        scrapedAt: data.scrapedAt,
        isFallback: data.isFallback || false,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
