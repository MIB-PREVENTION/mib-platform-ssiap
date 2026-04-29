// ============================================================
// login-formateur.js — Logique de connexion formateur (PIN 6 chiffres)
// Extrait de login-formateur.html.
// Dépend de : config.js, supabase.js (SESSION, UTILS, supabase global).
// ============================================================

// ── ÉTAT ──
let pin = [];
let pinHash = null;
let foundFormateurs = []; // formateurs trouvés avec ce PIN
let selectedFormateur = null;

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
  // Vider la session — login obligatoire
  SESSION.clear('formateur');

  // Pré-remplir centre si QR code
  const p = new URLSearchParams(window.location.search);
  window.preCentreId = p.get('center') || null;
});

// ── PAVÉ NUMÉRIQUE ──
function kp(d) { if (pin.length >= 6) return; pin.push(d); updatePin(); }
function kd() { if (!pin.length) return; pin.pop(); updatePin(); }

function updatePin() {
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById(`pd-${i}`);
    if (pin[i] !== undefined) {
      el.textContent = '●'; el.classList.add('filled'); el.classList.remove('active');
    } else {
      el.textContent = '—'; el.classList.remove('filled', 'active');
    }
  }
  if (pin.length < 6) document.getElementById(`pd-${pin.length}`)?.classList.add('active');
  document.getElementById('key-ok').disabled = pin.length !== 6;
}

// Clavier physique
document.addEventListener('keydown', e => {
  if (e.key >= '0' && e.key <= '9') kp(e.key);
  else if (e.key === 'Backspace') kd();
  else if (e.key === 'Enter' && pin.length === 6) verifyPin();
});

// ── VÉRIFICATION PIN ──
async function verifyPin() {
  if (pin.length !== 6) return;
  const errEl = document.getElementById('pin-err');
  errEl.classList.add('hidden');
  document.getElementById('pin-loading').classList.remove('hidden');
  document.getElementById('key-ok').disabled = true;

  try {
    pinHash = await UTILS.hash(pin.join(''));

    let query = supabase.from('formateurs')
      .select('*, centers(id, nom, plan, module_auto_entrainement, module_quiz_salle, module_challenge_cup, module_ssi_supervise, module_ssi_autoformation)')
      .eq('pin_hash', pinHash)
      .eq('actif', true);

    if (window.preCentreId) {
      query = query.eq('center_id', window.preCentreId);
    }

    const { data, error } = await query;
    if (error || !data || !data.length) throw new Error('notfound');

    foundFormateurs = data;
    document.getElementById('pin-loading').classList.add('hidden');

    if (data.length === 1) {
      doLogin(data[0]);
    } else {
      showCentreStep(data);
    }
  } catch (e) {
    document.getElementById('pin-loading').classList.add('hidden');
    errEl.textContent = '❌ PIN incorrect ou compte désactivé.';
    errEl.classList.remove('hidden');
    pin = []; updatePin();
    document.getElementById('key-ok').disabled = true;
  }
}

// ── AFFICHER ÉTAPE 2 ──
function showCentreStep(formateurs) {
  document.getElementById('step-pin').classList.add('hidden');
  document.getElementById('step-centre').classList.remove('hidden');
  document.getElementById('dot-1').classList.remove('active');
  document.getElementById('dot-2').classList.add('active');

  const nom = formateurs[0].prenom + ' ' + formateurs[0].nom;
  document.getElementById('step2-subtitle').textContent = `Bonjour ${nom} ! Choisissez votre centre :`;

  const list = document.getElementById('centres-list');
  list.innerHTML = formateurs.map((f, i) => `
    <div class="centre-item" id="centre-item-${i}" onclick="selectCentre(${i})">
      <div class="centre-icon">🏢</div>
      <div>
        <div style="font-weight:700;font-size:.9rem;color:#111827;">${f.centers?.nom || '—'}</div>
        <div style="font-size:.72rem;color:#6b7280;margin-top:2px;">Plan ${f.centers?.plan || '—'} · ${f.role}</div>
      </div>
    </div>`).join('');
}

// ── SÉLECTIONNER CENTRE ──
function selectCentre(idx) {
  selectedFormateur = foundFormateurs[idx];
  document.querySelectorAll('.centre-item').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
  });
  document.getElementById('btn-confirm').disabled = false;
}

// ── CONFIRMER ──
async function confirmCentre() {
  if (!selectedFormateur) return;
  const btnEl = document.getElementById('btn-confirm');
  btnEl.disabled = true;
  document.getElementById('btn-confirm-label').innerHTML = '<span class="spin"></span>';
  document.getElementById('centre-err').classList.add('hidden');
  doLogin(selectedFormateur);
}

// ── LOGIN FINAL ──
function doLogin(formateur) {
  SESSION.save('formateur', {
    formateur_id: formateur.id,
    formateur_nom: `${formateur.prenom} ${formateur.nom}`,
    center_id: formateur.center_id,
    center_nom: formateur.centers?.nom || '',
    role_formateur: formateur.role,
    modules: formateur.centers || {}
  });
  window.location.href = 'formateur.html';
}

// ── RETOUR ──
function backToPin() {
  document.getElementById('step-centre').classList.add('hidden');
  document.getElementById('step-pin').classList.remove('hidden');
  document.getElementById('dot-1').classList.add('active');
  document.getElementById('dot-2').classList.remove('active');
  document.getElementById('centres-list').innerHTML = '';
  document.getElementById('btn-confirm').disabled = true;
  selectedFormateur = null;
  pin = []; updatePin();
}
