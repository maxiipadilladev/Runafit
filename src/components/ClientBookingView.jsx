import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Check,
  X,
  Trash2,
  AlertCircle,
  CreditCard,
  Zap,
  Settings,
  Plus,
  Minus,
  User,
  Gift,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useCreditos } from "../hooks/useCreditos";
import { GYM_CONSTANTS } from "../config/gymConstants";
import Swal from "sweetalert2";

const ClientBookingView = () => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reservas, setReservas] = useState([]);
  const [todasLasReservas, setTodasLasReservas] = useState([]); // Todas las reservas (incluye otras personas)
  const [usuario, setUsuario] = useState(null);
  const [estudio, setEstudio] = useState(null);
  const [scheduleAlumna, setScheduleAlumna] = useState([]); // Horarios personalizados de la alumna
  const [creditos, setCreditos] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getCreditos, validarCreditos } = useCreditos();

  // Cargar usuario actual
  useEffect(() => {
    const userStr = localStorage.getItem("usuario");
    if (userStr) {
      const user = JSON.parse(userStr);
      setUsuario(user);
      fetchEstudio(user.estudio_id);
      fetchScheduleAlumna(user.id); // Cargar horarios personalizados
      fetchCreditos(user.id); // Cargar créditos disponibles
      fetchReservas();
      fetchTodasLasReservas();
    }
  }, []);

  const fetchEstudio = async (estudioId) => {
    try {
      const { data, error } = await supabase
        .from("estudios")
        .select("*")
        .eq("id", estudioId)
        .single();

      if (error) throw error;
      setEstudio(data);
    } catch (error) {
      console.error("Error al cargar estudio:", error);
    }
  };

  const fetchScheduleAlumna = async (usuarioId) => {
    try {
      const { data, error } = await supabase
        .from("schedule_alumnas")
        .select("*")
        .eq("usuario_id", usuarioId);

      if (error) throw error;
      setScheduleAlumna(data || []);
    } catch (error) {
      console.error("Error al cargar horarios personalizados:", error);
    }
  };

  const fetchCreditos = async (usuarioId) => {
    try {
      const creditosData = await getCreditos(usuarioId);
      setCreditos(creditosData);
    } catch (error) {
      console.error("Error al cargar créditos:", error);
      setCreditos(null);
    }
  };

  // Cargar reservas del usuario
  useEffect(() => {
    if (!usuario) return;

    fetchReservas();

    // Suscripción a cambios en tiempo real
    const subscription = supabase
      .channel("reservas-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservas",
          filter: `usuario_id=eq.${usuario.id}`,
        },
        fetchReservas
      )
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
      .channel("todas-reservas-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservas",
        },
        fetchTodasLasReservas
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  const fetchReservas = async () => {
    if (!usuario) return;

    const { data, error } = await supabase
      .from("reservas")
      .select(
        `
        *,
        cama:camas(nombre)
      `
      )
      .eq("usuario_id", usuario.id)
      .neq("estado", "cancelada")
      .gte("fecha", new Date().toISOString().split("T")[0])
      .order("fecha", { ascending: true });

    if (!error && data) {
      setReservas(data);
    }
    setLoading(false);
  };

  const fetchTodasLasReservas = async () => {
    const { data } = await supabase
      .from("reservas")
      .select("fecha, hora, cama_id, estado")
      .gte("fecha", new Date().toISOString().split("T")[0])
      .neq("estado", "cancelada");

    if (data) {
      setTodasLasReservas(data);
    }
  };

  // Generar horarios dinámicos basados en los horarios personalizados de la alumna
  const generateSchedule = () => {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const proximosDias = [];
    const diasSemanaMap = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];
    const mesesMap = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];

    for (let i = 0; i < 7; i++) {
      const fecha = new Date(startDate);
      fecha.setDate(startDate.getDate() + i);

      const diaIndex = fecha.getDay();
      const diaNombre = diasSemanaMap[diaIndex];
      const diaCapitalizado =
        diaNombre.charAt(0).toUpperCase() + diaNombre.slice(1);

      // Filtrar días que no abre el gimnasio (Solo Lun, Mie, Vie según config)
      if (!GYM_CONSTANTS.DIAS_Apertura.includes(diaCapitalizado)) {
        continue;
      }

      // 1. Prioridad: Horarios Específicos (scheduleAlumna)
      // Si la alumna tiene horarios puntuales asignados, usamos ESOS y solo ESOS.
      const diaConfig = scheduleAlumna.find(
        (s) => s.dia_semana.toLowerCase() === diaNombre.toLowerCase()
      );

      let slots = [];

      // 2. Lógica de selección de Slots
      // Regla de Oro: Si tiene scheduleAlumna (horarios fijos), el turno general (Mañana/Tarde) SE IGNORA.
      const tieneHorariosFijos = scheduleAlumna.length > 0;

      if (diaConfig) {
        // Caso A: Tiene horario fijo HOY -> Se muestra solo ese.
        slots = [diaConfig.hora.slice(0, 5)];
      } else if (tieneHorariosFijos) {
        // Caso B: Tiene horario fijo OTRO día, pero HOY no.
        // Como tiene horarios fijos, NO aplicamos el general. Hoy no se muestra nada.
        slots = [];
      } else {
        // Caso C: No tiene ningún horario fijo asignado.
        // Recién acá aplica el "Turno General" (Mañana o Tarde).
        if (usuario?.turno === "mañana") {
          slots = GYM_CONSTANTS.TURNOS.MAÑANA.horarios;
        } else if (usuario?.turno === "tarde") {
          slots = GYM_CONSTANTS.TURNOS.TARDE.horarios;
        } else {
          slots = GYM_CONSTANTS.HORARIOS_VALIDOS;
        }
      }

      // Si no hay slots para mostrar (ej: Caso B), saltamos el día
      if (slots.length === 0) continue;

      proximosDias.push({
        day: diaCapitalizado,
        date: `${fecha.getDate()} ${mesesMap[fecha.getMonth()]}`,
        slots: slots,
        fullDate: fecha,
      });

      if (proximosDias.length >= 7) break; // Mostrar solo una semana "hábil"
    }

    return proximosDias;
  };

  const schedule = generateSchedule();

  const beds = [1, 2, 3, 4, 5, 6];

  const handleBedClick = async (day, date, time) => {
    // NUEVA LÓGICA: Validar créditos antes de intentar reservar
    const validacion = await validarCreditos(usuario.id);

    if (!validacion.disponible) {
      Swal.fire({
        icon: "error",
        title: "Sin créditos disponibles",
        text: validacion.mensaje,
        confirmButtonColor: "#a855f7",
      });
      return;
    }

    // Convertir fecha legible a formato ISO
    const [dayNum, month] = date.split(" ");
    const year = new Date().getFullYear();
    const monthNum =
      {
        Dic: 12,
        Ene: 1,
        Feb: 2,
        Mar: 3,
        Abr: 4,
        May: 5,
        Jun: 6,
        Jul: 7,
        Ago: 8,
        Sep: 9,
        Oct: 10,
        Nov: 11,
      }[month] || 12;
    const fechaISO = `${year}-${String(monthNum).padStart(2, "0")}-${String(
      dayNum
    ).padStart(2, "0")}`;

    // Verificar si el usuario ya tiene una reserva en ese horario
    const { data: misReservasEnEseHorario } = await supabase
      .from("reservas")
      .select("*")
      .eq("usuario_id", usuario.id)
      .eq("fecha", fechaISO)
      .eq("hora", time + ":00")
      .neq("estado", "cancelada");

    if (misReservasEnEseHorario && misReservasEnEseHorario.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Ya tenés una reserva",
        text: "No podés reservar dos camas en el mismo horario",
        confirmButtonColor: "#a855f7",
      });
      return;
    }

    // Encontrar la primera cama disponible
    const { data: reservasEnEseHorario } = await supabase
      .from("reservas")
      .select("cama_id")
      .eq("fecha", fechaISO)
      .eq("hora", time + ":00")
      .neq("estado", "cancelada");

    const beds = [1, 2, 3, 4, 5, 6];
    const camasOcupadas = reservasEnEseHorario?.map((r) => r.cama_id) || [];
    const camaDisponible = beds.find((bed) => !camasOcupadas.includes(bed));

    if (!camaDisponible) {
      Swal.fire({
        icon: "error",
        title: "Sin camas disponibles",
        text: "Todas las camas están ocupadas en este horario",
        confirmButtonColor: "#a855f7",
      });
      return;
    }

    setSelectedSlot({ day, date, time, bed: camaDisponible, fecha: fechaISO });
  };

  const confirmBooking = async () => {
    if (!usuario || !selectedSlot) return;

    try {
      // Obtener créditos disponibles (activos, no vencidos, con créditos restantes)
      const { data: creditosActivos, error: errorCredito } = await supabase
        .from("creditos_alumna")
        .select("id, creditos_restantes, fecha_vencimiento")
        .eq("alumna_id", usuario.id)
        .eq("estado", "activo")
        .order("fecha_compra", { ascending: true });

      if (errorCredito) {
        console.error("Error al obtener créditos:", errorCredito);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron verificar los créditos",
          confirmButtonColor: "#a855f7",
        });
        setSelectedSlot(null);
        return;
      }

      // Filtrar créditos válidos en el código
      const creditoDisponible = creditosActivos?.find(
        (c) =>
          c.creditos_restantes > 0 && new Date(c.fecha_vencimiento) > new Date()
      );

      if (!creditoDisponible) {
        Swal.fire({
          icon: "error",
          title: "Sin créditos disponibles",
          text: "No hay créditos disponibles para reservar",
          confirmButtonColor: "#a855f7",
        });
        setSelectedSlot(null);
        return;
      }

      const creditoId = creditoDisponible.id;

      // Verificar nuevamente disponibilidad JUSTO antes de insertar (race condition)
      const { data: verificacionFinal, error: errorVerificacion } =
        await supabase
          .from("reservas")
          .select("cama_id")
          .eq("fecha", selectedSlot.fecha)
          .eq("hora", selectedSlot.time + ":00")
          .eq("cama_id", selectedSlot.bed)
          .neq("estado", "cancelada")
          .maybeSingle();

      if (verificacionFinal) {
        Swal.fire({
          icon: "error",
          title: "Cama ocupada",
          text: "Otra persona reservó esta cama mientras confirmabas. Intentá con otro horario.",
          confirmButtonColor: "#a855f7",
        });
        setSelectedSlot(null);
        await fetchTodasLasReservas();
        return;
      }

      // Insertar reserva con credito_id
      const { error } = await supabase.from("reservas").insert({
        usuario_id: usuario.id,
        fecha: selectedSlot.fecha,
        hora: selectedSlot.time + ":00",
        cama_id: selectedSlot.bed,
        credito_id: creditoId,
        estado: "confirmada", // Estado cambiado a confirmada (descuento automático)
      });

      if (error) {
        console.error("Error al insertar reserva:", error);
        if (error.code === "23505") {
          Swal.fire({
            icon: "error",
            title: "Cama ocupada",
            text: "Esa cama ya fue reservada por otra persona en este momento",
            confirmButtonColor: "#a855f7",
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error al reservar",
            text: error.message || "Intenta de nuevo más tarde",
            confirmButtonColor: "#a855f7",
          });
        }
        setSelectedSlot(null);
        await fetchTodasLasReservas();
        return;
      }

      Swal.fire({
        icon: "success",
        title: "¡Reserva confirmada!",
        html: `<p>Cama <strong>${selectedSlot.bed}</strong> - <strong>${selectedSlot.time}hs</strong></p>`,
        confirmButtonColor: "#a855f7",
      });

      setSelectedSlot(null);

      // Actualizar listas de reservas y créditos
      await fetchReservas();
      await fetchTodasLasReservas();
      await fetchCreditos(usuario.id);
    } catch (error) {
      console.error("Error en confirmBooking:", error);
      Swal.fire({
        icon: "error",
        title: "Error al reservar",
        text: "Hubo un problema. Intenta de nuevo.",
        confirmButtonColor: "#a855f7",
      });
      setSelectedSlot(null);
    }
  };

  const cancelBooking = async (reservaId) => {
    // Encontrar los detalles de la reserva
    const reserva = reservas.find((r) => r.id === reservaId);
    if (!reserva) return;

    // Verificar si la cancelación es con menos de 2 horas de anticipación
    const fechaReserva = new Date(reserva.fecha + "T" + reserva.hora);
    const ahora = new Date();
    const horasRestantes = (fechaReserva - ahora) / (1000 * 60 * 60);

    if (horasRestantes < 2 && horasRestantes > 0) {
      const confirmCancelacion = await Swal.fire({
        icon: "warning",
        title: "⚠️ Cancelación tardía",
        html: `Falta menos de 2 horas para tu clase.<br><br>¿Estás segura que querés cancelar?`,
        showCancelButton: true,
        confirmButtonText: "Sí, cancelar igual",
        cancelButtonText: "No, mantener",
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
      });

      if (!confirmCancelacion.isConfirmed) return;
    }

    const fecha = new Date(reserva.fecha + "T00:00:00");
    const dia = fecha.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
    const hora = reserva.hora.slice(0, 5);

    const result = await Swal.fire({
      icon: "warning",
      title: "¿Querés cancelar tu reserva?",
      html: `<p style="font-size: 16px; margin: 10px 0;">de la <strong>Cama ${
        reserva.cama_id
      }</strong></p>
             <p style="font-size: 14px; color: #666;">${
               dia.charAt(0).toUpperCase() + dia.slice(1)
             } a las ${hora}hs</p>`,
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "No, mantener",
      confirmButtonColor: "#a855f7",
      cancelButtonColor: "#6b7280",
      allowOutsideClick: false,
      allowEscapeKey: true,
    });

    if (!result.isConfirmed) return;

    // Cambiar estado a 'cancelada' en vez de eliminar (trigger devolverá el crédito)
    const { error } = await supabase
      .from("reservas")
      .update({ estado: "cancelada" })
      .eq("id", reservaId);

    if (!error) {
      Swal.fire({
        icon: "success",
        title: "Turno cancelado",
        text: "La cama está disponible nuevamente y tu crédito fue devuelto",
        timer: 1500,
        showConfirmButton: false,
        confirmButtonColor: "#a855f7",
      });
      // Esperar un poco antes de refrescar para asegurar que el trigger ejecutó
      setTimeout(async () => {
        await fetchReservas();
        await fetchTodasLasReservas();
        await fetchCreditos(usuario.id); // Actualizar créditos en vivo
      }, 500);
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
            <div className="text-2xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              FIT
            </div>
          </div>
          {estudio && (
            <p className="text-sm text-gray-500 font-semibold mb-3">
              {estudio.nombre}
            </p>
          )}
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Hola, {usuario?.nombre || "Cliente"} 👋
          </h1>
          <p className="text-gray-600 mb-4">Reservá tu próxima clase</p>

          {/* Panel de Créditos */}
          {creditos ? (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Gift size={16} className="text-green-600" />
                  Tu Pack
                </span>
                <span className="text-xs text-gray-500">
                  {creditos.dias_para_vencer > 0
                    ? `Vence en ${creditos.dias_para_vencer} días`
                    : "Vencido"}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                {creditos.pack_nombre}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-400 to-emerald-500 h-full transition-all"
                    style={{
                      width: `${
                        (creditos.creditos_restantes /
                          creditos.creditos_totales) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <span className="text-lg font-bold text-green-600">
                  {creditos.creditos_restantes}/{creditos.creditos_totales}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
              <p className="text-sm text-yellow-700 font-semibold">
                ⚠️ No tenés packs activos
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Contactá al estudio para comprar un pack de clases
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmación Toast */}
      {showConfirmation && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="bg-green-500 text-white rounded-xl shadow-2xl p-4 flex items-center gap-3 animate-slide-down">
            <Check className="w-6 h-6" />
            <div>
              <p className="font-bold">¡Turno reservado!</p>
              <p className="text-sm">
                Te enviamos la confirmación por WhatsApp
              </p>
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
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Confirmar Reserva
              </h3>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Día</span>
                <span className="font-semibold">
                  {selectedSlot.day} {selectedSlot.date}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Horario</span>
                <span className="font-semibold">{selectedSlot.time}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                <span className="text-gray-600 font-semibold">Tu Cama</span>
                <span className="font-bold text-green-600 text-lg">
                  #{selectedSlot.bed}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-blue-800">
                ✓ Se te asignó automáticamente la Cama #{selectedSlot.bed} para
                que estés siempre cómoda
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
          <div
            key={`${day.day}-${day.date}`}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
              <h3 className="text-white font-bold text-lg">{day.day}</h3>
              <p className="text-purple-100 text-sm">{day.date}</p>
            </div>

            <div className="p-4 space-y-4">
              {day.slots.map((time) => {
                // Convertir fecha a formato ISO
                const [dayNum, month] = day.date.split(" ");
                const year = new Date().getFullYear();
                const monthNum =
                  {
                    Dic: 12,
                    Ene: 1,
                    Feb: 2,
                    Mar: 3,
                    Abr: 4,
                    May: 5,
                    Jun: 6,
                    Jul: 7,
                    Ago: 8,
                    Sep: 9,
                    Oct: 10,
                    Nov: 11,
                  }[month] || 12;
                const fechaISO = `${year}-${String(monthNum).padStart(
                  2,
                  "0"
                )}-${String(dayNum).padStart(2, "0")}`;

                // Verificar si tengo una reserva en este horario
                const miReservaEnEsteHorario = reservas.find((r) => {
                  return r.fecha === fechaISO && r.hora.slice(0, 5) === time;
                });

                // Contar cuántas camas están ocupadas
                const camasOcupadas = todasLasReservas.filter((r) => {
                  return r.fecha === fechaISO && r.hora.slice(0, 5) === time;
                }).length;

                const camasDisponibles = 6 - camasOcupadas;

                return (
                  <div
                    key={time}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
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
                          onClick={() =>
                            cancelBooking(miReservaEnEsteHorario.id)
                          }
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
