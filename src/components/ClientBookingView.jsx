import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Check, X, Trash2, AlertCircle, CreditCard, Zap, Settings, Plus, Minus, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';

const ClientBookingView = () => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reservas, setReservas] = useState([]);
  const [todasLasReservas, setTodasLasReservas] = useState([]); // Todas las reservas (incluye otras personas)
  const [usuario, setUsuario] = useState(null);
  const [estudio, setEstudio] = useState(null);
  const [scheduleAlumna, setScheduleAlumna] = useState([]); // Horarios personalizados de la alumna
  const [loading, setLoading] = useState(true);

  // Cargar usuario actual
  useEffect(() => {
    const userStr = localStorage.getItem('usuario');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUsuario(user);
      fetchEstudio(user.estudio_id);
      fetchScheduleAlumna(user.id); // Cargar horarios personalizados
      fetchReservas();
      fetchTodasLasReservas();
    }
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
    } catch (error) {
      console.error('Error al cargar estudio:', error);
    }
  };

  const fetchScheduleAlumna = async (usuarioId) => {
    try {
      const { data, error } = await supabase
        .from('schedule_alumnas')
        .select('*')
        .eq('usuario_id', usuarioId);

      if (error) throw error;
      setScheduleAlumna(data || []);
    } catch (error) {
      console.error('Error al cargar horarios personalizados:', error);
    }
  };

  // Cargar reservas del usuario
  useEffect(() => {
    if (!usuario) return;
    
    fetchReservas();

    // Suscripción a cambios en tiempo real
    const subscription = supabase
      .channel('reservas-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservas',
        filter: `usuario_id=eq.${usuario.id}`
      }, fetchReservas)
      .subscribe();

    return () => subscription.unsubscribe();
  }, [usuario]);

  useEffect(() => {
    fetchTodasLasReservas();
  }, []);

  // Cargar todas las reservas (de todos los usuarios) para mostrar disponibilidad
  useEffect(() => {
    fetchTodasLasReservas();

    // Suscripción a cambios en todas las reservas
    const subscription = supabase
      .channel('todas-reservas-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservas'
      }, fetchTodasLasReservas)
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  const fetchReservas = async () => {
    if (!usuario) return;
    
    const { data, error } = await supabase
      .from('reservas')
      .select(`
        *,
        cama:camas(nombre)
      `)
      .eq('usuario_id', usuario.id)
      .gte('fecha', new Date().toISOString().split('T')[0])
      .order('fecha', { ascending: true });

    if (!error && data) {
      setReservas(data);
    }
    setLoading(false);
  };

  const fetchTodasLasReservas = async () => {
    const { data } = await supabase
      .from('reservas')
      .select('fecha, hora, cama_id, estado')
      .gte('fecha', new Date().toISOString().split('T')[0])
      .neq('estado', 'cancelada');

    if (data) {
      setTodasLasReservas(data);
    }
  };

  // Generar horarios dinámicos basados en los horarios personalizados de la alumna
  const generateSchedule = () => {
    if (scheduleAlumna.length === 0) {
      // Si no hay horarios personalizados, mostrar horarios por defecto según el turno
      const defaultSchedule = usuario?.turno === 'mañana' 
        ? [
            { day: 'Lunes', date: '9 Dic', slots: ['07:00', '09:00', '11:00'] },
            { day: 'Miércoles', date: '11 Dic', slots: ['07:00', '09:00', '11:00'] },
            { day: 'Viernes', date: '13 Dic', slots: ['07:00', '09:00', '11:00'] }
          ]
        : [
            { day: 'Lunes', date: '9 Dic', slots: ['17:00', '19:00', '20:00'] },
            { day: 'Miércoles', date: '11 Dic', slots: ['17:00', '19:00', '20:00'] },
            { day: 'Viernes', date: '13 Dic', slots: ['17:00', '19:00', '20:00'] }
          ];
      return defaultSchedule;
    }

    // Construir horarios a partir de los horarios personalizados
    const diasMap = {
      'lunes': { day: 'Lunes', date: '9 Dic' },
      'martes': { day: 'Martes', date: '10 Dic' },
      'miércoles': { day: 'Miércoles', date: '11 Dic' },
      'jueves': { day: 'Jueves', date: '12 Dic' },
      'viernes': { day: 'Viernes', date: '13 Dic' },
      'sábado': { day: 'Sábado', date: '14 Dic' },
      'domingo': { day: 'Domingo', date: '15 Dic' }
    };

    const scheduleByDay = {};
    scheduleAlumna.forEach(sch => {
      const dayInfo = diasMap[sch.dia_semana];
      if (!scheduleByDay[sch.dia_semana]) {
        scheduleByDay[sch.dia_semana] = { ...dayInfo, slots: [] };
      }
      scheduleByDay[sch.dia_semana].slots.push(sch.hora.slice(0, 5));
    });

    return Object.values(scheduleByDay).sort((a, b) => {
      const daysOrder = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
      return daysOrder.indexOf(a.day.toLowerCase()) - daysOrder.indexOf(b.day.toLowerCase());
    });
  };

  const schedule = generateSchedule();

  const beds = [1, 2, 3, 4, 5, 6];

  const handleBedClick = async (day, date, time) => {
    // Convertir fecha legible a formato ISO
    const [dayNum, month] = date.split(' ');
    const year = new Date().getFullYear();
    const monthNum = { 'Dic': 12, 'Ene': 1, 'Feb': 2, 'Mar': 3, 'Abr': 4, 'May': 5, 
                       'Jun': 6, 'Jul': 7, 'Ago': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11 }[month] || 12;
    const fechaISO = `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    
    // Verificar si el usuario ya tiene una reserva en ese horario
    const { data: misReservasEnEseHorario } = await supabase
      .from('reservas')
      .select('*')
      .eq('usuario_id', usuario.id)
      .eq('fecha', fechaISO)
      .eq('hora', time + ':00')
      .neq('estado', 'cancelada');

    if (misReservasEnEseHorario && misReservasEnEseHorario.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Ya tenés una reserva',
        text: 'No podés reservar dos camas en el mismo horario',
        confirmButtonColor: '#a855f7'
      });
      return;
    }
    
    // Encontrar la primera cama disponible
    const { data: reservasEnEseHorario } = await supabase
      .from('reservas')
      .select('cama_id')
      .eq('fecha', fechaISO)
      .eq('hora', time + ':00')
      .neq('estado', 'cancelada');

    const camasOcupadas = reservasEnEseHorario?.map(r => r.cama_id) || [];
    const camaDisponible = beds.find(bed => !camasOcupadas.includes(bed));

    if (!camaDisponible) {
      Swal.fire({
        icon: 'error',
        title: 'Sin camas disponibles',
        text: 'Todas las camas están ocupadas en este horario',
        confirmButtonColor: '#a855f7'
      });
      return;
    }
    
    setSelectedSlot({ day, date, time, bed: camaDisponible, fecha: fechaISO });
  };

  const confirmBooking = async () => {
    if (!usuario || !selectedSlot) return;

    const { error } = await supabase
      .from('reservas')
      .insert({
        usuario_id: usuario.id,
        fecha: selectedSlot.fecha,
        hora: selectedSlot.time,
        cama_id: selectedSlot.bed,
        estado: 'pendiente'
      });

    if (error) {
      if (error.code === '23505') {
        Swal.fire({
          icon: 'error',
          title: 'Cama ocupada',
          text: 'Esa cama ya fue reservada por otra persona',
          confirmButtonColor: '#a855f7'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al reservar',
          text: 'Intenta de nuevo más tarde',
          confirmButtonColor: '#a855f7'
        });
      }
      return;
    }

    Swal.fire({
      icon: 'success',
      title: '¡Reserva confirmada!',
      text: `Cama ${selectedSlot.bed} - ${selectedSlot.time}hs`,
      confirmButtonColor: '#a855f7'
    });

    setSelectedSlot(null);
    
    // Actualizar listas de reservas
    await fetchReservas();
    await fetchTodasLasReservas();
  };

  const cancelBooking = async (reservaId) => {
    // Encontrar los detalles de la reserva
    const reserva = reservas.find(r => r.id === reservaId);
    if (!reserva) return;

    const fecha = new Date(reserva.fecha + 'T00:00:00');
    const dia = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });
    const hora = reserva.hora.slice(0, 5);

    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Querés cancelar tu reserva?',
      html: `<p style="font-size: 16px; margin: 10px 0;">de la <strong>Cama ${reserva.cama_id}</strong></p>
             <p style="font-size: 14px; color: #666;">${dia.charAt(0).toUpperCase() + dia.slice(1)} a las ${hora}hs</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No, mantener',
      confirmButtonColor: '#a855f7',
      cancelButtonColor: '#6b7280',
      allowOutsideClick: false,
      allowEscapeKey: true
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase
      .from('reservas')
      .delete()
      .eq('id', reservaId);

    if (!error) {
      Swal.fire({
        icon: 'success',
        title: 'Turno cancelado',
        text: 'La cama está disponible nuevamente',
        timer: 1500,
        showConfirmButton: false,
        confirmButtonColor: '#a855f7'
      });
      await fetchReservas();
      await fetchTodasLasReservas();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Cargando reservas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      {/* Panel Demo comentado - descomentar si necesitas testear estados
      <button
        onClick={() => setShowDemoPanel(!showDemoPanel)}
        className="fixed top-2 right-4 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
        title="Demo Controls"
      >
        <Settings className="w-5 h-5" />
      </button>
      */}

      {/* Header */}
      <div className="max-w-md mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-2xl font-black">RUNA</div>
            <div className="text-2xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">FIT</div>
          </div>
          {estudio && <p className="text-sm text-gray-500 font-semibold mb-3">{estudio.nombre}</p>}
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Hola, {usuario?.nombre || 'Cliente'} 👋</h1>
          <p className="text-gray-600">Reservá tu próxima clase</p>
        </div>
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
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                <span className="text-gray-600 font-semibold">Tu Cama</span>
                <span className="font-bold text-green-600 text-lg">#{selectedSlot.bed}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-blue-800">
                ✓ Se te asignó automáticamente la Cama #{selectedSlot.bed} para que estés siempre cómoda
              </p>
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
              {day.slots.map((time) => {
                // Convertir fecha a formato ISO
                const [dayNum, month] = day.date.split(' ');
                const year = new Date().getFullYear();
                const monthNum = { 'Dic': 12, 'Ene': 1, 'Feb': 2, 'Mar': 3, 'Abr': 4, 'May': 5, 
                                   'Jun': 6, 'Jul': 7, 'Ago': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11 }[month] || 12;
                const fechaISO = `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                
                // Verificar si tengo una reserva en este horario
                const miReservaEnEsteHorario = reservas.find(r => {
                  return r.fecha === fechaISO && r.hora.slice(0, 5) === time;
                });

                // Contar cuántas camas están ocupadas
                const camasOcupadas = todasLasReservas.filter(r => {
                  return r.fecha === fechaISO && r.hora.slice(0, 5) === time;
                }).length;

                const camasDisponibles = 6 - camasOcupadas;

                return (
                  <div key={time} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-bold text-gray-800">{time}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {camasOcupadas}/6 camas ocupadas
                      </p>
                    </div>
                    
                    {miReservaEnEsteHorario ? (
                      <div className="flex flex-col items-end gap-2">
                        <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Cama #{miReservaEnEsteHorario.cama_id}
                        </div>
                        <button
                          onClick={() => cancelBooking(miReservaEnEsteHorario.id)}
                          className="text-red-600 hover:text-red-800 text-xs font-semibold"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : camasDisponibles > 0 ? (
                      <button
                        onClick={() => handleBedClick(day.day, day.date, time)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
                      >
                        Reservar
                      </button>
                    ) : (
                      <div className="bg-gray-200 text-gray-500 px-3 py-2 rounded-lg text-sm font-bold">
                        Completo
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientBookingView;