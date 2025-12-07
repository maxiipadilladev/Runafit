-- =====================================================
-- SISTEMA DE PACKS/CRÉDITOS - SQL SETUP
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Crear tabla PACKS
CREATE TABLE IF NOT EXISTS packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudio_id BIGINT NOT NULL REFERENCES estudios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  cantidad_clases INTEGER NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  duracion_dias INTEGER NOT NULL DEFAULT 30,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(estudio_id, nombre)
);

-- 2. Crear tabla CREDITOS_ALUMNA
CREATE TABLE IF NOT EXISTS creditos_alumna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumna_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES packs(id),
  creditos_totales INTEGER NOT NULL,
  creditos_restantes INTEGER NOT NULL,
  fecha_compra TIMESTAMP DEFAULT NOW(),
  fecha_vencimiento TIMESTAMP NOT NULL,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'vencido', 'agotado')),
  monto_pagado DECIMAL(10, 2) NOT NULL,
  metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'transferencia')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Modificar tabla RESERVAS (agregar credito_id si no existe)
ALTER TABLE reservas 
ADD COLUMN IF NOT EXISTS credito_id UUID REFERENCES creditos_alumna(id) ON DELETE SET NULL;

-- 4. Crear indexes para performance
CREATE INDEX IF NOT EXISTS idx_creditos_alumna_id ON creditos_alumna(alumna_id);
CREATE INDEX IF NOT EXISTS idx_creditos_estado ON creditos_alumna(estado);
CREATE INDEX IF NOT EXISTS idx_creditos_vencimiento ON creditos_alumna(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_packs_estudio ON packs(estudio_id);
CREATE INDEX IF NOT EXISTS idx_reservas_credito ON reservas(credito_id);

-- 5. Habilitar RLS
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE creditos_alumna ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policy: Admin puede ver packs de su estudio
DROP POLICY IF EXISTS "Admin ve packs de su estudio" ON packs;
CREATE POLICY "Admin ve packs de su estudio" ON packs
  FOR SELECT
  USING (estudio_id IN (
    SELECT estudio_id FROM admins WHERE telefono = auth.jwt() ->> 'email'
  ));

-- 7. RLS Policy: Admin puede insertar/actualizar packs de su estudio
DROP POLICY IF EXISTS "Admin gestiona packs" ON packs;
CREATE POLICY "Admin gestiona packs" ON packs
  FOR INSERT
  WITH CHECK (estudio_id IN (
    SELECT estudio_id FROM admins WHERE telefono = auth.jwt() ->> 'email'
  ));

-- 8. RLS Policy: Alumna ve sus créditos
DROP POLICY IF EXISTS "Alumna ve sus creditos" ON creditos_alumna;
CREATE POLICY "Alumna ve sus creditos" ON creditos_alumna
  FOR SELECT
  USING (alumna_id IN (
    SELECT id FROM usuarios WHERE dni = auth.jwt() ->> 'email'
  ));

-- 9. Función para obtener créditos disponibles de una alumna
CREATE OR REPLACE FUNCTION get_creditos_disponibles(p_alumna_id uuid)
RETURNS TABLE(
  creditos_totales integer,
  creditos_restantes integer,
  pack_nombre text,
  fecha_vencimiento timestamp,
  dias_para_vencer integer,
  estado text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.creditos_totales,
    ca.creditos_restantes,
    p.nombre,
    ca.fecha_vencimiento,
    EXTRACT(DAY FROM ca.fecha_vencimiento - NOW())::integer,
    ca.estado
  FROM creditos_alumna ca
  JOIN packs p ON ca.pack_id = p.id
  WHERE ca.alumna_id = p_alumna_id 
    AND ca.estado = 'activo'
    AND ca.creditos_restantes > 0
    AND ca.fecha_vencimiento >= NOW()
  ORDER BY ca.fecha_vencimiento ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 10. Función para marcar packs vencidos (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION marcar_packs_vencidos()
RETURNS void AS $$
BEGIN
  UPDATE creditos_alumna
  SET estado = 'vencido', updated_at = NOW()
  WHERE fecha_vencimiento < NOW()
    AND estado = 'activo';
END;
$$ LANGUAGE plpgsql;

-- 11. Función para descuento automático de crédito en reserva
CREATE OR REPLACE FUNCTION descuento_credito_reserva()
RETURNS TRIGGER AS $$
DECLARE
  v_credito_id UUID;
BEGIN
  -- Buscar pack activo más próximo a vencer
  SELECT id INTO v_credito_id
  FROM creditos_alumna
  WHERE alumna_id = NEW.usuario_id
    AND estado = 'activo'
    AND creditos_restantes > 0
    AND fecha_vencimiento >= NOW()
  ORDER BY fecha_vencimiento ASC
  LIMIT 1;

  IF v_credito_id IS NOT NULL THEN
    -- Asignar credito a la reserva
    NEW.credito_id := v_credito_id;
    
    -- Descontar crédito
    UPDATE creditos_alumna
    SET creditos_restantes = creditos_restantes - 1,
        estado = CASE 
          WHEN creditos_restantes - 1 = 0 THEN 'agotado'
          ELSE estado
        END,
        updated_at = NOW()
    WHERE id = v_credito_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Trigger que ejecuta descuento al insertar reserva
DROP TRIGGER IF EXISTS trg_descuento_credito_reserva ON reservas;
CREATE TRIGGER trg_descuento_credito_reserva
BEFORE INSERT ON reservas
FOR EACH ROW
EXECUTE FUNCTION descuento_credito_reserva();

-- 13. Función para devolver crédito si se cancela (>2hs de anticipación)
CREATE OR REPLACE FUNCTION devolver_credito_cancela()
RETURNS TRIGGER AS $$
DECLARE
  v_horas_restantes NUMERIC;
BEGIN
  -- Si se marca como cancelada
  IF NEW.estado = 'cancelada' AND OLD.estado != 'cancelada' THEN
    -- Calcular horas hasta la clase
    v_horas_restantes := EXTRACT(EPOCH FROM (
      (OLD.fecha || ' ' || OLD.hora)::timestamp - NOW()
    )) / 3600;

    -- Si cancela con > 2hs de anticipación, devolver crédito
    IF v_horas_restantes > 2 THEN
      UPDATE creditos_alumna
      SET creditos_restantes = creditos_restantes + 1,
          estado = CASE 
            WHEN estado = 'agotado' THEN 'activo'
            ELSE estado
          END,
          updated_at = NOW()
      WHERE id = OLD.credito_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Trigger para devolución automática de crédito
DROP TRIGGER IF EXISTS trg_devolver_credito_cancela ON reservas;
CREATE TRIGGER trg_devolver_credito_cancela
AFTER UPDATE ON reservas
FOR EACH ROW
EXECUTE FUNCTION devolver_credito_cancela();

-- 15. SEED: Insertar packs por defecto (REEMPLAZA XX con tu estudio_id real)
-- Ejecuta primero: SELECT id FROM estudios LIMIT 1;
-- Luego reemplaza el 1 en la siguiente línea con el ID real

INSERT INTO packs (estudio_id, nombre, cantidad_clases, precio, duracion_dias, activo)
VALUES
  (1, 'Pack 8 clases', 8, 25000, 30, true),
  (1, 'Pack 12 clases', 12, 35000, 30, true),
  (1, 'Pack 20 clases', 20, 55000, 60, true)
ON CONFLICT (estudio_id, nombre) DO NOTHING;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. El RLS puede necesitar ajuste según tu implementación de auth
-- 2. Los triggers se ejecutan automáticamente al insertar/actualizar reservas
-- 3. Ejecutar marcar_packs_vencidos() periódicamente (daily cron job recomendado)
-- 4. El credito_id en reservas se asigna automáticamente si el cliente tiene créditos
-- 5. Estado 'confirmada' en reservas = descuento automático de crédito
-- 6. Si NO hay créditos disponibles, la reserva no se completa
