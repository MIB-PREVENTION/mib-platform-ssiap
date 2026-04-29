-- ============================================================
-- 001_rls_phase1.sql — Phase 1 sécurité RLS
-- ============================================================
-- Objectif : retirer l'exposition complète des hashs de mots de passe,
-- PINs et clés de licence côté `anon`, en passant par des RPC sécurisées
-- (SECURITY DEFINER) qui font la comparaison côté serveur.
--
-- ⚠️ APPLIQUER EN MÊME TEMPS que le déploiement du nouveau code client
-- (login-centre.js / login-formateur.js qui appellent les RPC).
--
-- À exécuter dans le SQL Editor Supabase.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Retirer les policies « anon_all » sur les tables sensibles
-- ============================================================
-- Les autres tables (questions, sessions_formation, etc.) gardent leurs
-- policies pour l'instant — elles seront durcies en Phase 2.

DROP POLICY IF EXISTS anon_all          ON public.centers;
DROP POLICY IF EXISTS anon_read_centers ON public.centers;

DROP POLICY IF EXISTS anon_all             ON public.formateurs;
DROP POLICY IF EXISTS anon_all_formateurs  ON public.formateurs;

DROP POLICY IF EXISTS anon_all ON public.password_reset_requests;

-- À ce stade : aucune policy → `anon` ne peut plus rien faire sur ces 3
-- tables, sauf via les RPC qu'on définit ci-dessous.

-- ============================================================
-- 2. RPC d'authentification centre (email + mot de passe)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auth_centre(
  p_email    text,
  p_pwd_hash text
)
RETURNS TABLE (
  id        uuid,
  nom       text,
  plan      text,
  center_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.nom, c.plan, c.id AS center_id
  FROM centers c
  WHERE lower(c.email) = lower(p_email)
    AND c.password_hash = p_pwd_hash
    AND c.password_set = true
    AND c.license_status = 'active'
    AND (c.license_expires_at IS NULL OR c.license_expires_at > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.auth_centre(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.auth_centre(text, text) TO anon, authenticated;

-- ============================================================
-- 3. RPC première connexion centre (email + clé licence)
-- ============================================================
CREATE OR REPLACE FUNCTION public.init_centre_password(
  p_email       text,
  p_license_key text,
  p_pwd_hash    text
)
RETURNS TABLE (
  id   uuid,
  nom  text,
  plan text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_center centers%ROWTYPE;
BEGIN
  -- Vérifier email + clé + statut
  SELECT * INTO v_center
  FROM centers
  WHERE lower(email) = lower(p_email)
    AND upper(license_key) = upper(p_license_key)
    AND license_status = 'active'
    AND (license_expires_at IS NULL OR license_expires_at > now())
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_credentials' USING ERRCODE = 'P0001';
  END IF;

  IF v_center.password_set = true THEN
    RAISE EXCEPTION 'password_already_set' USING ERRCODE = 'P0002';
  END IF;

  -- Définir le mot de passe
  UPDATE centers
  SET password_hash = p_pwd_hash,
      password_set  = true,
      updated_at    = now()
  WHERE centers.id = v_center.id;

  RETURN QUERY
  SELECT v_center.id, v_center.nom, v_center.plan;
END;
$$;

REVOKE ALL ON FUNCTION public.init_centre_password(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.init_centre_password(text, text, text) TO anon, authenticated;

-- ============================================================
-- 4. RPC demande de réinitialisation de mot de passe
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_password_reset(p_email text)
RETURNS TABLE (
  token      text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_center_id  uuid;
  v_token      text;
  v_expires_at timestamptz;
BEGIN
  SELECT id INTO v_center_id
  FROM centers
  WHERE lower(email) = lower(p_email)
    AND license_status = 'active'
  LIMIT 1;

  -- Pour éviter l'énumération d'emails, on renvoie toujours un token
  -- (mais on n'insère en base que si l'email existe vraiment).
  v_token      := encode(gen_random_bytes(24), 'hex');
  v_expires_at := now() + interval '24 hours';

  IF v_center_id IS NOT NULL THEN
    INSERT INTO password_reset_requests (center_id, email, status, token, expires_at)
    VALUES (v_center_id, lower(p_email), 'pending', v_token, v_expires_at);
  END IF;

  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.request_password_reset(text) FROM public;
GRANT EXECUTE ON FUNCTION public.request_password_reset(text) TO anon, authenticated;

-- ============================================================
-- 5. RPC reset de mot de passe via token
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_password_reset(
  p_token    text,
  p_pwd_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request password_reset_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_request
  FROM password_reset_requests
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_expired_token' USING ERRCODE = 'P0003';
  END IF;

  UPDATE centers
  SET password_hash = p_pwd_hash,
      password_set  = true,
      updated_at    = now()
  WHERE id = v_request.center_id;

  UPDATE password_reset_requests
  SET status     = 'done',
      updated_at = now()
  WHERE id = v_request.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_password_reset(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.complete_password_reset(text, text) TO anon, authenticated;

-- ============================================================
-- 6. RPC d'authentification formateur (PIN)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auth_formateur(
  p_pin_hash  text,
  p_center_id uuid DEFAULT NULL
)
RETURNS TABLE (
  formateur_id uuid,
  prenom       text,
  nom          text,
  role         text,
  center_id    uuid,
  center_nom   text,
  center_plan  text,
  modules      jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id           AS formateur_id,
    f.prenom,
    f.nom,
    f.role,
    f.center_id,
    c.nom          AS center_nom,
    c.plan         AS center_plan,
    jsonb_build_object(
      'module_auto_entrainement', c.module_auto_entrainement,
      'module_quiz_salle',        c.module_quiz_salle,
      'module_challenge_cup',     c.module_challenge_cup,
      'module_ssi_supervise',     c.module_ssi_supervise,
      'module_ssi_autoformation', c.module_ssi_autoformation
    ) AS modules
  FROM formateurs f
  JOIN centers c ON c.id = f.center_id
  WHERE f.pin_hash = p_pin_hash
    AND f.actif = true
    AND c.license_status = 'active'
    AND (p_center_id IS NULL OR f.center_id = p_center_id);
$$;

REVOKE ALL ON FUNCTION public.auth_formateur(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.auth_formateur(text, uuid) TO anon, authenticated;

-- ============================================================
-- 7. Lecture publique RESTREINTE des centres (sans secrets)
-- ============================================================
-- L'app a parfois besoin de lire le nom/plan d'un centre (par ex. après
-- login formateur). On expose une vue qui ne contient AUCUN secret.

CREATE OR REPLACE VIEW public.centers_public AS
SELECT
  id,
  nom,
  plan,
  module_auto_entrainement,
  module_quiz_salle,
  module_challenge_cup,
  module_ssi_supervise,
  module_ssi_autoformation
FROM centers
WHERE license_status = 'active';

GRANT SELECT ON public.centers_public TO anon, authenticated;

-- ============================================================
-- 8. Vérifications post-migration
-- ============================================================
-- Ces requêtes doivent toutes échouer ou renvoyer 0 ligne :
--
--   SET ROLE anon;
--   SELECT password_hash FROM centers LIMIT 1;        -- doit échouer
--   SELECT pin_hash      FROM formateurs LIMIT 1;     -- doit échouer
--   SELECT license_key   FROM centers LIMIT 1;        -- doit échouer
--   RESET ROLE;
--
-- Et celles-ci doivent fonctionner :
--   SELECT * FROM auth_centre('test@example.com', 'fakehash');  -- 0 ligne
--   SELECT * FROM centers_public LIMIT 5;                        -- OK

COMMIT;

-- ============================================================
-- ROLLBACK (si problème)
-- ============================================================
-- BEGIN;
-- CREATE POLICY anon_all ON public.centers   FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY anon_all ON public.formateurs FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY anon_all ON public.password_reset_requests FOR ALL TO anon USING (true) WITH CHECK (true);
-- DROP FUNCTION IF EXISTS public.auth_centre;
-- DROP FUNCTION IF EXISTS public.init_centre_password;
-- DROP FUNCTION IF EXISTS public.request_password_reset;
-- DROP FUNCTION IF EXISTS public.complete_password_reset;
-- DROP FUNCTION IF EXISTS public.auth_formateur;
-- DROP VIEW IF EXISTS public.centers_public;
-- COMMIT;
