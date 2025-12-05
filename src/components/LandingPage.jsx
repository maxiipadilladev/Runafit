import React, { useState } from 'react';
import { Calendar, Zap, DollarSign, Users, MessageCircle, CheckCircle, Clock, Shield, Smartphone, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  const [activeTab, setActiveTab] = useState('cliente');

  const features = [
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Reservas Inteligentes',
      description: 'Sistema tipo cine: tus clientas eligen día, hora Y cama específica'
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: 'WhatsApp Automático',
      description: 'Recordatorios, cobros y confirmaciones sin que muevas un dedo'
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: 'Pagos Integrados',
      description: 'Mercado Pago + registro manual. El sistema habilita turnos solo'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Gestión Multicliente',
      description: 'Horarios fijos, flexibles o mixtos. El sistema se adapta a cada clienta'
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: 'Sin Apps que Bajar',
      description: 'PWA ultra rápida. Funciona desde el navegador como una app nativa'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Datos Seguros',
      description: 'Hosting certificado, backups diarios, cumplimiento normativo'
    }
  ];

  const benefits = {
    cliente: [
      'Reservo desde el celu en 30 segundos',
      'Elijo MI cama favorita (#4 siempre!)',
      'Me llega link de pago por WhatsApp',
      'Recordatorios 24hs antes',
      'Sin contraseñas complicadas'
    ],
    admin: [
      'Ves TODO desde el dashboard',
      'Registrás pagos en efectivo en 2 clicks',
      'El sistema cobra y confirma solo',
      'Ocupación en tiempo real',
      'Reportes automáticos'
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="text-4xl font-black text-white">RUNA</div>
              <div className="text-4xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">FIT</div>
            </div>
            <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <span className="text-sm font-semibold">✨ Sistema de Gestión para Studios de Pilates & Gimnasios</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Dejá de perseguir<br />pagos por WhatsApp
            </h1>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              El sistema que automatiza reservas, cobros y recordatorios mientras vos das clases
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold hover:bg-purple-50 transition-colors shadow-xl flex items-center justify-center gap-2">
                Ver Demo en Vivo
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                Agendar Llamada
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <p className="text-4xl font-bold mb-2">98%</p>
              <p className="text-purple-100">Ocupación promedio</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <p className="text-4xl font-bold mb-2">15hs</p>
              <p className="text-purple-100">Ahorradas por mes</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <p className="text-4xl font-bold mb-2">$0</p>
              <p className="text-purple-100">En pagos perdidos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Todo lo que necesitás</h2>
          <p className="text-xl text-gray-600">En un solo sistema, sin complicaciones</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center text-purple-600 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it Works - Tabs */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">¿Cómo funciona?</h2>
            <p className="text-xl text-gray-600">Simple para todos</p>
          </div>

          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => setActiveTab('cliente')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'cliente'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Para tus Clientas
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'admin'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Para Vos (Admin)
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
            <div className="space-y-4">
              {benefits[activeTab].map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  <p className="text-lg text-gray-700">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Automation Flow */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <div className="inline-block bg-purple-100 rounded-full px-4 py-2 mb-4">
            <span className="text-sm font-semibold text-purple-700">⚡ La Magia de la Automatización</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Mientras vos dormís...</h2>
          <p className="text-xl text-gray-600">El sistema trabaja 24/7</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center text-white mb-4 font-bold">
              1
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Cliente reserva</h3>
            <p className="text-gray-600">María elige Cama #4, Lunes 19hs desde su celu</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
            <div className="bg-yellow-500 w-12 h-12 rounded-full flex items-center justify-center text-white mb-4 font-bold">
              2
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Sistema cobra</h3>
            <p className="text-gray-600">WhatsApp con link de pago. Al pagar, turno confirmado automáticamente</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="bg-green-500 w-12 h-12 rounded-full flex items-center justify-center text-white mb-4 font-bold">
              3
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Sistema recuerda</h3>
            <p className="text-gray-600">24hs antes: "Recordatorio: Mañana 19hs, Cama #4 ✨"</p>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 py-20 text-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Inversión transparente</h2>
            <p className="text-xl text-purple-100">Sin sorpresas, todo incluido</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-center">
              <div className="inline-block bg-yellow-400 text-purple-900 px-4 py-2 rounded-full font-bold text-sm mb-2">
                🎁 PROMO LANZAMIENTO - Solo primeros 5 estudios
              </div>
              <h3 className="text-3xl font-bold mb-2">Plan Premium - Solución Completa</h3>
            </div>

            <div className="p-8">
              <div className="space-y-6">
                <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-purple-900 font-bold text-lg mb-1">Setup Inicial</p>
                      <p className="text-sm text-purple-700">Incluye Configuración Completa + Hosting Premium</p>
                    </div>
                    <div className="text-right">
                      <p className="text-purple-900 font-bold text-3xl">$150.000</p>
                      <p className="text-xs text-purple-600">Pago Único</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-start gap-2 text-sm text-purple-700">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Setup profesional, migración de datos, capacitación 1-on-1</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Abono Mensual</p>
                    <p className="text-sm text-gray-500 mt-1">Sistema completo + soporte</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-800 font-bold text-3xl">$35.000<span className="text-lg">/mes</span></p>
                  </div>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      OFERTA LIMITADA
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-green-900 font-bold">Primer Mes de Abono</p>
                      <p className="text-sm text-green-700">Solo para los primeros 5</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-700 line-through">$35.000</p>
                      <p className="text-3xl font-bold text-green-600">$17.500</p>
                      <p className="text-xs text-green-600 font-semibold">50% OFF</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-6 mt-8">
                <p className="font-bold text-gray-800 mb-3">✅ TODO incluido:</p>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Sistema completo sin límites de usuarios</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>WhatsApp ilimitado* (hasta 500 mensajes/mes)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Integración con Mercado Pago</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Soporte prioritario por WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Actualizaciones y mejoras incluidas</span>
                  </div>
                </div>
              </div>

              <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg mt-8 hover:shadow-lg transition-shadow">
                Quiero ser de los primeros 5 →
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                ⏰ Quedan solo 3 lugares disponibles
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Final */}
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold text-gray-800 mb-4">¿Listo para automatizar tu estudio?</h2>
        <p className="text-xl text-gray-600 mb-8">
          Agendar una demo de 20 minutos no te compromete a nada
        </p>
        <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-12 py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-shadow">
          Agendar Demo Gratuita
        </button>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xl font-black">RUNA</span>
            <span className="text-xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">FIT</span>
          </div>
          <p className="text-gray-400">© 2024 RunaFit - Sistema de Gestión Premium para Studios</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;