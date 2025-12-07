-- =====================================================
-- FIX RLS: Permisos de Admin para ver Créditos
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Permitir que el Admin vea los créditos de sus alumnas
-- (Necesario para el Dashboard "Créditos en Uso" y la tabla de Alumnas)

DROP POLICY IF EXISTS "Admin ve creditos de su estudio" ON creditos_alumna;

CREATE POLICY "Admin ve creditos de su estudio" ON creditos_alumna
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      JOIN admins a ON u.estudio_id = a.estudio_id
      WHERE u.id = creditos_alumna.alumna_id
      AND a.telefono = auth.jwt() ->> 'email'
    )
  );

-- 2. Permitir que el Admin gestione (Insert/Update) créditos (para "Vender Pack", "Liberar Cupo")
DROP POLICY IF EXISTS "Admin gestiona creditos de su estudio" ON creditos_alumna;

CREATE POLICY "Admin gestiona creditos de su estudio" ON creditos_alumna
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      JOIN admins a ON u.estudio_id = a.estudio_id
      WHERE u.id = creditos_alumna.alumna_id
      AND a.telefono = auth.jwt() ->> 'email'
    )
  );

-- 3. Asegurar que pueda ver usuarios (alumnas) si no estaba explícito
DROP POLICY IF EXISTS "Admin ve usuarios de su estudio" ON usuarios;

CREATE POLICY "Admin ve usuarios de su estudio" ON usuarios
  FOR SELECT
  USING (
    estudio_id IN (
      SELECT estudio_id FROM admins WHERE telefono = auth.jwt() ->> 'email'
    )
  );
