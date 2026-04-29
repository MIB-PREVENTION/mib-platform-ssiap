# Architecture cible souveraine — MIB Plateforme

**Statut**: brouillon stratégique — décision finale prévue avant juillet 2026.
**Échéance projet**: tous projets MIB alignés sur cette stack pour **septembre 2026**.

## 1. Pourquoi migrer

Les clients cibles (centres de formation SSIAP, EDF et autres OIV) exigent dans
leurs questionnaires sécurité fournisseurs :

- Hébergement **physique en France**
- **Pas de juridiction extra-territoriale** (CLOUD Act, FISA)
- Chaîne de sous-traitance contrôlable
- ISO 27001, idéalement **HDS** ou **SecNumCloud** selon le périmètre
- **Réversibilité** documentée

Supabase Cloud (entreprise US) ne satisfait pas les deux premiers points,
indépendamment de la région d'hébergement. Cela constitue un motif d'éviction
en appel d'offres OIV.

## 2. Architecture actuelle (à remplacer)

```
Client (PWA, HTML statique)
        │
        └──► Supabase Cloud (Frankfurt, AWS) ──► entreprise US
              ├── Postgres
              ├── Auth (custom, via tables centers/formateurs)
              ├── Realtime
              ├── Storage
              └── Edge Functions
```

## 3. Architecture cible

### 3.1 Option recommandée : Supabase self-hosted sur Scaleway

```
Client (PWA)
        │
        └──► Scaleway (Paris) ──► société française, RGPD natif
              ├── Instance Stardust2 / Pro2 (Docker compose Supabase)
              ├── Managed Postgres (DB principale, backups auto)
              ├── Object Storage (S3-compatible, remplace storage Supabase)
              └── Load Balancer + TLS
```

**Avantages**
- Code client **inchangé** (mêmes APIs Supabase)
- Souveraineté française complète
- ISO 27001, HDS disponible sur certaines offres
- ~50–150 €/mois pour la charge actuelle

**Inconvénients**
- Mises à jour Supabase à gérer manuellement (~1 j / mois)
- Pas de monitoring built-in équivalent à Supabase Cloud → ajouter Grafana

### 3.2 Option B : Scaleway Managed Postgres + back custom

Si on abandonne Supabase à terme :

```
Client → API Node/Go (Scaleway Serverless Functions ou conteneur)
              │
              ├── Scaleway Managed Postgres
              ├── Scaleway Object Storage
              └── WebSocket via Scaleway Containers (ou Pusher EU)
```

À envisager si :
- On veut réduire la dépendance fournisseur
- On a besoin de fonctionnalités custom (RPC complexes, etc.)

### 3.3 Option C : OVHcloud

Architecture identique à 3.1 mais sur OVH au lieu de Scaleway.
**À privilégier** si EDF a OVH comme fournisseur référencé (à vérifier).

## 4. Mapping Supabase → cible

| Service Supabase | Remplacement Scaleway / OVH |
|---|---|
| Postgres | Managed Database for Postgres |
| Auth (custom) | Inchangé (stocké en DB) — ou Keycloak self-hosted |
| Storage | Object Storage S3-compat |
| Realtime | Self-hosted Supabase Realtime, ou Postgres LISTEN/NOTIFY + WS |
| Edge Functions | Serverless Functions / Containers |
| Dashboard | Self-hosted Supabase Studio |

## 5. Stratégie de migration (Mai → Septembre 2026)

| Mois | Étape | Critère de succès |
|---|---|---|
| **Mai** | Phase 1 RLS sur prod actuelle (Supabase Cloud) | Tests RLS passent, audit OK |
| **Mai–Juin** | POC Scaleway : instance + Supabase self-hosted | Connexion login OK, requêtes < 200 ms |
| **Juin** | Schéma + migrations rejouées sur Scaleway | Parité fonctionnelle prod |
| **Juillet** | Migration projet 1 (le plus simple) | Bascule DNS sans perte |
| **Août** | Migration projets 2 et 3 | 100 % du trafic sur Scaleway |
| **Septembre** | Documentation EDF prête | Dossier sécurité auditable |

## 6. Coûts estimés

| Poste | Supabase Pro actuel | Scaleway self-hosted |
|---|---|---|
| Compute (1 instance Pro2) | inclus | ~25 €/mois |
| Postgres managé | inclus | ~50 €/mois (HA) |
| Object Storage 100 Go | inclus | ~5 €/mois |
| Backups | inclus | ~10 €/mois |
| Monitoring (Grafana Cloud) | — | ~0–25 €/mois |
| **Total** | **25 $/mois** | **~90–115 €/mois** |

Surcoût ~70 €/mois par projet, justifié par l'éligibilité aux marchés OIV.

## 7. Risques et mitigations

| Risque | Mitigation |
|---|---|
| Mises à jour Supabase self-hosted manquées | Cron de mise à jour mensuel + alerte CVE |
| Performance dégradée vs Cloud | Bench complet en POC, autoscaling Scaleway |
| Backup / restore non testés | Drill mensuel de restauration |
| Single point of failure | Postgres en HA (réplica) dès la prod |
| Compliance non documentée | `CONFORMITE.md` tenu à jour à chaque release |

## 8. Décisions à prendre

- [ ] **Scaleway vs OVH** — choisir avant fin mai 2026
- [ ] **Supabase self-hosted vs back custom** — selon complexité (default: self-host)
- [ ] **Niveau HA** — single node ou Postgres HA dès le départ
- [ ] **Domaine de production** — sous-domaine dédié pour MIB
- [ ] **Plan de secours** — staging permanent + procédure de bascule

## 9. Références

- Supabase self-hosting : https://supabase.com/docs/guides/self-hosting
- Scaleway Postgres : https://www.scaleway.com/fr/database/
- OVHcloud Public Cloud Databases : https://www.ovhcloud.com/fr/public-cloud/postgresql/
- Doctrine "cloud de confiance" (Premier ministre) : circulaire du 5 juillet 2021
- Schrems II (CJUE C-311/18) : invalidation Privacy Shield
