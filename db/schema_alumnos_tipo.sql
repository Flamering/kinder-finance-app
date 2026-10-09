-- =============================================
-- KINDER FINANCE — alumnos.tipo + RPC registrar_cobro_eventual
-- DB: kinder | Schema: kinder
--
-- Distingue alumnos regulares de eventuales y añade una RPC
-- que da de alta al alumno eventual (si hace falta) y lo cobra
-- en UNA sola transacción, reutilizando registrar_pago_eventual
-- (definida en schema_cxc_tipo.sql).
--
-- ORDEN ALFABÉTICO DEL RUNNER (scripts/migrar-db.mjs ordena .sort()):
--   schema.sql  <  schema_alumnos_tipo.sql  <  schema_cxc_tipo.sql
-- Este archivo se aplica ANTES de schema_cxc_tipo.sql, por lo que
-- kinder.registrar_pago_eventual aún no está creada cuando se define
-- kinder.registrar_cobro_eventual. Eso es seguro porque plpgsql
-- resuelve la llamada a registrar_pago_eventual en tiempo de ejecución.
--
-- Todo el archivo es IDEMPOTENTE: puede re-ejecutarse con
-- seguridad (IF NOT EXISTS / DO $$ / OR REPLACE).
-- =============================================

-- =============================================
-- 1. Columna tipo (las filas existentes quedan 'Regular').
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'kinder' AND table_name = 'alumnos' AND column_name = 'tipo'
  ) THEN
    ALTER TABLE kinder.alumnos ADD COLUMN tipo text NOT NULL DEFAULT 'Regular';
  END IF;
END $$;

-- =============================================
-- 2. Constraint CHECK (idempotente).
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_alumnos_tipo'
  ) THEN
    ALTER TABLE kinder.alumnos ADD CONSTRAINT chk_alumnos_tipo
      CHECK (tipo IN ('Regular', 'Eventual'));
  END IF;
END $$;

-- =============================================
-- 3. Índice para filtrar por tipo.
-- =============================================
CREATE INDEX IF NOT EXISTS idx_alumnos_tipo ON kinder.alumnos(tipo);

-- =============================================
-- 4. RPC registrar_cobro_eventual.
--    - Los parámetros obligatorios van primero; los opcionales
--      con DEFAULT quedan al final para que PostgREST pueda
--      invocarla con notación nombrada omitiéndolos.
--    - Si p_alumno_id es NULL, exige p_nombre e inserta el
--      alumno como Eventual (monto_colegiatura NULL).
--    - Si viene p_alumno_id, NO modifica al alumno: solo
--      valida que exista y no esté eliminado.
--    - El cobro lo hace registrar_pago_eventual (CxC Eventual
--      Pagada + pago con folio + finanza Ingreso/Evento).
-- =============================================
CREATE OR REPLACE FUNCTION kinder.registrar_cobro_eventual(
  p_concepto    text,
  p_monto       numeric,
  p_fecha       date,
  p_metodo_pago text,
  p_alumno_id   uuid DEFAULT NULL,
  p_nombre      text DEFAULT NULL,
  p_grado       text DEFAULT NULL,
  p_tutor       text DEFAULT NULL,
  p_referencia  text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_alumno_id uuid;
  v_alumno    json;
  v_resultado json;
BEGIN
  -- 1. Validaciones básicas.
  IF p_concepto IS NULL OR btrim(p_concepto) = '' THEN
    RAISE EXCEPTION 'El concepto es obligatorio';
  END IF;
  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;
  IF p_fecha IS NULL THEN
    RAISE EXCEPTION 'La fecha es obligatoria';
  END IF;

  -- 2. Alta del alumno eventual o validación del existente.
  IF p_alumno_id IS NULL THEN
    IF p_nombre IS NULL OR btrim(p_nombre) = '' THEN
      RAISE EXCEPTION 'El nombre es obligatorio para dar de alta al alumno';
    END IF;

    INSERT INTO kinder.alumnos (nombre, grado, tutor, estado, monto_colegiatura, tipo)
    VALUES (
      btrim(p_nombre),
      coalesce(nullif(btrim(p_grado), ''), 'Eventual'),
      nullif(btrim(coalesce(p_tutor, '')), ''),
      'Activo',
      NULL,
      'Eventual'
    )
    RETURNING id INTO v_alumno_id;
  ELSE
    v_alumno_id := p_alumno_id;

    PERFORM 1 FROM kinder.alumnos
      WHERE id = v_alumno_id AND eliminado = false;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Alumno no encontrado';
    END IF;
  END IF;

  -- 3. Snapshot del alumno para el retorno (tipo intacto si ya existía).
  SELECT to_json(a) INTO v_alumno FROM kinder.alumnos a WHERE a.id = v_alumno_id;

  -- 4. Cobro atómico: CxC eventual + pago + finanza.
  SELECT kinder.registrar_pago_eventual(
           v_alumno_id, btrim(p_concepto), p_monto, p_fecha, p_metodo_pago, p_referencia)
    INTO v_resultado;

  -- 5. JSON plano con los cuatro objetos.
  RETURN json_build_object(
    'alumno',  v_alumno,
    'cxc',     v_resultado->'resultado'->'cxc',
    'pago',    v_resultado->'resultado'->'pago',
    'finanza', v_resultado->'resultado'->'finanza'
  );
END;
$$;
ALTER FUNCTION kinder.registrar_cobro_eventual(text, numeric, date, text, uuid, text, text, text, text) OWNER TO kinder_owner;
GRANT EXECUTE ON FUNCTION kinder.registrar_cobro_eventual(text, numeric, date, text, uuid, text, text, text, text) TO kinder_anon;

-- PostgREST cachea el esquema: sin esto los cambios no aparecen en la API.
NOTIFY pgrst, 'reload schema';
