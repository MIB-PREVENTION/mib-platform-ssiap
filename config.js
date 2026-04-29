// ============================================================
// config.js — Configuration MIB Prévention Platform
// Source unique de vérité pour l'URL et la clé publique Supabase.
// À inclure AVANT supabase.js dans chaque page HTML :
//   <script src="config.js"></script>
//   <script src="supabase.js"></script>
//
// ⚠️ La clé "anon" est PUBLIQUE par design.
// Toute la sécurité repose sur les policies RLS côté Supabase.
// Voir RLS_AUDIT.md pour la check-list de sécurité.
// ============================================================

window.MIB_CONFIG = {
  SUPABASE_URL: 'https://ozfkmlokovxigfnwjeuk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96ZmttbG9rb3Z4aWdmbndqZXVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODUzODUsImV4cCI6MjA5MTE2MTM4NX0.zu5V20Nz7vO3dSYhOtr7mqS7VAMaUDVS2Ibs01xS9Fk'
};
