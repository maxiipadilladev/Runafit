-- =====================================================
-- ACTUALIZAR CONSTRAINT DE ESTADO EN RESERVAS
-- =====================================================
-- Permite el nuevo estado 'confirmada' para reservas con créditos
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar el constraint antiguo
ALTER TABLE reservas 
DROP CONSTRAINT IF EXISTS reservas_estado_check;

-- 2. Crear el nuevo constraint con 'confirmada'
ALTER TABLE reservas
ADD CONSTRAINT reservas_estado_check 
CHECK (estado IN ('pendiente', 'pagada', 'confirmada', 'cancelada'));

-- 3. Verificar que se creó correctamente
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'reservas'::regclass 
AND conname = 'reservas_estado_check';
