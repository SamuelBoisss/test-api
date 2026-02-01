import React, { useState, useEffect, useCallback } from 'react';

// ============================================
// CONFIGURATION - CHANGE CETTE URL APRÈS DÉPLOIEMENT
// ============================================
const API_URL = 'https://ton-api.vercel.app'; // ← Remplace par ton URL Vercel

const EMAIL = 'samuel.bois25@proton.me';
const CATEGORIES = ['Tous', 'High-Tech', 'Voyage', 'Beauté', 'Maison', 'Auto', 'Argent', 'Mode', 'Autre'];
const ICONS = { 'High-Tech': '📱', 'Voyage': '✈️', 'Beauté': '💄', 'Mode': '👗', 'Maison': '🏠', 'Auto': '🚗', 'Argent': '💰', 'Autre': '🎁' };

// ============================================
// APP
// ============================================
const App = () => {
  const [contests, setContests] = useState([]);
  const [played, setPlayed] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tous');
  const [country, setCountry] = useState('Tous');
  const [tab, setTab] = useState('toPlay');
  const [expanded, setExpanded] = useState(null);
  const [notif, setNotif] = useState(null);

  // Charger depuis l'API
  const fetchContests = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/contests`);
      if (!res.ok) throw new Error('API error');
      const { data } = await res.json();
      
      // Calculer daysLeft
      const today = new Date();
      const withDays = (data.contests || []).map(c => ({
        ...c,
        daysLeft: c.endDate ? Math.max(0, Math.ceil((new Date(c.endDate) - today) / (1000*60*60*24))) : 30,
      }));
      
      setContests(withDays);
      setLastUpdate(data.scrapedAt ? new Date(data.scrapedAt) : new Date());
      setApiStatus('online');
      setError(null);
    } catch (e) {
      console.error('Fetch error:', e);
      setError('API non disponible - utilisation des données locales');
      setApiStatus('offline');
      // Fallback données locales
      setContests(FALLBACK_DATA);
    }
  }, []);

  // Charger au démarrage
  useEffect(() => {
    const init = async () => {
      // Charger participations depuis storage
      try {
        const saved = await window.storage.get('played');
        if (saved?.value) setPlayed(JSON.parse(saved.value));
      } catch {}
      
      await fetchContests();
      setLoading(false);
    };
    init();
  }, [fetchContests]);

  // Sauvegarder participations
  useEffect(() => {
    if (Object.keys(played).length > 0) {
      window.storage.set('played', JSON.stringify(played)).catch(() => {});
    }
  }, [played]);

  // Refresh depuis l'API
  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/api/refresh`, { method: 'POST' });
      if (!res.ok) throw new Error('Refresh failed');
      const { data } = await res.json();
      
      const today = new Date();
      const withDays = (data.contests || []).map(c => ({
        ...c,
        daysLeft: c.endDate ? Math.max(0, Math.ceil((new Date(c.endDate) - today) / (1000*60*60*24))) : 30,
      }));
      
      setContests(withDays);
      setLastUpdate(new Date());
      notify(`✅ ${withDays.length} concours chargés`);
    } catch (e) {
      notify('❌ Erreur de rafraîchissement', 'error');
    }
    setRefreshing(false);
  };

  const notify = (m, type = 'success') => {
    setNotif({ m, type });
    setTimeout(() => setNotif(null), 2500);
  };

  const mark = (c) => {
    const date = new Date().toLocaleDateString('fr-FR');
    setPlayed(p => ({ ...p, [c.id]: { date, ...c } }));
    notify(`✅ ${c.title}`);
    
    setTimeout(() => {
      if (confirm(`📅 Rappel calendrier (${c.endDate || 'date inconnue'})?`)) {
        const endDate = c.endDate || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0];
        const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${endDate.replace(/-/g,'')}T120000Z\nSUMMARY:🎰 ${c.title}\nURL:${c.url}\nEND:VEVENT\nEND:VCALENDAR`;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([ics], {type:'text/calendar'}));
        a.download = `tirage-${c.id}.ics`;
        a.click();
      }
    }, 200);
    
    setTimeout(() => {
      if (confirm(`📧 Email à ${EMAIL}?`)) {
        window.open(`mailto:${EMAIL}?subject=${encodeURIComponent(`🎰 ${c.title}`)}&body=${encodeURIComponent(`${c.title}\n${c.value}€\n${c.url}\n\nJoué le ${date}`)}`);
      }
    }, 500);
  };

  const unmark = (id) => {
    const p = {...played}; delete p[id]; setPlayed(p);
  };

  // Filtrage
  const filtered = contests.filter(c => {
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.brand?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'Tous' || c.category === category;
    const matchCountry = country === 'Tous' || c.country === country;
    return matchSearch && matchCat && matchCountry;
  });

  const toPlay = filtered.filter(c => !played[c.id]);
  const playedList = filtered.filter(c => played[c.id]);
  const list = tab === 'toPlay' ? toPlay : playedList;

  // Loading
  if (loading) return (
    <div style={{minHeight:'100vh',background:'#F2F2F7',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'-apple-system,sans-serif'}}>
      <div style={{fontSize:'56px',marginBottom:'16px'}}>🎰</div>
      <h1 style={{fontSize:'22px',fontWeight:600,color:'#1C1C1E'}}>Chargement...</h1>
      <p style={{color:'#8E8E93',fontSize:'14px',marginTop:'8px'}}>Connexion à l'API...</p>
    </div>
  );

  const Card = ({c}) => {
    const isPlayed = !!played[c.id];
    const color = c.sourceColor || '#007AFF';
    return (
      <div style={{borderBottom:'0.5px solid rgba(0,0,0,0.08)'}}>
        <div onClick={()=>setExpanded(expanded===c.id?null:c.id)} style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:'12px',cursor:'pointer'}}>
          <div style={{width:'42px',height:'42px',borderRadius:'10px',background:`${color}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>{ICONS[c.category]||'🎁'}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
              <span style={{fontSize:'15px',fontWeight:600,color:'#1C1C1E',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.title}</span>
              {c.isNew&&<span style={{background:'#007AFF',color:'#fff',fontSize:'9px',fontWeight:700,padding:'1px 4px',borderRadius:'3px'}}>NEW</span>}
              {c.country==='INT'&&<span style={{fontSize:'11px'}}>🌍</span>}
            </div>
            <div style={{fontSize:'12px',color:'#8E8E93'}}>{c.brand} • {c.sourceName || c.source}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:'15px',fontWeight:600,color:isPlayed?'#34C759':'#007AFF'}}>{(c.value||0).toLocaleString()}€</div>
            <div style={{fontSize:'11px',color:(c.daysLeft||99)<=3?'#FF3B30':'#8E8E93',fontWeight:(c.daysLeft||99)<=3?600:400}}>{c.daysLeft||'?'}j</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2.5" style={{transform:expanded===c.id?'rotate(90deg)':'none',transition:'0.2s'}}><path d="m9 18 6-6-6-6"/></svg>
        </div>
        {expanded===c.id&&(
          <div style={{padding:'0 16px 12px',background:'rgba(0,0,0,0.02)'}}>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'8px'}}>
              <span style={{background:`${color}20`,color:color,padding:'3px 8px',borderRadius:'6px',fontSize:'11px'}}>{c.sourceIcon||'📡'} {c.sourceName||c.source}</span>
              {c.type&&<span style={{background:'#F2F2F7',padding:'3px 8px',borderRadius:'6px',fontSize:'11px',color:'#666'}}>{c.type}</span>}
            </div>
            {c.description&&<p style={{fontSize:'13px',color:'#3C3C43',margin:'0 0 8px'}}>{c.description}</p>}
            {c.answers&&c.answers.length>0&&(
              <div style={{background:'#34C75915',borderRadius:'8px',padding:'8px',marginBottom:'8px'}}>
                <div style={{fontSize:'11px',fontWeight:600,color:'#34C759',marginBottom:'4px'}}>📝 Réponses</div>
                {c.answers.map((a,i)=><div key={i} style={{fontSize:'12px'}}><b style={{color:'#34C759'}}>R{i+1}:</b> {a}</div>)}
              </div>
            )}
            {isPlayed&&<div style={{background:'#007AFF15',borderRadius:'8px',padding:'8px',marginBottom:'8px',fontSize:'12px',color:'#007AFF'}}>✅ Joué le {played[c.id].date}</div>}
            <div style={{display:'flex',gap:'8px'}}>
              <a href={c.url} target="_blank" rel="noopener noreferrer" style={{flex:1,background:'#007AFF',color:'#fff',borderRadius:'10px',padding:'10px',textAlign:'center',textDecoration:'none',fontSize:'14px',fontWeight:600}}>Participer</a>
              {!isPlayed?(
                <button onClick={e=>{e.stopPropagation();mark(c);}} style={{background:'#34C759',color:'#fff',border:'none',borderRadius:'10px',padding:'10px 14px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>✓</button>
              ):(
                <button onClick={e=>{e.stopPropagation();unmark(c.id);}} style={{background:'#FF3B30',color:'#fff',border:'none',borderRadius:'10px',padding:'10px 14px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>✕</button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{minHeight:'100vh',background:'#F2F2F7',fontFamily:'-apple-system,sans-serif',paddingBottom:'80px'}}>
      {notif&&<div style={{position:'fixed',top:'16px',left:'50%',transform:'translateX(-50%)',background:notif.type==='error'?'#FF3B30':'#34C759',color:'#fff',padding:'10px 20px',borderRadius:'10px',fontSize:'14px',fontWeight:500,zIndex:1000}}>{notif.m}</div>}

      <header style={{background:'rgba(255,255,255,0.9)',backdropFilter:'blur(20px)',borderBottom:'0.5px solid rgba(0,0,0,0.1)',position:'sticky',top:0,zIndex:100,padding:'12px 16px'}}>
        <div style={{maxWidth:'600px',margin:'0 auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
            <h1 style={{fontSize:'24px',fontWeight:700,margin:0}}>🎰 Concours</h1>
            <button onClick={refresh} disabled={refreshing} style={{background:refreshing?'#E5E5EA':'#007AFF',color:refreshing?'#8E8E93':'#fff',border:'none',borderRadius:'8px',padding:'8px 12px',fontSize:'13px',fontWeight:600,cursor:refreshing?'wait':'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
              {refreshing?<><span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>🔄</span>Scraping...</>:'🔄 Actualiser'}
            </button>
          </div>
          
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
            <span style={{fontSize:'11px',color:'#8E8E93'}}>
              {lastUpdate ? `MAJ: ${lastUpdate.toLocaleString('fr-FR')}` : 'Jamais mis à jour'}
            </span>
            <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'10px',background:apiStatus==='online'?'#34C75920':'#FF3B3020',color:apiStatus==='online'?'#34C759':'#FF3B30'}}>
              {apiStatus==='online'?'🟢 API Online':'🔴 Offline'}
            </span>
          </div>
          
          {error&&<div style={{background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:'8px',padding:'8px',marginBottom:'10px',fontSize:'12px',color:'#92400E'}}>{error}</div>}
          
          <div style={{background:'rgba(142,142,147,0.12)',borderRadius:'10px',padding:'8px 12px',display:'flex',alignItems:'center',gap:'8px'}}>
            <span>🔍</span>
            <input type="text" placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)} style={{background:'transparent',border:'none',fontSize:'15px',color:'#1C1C1E',flex:1,outline:'none'}}/>
          </div>
        </div>
      </header>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <div style={{padding:'12px 16px',maxWidth:'600px',margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
          <div style={{background:'#fff',borderRadius:'12px',padding:'10px',textAlign:'center'}}>
            <div style={{fontSize:'18px',fontWeight:700,color:'#007AFF'}}>{toPlay.reduce((s,c)=>s+(c.value||0),0).toLocaleString()}€</div>
            <div style={{fontSize:'10px',color:'#8E8E93'}}>À jouer ({toPlay.length})</div>
          </div>
          <div style={{background:'#fff',borderRadius:'12px',padding:'10px',textAlign:'center'}}>
            <div style={{fontSize:'18px',fontWeight:700,color:'#34C759'}}>{playedList.reduce((s,c)=>s+(c.value||0),0).toLocaleString()}€</div>
            <div style={{fontSize:'10px',color:'#8E8E93'}}>Joués ({playedList.length})</div>
          </div>
          <div style={{background:'#fff',borderRadius:'12px',padding:'10px',textAlign:'center'}}>
            <div style={{fontSize:'18px',fontWeight:700,color:'#FF3B30'}}>{toPlay.filter(c=>(c.daysLeft||99)<=3).length}</div>
            <div style={{fontSize:'10px',color:'#8E8E93'}}>Urgents</div>
          </div>
        </div>
      </div>

      <div style={{padding:'0 16px 8px',maxWidth:'600px',margin:'0 auto'}}>
        <div style={{display:'flex',gap:'6px',marginBottom:'8px'}}>
          {['Tous','FR','INT'].map(c=>(
            <button key={c} onClick={()=>setCountry(c)} style={{background:country===c?'#1C1C1E':'#fff',color:country===c?'#fff':'#1C1C1E',border:'none',borderRadius:'14px',padding:'5px 10px',fontSize:'12px',fontWeight:500,cursor:'pointer'}}>
              {c==='Tous'?'🌐':c==='FR'?'🇫🇷':'🌍'} {c==='Tous'?'Tous':c==='FR'?'France':'Intl'}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:'6px',overflowX:'auto'}}>
          {CATEGORIES.map(cat=>(
            <button key={cat} onClick={()=>setCategory(cat)} style={{background:category===cat?'#007AFF':'#fff',color:category===cat?'#fff':'#1C1C1E',border:'none',borderRadius:'14px',padding:'5px 10px',fontSize:'12px',fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'}}>{cat}</button>
          ))}
        </div>
      </div>

      <div style={{padding:'0 16px',maxWidth:'600px',margin:'0 auto'}}>
        <div style={{display:'flex',background:'rgba(142,142,147,0.12)',borderRadius:'9px',padding:'2px',marginBottom:'10px'}}>
          {['toPlay','played'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,background:tab===t?'#fff':'transparent',border:'none',borderRadius:'7px',padding:'7px',fontSize:'13px',fontWeight:600,color:tab===t?'#1C1C1E':'#8E8E93',cursor:'pointer'}}>{t==='toPlay'?`À jouer (${toPlay.length})`:`Joués (${playedList.length})`}</button>
          ))}
        </div>
      </div>

      <div style={{padding:'0 16px',maxWidth:'600px',margin:'0 auto'}}>
        <div style={{background:'#fff',borderRadius:'12px',overflow:'hidden'}}>
          {list.length>0?list.map(c=><Card key={c.id} c={c}/>):(
            <div style={{padding:'40px',textAlign:'center',color:'#8E8E93'}}>
              <div style={{fontSize:'40px',marginBottom:'8px'}}>{tab==='toPlay'?'🎉':'🎯'}</div>
              <p style={{margin:0}}>{tab==='toPlay'?'Tous joués!':'Aucune participation'}</p>
            </div>
          )}
        </div>

        <div style={{marginTop:'16px',padding:'12px',background:'#fff',borderRadius:'12px',fontSize:'11px',color:'#8E8E93'}}>
          <div style={{fontWeight:600,color:'#1C1C1E',marginBottom:'4px'}}>⚙️ Configuration</div>
          <div>📡 API: <code style={{background:'#F2F2F7',padding:'2px 4px',borderRadius:'4px',fontSize:'10px'}}>{API_URL}</code></div>
          <div>📧 Rappels → {EMAIL}</div>
          <div style={{marginTop:'6px',fontSize:'10px'}}>🔄 Scraping auto toutes les 2h via Vercel Cron</div>
        </div>
      </div>
    </div>
  );
};

// Données de fallback si l'API est offline
const FALLBACK_DATA = [
  { id: 'fb-1', title: 'Vol Paris-NY Classe Affaires x2', brand: 'Capital.fr', value: 6000, category: 'Voyage', source: 'ledemondujeu', sourceName: 'Le Démon du Jeu', sourceIcon: '😈', sourceColor: '#5856D6', country: 'FR', type: 'Tirage', url: 'https://www.ledemondujeu.com/', answers: ['Vols classe affaires vers NY', 'Paris, NY, Milan', 'Le Wi-fi'], daysLeft: 4 },
  { id: 'fb-2', title: 'Setup Gaming Corsair', brand: 'Materiel.net', value: 2500, category: 'High-Tech', source: 'concours-fr', sourceName: 'Concours.fr', sourceIcon: '🏆', sourceColor: '#34C759', country: 'FR', type: 'Tirage', url: 'https://www.concours.fr/', isNew: true, daysLeft: 21 },
  { id: 'fb-3', title: 'Fauteuil Ivana + pouf', brand: 'Femme Actuelle', value: 2248, category: 'Maison', source: 'jeu-concours-biz', sourceName: 'Jeu-Concours.biz', sourceIcon: '🎯', sourceColor: '#007AFF', country: 'FR', type: 'Tirage', url: 'https://www.jeu-concours.biz/', daysLeft: 10 },
  { id: 'fb-4', title: 'RTX 5090 FE', brand: 'Gleam', value: 1999, category: 'High-Tech', source: 'gleam', sourceName: 'Gleam.io', sourceIcon: '✨', sourceColor: '#9B59B6', country: 'INT', type: 'Tirage', url: 'https://gleam.io/', isNew: true, daysLeft: 14 },
  { id: 'fb-5', title: 'Galaxy Book 5 Pro + Buds', brand: 'Le Point', value: 1800, category: 'High-Tech', source: 'ledemondujeu', sourceName: 'Le Démon du Jeu', sourceIcon: '😈', sourceColor: '#5856D6', country: 'FR', type: 'Tirage', url: 'https://www.ledemondujeu.com/', daysLeft: 12 },
  { id: 'fb-6', title: 'Canapé Bobochic 1500€', brand: 'Bobochic', value: 1500, category: 'Maison', source: 'concours-fr', sourceName: 'Concours.fr', sourceIcon: '🏆', sourceColor: '#34C759', country: 'FR', type: 'Tirage', url: 'https://www.concours.fr/', daysLeft: 14 },
  { id: 'fb-7', title: 'Séjour Thalasso Pornic', brand: 'Femme Actuelle', value: 1324, category: 'Voyage', source: 'jeu-concours-biz', sourceName: 'Jeu-Concours.biz', sourceIcon: '🎯', sourceColor: '#007AFF', country: 'FR', type: 'Tirage', url: 'https://www.jeu-concours.biz/', answers: ['Loire Atlantique', 'Thalasso et Soins marins'], daysLeft: 4 },
  { id: 'fb-8', title: 'Séjour Center Parcs + Spa', brand: 'Center Parcs', value: 1200, category: 'Voyage', source: 'concours-fr', sourceName: 'Concours.fr', sourceIcon: '🏆', sourceColor: '#34C759', country: 'FR', type: 'Tirage', url: 'https://www.concours.fr/', daysLeft: 10 },
  { id: 'fb-9', title: 'iPhone 16 Pro', brand: 'Apple', value: 1229, category: 'High-Tech', source: 'reducavenue', sourceName: 'Reducavenue', sourceIcon: '💰', sourceColor: '#5AC8FA', country: 'FR', type: 'Tirage', url: 'https://www.reducavenue.com/', daysLeft: 25 },
  { id: 'fb-10', title: 'Steam Deck OLED', brand: 'Valve', value: 549, category: 'High-Tech', source: 'gleam', sourceName: 'Gleam.io', sourceIcon: '✨', sourceColor: '#9B59B6', country: 'INT', type: 'Tirage', url: 'https://gleam.io/', daysLeft: 7 },
];

export default App;
