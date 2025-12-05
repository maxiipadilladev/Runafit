import React, { useState } from 'react';
import { Calendar, Clock, Check, X, Trash2, AlertCircle, CreditCard, Zap, Settings, Plus, Minus, User } from 'lucide-react';

const ClientBookingView = () => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const [userName, setUserName] = useState('María');
  
  // Estado de pago simulado (cambiá a false para simular deuda)
  const [paymentStatus, setPaymentStatus] = useState({
    isPaid: false, // true = al día, false = vencida
    dueDate: '10/12/2024',
    amount: 35000,
    classesRemaining: 4
  });

  // Datos mockeados
  const schedule = [
    { day: 'Lunes', date: '9 Dic', slots: ['17:00', '19:00', '20:00'] },
    { day: 'Miércoles', date: '11 Dic', slots: ['17:00', '19:00', '20:00'] },
    { day: 'Viernes', date: '13 Dic', slots: ['17:00', '19:00', '20:00'] }
  ];

  const beds = [1, 2, 3, 4, 5, 6];

  // Simular camas ocupadas
  const occupiedBeds = {
    'Lunes-19:00': [1, 3, 5],
    'Miércoles-17:00': [2, 4],
    'Viernes-20:00': [1, 2, 3, 6]
  };

  const isBedOccupied = (day, time, bed) => {
    const key = `${day}-${time}`;
    return occupiedBeds[key]?.includes(bed) || 
           bookings.some(b => b.day === day && b.time === time && b.bed === bed);
  };

  const handleBedClick = (day, date, time, bed) => {
    if (isBedOccupied(day, time, bed)) return;
    setSelectedSlot({ day, date, time, bed });
  };

  const confirmBooking = () => {
    setBookings([...bookings, selectedSlot]);
    setShowConfirmation(true);
    setTimeout(() => {
      setShowConfirmation(false);
      setSelectedSlot(null);
    }, 3000);
  };

  const cancelBooking = (index) => {
    if (confirm('¿Querés cancelar este turno?')) {
      setBookings(bookings.filter((_, i) => i !== index));
    }
  };

  const handlePayNow = () => {
    alert('🔗 Redirigiendo a Mercado Pago...\n\nMonto: $35.000\nConcepto: Cuota Mensual RunaFit');
    // Aquí iría la integración real con Mercado Pago
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      {/* Botón Demo Mode - Esquina superior derecha */}
      <button
        onClick={() => setShowDemoPanel(!showDemoPanel)}
        className="fixed top-2 right-4 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
        title="Demo Controls"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Panel de Controles Demo */}
      {showDemoPanel && (
        <div className="fixed top-20 right-4 z-50 bg-white rounded-2xl shadow-2xl p-6 w-80 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-gray-800">🎮 Demo Controls</h3>
            <button onClick={() => setShowDemoPanel(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Toggle Estado de Pago */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-semibold text-gray-700">Estado de Pago</span>
                <button
                  onClick={() => setPaymentStatus({...paymentStatus, isPaid: !paymentStatus.isPaid})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    paymentStatus.isPaid ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    paymentStatus.isPaid ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                {paymentStatus.isPaid ? '✅ Al día' : '❌ Vencida'}
              </p>
            </div>

            {/* Contador de Clases */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-semibold text-gray-700 block mb-2">Clases Restantes</label>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setPaymentStatus({...paymentStatus, classesRemaining: Math.max(0, paymentStatus.classesRemaining - 1)})}
                  className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-2xl font-bold text-purple-600 min-w-[3rem] text-center">
                  {paymentStatus.classesRemaining}
                </span>
                <button
                  onClick={() => setPaymentStatus({...paymentStatus, classesRemaining: paymentStatus.classesRemaining + 1})}
                  className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cambiar Nombre */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Nombre Usuario
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all outline-none"
                placeholder="Nombre"
              />
            </div>

            {/* Reset */}
            <button
              onClick={() => {
                setPaymentStatus({ isPaid: false, dueDate: '10/12/2024', amount: 35000, classesRemaining: 4 });
                setUserName('María');
                setBookings([]);
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg transition-colors text-sm"
            >
              🔄 Reset Demo
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-md mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-2xl font-black">RUNA</div>
            <div className="text-2xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">FIT</div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Hola, {userName} 👋</h1>
          <p className="text-gray-600">Reservá tu próxima clase</p>
        </div>
      </div>

      {/* Tarjeta de Estado de Pago */}
      <div className="max-w-md mx-auto mb-6">
        {!paymentStatus.isPaid ? (
          // Estado: CUOTA VENCIDA
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-3 rounded-full">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-red-900">Cuota Vencida</h3>
                    <p className="text-sm text-red-700">Vencimiento: {paymentStatus.dueDate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-red-900">${paymentStatus.amount.toLocaleString()}</p>
                </div>
              </div>
              
              <button
                onClick={handlePayNow}
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                <span>Pagar Ahora con Mercado Pago</span>
              </button>
              
              <p className="text-xs text-red-700 text-center mt-3">
                ⚠️ No podrás reservar nuevos turnos hasta regularizar el pago
              </p>
            </div>
          </div>
          
        ) : (
          // Estado: AL DÍA
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-900">Cuota al Día ✨</h3>
                    <p className="text-sm text-green-700">Próximo vencimiento: {paymentStatus.dueDate}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/60 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Clases Restantes</span>
                  </div>
                  <div className="text-3xl font-black text-green-600">
                    {paymentStatus.classesRemaining}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmación Toast */}
      {showConfirmation && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="bg-green-500 text-white rounded-xl shadow-2xl p-4 flex items-center gap-3 animate-slide-down">
            <Check className="w-6 h-6" />
            <div>
              <p className="font-bold">¡Turno reservado!</p>
              <p className="text-sm">Te enviamos la confirmación por WhatsApp</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {selectedSlot && !showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-scale-in">
            <button 
              onClick={() => setSelectedSlot(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Confirmar Reserva</h3>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Día</span>
                <span className="font-semibold">{selectedSlot.day} {selectedSlot.date}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Horario</span>
                <span className="font-semibold">{selectedSlot.time}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-gray-600">Cama</span>
                <span className="font-bold text-purple-600">#{selectedSlot.bed}</span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-800">
                💳 Recordá pagar antes del {selectedSlot.day} 17hs para confirmar tu turno
              </p>
            </div>

            <button
              onClick={confirmBooking}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg"
            >
              Confirmar Reserva
            </button>
          </div>
        </div>
      )}

      {/* Grilla de Turnos */}
      <div className="max-w-md mx-auto space-y-4">
        {schedule.map((day) => (
          <div key={day.day} className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
              <h3 className="text-white font-bold text-lg">{day.day}</h3>
              <p className="text-purple-100 text-sm">{day.date}</p>
            </div>
            
            <div className="p-4 space-y-4">
              {day.slots.map((time) => (
                <div key={time}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-700">{time}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {beds.map((bed) => {
                      const occupied = isBedOccupied(day.day, time, bed);
                      const booked = bookings.some(b => 
                        b.day === day.day && b.time === time && b.bed === bed
                      );
                      
                      return (
                        <button
                          key={bed}
                          onClick={() => handleBedClick(day.day, day.date, time, bed)}
                          disabled={occupied}
                          className={`
                            p-4 rounded-xl font-bold transition-all text-sm
                            ${occupied 
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                              : booked
                              ? 'bg-green-500 text-white shadow-lg'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-md active:scale-95'
                            }
                          `}
                        >
                          {booked ? (
                            <div className="flex flex-col items-center gap-1">
                              <Check className="w-4 h-4" />
                              <span>Cama {bed}</span>
                            </div>
                          ) : (
                            <>Cama {bed}</>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mis Reservas */}
      {bookings.length > 0 && (
        <div className="max-w-md mx-auto mt-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Mis Próximos Turnos
            </h3>
            <div className="space-y-3">
              {bookings.map((booking, idx) => (
                <div key={idx} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-5 h-5 text-green-600" />
                        <p className="font-bold text-gray-800">{booking.day} {booking.date}</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-700 ml-7">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span>{booking.time}</span>
                        </div>
                        <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold text-xs">
                          Cama #{booking.bed}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => cancelBooking(idx)}
                      className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg transition-colors ml-3"
                      title="Cancelar turno"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-2 ml-7">
                    <p className="text-xs text-yellow-800">
                      💳 Recordá pagar antes del {booking.day} 17hs
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ClientBookingView;