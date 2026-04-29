# Audit RLS Supabase — MIB Platform SSIAP

La clé `anon` étant publique (visible dans `config.js`), **toute la sécurité repose
sur les Row Level Security policies de la base Postgres**. Ce document liste les
tables exposées et les règles attendues.

## Tables utilisées par l'app

| Table | Lectures attendues | Écritures attendues |
|---|---|---|
| `centers` | login centre / formateur (par email + license) | update password_hash uniquement par le centre lui-même |
| `formateurs` | login PIN (read-only filtré par pin_hash) | aucune côté anon |
| `stagiaires` | login stagiaire | inscription contrôlée par formateur |
| `sessions_formation`, `session_participants` | formateur du centre | formateur du centre |
| `entrainement_sessions`, `entrainement_reponses` | stagiaire propriétaire | stagiaire propriétaire |
| `quiz_salle_*` (4 tables) | participants de la session | participants de la session |
| `challenge_*` (4 tables) | équipes inscrites | formateur du centre |
| `ssi_sessions`, `ssi_autoformation_sessions` | propriétaire | propriétaire |
| `questions`, `question_boites`, `contenus` | tous (lecture) | admin uniquement |
| `password_reset_requests` | demandeur (par token) | insert open, update token-only |
| `avis_retours` | propriétaire | insert open |
| `patrol_data` | rondier authentifié | rondier authentifié |

## Check-list à exécuter dans le SQL Editor Supabase

### 1. Vérifier que RLS est activé sur **toutes** les tables

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```
Toutes les lignes doivent avoir `rowsecurity = true`. Sinon :
```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.<table> FORCE ROW LEVEL SECURITY;
```

### 2. Lister toutes les policies existantes

```sql
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

### 3. Points critiques à vérifier table par table

- [ ] `centers.password_hash` : non lisible par `anon` (sinon brute-force possible).
  Préférer une RPC `verify_center_password(email, pwd_hash)` qui fait la
  comparaison côté serveur et ne renvoie que `true/false`.
- [ ] `formateurs.pin_hash` : idem — passer par RPC `find_formateur_by_pin(pin_hash)`.
- [ ] `stagiaires` : un stagiaire ne doit pas pouvoir lister les autres stagiaires.
- [ ] `password_reset_requests` : insert ouvert OK, mais la lecture doit exiger
  le token + statut `pending` + `expires_at > now()`.
- [ ] `questions` : si la base de questions est commerciale, ne JAMAIS laisser
  `SELECT *` ouvert à `anon` — restreindre aux centres avec licence active.
- [ ] Tables `quiz_salle_*`, `challenge_*` : restreindre sur `center_id` du
  formateur connecté.

### 4. Tester en tant qu'anon

```sql
-- Dans SQL Editor, simuler un appel anon
SET ROLE anon;
SELECT * FROM centers LIMIT 1;            -- doit échouer ou colonnes filtrées
SELECT password_hash FROM centers LIMIT 1; -- doit échouer absolument
SELECT * FROM questions LIMIT 1;           -- selon politique commerciale
RESET ROLE;
```

### 5. Lancer les advisors Supabase

Dans le dashboard : **Database → Advisors**. Corriger toutes les alertes de
type :
- "RLS Disabled in Public"
- "Policy Exists RLS Disabled"
- "Function Search Path Mutable"

## Recommandations structurelles

1. **Migrer les vérifications de mot de passe / PIN vers des RPC sécurisées**
   (`security definer`) plutôt que comparer le hash côté client.
2. **Activer la rotation de la clé anon** si la clé courante a été exposée
   publiquement (Settings → API → Reset).
3. **Ajouter un `expires_at` court** sur les sessions client (`SESSION.save`)
   et invalider côté serveur en cas de license_status ≠ 'active'.
4. **Auditer périodiquement** : ré-exécuter ce document tous les trimestres.
