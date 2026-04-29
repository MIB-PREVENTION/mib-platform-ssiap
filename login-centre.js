// ============================================================
// login-centre.js — Connexion centre via RPC sécurisées
// Les hashs et clés de licence ne sont jamais exposés côté anon :
//   - auth_centre              : login email + mot de passe
//   - init_centre_password     : première connexion (email + clé)
//   - request_password_reset   : demande de reset
//   - complete_password_reset  : reset via token
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

// ── CONNEXION NORMALE (RPC) ──
async function doLogin() {
  const email = document.getElementById('l-email').value.trim().toLowerCase();
  const pwd = document.getElementById('l-pwd').value;
  const errEl = document.getElementById('l-err'); errEl.classList.add('hidden');
  if (!email || !pwd) { showErr(errEl, '❌ Remplissez tous les champs.'); return; }
  setLoad('btn-login', true);
  try {
    const pwdHash = await UTILS.hash(pwd);
    const { data, error } = await supabase.rpc('auth_centre', {
      p_email: email,
      p_pwd_hash: pwdHash
    });
    if (error) throw error;
    if (!data || !data.length) throw new Error('invalid');

    const c = data[0];
    SESSION.save('centre', { center_id: c.id, center_nom: c.nom, plan: c.plan, role: 'centre' });
    window.location.href = 'center.html';
  } catch (e) {
    showErr(errEl, '❌ Email ou mot de passe incorrect, licence expirée, ou première connexion à effectuer.');
    setLoad('btn-login', false, 'Se connecter →');
  }
}

// ── PREMIÈRE CONNEXION (RPC) ──
async function doFirst() {
  const email = document.getElementById('f-email').value.trim().toLowerCase();
  const key = document.getElementById('f-key').value.trim().toUpperCase();
  const errEl = document.getElementById('f-err');
  const okEl = document.getElementById('f-ok');
  errEl.classList.add('hidden'); okEl.classList.add('hidden');

  if (!firstStepDone) {
    // Étape 1 : on garde l'utilisateur sur la page, on ne valide qu'à l'étape 2
    // (la RPC effectue la vérification + l'écriture en une transaction).
    if (!email || !key) { showErr(errEl, '❌ Remplissez tous les champs.'); return; }
    centerDataCache = { email, key };
    firstStepDone = true;
    document.getElementById('f-step2').classList.remove('hidden');
    document.getElementById('f-key').disabled = true;
    document.getElementById('f-email').disabled = true;
    document.getElementById('btn-first-label').textContent = 'Créer mon mot de passe →';
    return;
  }

  const pwd = document.getElementById('f-pwd').value;
  const pwd2 = document.getElementById('f-pwd2').value;
  if (pwd.length < 8) { showErr(errEl, '❌ Le mot de passe doit faire au moins 8 caractères.'); return; }
  if (pwd !== pwd2) { showErr(errEl, '❌ Les mots de passe ne correspondent pas.'); return; }
  setLoad('btn-first', true, 'btn-first-label');
  try {
    const hash = await UTILS.hash(pwd);
    const { data, error } = await supabase.rpc('init_centre_password', {
      p_email: centerDataCache.email,
      p_license_key: centerDataCache.key,
      p_pwd_hash: hash
    });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('password_already_set')) throw new Error('already');
      throw new Error('invalid');
    }
    if (!data || !data.length) throw new Error('invalid');
    const c = data[0];
    okEl.textContent = '✅ Mot de passe créé ! Connexion en cours...'; okEl.classList.remove('hidden');
    SESSION.save('centre', { center_id: c.id, center_nom: c.nom, plan: c.plan, role: 'centre' });
    setTimeout(() => window.location.href = 'center.html', 1500);
  } catch (e) {
    const msgs = {
      already: '⚠️ Un mot de passe existe déjà — utilisez la connexion normale.',
      invalid: '❌ Email ou clé de licence incorrects (ou licence expirée).'
    };
    showErr(errEl, msgs[e.message] || '❌ Erreur.');
    setLoad('btn-first', false, 'btn-first-label');
  }
}

// ── MOT DE PASSE OUBLIÉ (RPC) ──
async function doReset() {
  const email = document.getElementById('r-email').value.trim().toLowerCase();
  const errEl = document.getElementById('r-err');
  const okEl = document.getElementById('r-ok');
  errEl.classList.add('hidden'); okEl.classList.add('hidden');
  if (!email) { showErr(errEl, '❌ Entrez votre email.'); return; }
  setLoad('btn-reset', true);
  try {
    const { data, error } = await supabase.rpc('request_password_reset', { p_email: email });
    if (error) throw error;
    if (!data || !data.length) throw new Error('nf');
    const token = data[0].token;
    const base = window.location.origin + window.location.pathname;
    const resetUrl = `${base}?reset=${token}`;

    okEl.innerHTML = `✅ Si un compte existe pour cet email, un lien de réinitialisation a été généré :<br><br>
      <a href="${resetUrl}" style="color:#1d4ed8;word-break:break-all;font-size:.78rem;">${resetUrl}</a><br><br>
      <button onclick="navigator.clipboard.writeText('${resetUrl}').then(()=>alert('Copié !'))"
        style="background:#1d4ed8;color:#fff;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:.78rem;font-weight:700;margin-top:6px;">
        📋 Copier le lien
      </button><br><br>
      <small style="color:#6b7280;">Ouvrez ce lien dans votre navigateur pour choisir un nouveau mot de passe. Valable 24h.</small>`;
    okEl.classList.remove('hidden');
    document.getElementById('btn-reset').disabled = true;
  } catch (e) {
    showErr(errEl, '❌ Erreur lors de la demande.');
    setLoad('btn-reset', false);
    document.getElementById('btn-reset').textContent = 'Demander un reset →';
  }
}

// ── RESET AVEC TOKEN (RPC) ──
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
    const hash = await UTILS.hash(pwd);
    const { data, error } = await supabase.rpc('complete_password_reset', {
      p_token: resetToken,
      p_pwd_hash: hash
    });
    if (error || !data) throw new Error('invalid');
    okEl.textContent = '✅ Mot de passe réinitialisé ! Redirection...'; okEl.classList.remove('hidden');
    setTimeout(() => switchTab('login'), 2000);
  } catch (e) {
    showErr(errEl, '❌ Lien invalide ou expiré. Faites une nouvelle demande.');
    setLoad('btn-token', false, 'Enregistrer →');
  }
}
