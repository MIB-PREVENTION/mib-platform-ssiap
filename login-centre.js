// ============================================================
// login-centre.js — Logique de connexion centre (email + mot de passe)
// Extrait de login-centre.html.
// Dépend de : config.js, supabase.js, auth-utils.js.
// ============================================================

let firstStepDone = false;
let centerDataCache = null;
let resetToken = null;

// ── ONGLETS ──
function switchTab(t) {
  ['login', 'first', 'reset', 'token'].forEach(id => {
    document.getElementById(`p-${id}`).classList.remove('show');
    document.getElementById(`p-${id}`).style.display = 'none';
  });
  document.getElementById(`p-${t}`).style.display = 'block';
  setTimeout(() => document.getElementById(`p-${t}`).classList.add('show'), 10);
  ['login', 'first'].forEach(id => {
    const btn = document.getElementById(`tab-${id}`); if (!btn) return;
    const on = (id === t) || (t === 'reset' && id === 'login');
    btn.style.background = on ? '#fff' : 'transparent';
    btn.style.color = on ? '#1d4ed8' : '#9ca3af';
    btn.style.boxShadow = on ? '2px 2px 6px rgba(100,116,139,.15)' : 'none';
  });
}
switchTab('login');

window.addEventListener('DOMContentLoaded', () => {
  SESSION.clear('centre');
  const p = new URLSearchParams(window.location.search);
  const token = p.get('reset');
  if (token) { resetToken = token; switchTab('token'); }
});

// ── CONNEXION NORMALE ──
async function doLogin() {
  const email = document.getElementById('l-email').value.trim().toLowerCase();
  const pwd = document.getElementById('l-pwd').value;
  const errEl = document.getElementById('l-err'); errEl.classList.add('hidden');
  if (!email || !pwd) { showErr(errEl, '❌ Remplissez tous les champs.'); return; }
  setLoad('btn-login', true);
  try {
    const { data, error } = await supabase.from('centers').select('*').eq('email', email).eq('license_status', 'active').single();
    if (error || !data) throw new Error('notfound');
    if (!data.password_set) throw new Error('nopwd');
    if (data.license_expires_at && new Date(data.license_expires_at) < new Date()) throw new Error('expired');
    const pwdHash = await UTILS.hash(pwd);
    if (pwdHash !== data.password_hash) throw new Error('badpwd');
    SESSION.save('centre', { center_id: data.id, center_nom: data.nom, plan: data.plan, role: 'centre' });
    window.location.href = 'center.html';
  } catch (e) {
    const msgs = {
      notfound: '❌ Email introuvable.',
      nopwd: '⚠️ Première connexion — utilisez l\'onglet "Première fois".',
      expired: '❌ Licence expirée. Contactez MIB Prévention.',
      badpwd: '❌ Mot de passe incorrect.'
    };
    showErr(errEl, msgs[e.message] || '❌ Erreur de connexion.');
    setLoad('btn-login', false, 'Se connecter →');
  }
}

// ── PREMIÈRE CONNEXION ──
async function doFirst() {
  const email = document.getElementById('f-email').value.trim().toLowerCase();
  const key = document.getElementById('f-key').value.trim().toUpperCase();
  const errEl = document.getElementById('f-err');
  const okEl = document.getElementById('f-ok');
  errEl.classList.add('hidden'); okEl.classList.add('hidden');

  if (!firstStepDone) {
    if (!email || !key) { showErr(errEl, '❌ Remplissez tous les champs.'); return; }
    setLoad('btn-first', true, 'btn-first-label');
    try {
      const { data, error } = await supabase.from('centers').select('*').eq('email', email).eq('license_key', key).eq('license_status', 'active').single();
      if (error || !data) throw new Error('nf');
      if (data.license_expires_at && new Date(data.license_expires_at) < new Date()) throw new Error('exp');
      if (data.password_set) throw new Error('already');
      centerDataCache = data;
      firstStepDone = true;
      document.getElementById('f-step2').classList.remove('hidden');
      document.getElementById('f-key').disabled = true;
      document.getElementById('f-email').disabled = true;
      document.getElementById('btn-first-label').textContent = 'Créer mon mot de passe →';
      setLoad('btn-first', false, 'btn-first-label');
    } catch (e) {
      const msgs = {
        nf: '❌ Email ou clé de licence incorrects.',
        exp: '❌ Licence expirée.',
        already: '⚠️ Un mot de passe existe déjà — utilisez la connexion normale.'
      };
      showErr(errEl, msgs[e.message] || '❌ Erreur.');
      setLoad('btn-first', false, 'btn-first-label');
    }
  } else {
    const pwd = document.getElementById('f-pwd').value;
    const pwd2 = document.getElementById('f-pwd2').value;
    if (pwd.length < 8) { showErr(errEl, '❌ Le mot de passe doit faire au moins 8 caractères.'); return; }
    if (pwd !== pwd2) { showErr(errEl, '❌ Les mots de passe ne correspondent pas.'); return; }
    setLoad('btn-first', true, 'btn-first-label');
    try {
      const hash = await UTILS.hash(pwd);
      const { error } = await supabase.from('centers').update({ password_hash: hash, password_set: true }).eq('id', centerDataCache.id);
      if (error) throw error;
      okEl.textContent = '✅ Mot de passe créé ! Connexion en cours...'; okEl.classList.remove('hidden');
      SESSION.save('centre', { center_id: centerDataCache.id, center_nom: centerDataCache.nom, plan: centerDataCache.plan, role: 'centre' });
      setTimeout(() => window.location.href = 'center.html', 1500);
    } catch (e) {
      showErr(errEl, '❌ Erreur lors de la création : ' + e.message);
      setLoad('btn-first', false, 'btn-first-label');
    }
  }
}

// ── MOT DE PASSE OUBLIÉ ──
async function doReset() {
  const email = document.getElementById('r-email').value.trim().toLowerCase();
  const errEl = document.getElementById('r-err');
  const okEl = document.getElementById('r-ok');
  errEl.classList.add('hidden'); okEl.classList.add('hidden');
  if (!email) { showErr(errEl, '❌ Entrez votre email.'); return; }
  setLoad('btn-reset', true);
  try {
    const { data } = await supabase.from('centers').select('id,nom').eq('email', email).single();
    if (!data) throw new Error('nf');

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('password_reset_requests').insert({
      center_id: data.id, email, status: 'pending',
      token, expires_at: expiresAt
    });

    const base = window.location.origin + window.location.pathname;
    const resetUrl = `${base}?reset=${token}`;

    okEl.innerHTML = `✅ Lien de réinitialisation généré :<br><br>
      <a href="${resetUrl}" style="color:#1d4ed8;word-break:break-all;font-size:.78rem;">${resetUrl}</a><br><br>
      <button onclick="navigator.clipboard.writeText('${resetUrl}').then(()=>alert('Copié !'))"
        style="background:#1d4ed8;color:#fff;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:.78rem;font-weight:700;margin-top:6px;">
        📋 Copier le lien
      </button><br><br>
      <small style="color:#6b7280;">Ouvrez ce lien dans votre navigateur pour choisir un nouveau mot de passe. Valable 24h.</small>`;
    okEl.classList.remove('hidden');
    document.getElementById('btn-reset').disabled = true;
  } catch (e) {
    showErr(errEl, e.message === 'nf' ? '❌ Email introuvable.' : '❌ Erreur lors de la demande.');
    setLoad('btn-reset', false);
    document.getElementById('btn-reset').textContent = 'Demander un reset →';
  }
}

// ── RESET AVEC TOKEN ──
async function doTokenReset() {
  const pwd = document.getElementById('t-pwd').value;
  const pwd2 = document.getElementById('t-pwd2').value;
  const errEl = document.getElementById('t-err');
  const okEl = document.getElementById('t-ok');
  errEl.classList.add('hidden'); okEl.classList.add('hidden');
  if (pwd.length < 8) { showErr(errEl, '❌ Au moins 8 caractères.'); return; }
  if (pwd !== pwd2) { showErr(errEl, '❌ Les mots de passe ne correspondent pas.'); return; }
  setLoad('btn-token', true);
  try {
    const { data: req } = await supabase.from('password_reset_requests')
      .select('*').eq('token', resetToken).eq('status', 'pending')
      .gt('expires_at', new Date().toISOString()).single();
    if (!req) throw new Error('invalid');
    const hash = await UTILS.hash(pwd);
    await supabase.from('centers').update({ password_hash: hash }).eq('id', req.center_id);
    await supabase.from('password_reset_requests').update({ status: 'done' }).eq('id', req.id);
    okEl.textContent = '✅ Mot de passe réinitialisé ! Redirection...'; okEl.classList.remove('hidden');
    setTimeout(() => switchTab('login'), 2000);
  } catch (e) {
    showErr(errEl, '❌ Lien invalide ou expiré. Faites une nouvelle demande.');
    setLoad('btn-token', false, 'Enregistrer →');
  }
}
