import React, { useState, useEffect } from "react";
import {
  Calendar,
  User,
  ShoppingBag,
  X,
  Check,
  CloudLightningIcon as Lightning,
  Zap,
  Ticket,
  Clock,
  Trash2,
  Plus,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@core/lib/supabase";
import { useCreditos } from "@core/hooks/useCreditos";
import { GYM_CONSTANTS } from "../config/gymConstants";
import Swal from "sweetalert2";

const ClientBookingView = () => {
  /* Estados para el Calendario */
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [repeatMonth, setRepeatMonth] = useState(false); // Checkbox state
  const [filterShift, setFilterShift] = useState("todos"); // todos, mañana, tarde
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reservas, setReservas] = useState([]);
  const [todasLasReservas, setTodasLasReservas] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [estudio, setEstudio] = useState(null);
  const [scheduleAlumna, setScheduleAlumna] = useState([]);
  const [creditos, setCreditos] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getCreditos, validarCreditos } = useCreditos();

  // Cargar usuario actual
  useEffect(() => {
    window.scrollTo(0, 0);
    const userStr = localStorage.getItem("usuario");
    if (userStr) {
      const user = JSON.parse(userStr);
      setUsuario(user);
      fetchEstudio(user.estudio_id);
      fetchScheduleAlumna(user.id);
      fetchCreditos(user.id);
      fetchReservas();
      fetchTodasLasReservas();
    }
  }, []);

  // Calendar Effect
  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    // Ajuste: Lun=0... Dom=6
    let startPadding = startingDay - 1;
    if (startPadding === -1) startPadding = 6;

    const days = [];

    for (let i = 0; i < startPadding; i++) {
      days.push({ day: null });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ day: i, date: date });
    }

    setCalendarDays(days);
  }, [currentMonth]);

  const changeMonth = (offset) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  const getDailySlots = (dateObj) => {
    if (!estudio) return { day: "", date: "", slots: [] };

    // Obtener nombre del día (Lunes, Martes, etc.)
    const dayName = dateObj.toLocaleDateString("es-AR", { weekday: "long" });
    const dayNameCapitalized =
      dayName.charAt(0).toUpperCase() + dayName.slice(1);

    // Usar el método existente en GYM_CONSTANTS
    const slots = GYM_CONSTANTS.getHorariosPorDia(dayNameCapitalized);

    if (!slots || slots.length === 0) return { day: "", date: "", slots: [] };

    const formattedDate =
      dateObj.getDate() +
      " " +
      dateObj.toLocaleDateString("es-AR", { month: "short" });
    const dateStr = dateObj.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });

    return {
      day: dayNameCapitalized,
      date: formattedDate,
      fullDate: dateStr,
      slots: slots,
      isoDate: dateObj.toISOString().split("T")[0],
    };
  };

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

      // --- ALERTA VENCIMIENTO / CREDITOS BAJOS ---
      if (creditosData) {
        const today = new Date();
        const vencimiento = new Date(creditosData.fecha_vencimiento);
        const diffTime = vencimiento - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Solo mostrar si no se mostró ya en esta sesión (para no ser spamer)
        const alertShown = sessionStorage.getItem(`alert_shown_${usuarioId}`);

        if (!alertShown) {
          let alertMessage = "";
          let alertTitle = "";
          let showAlert = false;

          if (diffDays <= 5 && diffDays >= 0) {
            alertTitle = "⚠️ ¡Tu pack vence pronto!";
            alertMessage = `Te quedan solo ${diffDays} días de vigencia. Renová tu pack para no perder tu lugar.`;
            showAlert = true;
          } else if (creditosData.creditos_restantes <= 1) {
            alertTitle = "⚠️ Te quedan pocos créditos";
            alertMessage = `Tenés ${creditosData.creditos_restantes} crédito(s) disponible(s). ¡Acordate de recargar!`;
            showAlert = true;
          }

          if (showAlert) {
            Swal.fire({
              title: alertTitle,
              text: alertMessage,
              icon: "warning",
              confirmButtonColor: "#a855f7",
              confirmButtonText: "Entendido",
              timer: 6000,
              timerProgressBar: true,
            });
            sessionStorage.setItem(`alert_shown_${usuarioId}`, "true");
          }
        }
      }
      // -------------------------------------------
    } catch (error) {
      console.error("Error al cargar créditos:", error);
      setCreditos(null);
    }
  };

  useEffect(() => {
    if (!usuario) return;

    fetchReservas();

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
        cama:camas(nombre),
        credito:creditos_alumna(*)
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
      .select("id, fecha, hora, cama_id, estado, usuario_id")
      .gte("fecha", new Date().toISOString().split("T")[0])
      .neq("estado", "cancelada");

    if (data) {
      setTodasLasReservas(data);
    }
  };

  const getShift = (timeStr) => {
    const hour = parseInt(timeStr.split(":")[0]);
    return hour < 14 ? "mañana" : "tarde";
  };

  const beds = [1, 2, 3, 4, 5, 6];

  const handleBedClick = async (day, date, time, fechaISO) => {
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

    // Ya viene fechaISO
    // LOADING STATE COULD BE ADDED HERE IF NEEDED
    // setSelectedSlot({ day, date, time, bed: null, fecha: fechaISO }); // REMOVING PREMATURE STATE update

    // --- VALIDACIÓN: SOLO UNA CLASE POR DÍA ---
    const yaTieneReservaEseDia = reservas.some(
      (r) => r.fecha === fechaISO && r.estado !== "cancelada"
    );

    if (yaTieneReservaEseDia) {
      Swal.fire({
        icon: "warning",
        title: "Día ya reservado",
        text: "Solo podés reservar una clase por día. Cancelá tu turno actual si querés cambiar de horario.",
        confirmButtonColor: "#a855f7",
      });
      return;
    }
    // ------------------------------------------

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

    const { data: reservasEnEseHorario } = await supabase
      .from("reservas")
      .select("cama_id")
      .eq("fecha", fechaISO)
      .eq("hora", time + ":00")
      .neq("estado", "cancelada");

    const camasOcupadas = reservasEnEseHorario?.map((r) => r.cama_id) || [];
    const camasDisponibles = beds.filter((bed) => !camasOcupadas.includes(bed));

    if (camasDisponibles.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Sin camas disponibles",
        text: "Todas las camas están ocupadas en este horario",
        confirmButtonColor: "#a855f7",
      });
      return;
    }

    const randomIndex = Math.floor(Math.random() * camasDisponibles.length);
    const camaDisponible = camasDisponibles[randomIndex];

    setSelectedSlot({ day, date, time, bed: camaDisponible, fecha: fechaISO });
    setRepeatMonth(false); // Reset checkbox
  };

  const confirmBooking = async () => {
    if (!usuario || !selectedSlot) return;

    // --- LOGICA REPETIR MES ---
    if (repeatMonth) {
      await handleRepeatBooking();
      return;
    }
    // --------------------------

    // Guardar referencia local para evitar problemas de estado
    const bedToBook = selectedSlot.bed;
    const timeToBook = selectedSlot.time;
    const dateToBook = selectedSlot.fecha;

    try {
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

      const selectedDate = new Date(selectedSlot.fecha + "T00:00:00");
      const creditoDisponible = creditosActivos?.find(
        (c) =>
          c.creditos_restantes > 0 &&
          new Date(c.fecha_vencimiento) >= selectedDate
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

      const { data: verificacionFinal, error: errorVerificacion } =
        await supabase
          .from("reservas")
          .select("cama_id")
          .select("cama_id")
          .eq("fecha", dateToBook)
          .eq("hora", timeToBook + ":00")
          .eq("cama_id", bedToBook)
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

      const { error } = await supabase.from("reservas").insert({
        usuario_id: usuario.id,
        fecha: dateToBook,
        hora: timeToBook + ":00",
        cama_id: bedToBook,
        credito_id: creditoId,
        estado: "confirmada",
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
        html: `<p>Cama <strong>${bedToBook}</strong> - <strong>${timeToBook}hs</strong></p>`,
        confirmButtonColor: "#a855f7",
      });

      setSelectedSlot(null);

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

  const handleRepeatBooking = async () => {
    // 1. Calculate dates
    const currentDate = new Date(selectedSlot.fecha + "T00:00:00");
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dayOfWeek = currentDate.getDay(); // 0-6
    const time = selectedSlot.time;

    const datesToBook = [];
    // Start from the selected date (inclusive? Yes, the user wants to book THIS + others)
    // Actually, let's include the selected date in the loop logic to share code,
    // BUT usually the user selects one date.
    // Let's iterate from selectedDate until end of month.

    let iterDate = new Date(currentDate);
    while (iterDate.getMonth() === month) {
      datesToBook.push(new Date(iterDate));
      iterDate.setDate(iterDate.getDate() + 7);
    }

    // 2. Check credits
    const { data: creditosActivos } = await supabase
      .from("creditos_alumna")
      .select("id, creditos_restantes, fecha_vencimiento")
      .eq("alumna_id", usuario.id)
      .eq("estado", "activo")
      .gte("creditos_restantes", 1) // At least 1
      .order("fecha_vencimiento", { ascending: true }); // Expiring sooner first? or purchase date?
    // Vencimiento logic is better for user.

    if (!creditosActivos || creditosActivos.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Sin crédito",
        text: "No tenés créditos disponibles.",
      });
      return;
    }

    let totalCredits = creditosActivos.reduce(
      (acc, c) => acc + c.creditos_restantes,
      0
    );
    const maxBookable = Math.min(datesToBook.length, totalCredits);

    if (maxBookable < datesToBook.length) {
      const confirm = await Swal.fire({
        title: "Créditos insuficientes",
        text: `Querés reservar ${datesToBook.length} días pero tenés ${totalCredits} créditos. ¿Reservamos solo los primeros ${totalCredits}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, reservar disponibles",
      });
      if (!confirm.isConfirmed) return;
    }

    // 3. Loop and Book
    let successCount = 0;
    let failCount = 0;

    // Show Loading
    Swal.fire({ title: "Reservando...", didOpen: () => Swal.showLoading() });

    for (let i = 0; i < maxBookable; i++) {
      const d = datesToBook[i];
      const dateStr = d.toISOString().split("T")[0];

      // Find credit for this specific date (validity)
      const validCredit = creditosActivos.find(
        (c) => c.creditos_restantes > 0 && new Date(c.fecha_vencimiento) >= d
      );

      if (!validCredit) {
        failCount++;
        continue;
      }

      // Find available bed
      // We need to check availability for EACH date.
      // Doing this in loop is slow but safer for concurrency without a complex Stored Procedure.
      const { data: ocupadas } = await supabase
        .from("reservas")
        .select("cama_id")
        .eq("fecha", dateStr)
        .eq("hora", time + ":00")
        .neq("estado", "cancelada");
      const idsOcupadas = ocupadas.map((o) => o.cama_id);
      const disponibles = beds.filter((b) => !idsOcupadas.includes(b));

      if (disponibles.length === 0) {
        failCount++;
        continue; // Full
      }

      // Pick same bed if possible, else random
      let bed = selectedSlot.bed;
      if (!disponibles.includes(bed)) bed = disponibles[0];

      // Insert
      const { error } = await supabase.from("reservas").insert({
        usuario_id: usuario.id,
        fecha: dateStr,
        hora: time + ":00",
        cama_id: bed,
        credito_id: validCredit.id,
        estado: "confirmada",
      });

      if (!error) {
        successCount++;
        validCredit.creditos_restantes--; // Local decrement to track
      } else {
        failCount++;
      }
    }

    setSelectedSlot(null);
    await fetchReservas();
    await fetchTodasLasReservas();
    await fetchCreditos(usuario.id);

    Swal.fire({
      icon: successCount > 0 ? "success" : "error",
      title: successCount > 0 ? "¡Reservas listas!" : "Error",
      text: `Se confirmaron ${successCount} reservas. ${
        failCount > 0 ? `(${failCount} fallaron por cupo/crédito)` : ""
      }`,
    });
  };

  /* State for processing */
  const [processingId, setProcessingId] = useState(null);

  const cancelBooking = async (reservaId) => {
    if (processingId) return; // Prevent double clicks

    let reserva = reservas.find((r) => r.id === reservaId);

    // Si no está en el estado local, buscarla en DB (robustez)
    if (!reserva) {
      const { data } = await supabase
        .from("reservas")
        .select("*")
        .eq("id", reservaId)
        .single();
      if (data) reserva = data;
    }

    if (!reserva) {
      console.error("Reserva no encontrada para cancelar", reservaId);
      return;
    }

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

    // --- ADVERTENCIA DE SEGURIDAD (DOBLE CHECK) ---
    // Si la reserva ya paso, no dejar cancelar
    if (new Date(fechaReserva) < new Date()) {
      Swal.fire("Error", "No podés cancelar una clase que ya pasó.", "error");
      return;
    }
    // --- ATOMIC CANCELLATION ---
    try {
      const { data, error } = await supabase.rpc("cancelar_reserva_atomico", {
        p_reserva_id: reservaId,
        p_credito_id: reserva.credito_id,
      });

      if (error) throw error;

      if (data && data.success) {
        Swal.fire({
          icon: "success",
          title: "Turno cancelado",
          text: data.message,
          timer: 1500,
          showConfirmButton: false,
          confirmButtonColor: "#a855f7",
        });
      } else {
        Swal.fire(
          "Info",
          data.message || "La reserva ya estaba cancelada",
          "info"
        );
      }

      // Update State
      await fetchReservas();
      await fetchTodasLasReservas();
      if (usuario) await fetchCreditos(usuario.id);
    } catch (err) {
      console.error("Error cancelando:", err);
      Swal.fire(
        "Error",
        "Error técnico al cancelar. Intenta de nuevo.",
        "error"
      );
    } finally {
      setProcessingId(null);
    }
  };
  // END of cancelBooking (Remove old lines below)
  /*
    // OLD MANUAL LOGIC REMOVED
  */

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
      {/* Header */}
      <div className="max-w-md mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="mb-4 -mx-6 -mt-6">
            <img
              src="/bodyfit_logo.jpg"
              alt="Body Fit Pilates"
              className="w-full h-auto object-cover rounded-t-2xl"
            />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Hola, {usuario?.nombre || "Cliente"} 👋
          </h1>
          <p className="text-gray-600 mb-4">Gestioná tus clases y reservas.</p>

          {/* Panel de Créditos */}
          {creditos ? (
            <div className="bg-white border border-green-100 rounded-xl p-3 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-green-50 p-2 rounded-full">
                  <Ticket className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm leading-tight">
                    {creditos.pack_nombre}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Vence:{" "}
                    {new Date(creditos.fecha_vencimiento).toLocaleDateString(
                      "es-AR",
                      { day: "numeric", month: "short" }
                    )}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-green-600">
                  {creditos.creditos_restantes}/{creditos.creditos_totales}
                </div>
                <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${
                        (creditos.creditos_restantes /
                          creditos.creditos_totales) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <p className="text-sm text-gray-700">
                No tenés créditos activos.{" "}
                <span
                  className="font-bold cursor-pointer text-orange-600 underline"
                  onClick={() =>
                    Swal.fire(
                      "Comprar Pack",
                      "Pedile a la admin que te asigne un pack o comprá por transferencia.",
                      "info"
                    )
                  }
                >
                  Comprar Pack
                </span>
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

      {/* SECCION MIS RESERVAS */}
      <div className="max-w-md mx-auto mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          Mis Próximas Clases
        </h2>

        {reservas.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400 mb-2">No tenés clases agendadas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservas.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between items-center relative overflow-hidden"
              >
                {/* Indicador lateral de color */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>

                <div>
                  <p className="text-sm font-bold text-gray-800 capitalize">
                    {new Date(r.fecha + "T00:00:00").toLocaleDateString(
                      "es-AR",
                      { weekday: "long", day: "numeric", month: "long" }
                    )}
                  </p>
                  <div className="flex items-center gap-2 text-gray-600 text-sm mt-1">
                    <Clock className="w-4 h-4" />
                    <span>{r.hora.slice(0, 5)} hs</span>
                    <span className="text-gray-300">|</span>
                    <span className="font-medium">Cama {r.cama?.nombre}</span>
                  </div>
                </div>

                <button
                  onClick={() => cancelBooking(r.id)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors"
                  title="Cancelar turno"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCION CALENDARIO RESERVA */}
      <div className="max-w-md mx-auto mb-20">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Plus className="w-5 h-5 text-purple-600" />
          Reservar Nuevo Turno
        </h2>

        {/* Calendar UI */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Month Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex justify-between items-center text-white">
            <h2 className="text-xl font-bold capitalize">
              {currentMonth.toLocaleDateString("es-AR", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d} className="text-xs font-bold text-gray-400 p-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((d, i) => {
                if (!d.day) return <div key={i}></div>;
                const isSelected =
                  selectedDate &&
                  d.date.toDateString() === selectedDate.toDateString();
                const isToday =
                  new Date().toDateString() === d.date.toDateString();

                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedDate(d.date);
                      setSelectedSlot(null); // Reset selection
                    }}
                    className={`
                          h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-all
                          ${
                            isSelected
                              ? "bg-purple-600 text-white shadow-md scale-105"
                              : "text-gray-700 hover:bg-purple-50"
                          }
                          ${
                            isToday && !isSelected
                              ? "ring-2 ring-purple-400 ring-offset-1"
                              : ""
                          }
                       `}
                  >
                    {d.day}
                  </button>
                );
              })}
            </div>

            {/* Slots of the Selected Day */}
            <div className="mt-6 border-t pt-4">
              <h3 className="font-bold text-gray-800 mb-3 capitalize">
                Horarios del{" "}
                {selectedDate.toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                })}
              </h3>

              <div className="grid grid-cols-3 gap-2">
                {getDailySlots(selectedDate).slots.length === 0 ? (
                  <p className="col-span-3 text-center text-gray-400 text-sm py-2">
                    No hay clases este día.
                  </p>
                ) : (
                  getDailySlots(selectedDate).slots.map((time) => {
                    const dateISO = getDailySlots(selectedDate).isoDate;
                    const isBooked = reservas.some(
                      (r) =>
                        r.fecha === dateISO &&
                        r.hora.startsWith(time) &&
                        r.estado !== "cancelada"
                    );
                    const isSelected =
                      selectedSlot &&
                      selectedSlot.time === time &&
                      selectedSlot.fecha === dateISO;

                    // Check if full (optimistic check or visual only if we have data)
                    // Here we rely on handleBedClick to validate fullness

                    return (
                      <button
                        key={time}
                        onClick={() =>
                          !isBooked &&
                          handleBedClick(
                            getDailySlots(selectedDate).day,
                            getDailySlots(selectedDate).fullDate,
                            time,
                            dateISO
                          )
                        }
                        disabled={isBooked}
                        className={`
                                    py-2 px-1 rounded-lg text-sm font-medium border transition-all
                                    ${
                                      isBooked
                                        ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed decoration-slice"
                                        : isSelected
                                        ? "bg-purple-600 text-white border-purple-600 shadow-md"
                                        : "bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                                    }
                                 `}
                      >
                        {time}
                        {isBooked && (
                          <span className="block text-[10px] lowercase">
                            reservado
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CONFIRMATION BUTTON FLOATING */}
        {selectedSlot && (
          <div className="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center justify-center animate-fade-in p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up sm:animate-scale-in">
              {/* Header Modal */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-white/90" />
                  <h3 className="font-bold text-lg">Confirmar Reserva</h3>
                </div>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">
                      Vas a reservar:
                    </p>
                    <h3 className="text-xl font-bold text-gray-800 capitalize">
                      {selectedDate.toLocaleDateString("es-AR", {
                        weekday: "long",
                        day: "numeric",
                      })}
                    </h3>
                    <div className="text-2xl font-black text-purple-600 mt-1">
                      {selectedSlot.time} hs
                    </div>
                  </div>
                  <div className="bg-green-50 px-3 py-2 rounded-xl border border-green-100 text-center">
                    <p className="text-xs text-green-600 font-bold uppercase tracking-wider">
                      Cama
                    </p>
                    <p className="text-2xl font-black text-green-700">
                      #{selectedSlot.bed}
                    </p>
                  </div>
                </div>

                {/* CHECKBOX REPEAT MONTH */}
                <div className="flex items-center gap-3 mb-6 bg-purple-50 p-4 rounded-xl border border-purple-100">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <input
                      type="checkbox"
                      id="repeatMonth"
                      checked={repeatMonth}
                      onChange={(e) => setRepeatMonth(e.target.checked)}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                    />
                  </div>
                  <label
                    htmlFor="repeatMonth"
                    className="text-sm text-gray-700 font-medium cursor-pointer flex-1 select-none leading-tight"
                  >
                    Repetir este horario <br />{" "}
                    <span className="text-purple-600 font-bold">
                      todo el mes
                    </span>
                  </label>
                </div>

                <button
                  onClick={confirmBooking}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all text-lg flex items-center justify-center gap-2"
                >
                  Confirmar Reserva <Check className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="mt-10 mb-6 text-center">
        <p className="text-xs text-gray-400 font-medium">
          Powered by <span className="text-purple-400 font-bold">RunaTech</span>
        </p>
      </div>
    </div>
  );
};

export default ClientBookingView;
