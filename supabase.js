// ============================================================
// supabase.js — Configuration partagée MIB Prévention Platform
// À inclure en premier dans chaque page HTML :
// <script src="supabase.js"></script>
// ============================================================

// SDK Supabase (à inclure avant ce fichier dans le HTML) :
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

const SUPABASE_URL = 'https://ozfkmlokovxigfnwjeuk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96ZmttbG9rb3Z4aWdmbndqZXVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODUzODUsImV4cCI6MjA5MTE2MTM4NX0.zu5V20Nz7vO3dSYhOtr7mqS7VAMaUDVS2Ibs01xS9Fk';

// Client Supabase global — utilisé partout
// On réaffecte window.supabase pour éviter le conflit CDN
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: { eventsPerSecond: 10 }
  }
});

// ============================================================
// STORAGE — URLs publiques
// ============================================================
const STORAGE = {
  videos:    `${SUPABASE_URL}/storage/v1/object/public/videos`,
  photos:    `${SUPABASE_URL}/storage/v1/object/public/photos`,
  documents: `${SUPABASE_URL}/storage/v1/object/public/documents`,

  // Construire une URL complète depuis un chemin relatif
  url: (bucket, path) => `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`,

  // Uploader un fichier
  upload: async (bucket, path, file) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    if (error) throw error;
    return STORAGE.url(bucket, data.path);
  }
};

// ============================================================
// HELPERS — Requêtes Supabase simplifiées
// ============================================================
const DB = {

  // SELECT
  get: async (table, filters = {}) => {
    let query = supabase.from(table).select('*');
    Object.entries(filters).forEach(([col, val]) => {
      query = query.eq(col, val);
    });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // SELECT avec filtre avancé (fonction callback)
  query: async (table, builderFn) => {
    const base = supabase.from(table).select('*');
    const { data, error } = await builderFn(base);
    if (error) throw error;
    return data;
  },

  // INSERT
  insert: async (table, payload) => {
    const { data, error } = await supabase
      .from(table)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // UPDATE
  update: async (table, id, payload) => {
    const { data, error } = await supabase
      .from(table)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // UPDATE sans champ updated_at (tables sans ce champ)
  updateSimple: async (table, id, payload) => {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // DELETE
  delete: async (table, id) => {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // SELECT par ID
  getById: async (table, id) => {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
};

// ============================================================
// REALTIME — Remplace Firebase .on('value') et .on('child_added')
// ============================================================
const REALTIME = {

  // Écouter les changements sur une table filtrée par colonne
  // Remplace : db.ref('sessions/xxx').on('value', ...)
  subscribe: (channelName, table, filter, callback) => {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload) => callback(payload)
      )
      .subscribe();
    return channel; // garder la référence pour se désabonner
  },

  // Écouter uniquement les INSERT (équivalent child_added Firebase)
  subscribeInsert: (channelName, table, filter, callback) => {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter },
        (payload) => callback(payload.new)
      )
      .subscribe();
    return channel;
  },

  // Écouter uniquement les UPDATE
  subscribeUpdate: (channelName, table, filter, callback) => {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table, filter },
        (payload) => callback(payload.new, payload.old)
      )
      .subscribe();
    return channel;
  },

  // Broadcast — temps réel sans écriture en base
  // Idéal pour signalisation WebRTC (offer/answer/ICE)
  broadcast: (channelName) => {
    return supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });
  },

  // Se désabonner proprement
  // Remplace : ref.off() de Firebase
  unsubscribe: async (channel) => {
    if (channel) await supabase.removeChannel(channel);
  },

  // Se désabonner de tous les canaux
  unsubscribeAll: async () => {
    await supabase.removeAllChannels();
  }
};

// ============================================================
// SESSION — Gestion de l'état de connexion local
// ============================================================
const SESSION = {

  // Sauvegarder la session dans localStorage
  save: (key, data) => {
    localStorage.setItem(`mib_${key}`, JSON.stringify({
      ...data,
      savedAt: new Date().toISOString()
    }));
  },

  // Récupérer une session sauvegardée
  load: (key) => {
    try {
      const raw = localStorage.getItem(`mib_${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  // Supprimer une session
  clear: (key) => localStorage.removeItem(`mib_${key}`),

  // Supprimer toutes les sessions MIB
  clearAll: () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('mib_'))
      .forEach(k => localStorage.removeItem(k));
  }
};

// ============================================================
// UTILS — Fonctions partagées
// ============================================================
const UTILS = {

  // Générer un UUID
  uuid: () => crypto.randomUUID(),

  // Générer un numéro de session horodaté
  sessionNumber: () => {
    const now = new Date();
    return now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0')
      + String(now.getHours()).padStart(2, '0')
      + String(now.getMinutes()).padStart(2, '0')
      + String(now.getSeconds()).padStart(2, '0');
  },

  // Hasher un mot de passe / PIN avec SHA-256 (côté client)
  hash: async (text) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Mélanger un tableau
  shuffle: (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  // Formater une date en français
  dateStr: (date) => new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }),

  // Formater une durée en secondes → 'Xm Xs'
  duration: (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
};

// ============================================================
// MODULES — Vérifier si un module est actif pour un centre
// ============================================================
const MODULES = {
  check: (center, moduleName) => {
    if (!center) return false;
    return center[`module_${moduleName}`] === true;
  },

  // Noms des modules
  AUTOFORMATION:    'auto_entrainement',
  QUIZ_SALLE:       'quiz_salle',
  CHALLENGE_CUP:    'challenge_cup',
  SSI_SUPERVISE:    'ssi_supervise',
  SSI_AUTOFORMATION:'ssi_autoformation'
};

console.log('✅ MIB Prévention Platform — Supabase initialisé');
console.log(`📡 Projet : ${SUPABASE_URL}`);
