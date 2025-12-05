import React, { useState } from 'react';
import { Users, DollarSign, Calendar, TrendingUp, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';

const AdminDashboard = () => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookings, setBookings] = useState([
    { id: 1, client: 'María González', phone: '381-5551234', day: 'Lunes 9/12', time: '19:00', bed: 4, status: 'pending', amount: 8000 },
    { id: 2, client: 'Ana Martínez', phone: '381-5555678', day: 'Lunes 9/12', time: '17:00', bed: 2, status: 'paid', amount: 8000 },
    { id: 3, client: 'Laura Fernández', phone: '381-5559012', day: 'Miércoles 11/12', time: '19:00', bed: 1, status: 'paid', amount: 8000 },
    { id: 4, client: 'Carla Rodríguez', phone: '381-5553456', day: 'Miércoles 11/12', time: '17:00', bed: 5, status: 'overdue', amount: 8000 },
    { id: 5, client: 'Sofía López', phone: '381-5557890', day: 'Viernes 13/12', time: '20:00', bed: 3, status: 'pending', amount: 8000 },
    { id: 6, client: 'Valentina Silva', phone: '381-5551111', day: 'Viernes 13/12', time: '19:00', bed: 6, status: 'paid', amount: 8000 },
  ]);

  const stats = {
    totalBookings: bookings.length,
    revenue: bookings.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0),
    pending: bookings.filter(b => b.status === 'pending').length,
    occupancy: 85
  };

  const handlePayment = (booking) => {
    setSelectedBooking(booking);
    setShowPaymentModal(true);
  };

  const confirmPayment = () => {
    setBookings(bookings.map(b => 
      b.id === selectedBooking.id ? { ...b, status: 'paid' } : b
    ));
    setShowPaymentModal(false);
    setSelectedBooking(null);
  };

  const releaseBooking = (bookingId) => {
    if (confirm('¿Estás segura de liberar este cupo? La cama quedará disponible para otras clientas.')) {
      setBookings(bookings.filter(b => b.id !== bookingId));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      paid: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      overdue: 'bg-red-100 text-red-700'
    };
    const labels = {
      paid: 'Pagado',
      pending: 'Pendiente',
      overdue: 'Vencido'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-3xl font-black">RUNA</div>
          <div className="text-3xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">FIT</div>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Panel de Control</h1>
        <p className="text-gray-600">Dashboard Administrativo</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Turnos Activos</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalBookings}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Facturado</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">${stats.revenue.toLocaleString()}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Pagos Pendientes</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats.pending}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Ocupación</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats.occupancy}%</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800 mb-1">1 Pago Vencido</h3>
            <p className="text-sm text-red-700">Carla Rodríguez - Vencido hace 2 días</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-800 mb-1">Sistema Activo</h3>
            <p className="text-sm text-green-700">Todos los recordatorios enviados correctamente</p>
          </div>
        </div>
      </div>

      {/* Modal de Pago */}
      {showPaymentModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button 
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Registrar Pago</h3>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Cliente</span>
                <span className="font-semibold">{selectedBooking.client}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Turno</span>
                <span className="font-semibold">{selectedBooking.day} {selectedBooking.time}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-gray-600">Monto</span>
                <span className="font-bold text-green-600">${selectedBooking.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago
              </label>
              <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Mercado Pago</option>
              </select>
            </div>

            <button
              onClick={confirmPayment}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg"
            >
              Confirmar Pago
            </button>
          </div>
        </div>
      )}

      {/* Tabla de Reservas */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Reservas Activas</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Turno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cama
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className={`hover:bg-gray-50 transition-colors ${booking.status === 'paid' ? 'bg-green-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{booking.client}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {booking.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.day}</div>
                    <div className="text-sm text-gray-500">{booking.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                      #{booking.bed}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ${booking.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      {booking.status !== 'paid' && (
                        <button
                          onClick={() => handlePayment(booking)}
                          className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirmar Pago
                        </button>
                      )}
                      <button
                        onClick={() => releaseBooking(booking.id)}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Liberar Cupo
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;