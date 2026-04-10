// ============================================================
// statistiques.js — Module graphiques MIB Prévention
// Utilise Chart.js (chargé via CDN dans le HTML)
// <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
// <script src="statistiques.js"></script>
// ============================================================

const STATS = {

  // Couleurs MIB
  colors: {
    blue:   { bg: 'rgba(37,99,235,.15)',   border: '#2563eb' },
    green:  { bg: 'rgba(16,185,129,.15)',  border: '#10b981' },
    red:    { bg: 'rgba(239,68,68,.15)',   border: '#ef4444' },
    orange: { bg: 'rgba(245,158,11,.15)',  border: '#f59e0b' },
    purple: { bg: 'rgba(124,58,237,.15)',  border: '#7c3aed' },
    teal:   { bg: 'rgba(13,148,136,.15)',  border: '#0d9488' },
  },

  // Defaults Chart.js
  defaults() {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#6b7280';
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.plugins.legend.labels.padding = 16;
  },

  // Détruire un chart existant avant d'en créer un nouveau
  destroy(id) {
    const existing = Chart.getChart(id);
    if (existing) existing.destroy();
  },

  // ── 1. Sessions par mois (line chart) ──
  sessionsParMois(canvasId, data) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Sessions Quiz Salle',
          data: data.quiz,
          borderColor: this.colors.purple.border,
          backgroundColor: this.colors.purple.bg,
          fill: true, tension: .4, pointRadius: 4,
        },{
          label: 'Challenge Cup',
          data: data.challenge,
          borderColor: this.colors.orange.border,
          backgroundColor: this.colors.orange.bg,
          fill: true, tension: .4, pointRadius: 4,
        },{
          label: 'SSI',
          data: data.ssi,
          borderColor: this.colors.red.border,
          backgroundColor: this.colors.red.bg,
          fill: true, tension: .4, pointRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  // ── 2. Répartition modules (doughnut) ──
  repartitionModules(canvasId, data) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Quiz Auto', 'Quiz Salle', 'Challenge Cup', 'SSI Supervisé', 'SSI Auto'],
        datasets: [{
          data: [data.auto, data.quiz, data.challenge, data.ssi, data.ssi_auto],
          backgroundColor: [
            this.colors.blue.border,
            this.colors.purple.border,
            this.colors.orange.border,
            this.colors.red.border,
            this.colors.teal.border,
          ],
          borderWidth: 0,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '65%',
        plugins: { legend: { position: 'right' } }
      }
    });
  },

  // ── 3. Score moyen par niveau (bar chart) ──
  scoreParNiveau(canvasId, data) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['SSIAP 1', 'SSIAP 2', 'SSIAP 3'],
        datasets: [{
          label: 'Score moyen (%)',
          data: [data.ssiap1, data.ssiap2, data.ssiap3],
          backgroundColor: [
            this.colors.blue.border,
            this.colors.purple.border,
            this.colors.orange.border,
          ],
          borderRadius: 10,
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(0,0,0,.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  // ── 4. Progression stagiaires (line — formateur) ──
  progressionStagiaires(canvasId, datasets) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    const palette = Object.values(this.colors);
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: datasets.labels,
        datasets: datasets.stagiaires.map((s, i) => ({
          label: s.nom,
          data: s.scores,
          borderColor: palette[i % palette.length].border,
          backgroundColor: palette[i % palette.length].bg,
          fill: false, tension: .4, pointRadius: 4,
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(0,0,0,.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  // ── 5. Taux de réussite par thème (radar) ──
  reussiteParTheme(canvasId, data) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    return new Chart(ctx, {
      type: 'radar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Taux de réussite',
          data: data.values,
          borderColor: this.colors.blue.border,
          backgroundColor: this.colors.blue.bg,
          pointBackgroundColor: this.colors.blue.border,
          pointRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            beginAtZero: true, max: 100,
            ticks: { stepSize: 25, callback: v => v + '%' },
            grid: { color: 'rgba(0,0,0,.07)' },
            pointLabels: { font: { size: 11 } }
          }
        }
      }
    });
  },

  // ── 6. Activité hebdomadaire (bar horizontal) ──
  activiteHebdo(canvasId, data) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        datasets: [{
          label: 'Sessions',
          data: data.sessions,
          backgroundColor: this.colors.green.border,
          borderRadius: 8, borderWidth: 0,
        },{
          label: 'Entraînements',
          data: data.entrainements,
          backgroundColor: this.colors.blue.border,
          borderRadius: 8, borderWidth: 0,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  // ============================================================
  // CHARGEMENT DONNÉES — CENTRE
  // ============================================================
  async loadCentreStats(centerId) {
    const now = new Date();
    const months = [];
    const labels = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d);
      labels.push(d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }));
    }

    const quiz = [], challenge = [], ssi = [];
    let totalAuto = 0, totalQuiz = 0, totalChallenge = 0, totalSsi = 0, totalSsiAuto = 0;
    const scoresByNiveau = { SSIAP1: [], SSIAP2: [], SSIAP3: [] };
    const sessions7days = [0,0,0,0,0,0,0];
    const entrainements7days = [0,0,0,0,0,0,0];

    try {
      // Sessions par mois
      for (const d of months) {
        const start = d.toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
        const [{ count: q }, { count: c }, { count: s }] = await Promise.all([
          supabase.from('quiz_salle_sessions').select('*', { count: 'exact', head: true }).eq('center_id', centerId).gte('created_at', start).lt('created_at', end),
          supabase.from('challenge_sessions').select('*', { count: 'exact', head: true }).eq('center_id', centerId).gte('created_at', start).lt('created_at', end),
          supabase.from('ssi_sessions').select('*', { count: 'exact', head: true }).eq('center_id', centerId).gte('created_at', start).lt('created_at', end),
        ]);
        quiz.push(q ?? 0);
        challenge.push(c ?? 0);
        ssi.push(s ?? 0);
        totalQuiz += (q ?? 0);
        totalChallenge += (c ?? 0);
        totalSsi += (s ?? 0);
      }

      // Auto-entraînements
      const { count: auto } = await supabase.from('entrainement_sessions').select('*', { count: 'exact', head: true }).eq('center_id', centerId);
      totalAuto = auto ?? 0;

      // Scores par niveau
      const { data: entrSessions } = await supabase.from('entrainement_sessions').select('niveau, score, max_score').eq('center_id', centerId).eq('status', 'terminee').not('max_score', 'is', null);
      (entrSessions || []).forEach(s => {
        if (s.max_score > 0 && scoresByNiveau[s.niveau]) {
          scoresByNiveau[s.niveau].push(Math.round(s.score / s.max_score * 100));
        }
      });

      // Activité 7 derniers jours
      const sept = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
      const { data: recentQ } = await supabase.from('quiz_salle_sessions').select('created_at').eq('center_id', centerId).gte('created_at', sept);
      const { data: recentE } = await supabase.from('entrainement_sessions').select('started_at').eq('center_id', centerId).gte('started_at', sept);
      (recentQ || []).forEach(s => { const d = new Date(s.created_at).getDay(); sessions7days[(d + 6) % 7]++; });
      (recentE || []).forEach(s => { const d = new Date(s.started_at).getDay(); entrainements7days[(d + 6) % 7]++; });

    } catch (e) { console.error('Stats centre:', e); }

    const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    return {
      sessionsParMois: { labels, quiz, challenge, ssi },
      repartitionModules: { auto: totalAuto, quiz: totalQuiz, challenge: totalChallenge, ssi: totalSsi, ssi_auto: totalSsiAuto },
      scoreParNiveau: { ssiap1: avg(scoresByNiveau.SSIAP1), ssiap2: avg(scoresByNiveau.SSIAP2), ssiap3: avg(scoresByNiveau.SSIAP3) },
      activiteHebdo: { sessions: sessions7days, entrainements: entrainements7days },
    };
  },

  // ============================================================
  // CHARGEMENT DONNÉES — FORMATEUR
  // ============================================================
  async loadFormateurStats(formateurId, centerId) {
    const now = new Date();
    const months = [];
    const labels = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d);
      labels.push(d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }));
    }

    const quiz = [], challenge = [], ssi = [];
    const sessions7 = [0,0,0,0,0,0,0];
    const entr7 = [0,0,0,0,0,0,0];
    const scoresByNiveau = { SSIAP1: [], SSIAP2: [], SSIAP3: [] };
    let stagData = { labels: [], stagiaires: [] };
    const themeLabels = ['Le Feu', 'ERP & IGH', 'Moyens secours', 'Évacuation'];
    const themeScores = [0, 0, 0, 0];

    try {
      // Sessions par mois
      for (const d of months) {
        const start = d.toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
        const [{ count: q }, { count: c }, { count: s }] = await Promise.all([
          supabase.from('quiz_salle_sessions').select('*', { count: 'exact', head: true }).eq('formateur_id', formateurId).gte('created_at', start).lt('created_at', end),
          supabase.from('challenge_sessions').select('*', { count: 'exact', head: true }).eq('formateur_id', formateurId).gte('created_at', start).lt('created_at', end),
          supabase.from('ssi_sessions').select('*', { count: 'exact', head: true }).eq('formateur_id', formateurId).gte('created_at', start).lt('created_at', end),
        ]);
        quiz.push(q ?? 0); challenge.push(c ?? 0); ssi.push(s ?? 0);
      }

      // Scores par niveau (depuis les entrainements du centre)
      const { data: entrSessions } = await supabase.from('entrainement_sessions').select('niveau, score, max_score').eq('center_id', centerId).eq('status', 'terminee');
      (entrSessions || []).forEach(s => {
        if (s.max_score > 0 && scoresByNiveau[s.niveau]) {
          scoresByNiveau[s.niveau].push(Math.round(s.score / s.max_score * 100));
        }
      });

      // Activité 7 jours
      const sept = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
      const { data: rQ } = await supabase.from('quiz_salle_sessions').select('created_at').eq('formateur_id', formateurId).gte('created_at', sept);
      (rQ || []).forEach(s => { const d = new Date(s.created_at).getDay(); sessions7[(d + 6) % 7]++; });

      // Top 5 stagiaires progression
      const { data: stags } = await supabase.from('stagiaires').select('id, nom, prenom').eq('center_id', centerId).eq('actif', true).limit(5);
      if (stags?.length) {
        const monthLabels = labels;
        const stagDatasets = [];
        for (const s of stags) {
          const monthScores = [];
          for (const d of months) {
            const start = d.toISOString();
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
            const { data: ses } = await supabase.from('entrainement_sessions').select('score, max_score').eq('stagiaire_id', s.id).eq('status', 'terminee').gte('started_at', start).lt('started_at', end);
            const moy = ses?.filter(x => x.max_score > 0).length ? Math.round(ses.filter(x => x.max_score > 0).reduce((a, x) => a + x.score / x.max_score * 100, 0) / ses.filter(x => x.max_score > 0).length) : null;
            monthScores.push(moy);
          }
          stagDatasets.push({ nom: `${s.prenom} ${s.nom.charAt(0)}.`, scores: monthScores });
        }
        stagData = { labels: monthLabels, stagiaires: stagDatasets };
      }

    } catch (e) { console.error('Stats formateur:', e); }

    const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    return {
      sessionsParMois: { labels, quiz, challenge, ssi },
      scoreParNiveau: { ssiap1: avg(scoresByNiveau.SSIAP1), ssiap2: avg(scoresByNiveau.SSIAP2), ssiap3: avg(scoresByNiveau.SSIAP3) },
      activiteHebdo: { sessions: sessions7, entrainements: entr7 },
      progressionStagiaires: stagData,
      reussiteParTheme: { labels: themeLabels, values: themeScores },
    };
  },

  // ============================================================
  // RENDER — CENTRE
  // ============================================================
  async renderCentre(centerId) {
    const el = document.getElementById('stats-loading');
    if (el) el.style.display = 'flex';
    try {
      const data = await this.loadCentreStats(centerId);
      this.defaults();
      this.sessionsParMois('chart-sessions-mois', data.sessionsParMois);
      this.repartitionModules('chart-modules', data.repartitionModules);
      this.scoreParNiveau('chart-score-niveau', data.scoreParNiveau);
      this.activiteHebdo('chart-activite-hebdo', data.activiteHebdo);
    } catch (e) { console.error(e); }
    finally { if (el) el.style.display = 'none'; }
  },

  // ============================================================
  // RENDER — FORMATEUR noveau
  // ============================================================
  async renderFormateur(formateurId, centerId) {
    const el = document.getElementById('stats-loading');
    if (el) el.style.display = 'flex';
    try {
      const data = await this.loadFormateurStats(formateurId, centerId);
      this.defaults();
      this.sessionsParMois('chart-sessions-mois', data.sessionsParMois);
      this.scoreParNiveau('chart-score-niveau', data.scoreParNiveau);
      this.activiteHebdo('chart-activite-hebdo', data.activiteHebdo);
      if (data.progressionStagiaires?.stagiaires?.length) {
        this.progressionStagiaires('chart-progression', data.progressionStagiaires);
      }
      if (data.reussiteParTheme?.labels?.length) {
        this.reussiteParTheme('chart-themes', data.reussiteParTheme);
      }
    } catch (e) { console.error(e); }
    finally { if (el) el.style.display = 'none'; }
  }
};
