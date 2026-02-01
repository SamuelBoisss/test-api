# 🎰 Concours Scraper API

API de scraping automatique des jeux concours français et internationaux.

## 🚀 Déploiement sur Vercel (GRATUIT)

### 1. Prérequis
- Compte GitHub
- Compte Vercel (gratuit) : https://vercel.com

### 2. Déployer

```bash
# 1. Créer un repo GitHub et pusher le code
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TON_USERNAME/concours-api.git
git push -u origin main

# 2. Connecter à Vercel
# - Va sur https://vercel.com/new
# - Importe ton repo GitHub
# - Clique "Deploy"
# C'est tout ! 🎉
```

### 3. URLs de ton API

Après déploiement, ton API sera disponible sur :
```
https://ton-projet.vercel.app/api/contests    # Liste des concours
https://ton-projet.vercel.app/api/refresh     # Forcer un scraping (POST)
https://ton-projet.vercel.app/api/health      # Status de l'API
```

## 📡 Sources scrapées

| Source | Pays | URL |
|--------|------|-----|
| Jeu-Concours.biz | 🇫🇷 FR | jeu-concours.biz |
| Le Démon du Jeu | 🇫🇷 FR | ledemondujeu.com |
| Concours du Net | 🇫🇷 FR | concours-du-net.com |
| EchantillonsClub | 🇫🇷 FR | echantillonsclub.com |
| SweepsAdvantage | 🌍 INT | sweepsadvantage.com |
| Gleam.io | 🌍 INT | gleam.io |

## 🔄 Scraping automatique

Le cron job Vercel s'exécute **toutes les 2 heures** automatiquement.

Config dans `vercel.json` :
```json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "0 */2 * * *"
  }]
}
```

## 📖 API Endpoints

### GET /api/contests

Récupère la liste des concours.

**Paramètres query :**
- `country` : `FR` | `INT` | `all` (défaut: all)
- `category` : `High-Tech` | `Voyage` | `Beauté` | etc.
- `minValue` : valeur minimum en €
- `limit` : nombre max de résultats

**Exemple :**
```bash
curl "https://ton-api.vercel.app/api/contests?country=FR&minValue=500&limit=10"
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "contests": [
      {
        "id": "jcb-123",
        "title": "iPhone 16 Pro",
        "brand": "Apple",
        "value": 1229,
        "category": "High-Tech",
        "country": "FR",
        "url": "https://...",
        "answers": ["R1", "R2"]
      }
    ],
    "stats": {
      "total": 45,
      "totalValue": 85000,
      "byCountry": { "FR": 30, "INT": 15 }
    },
    "scrapedAt": "2026-01-30T14:00:00Z"
  }
}
```

### POST /api/refresh

Force un nouveau scraping.

```bash
curl -X POST "https://ton-api.vercel.app/api/refresh"
```

### GET /api/health

Vérifie le status de l'API.

```bash
curl "https://ton-api.vercel.app/api/health"
```

## 🔧 Développement local

```bash
# Installer les dépendances
npm install

# Lancer en local
npx vercel dev

# Tester le scraping
npm run scrape
```

## 📱 Intégration dans l'app React

```javascript
const API_URL = 'https://ton-api.vercel.app';

// Charger les concours
const loadContests = async () => {
  const res = await fetch(`${API_URL}/api/contests`);
  const { data } = await res.json();
  return data.contests;
};

// Forcer un refresh
const refresh = async () => {
  const res = await fetch(`${API_URL}/api/refresh`, { method: 'POST' });
  const { data } = await res.json();
  return data.contests;
};
```

## 💰 Coûts

**100% GRATUIT** avec le free tier Vercel :
- 100 GB bandwidth/mois
- Serverless functions illimitées
- Cron jobs inclus
- SSL automatique

## ⚠️ Limitations

- Le stockage `/tmp` est éphémère sur Vercel (reset à chaque cold start)
- Pour du stockage persistant gratuit, ajouter Vercel KV ou Supabase
- Rate limiting sur les sites scrapés (1 req/sec)

## 📄 License

MIT - Fais-en ce que tu veux ! 🎉
