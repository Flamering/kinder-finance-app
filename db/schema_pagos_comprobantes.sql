-- =============================================
-- KINDER FINANCE — Pagos y comprobantes
-- DB: kinder | Schema: kinder
--
-- Crea la tabla kinder.pagos (un pago = un comprobante
-- con folio COM-YYYY-NNNNN), la secuencia de folios y
-- la función kinder.registrar_pago() que registra un
-- pago de forma atómica (pagos + cxc + finanzas).
--
-- Todo el archivo es IDEMPOTENTE: puede re-ejecutarse
-- con seguridad (IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).
-- Debe aplicarse DESPUÉS de schema.sql (el runner
-- scripts/migrar-db.mjs aplica en orden alfabético y
-- "schema.sql" < "schema_pagos_comprobantes.sql").
-- Ejecutar como superusuario/admin contra la DB kinder,
-- o vía: PGPASSWORD='...' node scripts/migrar-db.mjs
-- =============================================

-- =============================================
-- 1. SECUENCIA para folios de comprobante
-- (no se hace setval: el backfill consume de la
-- secuencia con nextval al insertar filas legacy)
-- =============================================
CREATE SEQUENCE IF NOT EXISTS kinder.seq_folio_comprobante;
ALTER SEQUENCE kinder.seq_folio_comprobante OWNER TO kinder_owner;

-- =============================================
-- 2. TABLA PAGOS (un pago = un comprobante)
-- alumno_nombre y concepto son snapshot, mismo
-- patrón que cxc.alumno_nombre.
-- =============================================
CREATE TABLE IF NOT EXISTS kinder.pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text UNIQUE NOT NULL,
  alumno_id uuid NOT NULL REFERENCES kinder.alumnos(id) ON DELETE CASCADE,
  cxc_id uuid NOT NULL REFERENCES kinder.cxc(id) ON DELETE CASCADE,
  alumno_nombre text NOT NULL,
  concepto text NOT NULL,
  monto numeric(10,2) NOT NULL CHECK (monto > 0),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  metodo_pago text NOT NULL CHECK (metodo_pago IN ('Transferencia', 'Efectivo', 'Tarjeta')),
  referencia text,
  finanza_id uuid REFERENCES kinder.finanzas(id) ON DELETE SET NULL,
  origen text NOT NULL DEFAULT 'app' CHECK (origen IN ('app', 'legacy')),
  eliminado boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE kinder.pagos OWNER TO kinder_owner;

-- =============================================
-- 3. ÍNDICES (idempotentes).
-- folio ya tiene índice vía UNIQUE.
-- =============================================
CREATE INDEX IF NOT EXISTS idx_pagos_alumno_id ON kinder.pagos(alumno_id);
CREATE INDEX IF NOT EXISTS idx_pagos_cxc_id ON kinder.pagos(cxc_id);
CREATE INDEX IF NOT EXISTS idx_pagos_eliminado ON kinder.pagos(eliminado);

-- =============================================
-- 4. TRIGGER BEFORE UPDATE (idempotente).
-- Reutiliza kinder.update_updated_at_column().
-- =============================================
DROP TRIGGER IF EXISTS update_pagos_updated_at ON kinder.pagos;
CREATE TRIGGER update_pagos_updated_at
  BEFORE UPDATE ON kinder.pagos
  FOR EACH ROW
  EXECUTE FUNCTION kinder.update_updated_at_column();

-- =============================================
-- 5. RLS + POLICY allow-all para kinder_anon
-- (espejo del comportamiento Supabase)
-- =============================================
ALTER TABLE kinder.pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kinder_anon_allow_all ON kinder.pagos;
CREATE POLICY kinder_anon_allow_all ON kinder.pagos
  FOR ALL TO kinder_anon USING (true) WITH CHECK (true);

-- =============================================
-- 6. GRANTS MÍNIMOS para kinder_anon (runtime de la app)
-- =============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON kinder.pagos TO kinder_anon;
GRANT USAGE, SELECT ON SEQUENCE kinder.seq_folio_comprobante TO kinder_anon;

-- =============================================
-- 7. FUNCIÓN registrar_pago — VER schema_cxc_tipo.sql.
-- La versión canónica de 7 args (con p_categoria) vive
-- en schema_cxc_tipo.sql, que además elimina el overload
-- legacy de 6 args. NO redefinir registrar_pago aquí.
-- =============================================

-- PostgREST cachea el esquema: sin esto la tabla nueva
-- y el RPC no aparecen en la API hasta recargar.
NOTIFY pgrst, 'reload schema';
