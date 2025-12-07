# 📋 Análisis: De DEMO a Producción
## RunaFit - Sistema de Gestión para Studios de Pilates

---

## 🎯 Estado Actual (DEMO)

### ✅ Lo que ya tiene:
- ✓ UI/UX completa y profesional
- ✓ Navegación entre vistas (Login, Cliente, Admin, Landing)
- ✓ Sistema de reservas con selección de camas
- ✓ Panel administrativo con métricas
- ✓ Estados de pago simulados (pagado/pendiente/vencido)
- ✓ Componentes React bien estructurados
- ✓ Diseño responsive con TailwindCSS
- ✓ Docker configurado para desarrollo

### ❌ Lo que le falta (datos en memoria, sin persistencia real):
- ❌ **Base de datos** - Todo está en estado local (se pierde al recargar)
- ❌ **Autenticación real** - Solo simulación de login
- ❌ **API Backend** - No hay servidor, solo frontend
- ❌ **Notificaciones WhatsApp** - No hay integración
- ❌ **Pagos reales** - No hay integración con Mercado Pago
- ❌ **Sistema de recordatorios automáticos**
- ❌ **Gestión de usuarios persistente**

---

## 🏗️ ARQUITECTURA DE PRODUCCIÓN RECOMENDADA

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  - Vite + React 18 + TailwindCSS                        │
│  - Autenticación con Supabase Auth                      │
│  - Real-time subscriptions                              │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              SUPABASE (Backend-as-a-Service)            │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐                │
│  │  PostgreSQL    │  │  Auth Service  │                │
│  │  - Usuarios    │  │  - JWT Tokens  │                │
│  │  - Reservas    │  │  - Row Level   │                │
│  │  - Pagos       │  │    Security    │                │
│  │  - Horarios    │  └────────────────┘                │
│  └────────────────┘                                     │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐                │
│  │  Edge Functions│  │  Realtime DB   │                │
│  │  - Webhooks MP │  │  - Live Updates│                │
│  │  - Envío WA    │  │  - Suscripciones│               │
│  │  - Cron Jobs   │  └────────────────┘                │
│  └────────────────┘                                     │
└─────────────┬───────────────┬───────────────────────────┘
              │               │
              ▼               ▼
┌─────────────────────┐  ┌─────────────────────┐
│   MERCADO PAGO      │  │   WHATSAPP API      │
│   - Webhooks        │  │   - Meta Business   │
│   - Payment Links   │  │   - Twilio/Wati     │
│   - Subscription    │  │   - Messages        │
└─────────────────────┘  └─────────────────────┘
```

---

## 🗄️ DISEÑO DE BASE DE DATOS (Supabase PostgreSQL)

### Tablas Principales:

```sql
-- 1. USUARIOS (profiles)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dni TEXT UNIQUE NOT NULL,
  nombre_completo TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT,
  rol TEXT CHECK (rol IN ('cliente', 'admin')) DEFAULT 'cliente',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PLANES Y CUOTAS
CREATE TABLE planes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL, -- "Mensual 12 clases", "Pack 8 clases"
  precio DECIMAL(10,2) NOT NULL,
  clases_incluidas INTEGER NOT NULL,
  duracion_dias INTEGER NOT NULL DEFAULT 30,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SUSCRIPCIONES DE CLIENTES
CREATE TABLE suscripciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES planes(id),
  fecha_inicio DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  clases_restantes INTEGER NOT NULL,
  estado TEXT CHECK (estado IN ('activa', 'vencida', 'cancelada')) DEFAULT 'activa',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PAGOS
CREATE TABLE pagos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suscripcion_id UUID REFERENCES suscripciones(id),
  cliente_id UUID REFERENCES profiles(id),
  monto DECIMAL(10,2) NOT NULL,
  metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'transferencia', 'mercadopago')),
  estado TEXT CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')) DEFAULT 'pendiente',
  mercadopago_id TEXT, -- ID de pago de Mercado Pago
  fecha_pago TIMESTAMPTZ,
  comprobante_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CAMAS / EQUIPOS
CREATE TABLE camas (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL, -- "Cama 1", "Reformer A"
  activa BOOLEAN DEFAULT true,
  notas TEXT
);

-- 6. HORARIOS DISPONIBLES (plantilla semanal)
CREATE TABLE horarios_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Domingo
  hora TIME NOT NULL,
  capacidad INTEGER NOT NULL DEFAULT 6,
  activo BOOLEAN DEFAULT true
);

-- 7. RESERVAS
CREATE TABLE reservas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  suscripcion_id UUID REFERENCES suscripciones(id),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  cama_id INTEGER REFERENCES camas(id),
  estado TEXT CHECK (estado IN ('reservada', 'confirmada', 'cancelada', 'completada')) DEFAULT 'reservada',
  recordatorio_enviado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: Una cama no puede estar ocupada dos veces a la misma hora
  CONSTRAINT reserva_unica UNIQUE (fecha, hora, cama_id)
);

-- 8. NOTIFICACIONES (Log de mensajes enviados)
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES profiles(id),
  tipo TEXT CHECK (tipo IN ('recordatorio', 'pago', 'confirmacion', 'cancelacion')),
  mensaje TEXT NOT NULL,
  whatsapp_status TEXT, -- 'sent', 'delivered', 'read', 'failed'
  enviado_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CONFIGURACIÓN DEL SISTEMA
CREATE TABLE configuracion (
  clave TEXT PRIMARY KEY,
  valor JSONB NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS) - Seguridad a nivel de fila:

```sql
-- Clientes solo ven sus propios datos
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes ven sus reservas" ON reservas
  FOR SELECT
  USING (auth.uid() = cliente_id);

CREATE POLICY "Admins ven todas las reservas" ON reservas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Similar para otras tablas...
```

---

## 📱 INTEGRACIÓN WHATSAPP

### Opción 1: **WhatsApp Business API (Meta) - Oficial** ⭐ Recomendado

**Pros:**
- Oficial de Meta
- Más confiable y escalable
- Templates pre-aprobados
- Webhooks para respuestas

**Cons:**
- Requiere verificación de negocio
- Proceso de aprobación (1-2 semanas)
- Costo por mensaje ($0.005 - $0.02 USD c/u)

**Implementación con Supabase Edge Function:**

```typescript
// supabase/functions/enviar-whatsapp/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN')
const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID')

serve(async (req) => {
  try {
    const { telefono, tipo, datos } = await req.json()
    
    // Obtener template según tipo de mensaje
    const templates = {
      recordatorio: {
        name: "recordatorio_clase",
        language: { code: "es_AR" },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: datos.nombreCliente },
            { type: "text", text: datos.fecha },
            { type: "text", text: datos.hora },
            { type: "text", text: datos.cama }
          ]
        }]
      },
      pago_pendiente: {
        name: "pago_pendiente",
        language: { code: "es_AR" },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: datos.monto },
            { type: "text", text: datos.linkPago }
          ]
        }]
      },
      confirmacion: {
        name: "confirmacion_reserva",
        language: { code: "es_AR" },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: datos.fecha },
            { type: "text", text: datos.hora }
          ]
        }]
      }
    }

    // Enviar mensaje
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: telefono.replace(/[^0-9]/g, ''), // Limpiar formato
          type: "template",
          template: templates[tipo]
        }),
      }
    )

    const result = await response.json()

    // Guardar log en BD
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabase.from('notificaciones').insert({
      cliente_id: datos.clienteId,
      tipo: tipo,
      mensaje: JSON.stringify(templates[tipo]),
      whatsapp_status: result.messages ? 'sent' : 'failed'
    })

    return new Response(
      JSON.stringify({ success: true, messageId: result.messages?.[0]?.id }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

**Templates de WhatsApp a crear en Meta Business:**

```
Template: recordatorio_clase
Categoría: UTILITY
Idioma: Español (Argentina)
---
¡Hola {{1}}! 👋

Recordatorio: Tenés clase agendada para *{{2}}* a las *{{3}}* en la *Cama {{4}}*.

¡Te esperamos! 💪

Template: pago_pendiente
Categoría: UTILITY
Idioma: Español (Argentina)
---
Hola! Tu cuota de *${{1}}* está por vencer.

Pagá ahora para seguir disfrutando de tus clases:
{{2}}

Template: confirmacion_reserva
Categoría: UTILITY
---
✅ *Reserva confirmada*

📅 Fecha: {{1}}
🕐 Hora: {{2}}

¡Nos vemos!
```

### Opción 2: **Twilio (WhatsApp Business API reseller)**

**Pros:**
- Setup más rápido que Meta directo
- Documentación excelente
- SDK en múltiples lenguajes

**Cons:**
- Más caro ($0.005 - $0.10 USD por mensaje)
- También requiere templates aprobados

```typescript
// Edge Function con Twilio
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER')

const enviarWhatsAppTwilio = async (telefono: string, mensaje: string) => {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  
  const params = new URLSearchParams({
    From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
    To: `whatsapp:${telefono}`,
    Body: mensaje
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  })

  return await response.json()
}
```

### Opción 3: **WATI.io / Respond.io** (Plataformas No-Code)

**Pros:**
- Interfaz gráfica para gestionar templates
- Webhooks fáciles de configurar
- Planes desde $29/mes
- No requiere desarrollo complejo

**Cons:**
- Menos control técnico
- Vendor lock-in
- Limitaciones de personalización

---

## 💳 INTEGRACIÓN MERCADO PAGO

### Setup de Mercado Pago:

```typescript
// supabase/functions/crear-pago/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')

serve(async (req) => {
  const { suscripcionId, clienteId, monto, concepto } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Obtener datos del cliente
  const { data: cliente } = await supabase
    .from('profiles')
    .select('nombre_completo, email, telefono')
    .eq('id', clienteId)
    .single()

  // Crear preferencia de pago
  const preference = {
    items: [{
      title: concepto,
      quantity: 1,
      unit_price: monto,
      currency_id: "ARS"
    }],
    payer: {
      name: cliente.nombre_completo,
      email: cliente.email,
      phone: {
        area_code: "",
        number: cliente.telefono
      }
    },
    back_urls: {
      success: `${Deno.env.get('FRONTEND_URL')}/pago/success`,
      failure: `${Deno.env.get('FRONTEND_URL')}/pago/failure`,
      pending: `${Deno.env.get('FRONTEND_URL')}/pago/pending`
    },
    auto_return: "approved",
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-mercadopago`,
    external_reference: suscripcionId,
    statement_descriptor: "RUNAFIT",
    expires: true,
    expiration_date_from: new Date().toISOString(),
    expiration_date_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
  }

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preference)
  })

  const result = await response.json()

  // Guardar pago pendiente en BD
  await supabase.from('pagos').insert({
    suscripcion_id: suscripcionId,
    cliente_id: clienteId,
    monto: monto,
    metodo_pago: 'mercadopago',
    estado: 'pendiente',
    mercadopago_id: result.id
  })

  // Enviar link por WhatsApp
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/enviar-whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telefono: cliente.telefono,
      tipo: 'pago_pendiente',
      datos: {
        monto: monto,
        linkPago: result.init_point,
        clienteId: clienteId
      }
    })
  })

  return new Response(
    JSON.stringify({ 
      success: true, 
      paymentLink: result.init_point,
      paymentId: result.id 
    }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

### Webhook para recibir notificaciones de pago:

```typescript
// supabase/functions/webhook-mercadopago/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { type, data } = await req.json()

  if (type === "payment") {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener detalles del pago desde Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}`
      }
    })

    const payment = await response.json()

    if (payment.status === 'approved') {
      // Actualizar pago en BD
      const { data: pago } = await supabase
        .from('pagos')
        .update({
          estado: 'aprobado',
          fecha_pago: new Date().toISOString()
        })
        .eq('mercadopago_id', payment.preference_id)
        .select()
        .single()

      // Actualizar suscripción
      await supabase
        .from('suscripciones')
        .update({
          estado: 'activa',
          fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', pago.suscripcion_id)

      // Enviar confirmación por WhatsApp
      const { data: cliente } = await supabase
        .from('profiles')
        .select('telefono, nombre_completo')
        .eq('id', pago.cliente_id)
        .single()

      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/enviar-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: cliente.telefono,
          tipo: 'confirmacion',
          datos: {
            nombreCliente: cliente.nombre_completo,
            monto: payment.transaction_amount
          }
        })
      })
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  })
})
```

---

## ⏰ SISTEMA DE RECORDATORIOS AUTOMÁTICOS

### Cron Job con Supabase (pg_cron extension):

```sql
-- Activar extensión pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job que se ejecuta cada hora para enviar recordatorios
SELECT cron.schedule(
  'enviar-recordatorios-24hs',
  '0 * * * *', -- Cada hora
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/procesar-recordatorios',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

### Edge Function para procesar recordatorios:

```typescript
// supabase/functions/procesar-recordatorios/index.ts
serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Obtener reservas para mañana que no tienen recordatorio enviado
  const manana = new Date()
  manana.setDate(manana.getDate() + 1)
  manana.setHours(0, 0, 0, 0)

  const pasadoManana = new Date(manana)
  pasadoManana.setDate(pasadoManana.getDate() + 1)

  const { data: reservas } = await supabase
    .from('reservas')
    .select(`
      *,
      cliente:profiles(nombre_completo, telefono),
      cama:camas(nombre)
    `)
    .gte('fecha', manana.toISOString())
    .lt('fecha', pasadoManana.toISOString())
    .eq('recordatorio_enviado', false)
    .eq('estado', 'confirmada')

  // Enviar recordatorio a cada cliente
  for (const reserva of reservas || []) {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/enviar-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefono: reserva.cliente.telefono,
        tipo: 'recordatorio',
        datos: {
          nombreCliente: reserva.cliente.nombre_completo,
          fecha: reserva.fecha,
          hora: reserva.hora,
          cama: reserva.cama.nombre,
          clienteId: reserva.cliente_id
        }
      })
    })

    // Marcar como enviado
    await supabase
      .from('reservas')
      .update({ recordatorio_enviado: true })
      .eq('id', reserva.id)
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      recordatoriosEnviados: reservas?.length || 0 
    }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

---

## 🔐 AUTENTICACIÓN Y SEGURIDAD

### Configuración de Supabase Auth:

```typescript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Login de Cliente con DNI:

```typescript
// src/components/LoginView.jsx (modificado)
const handleAlumnaLogin = async () => {
  try {
    // 1. Buscar usuario por DNI
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('dni', dni)
      .single()

    if (profileError || !profile) {
      alert('DNI no registrado. Consultá con el administrador.')
      return
    }

    // 2. Generar magic link o usar password temporal
    const { error: signInError } = await supabase.auth.signInWithOtp({
      phone: profile.telefono,
      options: {
        channel: 'whatsapp' // Envía código por WhatsApp!
      }
    })

    if (signInError) throw signInError

    alert('Te enviamos un código por WhatsApp')
    // Mostrar campo para ingresar código...
    
  } catch (error) {
    console.error('Error login:', error)
    alert('Error al iniciar sesión')
  }
}
```

### Login de Admin con Email/Password:

```typescript
const handleAdminLogin = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    })

    if (error) throw error

    // Verificar que sea admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', data.user.id)
      .single()

    if (profile.rol !== 'admin') {
      await supabase.auth.signOut()
      alert('No tenés permisos de administrador')
      return
    }

    // Redirigir a dashboard admin
    navigate('/admin')
    
  } catch (error) {
    alert('Credenciales incorrectas')
  }
}
```

---

## 📦 MODIFICACIONES NECESARIAS EN EL CÓDIGO ACTUAL

### 1. Instalar dependencias nuevas:

```bash
npm install @supabase/supabase-js
npm install react-router-dom  # Para navegación real
npm install zustand  # Para estado global (opcional)
npm install date-fns  # Para manejo de fechas
```

### 2. Estructura de carpetas propuesta:

```
src/
├── lib/
│   ├── supabase.js           # Cliente de Supabase
│   └── api.js                # Funciones API wrapper
├── hooks/
│   ├── useAuth.js            # Hook de autenticación
│   ├── useReservas.js        # Hook de reservas
│   └── usePagos.js           # Hook de pagos
├── components/
│   ├── auth/
│   │   ├── LoginView.jsx     # Ya existe (modificar)
│   │   └── ProtectedRoute.jsx
│   ├── cliente/
│   │   ├── ClientBookingView.jsx  # Ya existe (modificar)
│   │   └── PaymentStatus.jsx
│   ├── admin/
│   │   ├── AdminDashboard.jsx     # Ya existe (modificar)
│   │   └── PaymentRegistry.jsx
│   └── shared/
│       ├── Loading.jsx
│       └── ErrorBoundary.jsx
├── utils/
│   ├── fechas.js
│   └── validaciones.js
└── App.jsx
```

### 3. Modificar componentes para usar datos reales:

#### ClientBookingView.jsx (ejemplo de cambio):

```typescript
// ANTES (Demo):
const [bookings, setBookings] = useState([])

// DESPUÉS (Real):
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ClientBookingView = () => {
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    // Obtener usuario actual
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return

    // Cargar reservas del usuario
    const fetchReservas = async () => {
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          *,
          cama:camas(nombre),
          suscripcion:suscripciones(clases_restantes)
        `)
        .eq('cliente_id', userId)
        .order('fecha', { ascending: true })

      if (!error) setReservas(data)
      setLoading(false)
    }

    fetchReservas()

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('reservas-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservas',
        filter: `cliente_id=eq.${userId}`
      }, () => {
        fetchReservas()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  const handleReserva = async (fecha, hora, camaId) => {
    const { data: suscripcion } = await supabase
      .from('suscripciones')
      .select('*')
      .eq('cliente_id', userId)
      .eq('estado', 'activa')
      .single()

    if (!suscripcion || suscripcion.clases_restantes <= 0) {
      alert('No tenés clases disponibles')
      return
    }

    const { error } = await supabase
      .from('reservas')
      .insert({
        cliente_id: userId,
        suscripcion_id: suscripcion.id,
        fecha: fecha,
        hora: hora,
        cama_id: camaId,
        estado: 'reservada'
      })

    if (error) {
      alert('Ese horario ya está ocupado')
      return
    }

    // Descontar clase
    await supabase
      .from('suscripciones')
      .update({ clases_restantes: suscripcion.clases_restantes - 1 })
      .eq('id', suscripcion.id)

    alert('¡Reserva confirmada!')
  }

  if (loading) return <div>Cargando...</div>

  return (
    // ... resto del componente usando `reservas` en lugar de estado local
  )
}
```

---

## 🚀 PLAN DE MIGRACIÓN (Paso a Paso)

### FASE 1: Setup Inicial (Semana 1)
- [ ] Crear proyecto en Supabase
- [ ] Ejecutar scripts SQL para crear tablas
- [ ] Configurar RLS (Row Level Security)
- [ ] Crear Edge Functions básicas
- [ ] Configurar variables de entorno

### FASE 2: Autenticación (Semana 2)
- [ ] Implementar Supabase Auth en frontend
- [ ] Modificar LoginView para usar Auth real
- [ ] Crear sistema de roles (cliente/admin)
- [ ] Proteger rutas según rol
- [ ] Testing de flujo de login

### FASE 3: Base de Datos (Semana 3)
- [ ] Migrar componentes a usar Supabase
- [ ] Implementar CRUD de reservas
- [ ] Implementar gestión de pagos
- [ ] Configurar Real-time subscriptions
- [ ] Testing de persistencia

### FASE 4: Mercado Pago (Semana 4)
- [ ] Crear cuenta de desarrollador MP
- [ ] Implementar creación de preferencias
- [ ] Configurar webhooks
- [ ] Testing de flujo de pago completo
- [ ] Manejo de errores y reintentos

### FASE 5: WhatsApp (Semana 5-6)
- [ ] Decidir proveedor (Meta/Twilio/WATI)
- [ ] Crear templates y aprobarlos
- [ ] Implementar Edge Function de envío
- [ ] Configurar cron jobs para recordatorios
- [ ] Testing de mensajes

### FASE 6: Testing y Deploy (Semana 7)
- [ ] Testing integral de todos los flujos
- [ ] Configurar CI/CD
- [ ] Deploy a producción
- [ ] Monitoreo y logs
- [ ] Capacitación de usuarios

---

## 💰 COSTOS ESTIMADOS MENSUALES

### Infraestructura:
- **Supabase Pro**: $25/mes
  - 8GB de base de datos
  - 100GB de transferencia
  - 2M de Edge Function invocations

### Servicios Externos:
- **WhatsApp Business API (Meta)**:
  - $0.005 - $0.02 USD por mensaje
  - ~500 mensajes/mes = $2.50 - $10/mes
  
- **Twilio** (alternativa):
  - $0.005 - $0.10 USD por mensaje
  - ~500 mensajes/mes = $2.50 - $50/mes

- **WATI.io** (alternativa):
  - Plan básico: $29/mes (hasta 1000 conversaciones)

- **Mercado Pago**:
  - Sin costo de setup
  - Comisión por transacción: 4.99% + $10 ARS
  - (Asumido por el cliente)

### TOTAL ESTIMADO: $30 - $65 USD/mes

---

## 🔧 VARIABLES DE ENTORNO NECESARIAS

```bash
# .env.local (Frontend)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_FRONTEND_URL=https://runafit.com

# Supabase Edge Functions (Dashboard > Settings > Secrets)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxx-xxxxxx
WHATSAPP_TOKEN=EAAxxxxxxxxxxxx
WHATSAPP_PHONE_ID=1234567890
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
FRONTEND_URL=https://runafit.com

# Opcional si usas Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=+14155238886
```

---

## 📊 MÉTRICAS Y MONITOREO

### Dashboards recomendados:
1. **Supabase Dashboard** (built-in):
   - Queries por segundo
   - Edge Function invocations
   - Errores de BD

2. **Sentry** (opcional, $26/mes):
   - Tracking de errores en frontend
   - Performance monitoring

3. **Google Analytics 4** (gratis):
   - Conversiones de reservas
   - Flujo de usuarios

4. **PostHog** (alternativa open-source):
   - Product analytics
   - Feature flags
   - Session recordings

---

## 🎓 RECURSOS DE APRENDIZAJE

### Supabase:
- Docs oficiales: https://supabase.com/docs
- Video curso: https://egghead.io/courses/build-a-saas-product-with-next-js-supabase-and-stripe
- Channel de YouTube: https://youtube.com/@Supabase

### WhatsApp Business API:
- Docs de Meta: https://developers.facebook.com/docs/whatsapp
- Guía setup: https://business.whatsapp.com/products/business-platform

### Mercado Pago:
- Docs SDK: https://www.mercadopago.com.ar/developers/es/docs
- Testing: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards

---

## ⚠️ CONSIDERACIONES FINALES

### Seguridad:
- ✅ NUNCA exponer API keys en el código frontend
- ✅ Usar variables de entorno
- ✅ Configurar CORS correctamente
- ✅ Habilitar RLS en Supabase
- ✅ Sanitizar inputs de usuarios

### Escalabilidad:
- Supabase escala hasta ~1M usuarios sin cambios
- Considerar índices en BD para queries frecuentes
- Cachear queries costosas (React Query)
- Optimizar Edge Functions (cold starts)

### Legal:
- [ ] Términos y condiciones
- [ ] Política de privacidad (GDPR si es EU)
- [ ] Consentimiento de envío de WhatsApp
- [ ] Registro de tratamiento de datos personales

### Backup:
- Supabase hace backups diarios automáticos
- Considerar backup adicional semanal
- Plan de disaster recovery

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

1. **Crear proyecto en Supabase** (30 min)
2. **Ejecutar scripts SQL** (1 hora)
3. **Configurar autenticación básica** (2 horas)
4. **Modificar un componente (ej: LoginView)** para usar Supabase (2 horas)
5. **Testear flujo completo de auth** (1 hora)

**Total para MVP funcional básico: ~1 semana de desarrollo**

---

¿Necesitás ayuda con alguna parte específica de la implementación? 🚀
