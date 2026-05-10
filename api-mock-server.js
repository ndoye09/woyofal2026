#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 * MOCK API SERVER - Woyofal Data Platform
 * ═══════════════════════════════════════════════════════════════
 * Simule le serveur Flask en attendant que Python soit disponible
 * Endpoints: /api/auth/*, /api/simulation/*, /api/consommation/*, /api/ai/*
 */

const http = require('http');
const url = require('url');

// ─── Mock Users Database ───────────────────────────────────────────────────────
const users = {
  'test@example.com': { id: '1', name: 'Test User', password: 'password123', email: 'test@example.com' },
  'admin@woyofal.sn': { id: '2', name: 'Admin', password: 'admin123', email: 'admin@woyofal.sn' }
};

const tokens = {};

// ─── Tarifs Locaux ─────────────────────────────────────────────────────────────
const TARIFS = {
  DPP: {
    1: { prix: 82.00, max: 150 },
    2: { prix: 136.49, max: 250 },
    3: { prix: 136.49, max: null }
  },
  PPP: {
    1: { prix: 147.43, max: 50 },
    2: { prix: 189.84, max: 500 },
    3: { prix: 189.84, max: null }
  }
};

// ─── Utilitaires ───────────────────────────────────────────────────────────────
const generateToken = () => Math.random().toString(36).substr(2) + Date.now().toString(36);

const parseBody = (req) => {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
  });
};

const respond = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE, PUT',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400'
  });
  res.end(JSON.stringify(data));
};

const respondHTML = (res, html) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
};

const respondRaw = (res, contentType, body) => {
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(body);
};

const simulateRecharge = (montant, typeCompteur = 'DPP', cumulActuel = 0, avecRedevance = true) => {
  const tarifs = TARIFS[typeCompteur];
  const redevance = avecRedevance ? 429 : 0;
  const taxe = Math.round(montant * 0.025); // 2.5% tax
  let montantReste = montant - redevance - taxe;
  
  let cumul = cumulActuel;
  let kwhTotal = 0;
  let detailTranches = {};
  
  // Distribuer montantReste selon les tranches
  for (let t = 1; t <= 3; t++) {
    if (montantReste <= 0) break;
    
    const maxTranche = tarifs[t].max;
    const minTranche = t === 1 ? 0 : tarifs[t - 1].max;
    
    // Déterminer combien de kWh disponibles dans cette tranche
    let disponibleDansTranche;
    if (cumul < minTranche) {
      // Si on n'est pas encore à la tranche, on saute
      continue;
    } else if (cumul >= minTranche && (maxTranche === null || cumul < maxTranche)) {
      disponibleDansTranche = maxTranche ? maxTranche - cumul : Number.MAX_SAFE_INTEGER;
    } else {
      // Déjà passé cette tranche
      continue;
    }
    
    if (disponibleDansTranche <= 0) continue;
    
    const kwhDansTranche = Math.min(montantReste / tarifs[t].prix, disponibleDansTranche);
    const montantTranche = kwhDansTranche * tarifs[t].prix;
    
    if (kwhDansTranche > 0) {
      detailTranches[`T${t}`] = {
        kwh: parseFloat(kwhDansTranche.toFixed(2)),
        prix_unitaire: tarifs[t].prix,
        montant: Math.round(montantTranche)
      };
      
      kwhTotal += kwhDansTranche;
      cumul += kwhDansTranche;
      montantReste -= montantTranche;
    }
  }
  
  const trancheFinal = cumul <= 150 ? 1 : cumul <= 250 ? 2 : 3;
  
  const montantNetInitial = montant - redevance - taxe;
  
  return {
    montant_brut: montant,
    montant_redevance: redevance,
    taxe: taxe,
    montant_net: montantNetInitial,
    kwh_obtenus: parseFloat(kwhTotal.toFixed(2)),
    tranche_finale: trancheFinal,
    detail_tranches: detailTranches,
    type_compteur: typeCompteur,
    cumul_initial: cumulActuel,
    cumul_final: parseFloat(cumul.toFixed(2)),
    timestamp: new Date().toISOString()
  };
};

// ─── Request Handler ───────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const pathname = url.parse(req.url).pathname;
  const query = url.parse(req.url, true).query;
  const body = await parseBody(req);

  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${pathname}`);

  // ─── AUTH Endpoints ────────────────────────────────────────────────────────
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const user = users[body.email];
    if (user && user.password === body.password) {
      const token = generateToken();
      const refreshToken = generateToken();
      tokens[token] = { user, refreshToken };
      return respond(res, 200, {
        access_token: token,
        refresh_token: refreshToken,
        user: { id: user.id, name: user.name, email: user.email }
      });
    }
    return respond(res, 401, { error: 'Invalid credentials' });
  }

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const { email, password, name } = body;
    if (users[email]) {
      return respond(res, 409, { error: 'User already exists', errors: ['Email already registered'] });
    }
    const newUser = { id: String(Object.keys(users).length + 1), name, password, email };
    users[email] = newUser;
    const token = generateToken();
    const refreshToken = generateToken();
    tokens[token] = { user: newUser, refreshToken };
    return respond(res, 201, {
      access_token: token,
      refresh_token: refreshToken,
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    });
  }

  if (pathname === '/api/auth/simulations' && req.method === 'GET') {
    const limit = parseInt(query.limit) || 50;
    const simulations = [];
    for (let i = 0; i < Math.min(limit, 10); i++) {
      simulations.push({
        id: i + 1,
        date: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)).toISOString(),
        montant_brut: 5000 + Math.random() * 15000,
        kwh_obtenus: 50 + Math.random() * 150,
        tranche_finale: Math.floor(Math.random() * 3) + 1,
        type_compteur: Math.random() > 0.5 ? 'DPP' : 'PPP',
        detail_tranches: {}
      });
    }
    return respond(res, 200, {
      simulations: simulations,
      stats: {
        total_simulations: simulations.length,
        total_fcfa: simulations.reduce((s, sim) => s + sim.montant_brut, 0),
        total_kwh: simulations.reduce((s, sim) => s + sim.kwh_obtenus, 0),
        moyenne_kwh: simulations.reduce((s, sim) => s + sim.kwh_obtenus, 0) / simulations.length
      }
    });
  }

  // ─── SIMULATION Endpoints ──────────────────────────────────────────────────
  if (pathname === '/api/simulation/recharge' && req.method === 'POST') {
    const { montant_brut, type_compteur = 'DPP', cumul_actuel = 0, avecRedevance = true } = body;
    if (!montant_brut || montant_brut < 0) {
      return respond(res, 400, { error: 'Invalid montant_brut' });
    }
    
    // Appeler la fonction simulateRecharge avec les bons paramètres
    const result = simulateRecharge(montant_brut, type_compteur, cumul_actuel, avecRedevance);
    return respond(res, 200, { data: result });
  }

  if (pathname === '/api/simulation/tarifs' && req.method === 'GET') {
    const type = query.type_compteur || 'DPP';
    return respond(res, 200, {
      type_compteur: type,
      tarifs: TARIFS[type] || TARIFS.DPP,
      redevance: 429,
      devise: 'XOF'
    });
  }

  if (pathname === '/api/simulation/recommandation' && req.method === 'POST') {
    const { consommation_mensuelle, budget_mensuel } = body;
    return respond(res, 200, {
      recommandation: budget_mensuel > 50000 ? 'PPP' : 'DPP',
      raison: budget_mensuel > 50000 ? 'Consommation élevée' : 'Consommation modérée',
      economie_potentielle: budget_mensuel > 50000 ? 5000 : 2000
    });
  }

  // ─── CONSOMMATION Endpoints ────────────────────────────────────────────────
  if (pathname === '/api/consommation/kpis' && req.method === 'GET') {
    return respond(res, 200, {
      periode: query.periode || '2026-01',
      consommation_totale_kwh: 450.5,
      depense_totale_fcfa: 78500,
      factures_count: 5,
      factures_payees: 4,
      factures_impayees: 1
    });
  }

  if (pathname === '/api/consommation/evolution' && req.method === 'GET') {
    const limit = parseInt(query.limit) || 30;
    const evolution = [];
    for (let i = 0; i < limit; i++) {
      evolution.push({
        date: new Date(Date.now() - (limit - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        kwh: Math.floor(Math.random() * 50) + 10,
        montant: Math.floor(Math.random() * 10000) + 5000
      });
    }
    return respond(res, 200, { evolution });
  }

  // ─── AI Endpoints ─────────────────────────────────────────────────────────
  if (pathname === '/api/ai/chat' && req.method === 'POST') {
    const { message } = body;
    const msg = message.toLowerCase();
    
    // Base de connaissances FAQ complète
    const faqBase = {
      '5000': {
        keywords: ['5000', '5 000'],
        reply: 'Avec 5 000 FCFA sans redevance (cumul = 0) : environ 60.9 kWh. Calcul détaillé : taxe 2,5% = 125 F → net = 4 875 F → T1 : 4 875 / 82 = 59.4 kWh. Utilisez notre simulateur pour un résultat exact selon votre cumul actuel.'
      },
      '10000': {
        keywords: ['10000', '10 000'],
        reply: 'Sans redevance, cumul à 0 : environ 104 kWh. T1 : 150 kWh max, mais le montant net (9 750 F) suffit pour ~104 kWh en T1 (9 750 / 82 ≈ 118.9 kWh). Résultat variable selon votre cumul du mois.'
      },
      '20000': {
        keywords: ['20000', '20 000'],
        reply: 'Sans redevance, départ de 0 : environ 183 kWh. T1 (12 300 F / 82 = 150 kWh) + T2 (7 200 F / 136.49 ≈ 52.8 kWh). Vous passez en Tranche 2 après 150 kWh.'
      },
      'tarifs_diff': {
        keywords: ['tarifs', '2025', '2026', 'différence'],
        reply: 'La Senelec a révisé sa grille tarifaire. Les tarifs 2026 (DPP) : T1 = 82 FCFA/kWh, T2 = 136.49 FCFA/kWh. Les tarifs 2025 utilisés par d\'autres calculateurs sont obsolètes. Notre plateforme est la seule à utiliser les tarifs 2026 officiels.'
      },
      'tarifs_senegal': {
        keywords: ['sénégal', 'senegal', 'uniforme', 'région'],
        reply: 'Oui. Les tarifs Woyofal sont uniformes sur tout le territoire sénégalais : Dakar, Thiès, Saint-Louis, Kaolack, Ziguinchor, Diourbel, Fatick, Kaffrine, Kédougou, Kolda, Louga, Matam, Sédhiou, Tambacounda. Les tarifs sont fixés par décret de la CRSE.'
      },
      'redevance': {
        keywords: ['redevance', 'frais fixe'],
        reply: 'La redevance est un frais fixe prélevé lors de votre première recharge du mois. Pour DPP : 429 FCFA. Elle couvre les frais de location du compteur et d\'entretien du réseau électrique. Les recharges suivantes dans le même mois ne sont pas soumises à la redevance.'
      },
      'taxe': {
        keywords: ['taxe', '2.5%', 'communale'],
        reply: 'La taxe communale de 2,5% est prélevée sur CHAQUE recharge, quel que soit le montant. Exemple : pour 10 000 FCFA, la taxe = 250 FCFA. Elle est destinée aux collectivités locales.'
      },
      'deductions': {
        keywords: ['ordre', 'déduction', 'prélèvement'],
        reply: 'L\'ordre est : 1) Redevance mensuelle (si première recharge du mois) → 2) Taxe communale 2,5% → 3) Le reste est converti en kWh selon les tranches. Notre simulateur applique exactement cet ordre.'
      },
      'dpp_ppp': {
        keywords: ['dpp', 'ppp', 'différence', 'domestique', 'professionnel'],
        reply: 'DPP (Domestique Prépayé) : pour les ménages, appartements, villas. T1: 82 F/kWh (0-150 kWh), T2: 136.49 F/kWh (151-250 kWh). PPP (Professionnel Prépayé) : pour les entreprises, commerces, bureaux. T1: 147.43 F/kWh (0-50 kWh), T2: 189.84 F/kWh (51-500 kWh). Notre simulateur gère les deux types de compteurs.'
      },
      'reconnaitre': {
        keywords: ['reconnaitre', 'identifier', 'plaque', 'compteur'],
        reply: 'Regardez la plaque de votre compteur Senelec : "DPP" ou "PPP" est indiqué. Les compteurs résidentiels sont généralement DPP. Les compteurs professionnels/industriels sont PPP. Vous pouvez aussi appeler le 33 839 33 33 (Senelec).'
      },
      'passer': {
        keywords: ['passer', 'changer', 'catégorie', 'dpp', 'ppp'],
        reply: 'Oui, sous conditions. Si votre consommation mensuelle descend sous un seuil défini par la Senelec et que l\'usage est résidentiel, vous pouvez demander un changement de catégorie. Contactez directement la Senelec.'
      },
      'dashboard': {
        keywords: ['dashboard', 'données', 'historique'],
        reply: 'Le Dashboard est votre espace personnel : il affiche l\'historique de vos simulations, vos statistiques de recharge (total FCFA, kWh moyen) et l\'évolution de votre consommation dans le temps.'
      },
      'ml': {
        keywords: ['prédiction', 'machine learning', 'ml', 'fiable'],
        reply: 'Nos modèles de machine learning (Random Forest, XGBoost) sont entraînés sur des données historiques de consommation. La précision varie selon la saison et la région. Les prédictions sont des estimations pour vous aider à planifier, pas des certitudes.'
      },
      'cumul': {
        keywords: ['cumul', 'mensuel', 'tranche', 'meme montant', 'même montant', 'diff', 'variation', 'pourquoi pas'],
        reply: 'IMPORTANT: Deux recharges du même montant donnent des kWh différents selon votre cumul. Exemple: 10 000 FCFA = 104 kWh si cumul=0 (Tranche 1 à 82F/kWh), mais seulement 73 kWh si cumul=200 (Tranche 2 à 136.49F/kWh). C\'est pour cela que notre simulateur demande votre cumul actuel!'
      },
      'solde_restant': {
        keywords: ['solde restant', 'solde', 'crédit restant', 'kwh restant'],
        reply: 'Tapez 801 sur le clavier de votre compteur Woyofal pour connaître votre solde restant.'
      },
      'connaitre_cumul': {
        keywords: ['comment savoir', 'consommation actuelle', 'cumul actuel', 'connaitre', 'savoir mon cumul', 'consulter'],
        reply: 'Tapez 814 sur le clavier de votre compteur Woyofal pour connaître votre consommation actuelle.'
      },
      'inverse': {
        keywords: ['inverse', 'calcul inverse', 'kwh'],
        reply: 'Dans le simulateur, activez le mode "Calcul inverse". Entrez le nombre de kWh que vous souhaitez obtenir. Le simulateur calcule automatiquement le montant FCFA à recharger, en tenant compte des tranches et des déductions. Fonctionnalité exclusive à notre plateforme.'
      },
      'comparaison': {
        keywords: ['comparer', 'comparaison', 'deux types', 'simuler'],
        reply: 'Vous pouvez changer le type (DPP/PPP) dans le simulateur et refaire le calcul. Pour une comparaison côte à côte, consultez notre Guide des Tarifs qui présente les deux grilles tarifaires en parallèle.'
      }
    };
    
    // Chercher la meilleure correspondance
    let reply = 'Bonjour! Je suis l\'assistant Woyofal ⚡. Comment puis-je vous aider avec vos questions sur les tarifs Senelec et votre électricité?';
    
    for (const [key, faq] of Object.entries(faqBase)) {
      if (faq.keywords.some(kw => msg.includes(kw))) {
        reply = faq.reply;
        break;
      }
    }
    
    return respond(res, 200, {
      reply: reply,
      confidence: 0.95,
      timestamp: new Date().toISOString()
    });
  }

  // ─── Health Check ─────────────────────────────────────────────────────────
  if (pathname === '/api/health' && req.method === 'GET') {
    return respond(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
  }

  // ─── Accueil ───────────────────────────────────────────────────────────────
  if (pathname === '/' && req.method === 'GET') {
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="theme-color" content="#1a1a2e"/>
  <meta name="description" content="Woyofal Data Platform – API de simulation de recharge Sénelec"/>
  <title>Woyofal API</title>
  <link rel="manifest" href="/manifest.json"/>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh; color: #e0e0e0;
      display: flex; flex-direction: column; align-items: center;
      padding: 2rem 1rem;
    }
    .badge {
      background: #22c55e; color: #052e16; font-size: .75rem;
      font-weight: 700; padding: .2rem .7rem; border-radius: 999px;
      letter-spacing: .05em; margin-bottom: 1.5rem;
    }
    h1 { font-size: 2.2rem; font-weight: 800; color: #fff; text-align: center; }
    h1 span { color: #facc15; }
    .subtitle { color: #94a3b8; margin-top: .5rem; text-align: center; font-size: .95rem; }
    .version { color: #475569; font-size: .8rem; margin-top: .25rem; }
    .grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem; margin-top: 2.5rem; width: 100%; max-width: 900px;
    }
    .card {
      background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
      border-radius: 12px; padding: 1rem 1.25rem;
      display: flex; align-items: center; gap: .85rem;
      transition: background .2s, transform .15s;
      cursor: default;
    }
    .card:hover { background: rgba(255,255,255,.1); transform: translateY(-2px); }
    .method {
      font-size: .7rem; font-weight: 700; padding: .25rem .55rem;
      border-radius: 6px; flex-shrink: 0; letter-spacing: .04em;
    }
    .get  { background: #166534; color: #86efac; }
    .post { background: #1e3a8a; color: #93c5fd; }
    .path { font-size: .85rem; color: #e2e8f0; font-family: monospace; word-break: break-all; }
    .footer { margin-top: 3rem; color: #334155; font-size: .8rem; text-align: center; }
    .ping { display: inline-block; width: 8px; height: 8px; border-radius: 50%;
            background: #22c55e; margin-right: .4rem;
            animation: pulse 1.8s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
    #install-btn {
      display: none; margin-top: 1.5rem;
      background: #facc15; color: #1a1a2e; border: none;
      padding: .6rem 1.4rem; border-radius: 8px; font-weight: 700;
      cursor: pointer; font-size: .9rem;
    }
    #install-btn:hover { background: #fbbf24; }
  </style>
</head>
<body>
  <div class="badge"><span class="ping"></span>RUNNING</div>
  <h1>⚡ <span>Woyofal</span> API</h1>
  <p class="subtitle">Plateforme de simulation de recharge Sénelec</p>
  <p class="version">v1.0.0 &nbsp;·&nbsp; Mock Server &nbsp;·&nbsp; Port 5000</p>
  <button id="install-btn">📲 Installer l'application</button>
  <div class="grid">
    <div class="card"><span class="method post">POST</span><span class="path">/api/auth/login</span></div>
    <div class="card"><span class="method post">POST</span><span class="path">/api/auth/register</span></div>
    <div class="card"><span class="method get">GET</span><span class="path">/api/auth/simulations</span></div>
    <div class="card"><span class="method post">POST</span><span class="path">/api/simulation/recharge</span></div>
    <div class="card"><span class="method get">GET</span><span class="path">/api/simulation/tarifs</span></div>
    <div class="card"><span class="method post">POST</span><span class="path">/api/simulation/recommandation</span></div>
    <div class="card"><span class="method get">GET</span><span class="path">/api/consommation/kpis</span></div>
    <div class="card"><span class="method get">GET</span><span class="path">/api/consommation/evolution</span></div>
    <div class="card"><span class="method post">POST</span><span class="path">/api/ai/chat</span></div>
    <div class="card"><span class="method get">GET</span><span class="path">/api/health</span></div>
  </div>
  <p class="footer">© 2026 Woyofal Data Platform</p>
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault(); deferredPrompt = e;
      document.getElementById('install-btn').style.display = 'inline-block';
    });
    document.getElementById('install-btn').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') document.getElementById('install-btn').style.display = 'none';
      deferredPrompt = null;
    });
  </script>
</body>
</html>`;
    return respondHTML(res, html);
  }

  // ─── PWA Manifest ─────────────────────────────────────────────────────────
  if (pathname === '/manifest.json' && req.method === 'GET') {
    return respond(res, 200, {
      name: 'Woyofal API',
      short_name: 'Woyofal',
      description: 'Plateforme de simulation de recharge Sénelec',
      start_url: '/',
      display: 'standalone',
      background_color: '#1a1a2e',
      theme_color: '#1a1a2e',
      icons: [
        { src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>", sizes: '192x192', type: 'image/svg+xml' },
        { src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>", sizes: '512x512', type: 'image/svg+xml' }
      ]
    });
  }

  // ─── Service Worker ────────────────────────────────────────────────────────
  if (pathname === '/sw.js' && req.method === 'GET') {
    return respondRaw(res, 'application/javascript', `
const CACHE = 'woyofal-v1';
const ASSETS = ['/'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
    `.trim());
  }

  // 404
  return respond(res, 404, { error: 'Endpoint not found', path: pathname });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`✅ Mock API Server lancé sur port ${PORT}`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);
  console.log(`Endpoints disponibles:`);
  console.log(`  POST   /api/auth/login`);
  console.log(`  POST   /api/auth/register`);
  console.log(`  POST   /api/simulation/recharge`);
  console.log(`  GET    /api/simulation/tarifs`);
  console.log(`  POST   /api/simulation/recommandation`);
  console.log(`  GET    /api/consommation/kpis`);
  console.log(`  GET    /api/consommation/evolution`);
  console.log(`  POST   /api/ai/chat`);
  console.log(`  GET    /api/health\n`);
});
