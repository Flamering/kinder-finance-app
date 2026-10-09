-- =============================================
-- KINDER FINANCE — Verificación de la migración
-- db/schema_alumnos_tipo.sql (columna alumnos.tipo
-- + RPC kinder.registrar_cobro_eventual).
--
-- Este archivo NO vive en db/ para que el runner
-- scripts/migrar-db.mjs no lo aplique. Se ejecuta a mano:
--
--   psql -v ON_ERROR_STOP=1 -d kinder -f scripts/verify-cobro-eventual.sql
--
-- Es un test de caja: abre una transacción, ejercita la RPC
-- y hace ROLLBACK al final para no dejar datos. Cada caso
-- falla con RAISE EXCEPTION 'FAIL <caso>: <detalle>'.
-- Antes de aplicar la migración debe fallar en el Caso A;
-- después debe terminar con la línea OK.
-- =============================================

BEGIN;

-- =============================================
-- Caso A (DDL): columna, default, constraint y funciones.
-- =============================================
DO $$
DECLARE
  v_nullable text;
  v_default  text;
BEGIN
  SELECT is_nullable, column_default
    INTO v_nullable, v_default
    FROM information_schema.columns
   WHERE table_schema = 'kinder'
     AND table_name   = 'alumnos'
     AND column_name  = 'tipo';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FAIL A: no existe kinder.alumnos.tipo';
  END IF;
  IF v_nullable IS DISTINCT FROM 'NO' THEN
    RAISE EXCEPTION 'FAIL A: alumnos.tipo debe ser NOT NULL (is_nullable=%)', v_nullable;
  END IF;
  -- information_schema normaliza el default con cast: 'Regular'::text
  IF v_default IS DISTINCT FROM '''Regular''::text' THEN
    RAISE EXCEPTION 'FAIL A: default de alumnos.tipo = % (esperado ''Regular'')', coalesce(v_default, '<null>');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_alumnos_tipo') THEN
    RAISE EXCEPTION 'FAIL A: no existe el constraint chk_alumnos_tipo';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'kinder' AND p.proname = 'registrar_cobro_eventual'
  ) THEN
    RAISE EXCEPTION 'FAIL A: no existe la función kinder.registrar_cobro_eventual';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'kinder' AND p.proname = 'registrar_pago_eventual'
  ) THEN
    RAISE EXCEPTION 'FAIL A: no existe la función kinder.registrar_pago_eventual';
  END IF;
END $$;

-- =============================================
-- Caso B (alumno existente): cobra usando p_alumno_id y
-- NO altera el alumno.
-- =============================================
DO $$
DECLARE
  v_id          uuid;
  v_tipo_antes  text;
  v_estado_antes text;
  v_tipo_despues text;
  v_estado_despues text;
  v_res         json;
BEGIN
  SELECT id, tipo, estado
    INTO v_id, v_tipo_antes, v_estado_antes
    FROM kinder.alumnos
   WHERE eliminado = false AND tipo = 'Regular'
   LIMIT 1;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'FAIL B: no hay ningún alumno Regular para el caso';
  END IF;

  v_res := kinder.registrar_cobro_eventual(
    p_concepto    := 'Caso B',
    p_monto       := 100,
    p_fecha       := CURRENT_DATE,
    p_metodo_pago := 'Efectivo',
    p_alumno_id   := v_id
  );

  SELECT tipo, estado INTO v_tipo_despues, v_estado_despues
    FROM kinder.alumnos WHERE id = v_id;

  IF v_tipo_despues IS DISTINCT FROM v_tipo_antes THEN
    RAISE EXCEPTION 'FAIL B: el tipo del alumno cambió (% -> %)', v_tipo_antes, v_tipo_despues;
  END IF;
  IF v_estado_despues IS DISTINCT FROM v_estado_antes THEN
    RAISE EXCEPTION 'FAIL B: el estado del alumno cambió (% -> %)', v_estado_antes, v_estado_despues;
  END IF;

  IF v_res->'cxc'->>'tipo' IS DISTINCT FROM 'Eventual' THEN
    RAISE EXCEPTION 'FAIL B: cxc.tipo = % (esperado Eventual)', v_res->'cxc'->>'tipo';
  END IF;
  IF v_res->'cxc'->>'estado' IS DISTINCT FROM 'Pagado' THEN
    RAISE EXCEPTION 'FAIL B: cxc.estado = % (esperado Pagado)', v_res->'cxc'->>'estado';
  END IF;
  IF (v_res->'cxc'->>'monto_pagado')::numeric IS DISTINCT FROM 100 THEN
    RAISE EXCEPTION 'FAIL B: cxc.monto_pagado = % (esperado 100)', v_res->'cxc'->>'monto_pagado';
  END IF;
  IF v_res->'pago'->>'folio' NOT LIKE 'COM-%' THEN
    RAISE EXCEPTION 'FAIL B: pago.folio = % (esperado COM-%%)', v_res->'pago'->>'folio';
  END IF;
  IF v_res->'finanza'->>'categoria' IS DISTINCT FROM 'Evento' THEN
    RAISE EXCEPTION 'FAIL B: finanza.categoria = % (esperado Evento)', v_res->'finanza'->>'categoria';
  END IF;
  IF (v_res->'finanza'->>'monto')::numeric IS DISTINCT FROM 100 THEN
    RAISE EXCEPTION 'FAIL B: finanza.monto = % (esperado 100)', v_res->'finanza'->>'monto';
  END IF;
END $$;

-- =============================================
-- Caso C (alta nueva): sin p_alumno_id da de alta al
-- eventual y lo cobra.
-- =============================================
DO $$
DECLARE
  v_res          json;
  v_tipo         text;
  v_grado        text;
  v_tutor        text;
  v_estado       text;
  v_colegiatura  text;
  v_count        integer;
BEGIN
  v_res := kinder.registrar_cobro_eventual(
    p_concepto    := 'Colegiatura eventual',
    p_monto       := 250,
    p_fecha       := CURRENT_DATE,
    p_metodo_pago := 'Efectivo',
    p_nombre      := 'PRUEBA COBRO EVENTUAL',
    p_grado       := 'Kinder A',
    p_tutor       := 'Tutor Prueba'
  );

  SELECT tipo, grado, tutor, estado, monto_colegiatura
    INTO v_tipo, v_grado, v_tutor, v_estado, v_colegiatura
    FROM kinder.alumnos
   WHERE nombre = 'PRUEBA COBRO EVENTUAL';

  IF v_tipo IS DISTINCT FROM 'Eventual' THEN
    RAISE EXCEPTION 'FAIL C: tipo = % (esperado Eventual)', v_tipo;
  END IF;
  IF v_grado IS DISTINCT FROM 'Kinder A' THEN
    RAISE EXCEPTION 'FAIL C: grado = % (esperado Kinder A)', v_grado;
  END IF;
  IF v_tutor IS DISTINCT FROM 'Tutor Prueba' THEN
    RAISE EXCEPTION 'FAIL C: tutor = % (esperado Tutor Prueba)', v_tutor;
  END IF;
  IF v_estado IS DISTINCT FROM 'Activo' THEN
    RAISE EXCEPTION 'FAIL C: estado = % (esperado Activo)', v_estado;
  END IF;
  IF v_colegiatura IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL C: monto_colegiatura = % (esperado NULL)', v_colegiatura;
  END IF;

  IF v_res->'alumno'->>'tipo' IS DISTINCT FROM 'Eventual' THEN
    RAISE EXCEPTION 'FAIL C: json alumno.tipo = % (esperado Eventual)', v_res->'alumno'->>'tipo';
  END IF;
  IF v_res->'alumno'->>'monto_colegiatura' IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL C: json alumno.monto_colegiatura = % (esperado null)', v_res->'alumno'->>'monto_colegiatura';
  END IF;
  IF v_res->'cxc'->>'tipo' IS DISTINCT FROM 'Eventual' THEN
    RAISE EXCEPTION 'FAIL C: cxc.tipo = % (esperado Eventual)', v_res->'cxc'->>'tipo';
  END IF;
  IF v_res->'cxc'->>'estado' IS DISTINCT FROM 'Pagado' THEN
    RAISE EXCEPTION 'FAIL C: cxc.estado = % (esperado Pagado)', v_res->'cxc'->>'estado';
  END IF;
  IF (v_res->'cxc'->>'monto_pagado')::numeric IS DISTINCT FROM 250 THEN
    RAISE EXCEPTION 'FAIL C: cxc.monto_pagado = % (esperado 250)', v_res->'cxc'->>'monto_pagado';
  END IF;
  IF v_res->'pago'->>'folio' NOT LIKE 'COM-%' THEN
    RAISE EXCEPTION 'FAIL C: pago.folio = % (esperado COM-%%)', v_res->'pago'->>'folio';
  END IF;
  IF v_res->'finanza'->>'categoria' IS DISTINCT FROM 'Evento' THEN
    RAISE EXCEPTION 'FAIL C: finanza.categoria = % (esperado Evento)', v_res->'finanza'->>'categoria';
  END IF;
  IF (v_res->'finanza'->>'monto')::numeric IS DISTINCT FROM 250 THEN
    RAISE EXCEPTION 'FAIL C: finanza.monto = % (esperado 250)', v_res->'finanza'->>'monto';
  END IF;
END $$;

-- =============================================
-- Caso D (atomicidad): el monto desborda numeric(10,2)
-- al insertar la CxC (después de insertar el alumno); la
-- transacción debe revertir y no dejar alumno huérfano.
-- =============================================
DO $$
DECLARE
  v_fallo boolean := false;
  v_count integer;
BEGIN
  BEGIN
    PERFORM kinder.registrar_cobro_eventual(
      p_concepto    := 'Caso D',
      p_monto       := 1234567890123,
      p_fecha       := CURRENT_DATE,
      p_metodo_pago := 'Efectivo',
      p_nombre      := 'PRUEBA NO DEBE QUEDAR'
    );
  EXCEPTION WHEN OTHERS THEN
    v_fallo := true;
  END;

  IF NOT v_fallo THEN
    RAISE EXCEPTION 'FAIL D: la llamada no falló pese al monto desbordado';
  END IF;

  SELECT count(*) INTO v_count
    FROM kinder.alumnos WHERE nombre = 'PRUEBA NO DEBE QUEDAR';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL D: quedaron % alumnos PRUEBA NO DEBE QUEDAR (no revirtió)', v_count;
  END IF;
END $$;

-- =============================================
-- Caso E (validaciones): tres llamadas inválidas deben
-- lanzar excepción.
-- =============================================
DO $$
DECLARE
  v_fallo boolean;
BEGIN
  -- E1: sin p_alumno_id y sin p_nombre.
  v_fallo := false;
  BEGIN
    PERFORM kinder.registrar_cobro_eventual(
      p_concepto    := 'Caso E1',
      p_monto       := 100,
      p_fecha       := CURRENT_DATE,
      p_metodo_pago := 'Efectivo'
    );
  EXCEPTION WHEN OTHERS THEN
    v_fallo := true;
  END;
  IF NOT v_fallo THEN
    RAISE EXCEPTION 'FAIL E: aceptó una llamada sin p_alumno_id ni p_nombre';
  END IF;

  -- E2: monto 0.
  v_fallo := false;
  BEGIN
    PERFORM kinder.registrar_cobro_eventual(
      p_concepto    := 'Caso E2',
      p_monto       := 0,
      p_fecha       := CURRENT_DATE,
      p_metodo_pago := 'Efectivo',
      p_nombre      := 'PRUEBA E2'
    );
  EXCEPTION WHEN OTHERS THEN
    v_fallo := true;
  END;
  IF NOT v_fallo THEN
    RAISE EXCEPTION 'FAIL E: aceptó p_monto = 0';
  END IF;

  -- E3: concepto en blanco.
  v_fallo := false;
  BEGIN
    PERFORM kinder.registrar_cobro_eventual(
      p_concepto    := '  ',
      p_monto       := 100,
      p_fecha       := CURRENT_DATE,
      p_metodo_pago := 'Efectivo',
      p_nombre      := 'PRUEBA E3'
    );
  EXCEPTION WHEN OTHERS THEN
    v_fallo := true;
  END;
  IF NOT v_fallo THEN
    RAISE EXCEPTION 'FAIL E: aceptó p_concepto en blanco';
  END IF;
END $$;

ROLLBACK;

\echo 'OK: verificaciones de cobro excepcional'
