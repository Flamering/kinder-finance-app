-- =============================================
-- NUEVAS TABLAS Y RELACIONES - KINDER FINANCE APP
-- Ejecutar este SQL en el SQL Editor de Supabase
-- =============================================

-- =============================================
-- 1. TABLA TUTORES (Clientes/Responsables)
-- =============================================
CREATE TABLE IF NOT EXISTS tutores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  email TEXT UNIQUE,
  telefono TEXT,
  telefono_secundario TEXT,
  direccion TEXT,
  colonia TEXT,
  ciudad TEXT,
  estado_fiscal TEXT,
  codigo_postal TEXT,
  rfc TEXT,
  curp TEXT,
  datos_facturacion JSONB,
  eliminado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. TABLA MAESTROS
-- =============================================
CREATE TABLE IF NOT EXISTS maestros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  email TEXT UNIQUE,
  telefono TEXT,
  telefono_emergencia TEXT,
  direccion TEXT,
  rfc TEXT,
  curp TEXT,
  especialidad TEXT,
  fecha_contratacion DATE DEFAULT CURRENT_DATE,
  activo BOOLEAN DEFAULT true,
  eliminado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. TABLA SALONES (Clases/Grupos)
-- =============================================
CREATE TABLE IF NOT EXISTS salones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  capacidad_maxima INTEGER DEFAULT 25,
  horario TEXT,
  eliminado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. TABLA INTERMEDIA: MAESTROS_SALONES (Relación N:M)
-- =============================================
CREATE TABLE IF NOT EXISTS maestros_salones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  maestro_id UUID REFERENCES maestros(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salones(id) ON DELETE CASCADE,
  rol TEXT DEFAULT 'Principal' CHECK (rol IN ('Principal', 'Asistente', 'Suplente')),
  eliminado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(maestro_id, salon_id)
);

-- =============================================
-- 5. AGREGAR RELACIONES A TABLA ALUMNOS
-- =============================================
ALTER TABLE alumnos 
  ADD COLUMN IF NOT EXISTS tutor_id UUID REFERENCES tutores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS eliminado BOOLEAN DEFAULT false;

-- =============================================
-- CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tutores_email ON tutores(email);
CREATE INDEX IF NOT EXISTS idx_tutores_rfc ON tutores(rfc);
CREATE INDEX IF NOT EXISTS idx_tutores_eliminado ON tutores(eliminado);
CREATE INDEX IF NOT EXISTS idx_maestros_email ON maestros(email);
CREATE INDEX IF NOT EXISTS idx_maestros_activo ON maestros(activo);
CREATE INDEX IF NOT EXISTS idx_maestros_eliminado ON maestros(eliminado);
CREATE INDEX IF NOT EXISTS idx_salones_nombre ON salones(nombre);
CREATE INDEX IF NOT EXISTS idx_salones_eliminado ON salones(eliminado);
CREATE INDEX IF NOT EXISTS idx_alumnos_tutor_id ON alumnos(tutor_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_salon_id ON alumnos(salon_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_eliminado ON alumnos(eliminado);
CREATE INDEX IF NOT EXISTS idx_maestros_salones_maestro ON maestros_salones(maestro_id);
CREATE INDEX IF NOT EXISTS idx_maestros_salones_salon ON maestros_salones(salon_id);
CREATE INDEX IF NOT EXISTS idx_maestros_salones_eliminado ON maestros_salones(eliminado);

-- =============================================
-- CREAR TRIGGERS PARA updated_at
-- =============================================
CREATE TRIGGER update_tutores_updated_at
  BEFORE UPDATE ON tutores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maestros_updated_at
  BEFORE UPDATE ON maestros
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salones_updated_at
  BEFORE UPDATE ON salones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE tutores ENABLE ROW LEVEL SECURITY;
ALTER TABLE maestros ENABLE ROW LEVEL SECURITY;
ALTER TABLE salones ENABLE ROW LEVEL SECURITY;
ALTER TABLE maestros_salones ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREAR POLÍTICAS DE SEGURIDAD
-- =============================================
CREATE POLICY "Permitir todo acceso a tutores" ON tutores
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo acceso a maestros" ON maestros
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo acceso a salones" ON salones
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo acceso a maestros_salones" ON maestros_salones
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- INSERTAR DATOS DE EJEMPLO
-- =============================================

-- Insertar tutores de ejemplo
INSERT INTO tutores (nombre_completo, email, telefono, telefono_secundario, direccion, colonia, ciudad, estado_fiscal, codigo_postal, rfc, curp) VALUES
('María González López', 'maria.gonzalez@email.com', '555-1001', '555-1002', 'Calle Roble 123', 'Col. Centro', 'Ciudad de México', 'CDMX', '06000', 'GOLM850101XXX', 'GOLM850101MDFNPR01'),
('Juan Pérez Martínez', 'juan.perez@email.com', '555-2001', NULL, 'Av. Juárez 456', 'Col. Moderna', 'Ciudad de México', 'CDMX', '06100', 'PEMJ900202XXX', 'PEMJ900202HDFRNN02'),
('Ana Rodríguez Silva', 'ana.rodriguez@email.com', '555-3001', '555-3002', 'Calle Pino 789', 'Col. Del Valle', 'Ciudad de México', 'CDMX', '06200', 'ROSA880303XXX', 'ROSA880303MDFDLN03'),
('Carlos Hernández Díaz', 'carlos.hdz@email.com', '555-4001', NULL, 'Blvd. Águilas 321', 'Col. Del Valle', 'Ciudad de México', 'CDMX', '06300', 'HEDC750404XXX', 'HEDC750404HDFRRR04'),
('Laura Sánchez Torres', 'laura.sanchez@email.com', '555-5001', '555-5002', 'Calle Cedro 654', 'Col. Roma', 'Ciudad de México', 'CDMX', '06400', 'SATL920505XXX', 'SATL920505MDFNRR05'),
('Roberto Morales Vargas', 'roberto.morales@email.com', '555-6001', NULL, 'Av. Insurgentes 987', 'Col. Condesa', 'Ciudad de México', 'CDMX', '06500', 'MOVR800606XXX', 'MOVR800606HDFLRB06'),
('Patricia Jiménez Cruz', 'patricia.jc@email.com', '555-7001', '555-7002', 'Calle Olivo 147', 'Col. Narvarte', 'Ciudad de México', 'CDMX', '06600', 'JICP870707XXX', 'JICP870707MDFMRC07'),
('Fernando López Ruiz', 'fernando.lopez@email.com', '555-8001', NULL, 'Calle Nogal 258', 'Col. Del Valle', 'Ciudad de México', 'CDMX', '06700', 'LORF830808XXX', 'LORF830808HDFPZN08'),
('Gabriela Martínez Flores', 'gabi.mtz@email.com', '555-9001', '555-9002', 'Av. Universidad 369', 'Col. Copilco', 'Ciudad de México', 'CDMX', '06800', 'MAFG910909XXX', 'MAFG910909MDFLRB09'),
('Miguel Ángel Castro Vega', 'miguel.castro@email.com', '555-1101', NULL, 'Calle Sauce 741', 'Col. Coyoacán', 'Ciudad de México', 'CDMX', '06900', 'CAVM861010XXX', 'CAVM861010HDFSRG10');

-- Insertar maestros de ejemplo
INSERT INTO maestros (nombre_completo, email, telefono, telefono_emergencia, direccion, rfc, curp, especialidad, fecha_contratacion) VALUES
('Sofía Ramírez Mendoza', 'sofia.ramirez@kinder.com', '555-5001', '555-5002', 'Calle Fresno 111', 'RAMS850101XXX', 'RAMS850101MDFMNF01', 'Educación Preescolar', '2022-08-15'),
('David Ortiz Delgado', 'david.ortiz@kinder.com', '555-5003', '555-5004', 'Av. Copérnico 222', 'ORD D880202XXX', 'ORD D880202HDFRLG02', 'Psicomotricidad', '2023-01-10'),
('Valentina Reyes Navarro', 'valentina.reyes@kinder.com', '555-5005', '555-5006', 'Calle Encino 333', 'RENV900303XXX', 'RENV900303MDFYVL03', 'Música y Artes', '2022-09-01'),
('Andrés Guerrero Luna', 'andres.guerrero@kinder.com', '555-5007', NULL, 'Blvd. diamante 444', 'GULA870404XXX', 'GULA870404HDFRNN04', 'Inglés', '2023-02-15'),
('Daniela Vega Campos', 'daniela.vega@kinder.com', '555-5009', '555-5010', 'Calle Perla 555', 'VECD920505XXX', 'VECD920505MDFGMN05', 'Psicología Infantil', '2022-08-20');

-- Insertar salones de ejemplo
INSERT INTO salones (nombre, descripcion, capacidad_maxima, horario) VALUES
('Pre-Kinder A', 'Grupo para niños de 3 años', 20, 'Lunes a Viernes 8:00-13:00'),
('Kinder B', 'Grupo para niños de 4 años', 25, 'Lunes a Viernes 8:00-13:00'),
('Kinder C', 'Grupo para niños de 5 años', 25, 'Lunes a Viernes 8:00-13:00'),
('Taller de Inglés', 'Clase de inglés complementaria', 15, 'Martes y Jueves 14:00-15:30'),
('Taller de Música', 'Clase de música y expresión artística', 20, 'Miércoles y Viernes 14:00-15:30'),
('Psicomotricidad', 'Clase de desarrollo motor', 20, 'Lunes y Miércoles 15:00-16:00');

-- Insertar relaciones maestros_salones
INSERT INTO maestros_salones (maestro_id, salon_id, rol) VALUES
-- Salón Pre-Kinder A con maestra principal
((SELECT id FROM maestros WHERE nombre_completo = 'Sofía Ramírez Mendoza'), (SELECT id FROM salones WHERE nombre = 'Pre-Kinder A'), 'Principal'),

-- Salón Kinder B con maestra principal y asistente
((SELECT id FROM maestros WHERE nombre_completo = 'David Ortiz Delgado'), (SELECT id FROM salones WHERE nombre = 'Kinder B'), 'Principal'),
((SELECT id FROM maestros WHERE nombre_completo = 'Valentina Reyes Navarro'), (SELECT id FROM salones WHERE nombre = 'Kinder B'), 'Asistente'),

-- Salón Kinder C con maestra principal
((SELECT id FROM maestros WHERE nombre_completo = 'Sofía Ramírez Mendoza'), (SELECT id FROM salones WHERE nombre = 'Kinder C'), 'Principal'),

-- Taller de Inglés
((SELECT id FROM maestros WHERE nombre_completo = 'Andrés Guerrero Luna'), (SELECT id FROM salones WHERE nombre = 'Taller de Inglés'), 'Principal'),

-- Taller de Música
((SELECT id FROM maestros WHERE nombre_completo = 'Valentina Reyes Navarro'), (SELECT id FROM salones WHERE nombre = 'Taller de Música'), 'Principal'),

-- Psicomotricidad
((SELECT id FROM maestros WHERE nombre_completo = 'David Ortiz Delgado'), (SELECT id FROM salones WHERE nombre = 'Psicomotricidad'), 'Principal');

-- Actualizar alumnos con tutor_id y salon_id (relaciones realistas)
UPDATE alumnos SET 
  tutor_id = (SELECT id FROM tutores ORDER BY id LIMIT 1 OFFSET 0),
  salon_id = (SELECT id FROM salones WHERE nombre = 'Pre-Kinder A' LIMIT 1)
WHERE nombre = 'Alumno 1';

UPDATE alumnos SET 
  tutor_id = (SELECT id FROM tutores ORDER BY id LIMIT 1 OFFSET 1),
  salon_id = (SELECT id FROM salones WHERE nombre = 'Kinder B' LIMIT 1)
WHERE nombre = 'Alumno 2';

UPDATE alumnos SET 
  tutor_id = (SELECT id FROM tutores ORDER BY id LIMIT 1 OFFSET 2),
  salon_id = (SELECT id FROM salones WHERE nombre = 'Kinder C' LIMIT 1)
WHERE nombre = 'Alumno 3';

UPDATE alumnos SET 
  tutor_id = (SELECT id FROM tutores ORDER BY id LIMIT 1 OFFSET 3),
  salon_id = (SELECT id FROM salones WHERE nombre = 'Pre-Kinder A' LIMIT 1)
WHERE nombre = 'Alumno 4';

UPDATE alumnos SET 
  tutor_id = (SELECT id FROM tutores ORDER BY id LIMIT 1 OFFSET 4),
  salon_id = (SELECT id FROM salones WHERE nombre = 'Kinder B' LIMIT 1)
WHERE nombre = 'Alumno 5';

UPDATE alumnos SET 
  tutor_id = (SELECT id FROM tutores ORDER BY id LIMIT 1 OFFSET 5),
  salon_id = (SELECT id FROM salones WHERE nombre = 'Kinder C' LIMIT 1)
WHERE nombre = 'Alumno 6';

UPDATE alumnos SET 
  tutor_id = (SELECT id FROM tutores ORDER BY id LIMIT 1 OFFSET 6),
  salon_id = (SELECT id FROM salones WHERE nombre = 'Pre-Kinder A' LIMIT 1)
WHERE nombre = 'Alumno 7';

UPDATE alumnos SET 
  tutor_id = (SELECT id FROM tutores ORDER BY id LIMIT 1 OFFSET 7),
  salon_id = (SELECT id FROM salones WHERE nombre = 'Kinder B' LIMIT 1)
WHERE nombre = 'Alumno 8';

UPDATE alumnos SET 
  tutor_id = (SELECT id FROM tutores ORDER BY id LIMIT 1 OFFSET 8),
  salon_id = (SELECT id FROM salones WHERE nombre = 'Kinder C' LIMIT 1)
WHERE nombre = 'Alumno 9';

UPDATE alumnos SET 
  tutor_id = (SELECT id FROM tutores ORDER BY id LIMIT 1 OFFSET 9),
  salon_id = (SELECT id FROM salones WHERE nombre = 'Pre-Kinder A' LIMIT 1)
WHERE nombre = 'Alumno 10';

UPDATE alumnos SET 
  tutor_id = (SELECT id FROM tutores ORDER BY id LIMIT 1 OFFSET 0),
  salon_id = (SELECT id FROM salones WHERE nombre = 'Kinder B' LIMIT 1)
WHERE nombre = 'Alumno 11';

UPDATE alumnos SET 
  tutor_id = (SELECT id FROM tutores ORDER BY id LIMIT 1 OFFSET 1),
  salon_id = (SELECT id FROM salones WHERE nombre = 'Kinder C' LIMIT 1)
WHERE nombre = 'Alumno 12';
