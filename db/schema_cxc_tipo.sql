-- =============================================
-- KINDER FINANCE — Pagos eventuales (cxc.tipo)
-- DB: kinder | Schema: kinder
-- Diferencia cuentas de colegiatura de pagos
-- eventuales (eventos, inscripciones, etc.).
-- Todo el archivo es IDEMPOTENTE.
-- Debe aplicarse DESPUÉS de schema.sql (el runner
-- scripts/migrar-db.mjs aplica en orden alfabético y
-- "schema.sql" < "schema_cxc_tipo.sql").
-- =============================================

-- 1. COLUMNA tipo EN CXC (las filas existentes quedan 'Colegiatura')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'kinder' AND table_name = 'cxc' AND column_name = 'tipo'
  ) THEN
    ALTER TABLE kinder.cxc ADD COLUMN tipo text NOT NULL DEFAULT 'Colegiatura';
  END IF;
END $$;

-- 2. CONSTRAINT CHECK (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_cxc_tipo'
  ) THEN
    ALTER TABLE kinder.cxc ADD CONSTRAINT chk_cxc_tipo
      CHECK (tipo IN ('Colegiatura', 'Eventual'));
  END IF;
END $$;

-- 3. ÍNDICE para filtrar por tipo
CREATE INDEX IF NOT EXISTS idx_cxc_tipo ON kinder.cxc(tipo);

-- =============================================
-- 4. registrar_pago con p_categoria opcional.
-- DROP de la firma anterior + CREATE (CREATE OR REPLACE no
-- puede cambiar la firma; PostgREST vería dos funciones).
-- Cuerpo idéntico al de schema_pagos_comprobantes.sql,
-- salvo la categoría de finanzas que usa p_categoria.
-- =============================================
DROP FUNCTION IF EXISTS kinder.registrar_pago(uuid, uuid, numeric, date, text, text);
CREATE OR REPLACE FUNCTION kinder.registrar_pago(
  p_alumno_id uuid,
  p_cxc_id uuid,
  p_monto numeric,
  p_fecha date,
  p_metodo_pago text,
  p_referencia text DEFAULT NULL,
  p_categoria text DEFAULT 'Mensualidad'
) RETURNS json
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_cxc record;
  v_cxc_new record;
  v_pago record;
  v_finanza record;
  v_folio text;
BEGIN
  -- 1. Bloquea la cuenta; si no existe, error.
  SELECT * INTO v_cxc FROM kinder.cxc WHERE id = p_cxc_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta no encontrada';
  END IF;

  -- 2. La cuenta debe tener alumno asociado (pagos.alumno_id es NOT NULL).
  IF p_alumno_id IS NULL THEN
    RAISE EXCEPTION 'La cuenta no tiene alumno asociado';
  END IF;

  -- 3. El monto debe ser positivo.
  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  -- 4. No exceder el saldo pendiente.
  IF v_cxc.monto_pagado + p_monto > v_cxc.monto THEN
    RAISE EXCEPTION 'El monto excede el saldo pendiente';
  END IF;

  -- 5. Folio nuevo desde la secuencia.
  v_folio := 'COM-' || to_char(now(), 'YYYY') || '-'
    || lpad(nextval('kinder.seq_folio_comprobante')::text, 5, '0');

  -- 6. Inserta el pago (snapshot de alumno_nombre y concepto).
  INSERT INTO kinder.pagos
    (folio, alumno_id, cxc_id, alumno_nombre, concepto, monto, fecha, metodo_pago, referencia)
  VALUES
    (v_folio, p_alumno_id, p_cxc_id, v_cxc.alumno_nombre, v_cxc.concepto, p_monto, p_fecha, p_metodo_pago, p_referencia)
  RETURNING * INTO v_pago;

  -- 7. Actualiza la CxC: acumula y recalcula estado.
  UPDATE kinder.cxc
  SET monto_pagado = monto_pagado + p_monto,
      estado = CASE WHEN monto_pagado + p_monto >= monto THEN 'Pagado' ELSE 'Parcial' END
  WHERE id = p_cxc_id
  RETURNING * INTO v_cxc_new;

  -- 8. Inserta la entrada en el libro de finanzas.
  INSERT INTO kinder.finanzas
    (tipo, categoria, monto, fecha, metodo_pago, estado, descripcion)
  VALUES
    ('Ingreso', p_categoria, p_monto, p_fecha, p_metodo_pago, 'Completado',
     'Pago CxC - ' || v_cxc.concepto || ' - ' || v_cxc.alumno_nombre)
  RETURNING * INTO v_finanza;

  -- 9. Vincula el pago con la entrada de finanzas.
  UPDATE kinder.pagos SET finanza_id = v_finanza.id WHERE id = v_pago.id;

  -- 10. Devuelve los tres registros creados/actualizados.
  RETURN json_build_object(
    'pago', to_json(v_pago),
    'cxc', to_json(v_cxc_new),
    'finanza', to_json(v_finanza)
  );
END;
$$;
ALTER FUNCTION kinder.registrar_pago(uuid, uuid, numeric, date, text, text, text) OWNER TO kinder_owner;
GRANT EXECUTE ON FUNCTION kinder.registrar_pago(uuid, uuid, numeric, date, text, text, text) TO kinder_anon;

-- =============================================
-- 5. RPC registrar_pago_eventual: crea la cuenta eventual y la
-- paga en UNA sola transacción (llama a registrar_pago anidado).
-- =============================================
CREATE OR REPLACE FUNCTION kinder.registrar_pago_eventual(
  p_alumno_id uuid,
  p_concepto text,
  p_monto numeric,
  p_fecha date,
  p_metodo_pago text,
  p_referencia text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_cxc_id uuid;
  v_resultado json;
BEGIN
  IF p_alumno_id IS NULL THEN
    RAISE EXCEPTION 'El alumno es obligatorio';
  END IF;
  IF p_concepto IS NULL OR btrim(p_concepto) = '' THEN
    RAISE EXCEPTION 'El concepto es obligatorio';
  END IF;

  INSERT INTO kinder.cxc (alumno_id, alumno_nombre, concepto, monto, monto_pagado, tipo, estado, fecha_emision, fecha_vencimiento)
  SELECT p_alumno_id, a.nombre, p_concepto, p_monto, 0, 'Eventual', 'Pendiente', p_fecha, NULL
    FROM kinder.alumnos a
   WHERE a.id = p_alumno_id
  RETURNING id INTO v_cxc_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alumno no encontrado';
  END IF;

  SELECT kinder.registrar_pago(p_alumno_id, v_cxc_id, p_monto, p_fecha, p_metodo_pago, p_referencia, 'Evento')
    INTO v_resultado;

  RETURN json_build_object('cxc_id', v_cxc_id, 'resultado', v_resultado);
END;
$$;
ALTER FUNCTION kinder.registrar_pago_eventual(uuid, text, numeric, date, text, text) OWNER TO kinder_owner;
GRANT EXECUTE ON FUNCTION kinder.registrar_pago_eventual(uuid, text, numeric, date, text, text) TO kinder_anon;

-- PostgREST cachea el esquema: sin esto los cambios no aparecen en la API.
NOTIFY pgrst, 'reload schema';
