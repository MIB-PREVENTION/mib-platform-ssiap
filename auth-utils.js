// ============================================================
// auth-utils.js — Helpers UI partagés pour les pages de login
// À inclure après supabase.js dans les pages d'authentification.
// ============================================================

// Afficher un message d'erreur dans un élément donné.
function showErr(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

// Basculer la visibilité d'un champ password ↔ text.
function togglePwd(id) {
  const i = document.getElementById(id);
  if (!i) return;
  i.type = i.type === 'password' ? 'text' : 'password';
}

// Activer/désactiver un bouton avec spinner.
// labelId = id d'un span enfant ; sinon le bouton lui-même reçoit le HTML.
function setLoad(btnId, on, labelId) {
  const b = document.getElementById(btnId);
  if (!b) return;
  b.disabled = on;
  const target = labelId ? document.getElementById(labelId) : b;
  if (!target) return;
  if (on) {
    target.dataset.savedHtml = target.innerHTML;
    target.innerHTML = '<span class="spin"></span>';
  } else {
    const restore = target.dataset.savedHtml || target.getAttribute('data-label');
    if (restore) target.innerHTML = restore;
  }
}
