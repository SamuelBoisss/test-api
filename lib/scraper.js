const cheerio = require('cheerio');

// ============================================
// CONFIGURATION DES SOURCES
// ============================================
const SOURCES = {
  'jeu-concours-biz': {
    name: 'Jeu-Concours.biz',
    icon: '🎯',
    color: '#007AFF',
    country: 'FR',
    urls: [
      'https://www.jeu-concours.biz/meilleursconcours.php',
      'https://www.jeu-concours.biz/nouveaux-concours.html',
    ],
  },
  'ledemondujeu': {
    name: 'Le Démon du Jeu',
    icon: '😈',
    color: '#5856D6',
    country: 'FR',
    urls: [
      'https://www.ledemondujeu.com/',
      'https://www.ledemondujeu.com/selection-concours.html',
    ],
  },
  'concours-du-net': {
    name: 'Concours du Net',
    icon: '🌐',
    color: '#FF9500',
    country: 'FR',
    urls: [
      'https://www.concours-du-net.com/',
    ],
  },
  'echantillonsclub': {
    name: 'EchantillonsClub',
    icon: '🎁',
    color: '#FF2D55',
    country: 'FR',
    urls: [
      'https://www.echantillonsclub.com/concours',
    ],
  },
  'sweepsadvantage': {
    name: 'SweepsAdvantage',
    icon: '🇺🇸',
    color: '#FF3B30',
    country: 'INT',
    urls: [
      'https://www.sweepsadvantage.com/new-sweepstakes',
    ],
  },
  'gleam': {
    name: 'Gleam.io',
    icon: '✨',
    color: '#9B59B6',
    country: 'INT',
    urls: [
      'https://gleam.io/giveaways',
    ],
  },
};

// ============================================
// FETCH AVEC RETRY ET TIMEOUT
// ============================================
async function fetchWithRetry(url, retries = 3) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
      });
      clearTimeout(timeout);
      if (res.ok) return await res.text();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return null;
}

// ============================================
// PARSERS PAR SOURCE
// ============================================

// Parser Jeu-Concours.biz
function parseJeuConcoursBiz(html, sourceId) {
  const $ = cheerio.load(html);
  const contests = [];

  $('.concours-item, .jeu-concours, article').each((i, el) => {
    try {
      const $el = $(el);
      const title = $el.find('h2, h3, .titre, .title').first().text().trim();
      const brand = $el.find('.organisateur, .marque, .brand').first().text().trim() || 'Jeu-Concours.biz';
      const valueText = $el.find('.valeur, .value, .prix').first().text();
      const value = parseInt(valueText.replace(/[^\d]/g, '')) || 0;
      const url = $el.find('a').first().attr('href') || '';
      const description = $el.find('.description, .desc, p').first().text().trim();
      const dateText = $el.find('.date, .fin, .cloture').first().text();
      
      // Extraire réponses si présentes
      const answersEl = $el.find('.reponses, .answers');
      const answers = [];
      answersEl.find('li, .reponse').each((j, ans) => {
        answers.push($(ans).text().trim());
      });

      if (title && value > 0) {
        contests.push({
          id: `${sourceId}-${Date.now()}-${i}`,
          title: title.substring(0, 100),
          brand,
          value,
          category: guessCategory(title),
          source: sourceId,
          url: url.startsWith('http') ? url : `https://www.jeu-concours.biz${url}`,
          description: description.substring(0, 200),
          answers: answers.length > 0 ? answers : undefined,
          endDate: parseDate(dateText),
          type: 'Tirage',
          scrapedAt: new Date().toISOString(),
        });
      }
    } catch (e) {}
  });

  return contests;
}

// Parser Le Démon du Jeu
function parseLeDemonDuJeu(html, sourceId) {
  const $ = cheerio.load(html);
  const contests = [];

  $('.concours, .jeu, [class*="concours"]').each((i, el) => {
    try {
      const $el = $(el);
      const title = $el.find('h2, h3, h4, .titre').first().text().trim();
      const brand = $el.find('.organisateur, .source').first().text().trim() || 'Le Démon du Jeu';
      const valueText = $el.text().match(/(\d+[\s,.]?\d*)\s*[€$]/);
      const value = valueText ? parseInt(valueText[1].replace(/[\s,.]/g, '')) : 0;
      const url = $el.find('a[href*="jeu-"], a[href*="concours"]').first().attr('href') || '';
      const description = $el.find('.principe, .description, p').first().text().trim();

      // Réponses
      const answersText = $el.find('.reponses, [class*="reponse"]').text();
      const answers = answersText.match(/R\d+[>:]\s*([^R]+)/g)?.map(r => r.replace(/R\d+[>:]\s*/, '').trim()) || [];

      if (title && value > 0) {
        contests.push({
          id: `${sourceId}-${Date.now()}-${i}`,
          title: title.substring(0, 100),
          brand,
          value,
          category: guessCategory(title),
          source: sourceId,
          url: url.startsWith('http') ? url : `https://www.ledemondujeu.com${url}`,
          description: description.substring(0, 200),
          answers: answers.length > 0 ? answers : undefined,
          type: 'Tirage',
          scrapedAt: new Date().toISOString(),
        });
      }
    } catch (e) {}
  });

  return contests;
}

// Parser Concours du Net
function parseConcoursduNet(html, sourceId) {
  const $ = cheerio.load(html);
  const contests = [];

  $('.bloc-concours, .concours-liste article, .jeu').each((i, el) => {
    try {
      const $el = $(el);
      const title = $el.find('h2, h3, .nom-jeu').first().text().trim();
      const valueText = $el.text().match(/(\d+[\s,.]?\d*)\s*[€$]/);
      const value = valueText ? parseInt(valueText[1].replace(/[\s,.]/g, '')) : 0;
      const url = $el.find('a').first().attr('href') || '';

      if (title && value > 0) {
        contests.push({
          id: `${sourceId}-${Date.now()}-${i}`,
          title: title.substring(0, 100),
          brand: 'Concours du Net',
          value,
          category: guessCategory(title),
          source: sourceId,
          url: url.startsWith('http') ? url : `https://www.concours-du-net.com${url}`,
          type: 'Tirage',
          scrapedAt: new Date().toISOString(),
        });
      }
    } catch (e) {}
  });

  return contests;
}

// Parser générique pour les autres sites
function parseGeneric(html, sourceId, baseUrl) {
  const $ = cheerio.load(html);
  const contests = [];

  // Cherche des patterns communs
  $('article, .giveaway, .sweepstakes, .contest, [class*="prize"], [class*="concours"]').each((i, el) => {
    try {
      const $el = $(el);
      const text = $el.text();
      const title = $el.find('h1, h2, h3, h4, .title, .prize-name').first().text().trim();
      const valueMatch = text.match(/\$?([\d,]+(?:\.\d{2})?)\s*(?:€|\$|USD|EUR)/i);
      const value = valueMatch ? parseInt(valueMatch[1].replace(/[,\.]/g, '')) : 0;
      const url = $el.find('a').first().attr('href') || '';

      if (title && title.length > 3 && value > 50) {
        contests.push({
          id: `${sourceId}-${Date.now()}-${i}`,
          title: title.substring(0, 100),
          brand: SOURCES[sourceId]?.name || sourceId,
          value,
          category: guessCategory(title),
          source: sourceId,
          url: url.startsWith('http') ? url : `${baseUrl}${url}`,
          type: 'Tirage',
          scrapedAt: new Date().toISOString(),
        });
      }
    } catch (e) {}
  });

  return contests;
}

// ============================================
// HELPERS
// ============================================

function guessCategory(title) {
  const t = title.toLowerCase();
  if (/iphone|samsung|ps5|playstation|xbox|switch|pc|ordinateur|écran|casque|airpods|macbook|ipad|console|gaming|rtx|gpu/i.test(t)) return 'High-Tech';
  if (/voyage|séjour|vol|billet|avion|hôtel|croisière|vacances|week-end|spa|thalasso/i.test(t)) return 'Voyage';
  if (/beauté|parfum|cosmétique|maquillage|soin|crème|lancôme|dior|sephora/i.test(t)) return 'Beauté';
  if (/montre|bijou|sac|vêtement|mode|swarovski|fashion/i.test(t)) return 'Mode';
  if (/cuisine|robot|thermomix|électroménager|meuble|canapé|fauteuil|maison|jardin|déco|four/i.test(t)) return 'Maison';
  if (/voiture|auto|moto|vélo|scooter|pneu/i.test(t)) return 'Auto';
  if (/argent|cash|€|\$|chèque|bon d'achat|carte cadeau/i.test(t)) return 'Argent';
  return 'Autre';
}

function parseDate(text) {
  if (!text) return null;
  const match = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  return null;
}

// ============================================
// SCRAPER PRINCIPAL
// ============================================

async function scrapeSource(sourceId) {
  const source = SOURCES[sourceId];
  if (!source) return [];

  let allContests = [];

  for (const url of source.urls) {
    try {
      console.log(`Scraping ${sourceId}: ${url}`);
      const html = await fetchWithRetry(url);
      if (!html) continue;

      let contests = [];
      
      switch (sourceId) {
        case 'jeu-concours-biz':
          contests = parseJeuConcoursBiz(html, sourceId);
          break;
        case 'ledemondujeu':
          contests = parseLeDemonDuJeu(html, sourceId);
          break;
        case 'concours-du-net':
          contests = parseConcoursduNet(html, sourceId);
          break;
        default:
          contests = parseGeneric(html, sourceId, new URL(url).origin);
      }

      allContests = [...allContests, ...contests];
    } catch (e) {
      console.error(`Error scraping ${sourceId}:`, e.message);
    }
  }

  // Ajouter les métadonnées de la source
  return allContests.map(c => ({
    ...c,
    sourceName: source.name,
    sourceIcon: source.icon,
    sourceColor: source.color,
    country: source.country,
  }));
}

async function scrapeAll() {
  const results = {
    contests: [],
    sources: Object.keys(SOURCES).length,
    scrapedAt: new Date().toISOString(),
    errors: [],
  };

  for (const sourceId of Object.keys(SOURCES)) {
    try {
      const contests = await scrapeSource(sourceId);
      results.contests = [...results.contests, ...contests];
      console.log(`✓ ${sourceId}: ${contests.length} concours`);
    } catch (e) {
      results.errors.push({ source: sourceId, error: e.message });
      console.error(`✗ ${sourceId}: ${e.message}`);
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  // Dédupliquer par titre similaire
  const seen = new Set();
  results.contests = results.contests.filter(c => {
    const key = c.title.toLowerCase().substring(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Trier par valeur
  results.contests.sort((a, b) => b.value - a.value);

  results.total = results.contests.length;
  return results;
}

module.exports = { scrapeAll, scrapeSource, SOURCES };
