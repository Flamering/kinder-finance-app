-- =============================================
-- CREAR TABLAS PARA KINDER FINANCE APP
-- Ejecutar este SQL en el SQL Editor de Supabase
-- =============================================

-- 1. TABLA ALUMNOS
CREATE TABLE IF NOT EXISTS alumnos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  grado TEXT NOT NULL,
  tutor TEXT,
  telefono TEXT,
  email TEXT,
  estado TEXT DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo', 'Moroso')),
  fecha_inscripcion DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA CUENTAS POR COBRAR (CxC)
CREATE TABLE IF NOT EXISTS cxc (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id UUID REFERENCES alumnos(id) ON DELETE CASCADE,
  alumno_nombre TEXT NOT NULL,
  concepto TEXT NOT NULL,
  monto NUMERIC(10, 2) NOT NULL,
  monto_pagado NUMERIC(10, 2) DEFAULT 0,
  fecha_emision DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  estado TEXT DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pagado', 'Vencido', 'Parcial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA FINANZAS
CREATE TABLE IF NOT EXISTS finanzas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('Ingreso', 'Gasto')),
  categoria TEXT NOT NULL,
  monto NUMERIC(10, 2) NOT NULL,
  descripcion TEXT,
  fecha DATE DEFAULT CURRENT_DATE,
  metodo_pago TEXT CHECK (metodo_pago IN ('Transferencia', 'Efectivo', 'Tarjeta')),
  estado TEXT DEFAULT 'Completado' CHECK (estado IN ('Completado', 'Pendiente')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- =============================================
CREATE INDEX IF NOT EXISTS idx_alumnos_estado ON alumnos(estado);
CREATE INDEX IF NOT EXISTS idx_cxc_alumno_id ON cxc(alumno_id);
CREATE INDEX IF NOT EXISTS idx_cxc_estado ON cxc(estado);
CREATE INDEX IF NOT EXISTS idx_finanzas_tipo ON finanzas(tipo);
CREATE INDEX IF NOT EXISTS idx_finanzas_estado ON finanzas(estado);

-- =============================================
-- CREAR FUNCIÓN PARA ACTUALIZAR updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CREAR TRIGGERS PARA updated_at
-- =============================================
CREATE TRIGGER update_alumnos_updated_at
  BEFORE UPDATE ON alumnos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cxc_updated_at
  BEFORE UPDATE ON cxc
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finanzas_updated_at
  BEFORE UPDATE ON finanzas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cxc ENABLE ROW LEVEL SECURITY;
ALTER TABLE finanzas ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREAR POLÍTICAS DE SEGURIDAD (Permitir todo para anon)
-- =============================================

-- Políticas para alumnos
CREATE POLICY "Permitir todo acceso a alumnos" ON alumnos
  FOR ALL USING (true) WITH CHECK (true);

-- Políticas para cxc
CREATE POLICY "Permitir todo acceso a cxc" ON cxc
  FOR ALL USING (true) WITH CHECK (true);

-- Políticas para finanzas
CREATE POLICY "Permitir todo acceso a finanzas" ON finanzas
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- INSERTAR DATOS DE EJEMPLO (OPCIONAL)
-- =============================================

-- Insertar alumnos de ejemplo
INSERT INTO alumnos (nombre, grado, tutor, telefono, email, estado, fecha_inscripcion) VALUES
('Alumno 1', 'Pre-Kinder', 'Tutor 1', '555-0001', 'alumno1@email.com', 'Activo', '2024-01-15'),
('Alumno 2', 'Kinder A', 'Tutor 2', '555-0002', 'alumno2@email.com', 'Activo', '2024-01-16'),
('Alumno 3', 'Kinder B', 'Tutor 3', '555-0003', 'alumno3@email.com', 'Moroso', '2024-01-17'),
('Alumno 4', 'Pre-Kinder', 'Tutor 4', '555-0004', 'alumno4@email.com', 'Activo', '2024-01-18'),
('Alumno 5', 'Kinder A', 'Tutor 5', '555-0005', 'alumno5@email.com', 'Inactivo', '2024-01-19'),
('Alumno 6', 'Kinder B', 'Tutor 6', '555-0006', 'alumno6@email.com', 'Activo', '2024-01-20'),
('Alumno 7', 'Pre-Kinder', 'Tutor 7', '555-0007', 'alumno7@email.com', 'Activo', '2024-01-21'),
('Alumno 8', 'Kinder A', 'Tutor 8', '555-0008', 'alumno8@email.com', 'Moroso', '2024-01-22'),
('Alumno 9', 'Kinder B', 'Tutor 9', '555-0009', 'alumno9@email.com', 'Activo', '2024-01-23'),
('Alumno 10', 'Pre-Kinder', 'Tutor 10', '555-0010', 'alumno10@email.com', 'Activo', '2024-01-24'),
('Alumno 11', 'Kinder A', 'Tutor 11', '555-0011', 'alumno11@email.com', 'Activo', '2024-01-25'),
('Alumno 12', 'Kinder B', 'Tutor 12', '555-0012', 'alumno12@email.com', 'Inactivo', '2024-01-26');

-- Insertar CxC de ejemplo
INSERT INTO cxc (alumno_nombre, concepto, monto, monto_pagado, fecha_emision, fecha_vencimiento, estado) VALUES
('Alumno 1', 'Mensualidad', 500.00, 500.00, '2024-04-01', '2024-04-15', 'Pagado'),
('Alumno 2', 'Inscripción', 800.00, 400.00, '2024-04-01', '2024-04-15', 'Parcial'),
('Alumno 3', 'Mensualidad', 500.00, 0.00, '2024-04-01', '2024-04-15', 'Vencido'),
('Alumno 4', 'Actividad Extra', 300.00, 300.00, '2024-04-01', '2024-04-15', 'Pagado'),
('Alumno 5', 'Uniforme', 600.00, 0.00, '2024-04-01', '2024-04-15', 'Pendiente'),
('Alumno 6', 'Mensualidad', 500.00, 500.00, '2024-04-01', '2024-04-15', 'Pagado'),
('Alumno 7', 'Material', 200.00, 100.00, '2024-04-01', '2024-04-15', 'Parcial'),
('Alumno 8', 'Mensualidad', 500.00, 0.00, '2024-04-01', '2024-04-15', 'Vencido'),
('Alumno 9', 'Inscripción', 800.00, 800.00, '2024-04-01', '2024-04-15', 'Pagado'),
('Alumno 10', 'Mensualidad', 500.00, 0.00, '2024-04-01', '2024-04-15', 'Pendiente');

-- Insertar Finanzas de ejemplo
INSERT INTO finanzas (tipo, categoria, monto, descripcion, fecha, metodo_pago, estado) VALUES
('Ingreso', 'Mensualidad', 5000.00, 'Pagos de mensualidad Abril', '2024-04-11', 'Transferencia', 'Completado'),
('Gasto', 'Nómina', 3000.00, 'Pago maestros Abril', '2024-04-11', 'Transferencia', 'Completado'),
('Ingreso', 'Inscripción', 2400.00, 'Inscripciones nuevas', '2024-04-10', 'Efectivo', 'Completado'),
('Gasto', 'Mantenimiento', 800.00, 'Reparación aulas', '2024-04-10', 'Tarjeta', 'Completado'),
('Ingreso', 'Actividad Extra', 1500.00, 'Taller de inglés', '2024-04-09', 'Efectivo', 'Completado'),
('Gasto', 'Material', 600.00, 'Material escolar', '2024-04-09', 'Tarjeta', 'Completado'),
('Ingreso', 'Mensualidad', 4500.00, 'Pagos mensualidad Mayo', '2024-04-08', 'Transferencia', 'Pendiente'),
('Gasto', 'Servicios', 1200.00, 'Luz y agua', '2024-04-08', 'Transferencia', 'Pendiente'),
('Ingreso', 'Uniforme', 1800.00, 'Venta de uniformes', '2024-04-07', 'Efectivo', 'Completado'),
('Gasto', 'Nómina', 3000.00, 'Pago maestros Mayo', '2024-04-07', 'Transferencia', 'Pendiente');
u