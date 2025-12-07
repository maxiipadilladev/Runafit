-- =====================================================
-- ACTUALIZAR UNIQUE CONSTRAINT PARA PERMITIR CANCELADAS
-- =====================================================
-- El constraint debe permitir múltiples reservas canceladas
-- pero evitar duplicados en reservas activas

-- 1. Eliminar el constraint antiguo
ALTER TABLE reservas 
DROP CONSTRAINT IF EXISTS reservas_fecha_hora_cama_id_key;

-- 2. Crear un nuevo constraint parcial que excluye canceladas
-- PostgreSQL permite crear índices parciales (WHERE estado != 'cancelada')
CREATE UNIQUE INDEX reservas_fecha_hora_cama_id_key 
ON reservas (fecha, hora, cama_id) 
WHERE estado != 'cancelada';

-- 3. Verificar que se creó
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'reservas' 
AND indexname = 'reservas_fecha_hora_cama_id_key';
