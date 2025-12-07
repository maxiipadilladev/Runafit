import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Calendar, TrendingUp, AlertCircle, CheckCircle, Clock, X, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';

const AdminDashboard = () => {
  const [usuario, setUsuario] = useState(null);
  const [estudio, setEstudio] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para formulario de nuevo usuario
  const [newUser, setNewUser] = useState({
    dni: '',
    nombre: '',
    telefono: '',
    estudio_id: '',
    turno: 'mañana',
    metodo_pago: 'digital'
  });

  // Estado para horarios mixtos
  const [schedules, setSchedules] = useState([]);
  const [newSchedule, setNewSchedule] = useState({
    dia_semana: 'lunes',
    hora: '09:00'
  });

  // Cargar datos del admin y estudio
  useEffect(() => {
    const storedUser = localStorage.getItem('usuario');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUsuario(user);
      fetchEstudio(user.estudio_id);
    }
    fetchReservas();

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel('admin-reservas')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'reservas' },
        () => {
          fetchReservas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEstudio = async (estudioId) => {
    try {
      const { data, error } = await supabase
        .from('estudios')
        .select('*')
        .eq('id', estudioId)
        .single();

      if (error) throw error;
      setEstudio(data);
      // Auto-llenar estudio_id en el formulario
      setNewUser(prev => ({ ...prev, estudio_id: estudioId.toString() }));
    } catch (error) {
      console.error('Error al cargar estudio:', error);
    }
  };

  const fetchReservas = async () => {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          *,
          usuario:usuarios(dni, nombre, telefono),
          cama:camas(nombre)
        `)
        .neq('estado', 'cancelada')
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

      if (error) throw error;
      setReservas(data || []);
    } catch (error) {
      console.error('Error al cargar reservas:', error);
      alert('Error al cargar las reservas');
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas en base a datos reales
  const stats = {
    totalBookings: reservas.length,
    revenue: reservas.filter(r => r.estado === 'pagada').length * 8000,
    pending: reservas.filter(r => r.estado === 'pendiente').length,
    occupancy: reservas.length > 0 ? Math.round((reservas.length / 42) * 100) : 0 // 7 días * 6 camas = 42 slots semanales
  };

  const handlePayment = (reserva) => {
    setSelectedBooking(reserva);
    setShowPaymentModal(true);
  };

  const saveSchedulesToDB = async (usuarioId) => {
    if (schedules.length === 0) return;

    for (const schedule of schedules) {
      const { error } = await supabase
        .from('schedule_alumnas')
        .insert({
          usuario_id: usuarioId,
          dia_semana: schedule.dia_semana,
          hora: schedule.hora,
          cama_preferida: null
        });

      if (error) {
        console.error('Error guardando horario:', error);
      }
    }
  };

  const confirmPayment = async () => {
    try {
      const { error } = await supabase
        .from('reservas')
        .update({ estado: 'pagada' })
        .eq('id', selectedBooking.id);

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'Pago registrado',
        text: `${selectedBooking.usuario.nombre} - $8.000`,
        timer: 1500,
        showConfirmButton: false,
        confirmButtonColor: '#10b981'
      });

      setShowPaymentModal(false);
      setSelectedBooking(null);
      fetchReservas(); // Recargar datos
    } catch (error) {
      console.error('Error al confirmar pago:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo registrar el pago',
        confirmButtonColor: '#10b981'
      });
    }
  };

  const releaseBooking = async (reservaId) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Liberar cupo?',
      text: 'La cama quedará disponible para otras clientas',
      showCancelButton: true,
      confirmButtonText: 'Sí, liberar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      allowOutsideClick: false,
      allowEscapeKey: true
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase
        .from('reservas')
        .delete()
        .eq('id', reservaId);

      if (error) throw error;
      
      Swal.fire({
        icon: 'success',
        title: 'Cupo liberado',
        text: 'La cama está disponible nuevamente',
        timer: 1500,
        showConfirmButton: false,
        confirmButtonColor: '#10b981'
      });
      fetchReservas(); // Recargar datos
    } catch (error) {
      console.error('Error al liberar cupo:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo liberar el cupo',
        confirmButtonColor: '#10b981'
      });
    }
  };

  const createNewUser = async () => {
    if (!newUser.dni || !newUser.nombre || !newUser.telefono) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor completá todos los datos',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    if (newUser.dni.length < 7) {
      Swal.fire({
        icon: 'warning',
        title: 'DNI inválido',
        text: 'Debe tener 8 dígitos',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    try {
      const { data: newUserData, error } = await supabase
        .from('usuarios')
        .insert({
          dni: newUser.dni,
          nombre: newUser.nombre,
          telefono: newUser.telefono,
          rol: 'cliente',
          estudio_id: parseInt(newUser.estudio_id),
          turno: newUser.turno
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          Swal.fire({
            icon: 'warning',
            title: 'DNI duplicado',
            text: 'Este DNI ya está registrado',
            confirmButtonColor: '#10b981'
          });
        } else {
          throw error;
        }
        return;
      }

      // Guardar horarios si existen
      await saveSchedulesToDB(newUserData.id);

      Swal.fire({
        icon: 'success',
        title: 'Cliente registrada',
        text: `${newUser.nombre} puede loguearse con su DNI`,
        confirmButtonColor: '#10b981'
      });
      setNewUser({ 
        dni: '', 
        nombre: '', 
        telefono: '', 
        estudio_id: newUser.estudio_id,
        turno: 'mañana',
        metodo_pago: 'digital'
      });
      setSchedules([]);
      setShowUserModal(false);
      await fetchReservas();
    } catch (error) {
      console.error('Error al crear usuario:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo registrar la cliente',
        confirmButtonColor: '#10b981'
      });
    }
  };

  const getStatusBadge = (estado) => {
    const styles = {
      pagada: 'bg-green-100 text-green-700',
      pendiente: 'bg-yellow-100 text-yellow-700'
    };
    const labels = {
      pagada: 'Pagado',
      pendiente: 'Pendiente'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[estado]}`}>
        {labels[estado]}
      </span>
    );
  };

  // Formatear fecha legible
  const formatFecha = (fecha, hora) => {
    const date = new Date(fecha + 'T00:00:00');
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dia = dias[date.getDay()];
    const numero = date.getDate();
    const mes = date.getMonth() + 1;
    return `${dia} ${numero}/${mes}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-600">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-10 bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="text-4xl font-black">RUNA</div>
              <div className="text-4xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">FIT</div>
            </div>
            {estudio && <h2 className="text-xl font-bold text-purple-600 mb-4">{estudio.nombre}</h2>}
            <h1 className="text-3xl font-bold text-gray-800 mb-1">Panel de Control</h1>
            <p className="text-gray-500 text-sm">Dashboard Administrativo</p>
          </div>
          <button
            onClick={() => setShowUserModal(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 whitespace-nowrap ml-6"
          >
            <Plus className="w-5 h-5" />
            Nueva Cliente
          </button>
        </div>
      </div>

      {/* Modal Nuevo Usuario */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button 
              onClick={() => setShowUserModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Registrar Nueva Cliente</h3>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  DNI (sin puntos)
                </label>
                <input
                  type="text"
                  value={newUser.dni}
                  onChange={(e) => setNewUser({ ...newUser, dni: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                  placeholder="12345678"
                  maxLength="8"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={newUser.nombre}
                  onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                  placeholder="María González"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={newUser.telefono}
                  onChange={(e) => setNewUser({ ...newUser, telefono: e.target.value })}
                  placeholder="381-5551234"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Turno
                </label>
                <select
                  value={newUser.turno}
                  onChange={(e) => setNewUser({ ...newUser, turno: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                >
                  <option value="mañana">Mañana (7:00 - 13:00)</option>
                  <option value="tarde">Tarde (17:00 - 20:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Método de Pago
                </label>
                <select
                  value={newUser.metodo_pago}
                  onChange={(e) => setNewUser({ ...newUser, metodo_pago: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none"
                >
                  <option value="digital">Transferencia / Mercado Pago</option>
                  <option value="efectivo">Efectivo (Confirmar manualmente)</option>
                </select>
              </div>

              <div className="border-t-2 border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Horarios (Días y Horas)</h4>
                <div className="space-y-2 mb-3">
                  {schedules.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Sin horarios agregados aún</p>
                  ) : (
                    schedules.map((sch, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                        <span className="text-sm font-semibold">
                          {sch.dia_semana.charAt(0).toUpperCase() + sch.dia_semana.slice(1)} - {sch.hora}
                        </span>
                        <button
                          onClick={() => setSchedules(schedules.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:text-red-800 text-sm font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    value={newSchedule.dia_semana}
                    onChange={(e) => setNewSchedule({ ...newSchedule, dia_semana: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="lunes">Lunes</option>
                    <option value="martes">Martes</option>
                    <option value="miércoles">Miércoles</option>
                    <option value="jueves">Jueves</option>
                    <option value="viernes">Viernes</option>
                    <option value="sábado">Sábado</option>
                    <option value="domingo">Domingo</option>
                  </select>
                  <input
                    type="time"
                    value={newSchedule.hora}
                    onChange={(e) => setNewSchedule({ ...newSchedule, hora: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={() => {
                      if (!schedules.find(s => s.dia_semana === newSchedule.dia_semana && s.hora === newSchedule.hora)) {
                        setSchedules([...schedules, newSchedule]);
                      }
                    }}
                    className="px-3 py-2 bg-blue-500 text-white rounded text-sm font-bold hover:bg-blue-600"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 mb-6 border border-blue-200">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Nota:</span> La cliente podrá loguearse con su DNI una vez registrada.
              </p>
            </div>

            <button
              onClick={createNewUser}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg"
            >
              Registrar Cliente
            </button>
          </div>
        </div>
      )}
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
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800 mb-1">{stats.pending} Pagos Pendientes</h3>
            <p className="text-sm text-yellow-700">Recordá confirmar los pagos recibidos</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-800 mb-1">Sistema Activo</h3>
            <p className="text-sm text-green-700">Reservas sincronizadas en tiempo real</p>
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
                <span className="font-semibold">{selectedBooking.usuario.nombre}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Turno</span>
                <span className="font-semibold">
                  {formatFecha(selectedBooking.fecha, selectedBooking.hora)} {selectedBooking.hora.slice(0, 5)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Cama</span>
                <span className="font-semibold">{selectedBooking.cama.nombre}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-gray-600">Monto</span>
                <span className="font-bold text-green-600">$8.000</span>
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
              {reservas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No hay reservas activas
                  </td>
                </tr>
              ) : (
                reservas.map((reserva) => (
                  <tr key={reserva.id} className={`hover:bg-gray-50 transition-colors ${reserva.estado === 'pagada' ? 'bg-green-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{reserva.usuario.nombre}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {reserva.usuario.telefono}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatFecha(reserva.fecha, reserva.hora)}</div>
                      <div className="text-sm text-gray-500">{reserva.hora.slice(0, 5)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                        {reserva.cama.nombre}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      $8.000
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(reserva.estado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {reserva.estado !== 'pagada' && (
                          <button
                            onClick={() => handlePayment(reserva)}
                            className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Confirmar Pago
                          </button>
                        )}
                        <button
                          onClick={() => releaseBooking(reserva.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          Liberar Cupo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;