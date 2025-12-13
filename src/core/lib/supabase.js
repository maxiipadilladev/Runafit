import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validar que las variables estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Faltan variables de entorno de Supabase')
  console.error('Asegurate de tener configurado .env.local con:')
  console.error('- VITE_SUPABASE_URL')
  console.error('- VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper para debug
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('usuarios').select('count')
    if (error) throw error
    console.log('✅ Conexión a Supabase exitosa')
    return true
  } catch (error) {
    console.error('❌ Error conectando a Supabase:', error.message)
    return false
  }
}
