# Conformité RGPD & sécurité — MIB Plateforme

**Échéance**: dossier complet pour septembre 2026 (clients OIV / EDF).
**Responsable**: à désigner (DPO ou référent RGPD).

## 1. Statut RGPD

### 1.1 Rôles
- **Responsable de traitement** : MIB Prévention (l'éditeur)
- **Sous-traitants** :
  - Aujourd'hui : Supabase Inc (US, AWS Frankfurt) ⚠️ CLOUD Act
  - Cible : Scaleway SAS ou OVHcloud SAS (FR)

### 1.2 Données personnelles traitées

| Catégorie | Exemples | Base légale | Durée |
|---|---|---|---|
| Identité formateur | nom, prénom, email, PIN hashé | Exécution contrat | Durée contrat + 3 ans |
| Identité stagiaire | nom, prénom, email, photo | Exécution contrat | Durée contrat + 3 ans |
| Données de formation | scores, sessions, émargements | Obligation légale (SSIAP) | 5 ans (réglementation) |
| Logs techniques | IP, user-agent, timestamps | Intérêt légitime (sécu) | 12 mois |
| Cookies | session locale | Stricte nécessité | session navigateur |

### 1.3 Documents à produire / maintenir

- [ ] **Registre des traitements** (art. 30 RGPD) — modèle CNIL
- [ ] **Politique de confidentialité** publique (sur le site)
- [ ] **Mentions légales** (hébergeur, éditeur, contact RGPD)
- [ ] **DPA signé** avec chaque sous-traitant (Supabase aujourd'hui, Scaleway demain)
- [ ] **Liste des sous-traitants** publique et tenue à jour
- [ ] **PIA** (analyse d'impact) si traitement à risque — à évaluer
- [ ] **Procédure d'exercice des droits** (accès, rectif, suppression, portabilité)
- [ ] **Procédure de notification d'incident** (CNIL sous 72h)

## 2. Sécurité — exigences EDF / OIV

### 2.1 Exigences techniques attendues

- [x] HTTPS/TLS partout
- [ ] **Hashs de mots de passe non lisibles côté `anon`** → corrigé en Phase 1
- [ ] **PINs non lisibles côté `anon`** → corrigé en Phase 1
- [ ] **Audit logs** des accès admin (à ajouter)
- [ ] **MFA** sur les comptes admin (à évaluer)
- [ ] **Rotation des secrets** documentée
- [ ] **Sauvegardes chiffrées** quotidiennes, testées mensuellement
- [ ] **Plan de reprise** documenté (RTO < 4h, RPO < 1h cible)
- [ ] **Pen-test** annuel par tiers

### 2.2 Exigences contractuelles attendues (questionnaire EDF type)

- [ ] Données stockées **physiquement en France**
- [ ] Aucun transfert hors UE sans clauses contractuelles types
- [ ] **Droit d'audit** du fournisseur sur le sous-traitant
- [ ] **Réversibilité** : export complet en format ouvert sous 30 j
- [ ] **Notification incident** sous 24–72h selon gravité
- [ ] **Liste des sous-traitants** validée par EDF
- [ ] **Pas de juridiction extra-UE** (CLOUD Act, FISA)
- [ ] **Effacement à la fin du contrat** avec attestation

### 2.3 Certifications cibles

| Niveau | Quand | Coût indicatif |
|---|---|---|
| **ISO 27001** (héritée hébergeur) | Inclus avec Scaleway / OVH | 0 |
| **HDS** (héritée hébergeur) | Si données santé un jour | 0 (côté hébergeur) |
| **ISO 27001 propre** (audit MIB) | Au-delà de 5 clients OIV | 15–30 k€ initial + 5 k€/an |
| **SecNumCloud** (qualif ANSSI) | Si appel d'offres État | 50 k€+ |

## 3. Mesures techniques en cours / à venir

### 3.1 Phase 1 — Sécurité urgente (Mai 2026)
- [x] Migration `migrations/001_rls_phase1.sql` créée
- [ ] Migration appliquée en prod (après tests)
- [ ] Code client (login JS) mis à jour pour utiliser les RPC
- [ ] Vérification post-migration : `SELECT password_hash FROM centers` échoue côté `anon`

### 3.2 Phase 2 — Durcissement RLS (Juin 2026)
- [ ] Policies fines par `center_id` sur toutes les tables (sessions, quiz, challenge…)
- [ ] Suppression des policies `anon_all qual:true` restantes
- [ ] Activation Supabase Auth (au lieu de l'auth maison) pour bénéficier de `auth.uid()`
- [ ] Logs d'audit DB (extension `pgaudit` ou table custom)

### 3.3 Phase 3 — Migration souveraine (Juillet–Septembre 2026)
- [ ] POC Scaleway / OVH validé
- [ ] Migration des projets
- [ ] DPA signé avec hébergeur français
- [ ] Mise à jour mentions légales + politique confidentialité

## 4. Procédure d'incident

### 4.1 Notification
- **Interne** : alerte responsable technique sous 1h
- **CNIL** : sous 72h (formulaire en ligne) si risque pour les personnes
- **Personnes concernées** : sous 72h si risque élevé

### 4.2 Logs à conserver
- Date / heure de détection
- Date / heure de l'incident
- Nature des données impactées
- Volume estimé
- Mesures correctives prises
- Notification effectuée

## 5. Templates à rédiger

À placer dans `/legal/` lors de la prochaine itération :

- [ ] `legal/mentions-legales.html`
- [ ] `legal/politique-confidentialite.html`
- [ ] `legal/cookies.html` (si applicable — actuellement on n'utilise que localStorage)
- [ ] `legal/cgu.html` (centre + formateur + stagiaire)
- [ ] `legal/registre-traitements.md` (interne)
- [ ] `legal/pssi.md` (politique de sécurité — interne, à présenter aux clients)

## 6. Check-list "prêt pour audit EDF"

À cocher avant la 1ère réunion sécurité avec un client OIV :

- [ ] Hébergement français confirmé (DPA signé)
- [ ] Phase 1 RLS appliquée et vérifiée
- [ ] PSSI rédigée et versionnée
- [ ] Registre des traitements à jour
- [ ] Politique de confidentialité publique
- [ ] Plan de continuité documenté
- [ ] Backups quotidiens testés (drill de restore < 30 j)
- [ ] Procédure incident formalisée
- [ ] Liste sous-traitants à jour
- [ ] Pen-test < 12 mois (si possible)
- [ ] Architecture cible (`ARCHITECTURE_CIBLE.md`) à présenter

## 7. Références

- CNIL — modèle de registre : https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement
- ANSSI — guide d'hygiène informatique
- ANSSI — référentiel SecNumCloud
- Décret 2018-687 (formations SSIAP)
- Code du travail — durée de conservation formations
