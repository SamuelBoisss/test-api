const fs = require('fs');
const path = require('path');

// En mode serverless Vercel, on utilise /tmp pour le stockage temporaire
// Pour du stockage persistant, utiliser Vercel KV (gratuit) ou une DB externe

const DATA_FILE = '/tmp/concours-data.json';
const BACKUP_DATA = {
  contests: [],
  scrapedAt: null,
  total: 0,
};

// Données de fallback si le scraping échoue
const FALLBACK_CONTESTS = [
  { id: 'fb-1', title: 'Vol Paris-NY Classe Affaires x2', brand: 'Capital.fr', value: 6000, category: 'Voyage', source: 'ledemondujeu', sourceName: 'Le Démon du Jeu', sourceIcon: '😈', sourceColor: '#5856D6', country: 'FR', type: 'Tirage', url: 'https://www.ledemondujeu.com/', answers: ['Vols classe affaires vers NY', 'Paris, NY, Milan', 'Le Wi-fi'] },
  { id: 'fb-2', title: 'Setup Gaming Corsair', brand: 'Materiel.net', value: 2500, category: 'High-Tech', source: 'concours-fr', sourceName: 'Concours.fr', sourceIcon: '🏆', sourceColor: '#34C759', country: 'FR', type: 'Tirage', url: 'https://www.concours.fr/', isNew: true },
  { id: 'fb-3', title: 'Fauteuil Ivana + pouf', brand: 'Femme Actuelle', value: 2248, category: 'Maison', source: 'jeu-concours-biz', sourceName: 'Jeu-Concours.biz', sourceIcon: '🎯', sourceColor: '#007AFF', country: 'FR', type: 'Tirage', url: 'https://www.jeu-concours.biz/' },
  { id: 'fb-4', title: 'RTX 5090 Founders Edition', brand: 'Gleam', value: 1999, category: 'High-Tech', source: 'gleam', sourceName: 'Gleam.io', sourceIcon: '✨', sourceColor: '#9B59B6', country: 'INT', type: 'Tirage', url: 'https://gleam.io/', isNew: true },
  { id: 'fb-5', title: 'Galaxy Book 5 Pro + Buds', brand: 'Le Point', value: 1800, category: 'High-Tech', source: 'ledemondujeu', sourceName: 'Le Démon du Jeu', sourceIcon: '😈', sourceColor: '#5856D6', country: 'FR', type: 'Tirage', url: 'https://www.ledemondujeu.com/' },
  { id: 'fb-6', title: 'Canapé Bobochic 1500€', brand: 'Bobochic Paris', value: 1500, category: 'Maison', source: 'concours-fr', sourceName: 'Concours.fr', sourceIcon: '🏆', sourceColor: '#34C759', country: 'FR', type: 'Tirage', url: 'https://www.concours.fr/' },
  { id: 'fb-7', title: 'Thermomix TM6', brand: 'Thermomix', value: 1499, category: 'Maison', source: 'echantillonsclub', sourceName: 'EchantillonsClub', sourceIcon: '🎁', sourceColor: '#FF2D55', country: 'FR', type: 'Tirage', url: 'https://www.echantillonsclub.com/' },
  { id: 'fb-8', title: 'Séjour Thalasso Pornic', brand: 'Femme Actuelle', value: 1324, category: 'Voyage', source: 'jeu-concours-biz', sourceName: 'Jeu-Concours.biz', sourceIcon: '🎯', sourceColor: '#007AFF', country: 'FR', type: 'Tirage', url: 'https://www.jeu-concours.biz/', answers: ['Loire Atlantique', 'Thalasso et Soins marins'] },
  { id: 'fb-9', title: 'Séjour Center Parcs + Spa', brand: 'Center Parcs', value: 1200, category: 'Voyage', source: 'concours-fr', sourceName: 'Concours.fr', sourceIcon: '🏆', sourceColor: '#34C759', country: 'FR', type: 'Tirage', url: 'https://www.concours.fr/' },
  { id: 'fb-10', title: 'iPhone 16 Pro', brand: 'Apple', value: 1229, category: 'High-Tech', source: 'reducavenue', sourceName: 'Reducavenue', sourceIcon: '💰', sourceColor: '#5AC8FA', country: 'FR', type: 'Tirage', url: 'https://www.reducavenue.com/' },
  { id: 'fb-11', title: 'Lot beauté Gouiran 1000€', brand: 'Gouiran Beauté', value: 1000, category: 'Beauté', source: 'ledemondujeu', sourceName: 'Le Démon du Jeu', sourceIcon: '😈', sourceColor: '#5856D6', country: 'FR', type: 'Tirage', url: 'https://www.gouiran-beaute.com/' },
  { id: 'fb-12', title: 'Four AEG encastrable', brand: 'Schmidt', value: 799, category: 'Maison', source: 'ledemondujeu', sourceName: 'Le Démon du Jeu', sourceIcon: '😈', sourceColor: '#5856D6', country: 'FR', type: 'Tirage', url: 'https://www.ledemondujeu.com/' },
  { id: 'fb-13', title: 'PlayStation 5 Pro', brand: 'Sony', value: 799, category: 'High-Tech', source: 'echantillonsclub', sourceName: 'EchantillonsClub', sourceIcon: '🎁', sourceColor: '#FF2D55', country: 'FR', type: 'Tirage', url: 'https://www.echantillonsclub.com/' },
  { id: 'fb-14', title: 'Steam Deck OLED', brand: 'Valve', value: 549, category: 'High-Tech', source: 'gleam', sourceName: 'Gleam.io', sourceIcon: '✨', sourceColor: '#9B59B6', country: 'INT', type: 'Tirage', url: 'https://gleam.io/' },
  { id: 'fb-15', title: 'Canon EOS 2000D', brand: 'Challenges', value: 400, category: 'High-Tech', source: 'jeu-concours-biz', sourceName: 'Jeu-Concours.biz', sourceIcon: '🎯', sourceColor: '#007AFF', country: 'FR', type: 'Tirage', url: 'https://www.jeu-concours.biz/' },
  { id: 'fb-16', title: 'Casque Bose 700', brand: 'Notaires', value: 330, category: 'High-Tech', source: 'jeu-concours-biz', sourceName: 'Jeu-Concours.biz', sourceIcon: '🎯', sourceColor: '#007AFF', country: 'FR', type: 'Tirage', url: 'https://www.jeu-concours.biz/' },
];

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      // Vérifier si les données ne sont pas trop vieilles (max 24h)
      if (data.scrapedAt) {
        const age = Date.now() - new Date(data.scrapedAt).getTime();
        if (age < 24 * 60 * 60 * 1000 && data.contests?.length > 0) {
          return data;
        }
      }
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }
  
  // Retourner les données de fallback
  return {
    contests: FALLBACK_CONTESTS,
    scrapedAt: new Date().toISOString(),
    total: FALLBACK_CONTESTS.length,
    isFallback: true,
  };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('Error saving data:', e);
    return false;
  }
}

function mergeContests(existing, newContests) {
  // Fusionner en gardant les plus récents et dédupliquant
  const map = new Map();
  
  // Ajouter existants
  existing.forEach(c => map.set(c.id, c));
  
  // Ajouter/remplacer par nouveaux
  newContests.forEach(c => map.set(c.id, c));
  
  // Convertir et trier
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

module.exports = { loadData, saveData, mergeContests, FALLBACK_CONTESTS };
