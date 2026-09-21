-- =============================================
-- KINDER FINANCE — Schema PostgreSQL selfhosted
-- DB: kinder | Schema: kinder
-- T1 Migración Supabase → Postgres selfhosted
--
-- Fuente de verdad: OpenAPI de Supabase (el archivo
-- supabase-schema.sql de este repo está DESACTUALIZADO
-- y solo se usa como referencia histórica).
--
-- Todo el archivo es IDEMPOTENTE: puede re-ejecutarse
-- con seguridad (IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).
-- Los roles kinder_owner / kinder_anon se crean FUERA de
-- este archivo (ver reporte T1); aquí solo se referencian
-- en OWNER / GRANT / POLICY.
-- Ejecutar como superusuario/admin contra la DB kinder,
-- o vía: node scripts/migrar-db.mjs
-- =============================================

-- Extensión para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Schema owned por kinder_owner
CREATE SCHEMA IF NOT EXISTS kinder AUTHORIZATION kinder_owner;

-- =============================================
-- 1. TABLA ALUMNOS
-- =============================================
CREATE TABLE IF NOT EXISTS kinder.alumnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  grado text NOT NULL,
  tutor text,
  telefono text,
  email text,
  estado text DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo', 'Moroso')),
  fecha_inscripcion date DEFAULT CURRENT_DATE,
  eliminado boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tutor_id uuid,
  salon_id uuid,
  monto_colegiatura numeric(10,2)
);
ALTER TABLE kinder.alumnos OWNER TO kinder_owner;

-- =============================================
-- 2. TABLA CUENTAS POR COBRAR (CxC)
-- =============================================
CREATE TABLE IF NOT EXISTS kinder.cxc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id uuid REFERENCES kinder.alumnos(id) ON DELETE CASCADE,
  alumno_nombre text NOT NULL,
  concepto text NOT NULL,
  monto numeric(10,2) NOT NULL,
  monto_pagado numeric(10,2) DEFAULT 0,
  fecha_emision date DEFAULT CURRENT_DATE,
  fecha_vencimiento date,
  estado text DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pagado', 'Vencido', 'Parcial')),
  eliminado boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE kinder.cxc OWNER TO kinder_owner;

-- =============================================
-- 3. TABLA FINANZAS
-- =============================================
CREATE TABLE IF NOT EXISTS kinder.finanzas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('Ingreso', 'Gasto')),
  categoria text NOT NULL,
  monto numeric(10,2) NOT NULL,
  descripcion text,
  fecha date DEFAULT CURRENT_DATE,
  metodo_pago text,
  estado text,
  eliminado boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE kinder.finanzas OWNER TO kinder_owner;

-- =============================================
-- 4. TABLA TUTORES
-- =============================================
CREATE TABLE IF NOT EXISTS kinder.tutores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo text NOT NULL,
  email text UNIQUE,
  telefono text,
  telefono_secundario text,
  direccion text,
  colonia text,
  ciudad text,
  estado_fiscal text,
  codigo_postal text,
  rfc text,
  curp text,
  datos_facturacion jsonb,
  eliminado boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE kinder.tutores OWNER TO kinder_owner;

-- =============================================
-- 5. TABLA MAESTROS
-- =============================================
CREATE TABLE IF NOT EXISTS kinder.maestros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo text NOT NULL,
  email text UNIQUE,
  telefono text,
  telefono_emergencia text,
  direccion text,
  rfc text,
  curp text,
  especialidad text,
  fecha_contratacion date DEFAULT CURRENT_DATE,
  activo boolean DEFAULT true,
  eliminado boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE kinder.maestros OWNER TO kinder_owner;

-- =============================================
-- 6. TABLA SALONES
-- =============================================
CREATE TABLE IF NOT EXISTS kinder.salones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  capacidad_maxima integer DEFAULT 25,
  horario text,
  eliminado boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE kinder.salones OWNER TO kinder_owner;

-- =============================================
-- 7. TABLA INTERMEDIA MAESTROS_SALONES (N:M)
-- =============================================
CREATE TABLE IF NOT EXISTS kinder.maestros_salones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maestro_id uuid REFERENCES kinder.maestros(id) ON DELETE CASCADE,
  salon_id uuid REFERENCES kinder.salones(id) ON DELETE CASCADE,
  rol text,
  eliminado boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE kinder.maestros_salones OWNER TO kinder_owner;

-- =============================================
-- FUNCIÓN update_updated_at_column (idempotente)
-- =============================================
CREATE OR REPLACE FUNCTION kinder.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
ALTER FUNCTION kinder.update_updated_at_column() OWNER TO kinder_owner;

-- =============================================
-- TRIGGERS BEFORE UPDATE (idempotentes).
-- Solo en las 6 tablas con updated_at; NO en maestros_salones.
-- =============================================
DROP TRIGGER IF EXISTS update_alumnos_updated_at ON kinder.alumnos;
CREATE TRIGGER update_alumnos_updated_at
  BEFORE UPDATE ON kinder.alumnos
  FOR EACH ROW
  EXECUTE FUNCTION kinder.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cxc_updated_at ON kinder.cxc;
CREATE TRIGGER update_cxc_updated_at
  BEFORE UPDATE ON kinder.cxc
  FOR EACH ROW
  EXECUTE FUNCTION kinder.update_updated_at_column();

DROP TRIGGER IF EXISTS update_finanzas_updated_at ON kinder.finanzas;
CREATE TRIGGER update_finanzas_updated_at
  BEFORE UPDATE ON kinder.finanzas
  FOR EACH ROW
  EXECUTE FUNCTION kinder.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tutores_updated_at ON kinder.tutores;
CREATE TRIGGER update_tutores_updated_at
  BEFORE UPDATE ON kinder.tutores
  FOR EACH ROW
  EXECUTE FUNCTION kinder.update_updated_at_column();

DROP TRIGGER IF EXISTS update_maestros_updated_at ON kinder.maestros;
CREATE TRIGGER update_maestros_updated_at
  BEFORE UPDATE ON kinder.maestros
  FOR EACH ROW
  EXECUTE FUNCTION kinder.update_updated_at_column();

DROP TRIGGER IF EXISTS update_salones_updated_at ON kinder.salones;
CREATE TRIGGER update_salones_updated_at
  BEFORE UPDATE ON kinder.salones
  FOR EACH ROW
  EXECUTE FUNCTION kinder.update_updated_at_column();

-- =============================================
-- ÍNDICES (idempotentes)
-- =============================================
-- Columna eliminado en las 7 tablas
CREATE INDEX IF NOT EXISTS idx_alumnos_eliminado ON kinder.alumnos(eliminado);
CREATE INDEX IF NOT EXISTS idx_cxc_eliminado ON kinder.cxc(eliminado);
CREATE INDEX IF NOT EXISTS idx_finanzas_eliminado ON kinder.finanzas(eliminado);
CREATE INDEX IF NOT EXISTS idx_tutores_eliminado ON kinder.tutores(eliminado);
CREATE INDEX IF NOT EXISTS idx_maestros_eliminado ON kinder.maestros(eliminado);
CREATE INDEX IF NOT EXISTS idx_salones_eliminado ON kinder.salones(eliminado);
CREATE INDEX IF NOT EXISTS idx_maestros_salones_eliminado ON kinder.maestros_salones(eliminado);
-- FKs / relaciones
CREATE INDEX IF NOT EXISTS idx_cxc_alumno_id ON kinder.cxc(alumno_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_tutor_id ON kinder.alumnos(tutor_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_salon_id ON kinder.alumnos(salon_id);
CREATE INDEX IF NOT EXISTS idx_maestros_salones_maestro ON kinder.maestros_salones(maestro_id);
CREATE INDEX IF NOT EXISTS idx_maestros_salones_salon ON kinder.maestros_salones(salon_id);

-- =============================================
-- RLS + POLICIES allow-all para kinder_anon
-- (espejo del comportamiento Supabase)
-- =============================================
ALTER TABLE kinder.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinder.cxc ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinder.finanzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinder.tutores ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinder.maestros ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinder.salones ENABLE ROW LEVEL SECURITY;
ALTER TABLE kinder.maestros_salones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kinder_anon_allow_all ON kinder.alumnos;
CREATE POLICY kinder_anon_allow_all ON kinder.alumnos
  FOR ALL TO kinder_anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS kinder_anon_allow_all ON kinder.cxc;
CREATE POLICY kinder_anon_allow_all ON kinder.cxc
  FOR ALL TO kinder_anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS kinder_anon_allow_all ON kinder.finanzas;
CREATE POLICY kinder_anon_allow_all ON kinder.finanzas
  FOR ALL TO kinder_anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS kinder_anon_allow_all ON kinder.tutores;
CREATE POLICY kinder_anon_allow_all ON kinder.tutores
  FOR ALL TO kinder_anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS kinder_anon_allow_all ON kinder.maestros;
CREATE POLICY kinder_anon_allow_all ON kinder.maestros
  FOR ALL TO kinder_anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS kinder_anon_allow_all ON kinder.salones;
CREATE POLICY kinder_anon_allow_all ON kinder.salones
  FOR ALL TO kinder_anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS kinder_anon_allow_all ON kinder.maestros_salones;
CREATE POLICY kinder_anon_allow_all ON kinder.maestros_salones
  FOR ALL TO kinder_anon USING (true) WITH CHECK (true);

-- =============================================
-- GRANTS MÍNIMOS para kinder_anon (runtime de la app).
-- Incluye DELETE porque el smoke test T1 lo exige
-- (insert+select+update+delete como kinder_anon) y la
-- policy RLS es FOR ALL (espejo Supabase).
-- =============================================
GRANT USAGE ON SCHEMA kinder TO kinder_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA kinder TO kinder_anon;
ALTER DEFAULT PRIVILEGES FOR ROLE kinder_owner IN SCHEMA kinder
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kinder_anon;
GRANT EXECUTE ON FUNCTION kinder.update_updated_at_column() TO kinder_anon;
ALTER DEFAULT PRIVILEGES FOR ROLE kinder_owner IN SCHEMA kinder
  GRANT EXECUTE ON FUNCTIONS TO kinder_anon;
