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
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useCreditos } from "../hooks/useCreditos";
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

  const cancelBooking = async (reservaId) => {
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

    let creditBefore = null;
    if (reserva.credito_id) {
      const { data } = await supabase
        .from("creditos_alumna")
        .select("creditos_restantes")
        .eq("id", reserva.credito_id)
        .single();
      creditBefore = data ? data.creditos_restantes : 0;
    }

    const { error } = await supabase
      .from("reservas")
      .update({ estado: "cancelada" })
      .eq("id", reservaId);

    if (error) return;

    if (reserva.credito_id && creditBefore !== null) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: creditAfterData } = await supabase
        .from("creditos_alumna")
        .select("creditos_restantes")
        .eq("id", reserva.credito_id)
        .single();

      const creditAfter = creditAfterData
        ? creditAfterData.creditos_restantes
        : 0;

      if (creditAfter === creditBefore) {
        try {
          const { error: rpcError } = await supabase.rpc("increment_creditos", {
            row_id: reserva.credito_id,
          });

          if (rpcError) {
            await supabase
              .from("creditos_alumna")
              .update({
                creditos_restantes: creditBefore + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", reserva.credito_id);
          }
        } catch (err) {
          console.error("Error manual refund:", err);
        }
      }
    }

    Swal.fire({
      icon: "success",
      title: "Turno cancelado",
      text: "La cama está disponible nuevamente y tu crédito fue devuelto",
      timer: 1500,
      showConfirmButton: false,
      confirmButtonColor: "#a855f7",
    });

    setTimeout(async () => {
      await fetchReservas();
      await fetchTodasLasReservas();
      if (usuario) fetchCreditos(usuario.id);
    }, 500);
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
          <p className="text-gray-600 mb-4">Reservá tu próxima clase</p>

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
                <div className="text-right">
                  <span className="font-semibold block">
                    {selectedSlot.day} {selectedSlot.date}
                  </span>
                  {/* Checkbox Repeat */}
                  <label className="flex items-center justify-end gap-2 mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={repeatMonth}
                      onChange={(e) => setRepeatMonth(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                    />
                    <span className="text-xs font-bold text-purple-700">
                      Repetir todo el mes
                    </span>
                  </label>
                </div>
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

      {/* Calendario */}
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
        {/* Header Calendario */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex justify-between items-center text-white">
          <button
            onClick={() => changeMonth(-1)}
            className="p-1 hover:bg-white/20 rounded-full"
          >
            <span className="text-xl">←</span>
          </button>
          <h2 className="font-bold text-lg capitalize">
            {currentMonth.toLocaleDateString("es-AR", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button
            onClick={() => changeMonth(1)}
            className="p-1 hover:bg-white/20 rounded-full"
          >
            <span className="text-xl">→</span>
          </button>
        </div>

        {/* Días Semana */}
        <div className="grid grid-cols-7 text-center p-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <div>Lu</div>
          <div>Ma</div>
          <div>Mi</div>
          <div>Ju</div>
          <div>Vi</div>
          <div>Sa</div>
          <div>Do</div>
        </div>

        {/* Grid Días */}
        <div className="grid grid-cols-7 p-2 gap-1">
          {calendarDays.map((d, i) => {
            if (!d.day) return <div key={i}></div>;

            const isSelected =
              selectedDate &&
              d.date.getDate() === selectedDate.getDate() &&
              d.date.getMonth() === selectedDate.getMonth();

            const isToday =
              new Date().getDate() === d.date.getDate() &&
              new Date().getMonth() === d.date.getMonth() &&
              new Date().getFullYear() === d.date.getFullYear();

            // Highlight user reservations
            const hasReservation = reservas.some((r) => {
              const resDate = new Date(r.fecha + "T00:00:00");
              return (
                resDate.getDate() === d.date.getDate() &&
                resDate.getMonth() === d.date.getMonth()
              );
            });

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(d.date)}
                className={`
                              h-10 w-10 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-all
                              ${
                                isSelected
                                  ? "bg-purple-600 text-white shadow-md transform scale-105"
                                  : "hover:bg-purple-50 text-gray-700"
                              }
                              ${
                                isToday && !isSelected
                                  ? "border-2 border-purple-400 font-bold"
                                  : ""
                              }
                              }
                              ${
                                hasReservation && !isSelected
                                  ? "border-2 border-purple-500 text-purple-700 font-bold"
                                  : ""
                              }
                          `}
              >
                {d.day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Horarios para el día seleccionado */}
      <div className="max-w-md mx-auto space-y-4">
        {selectedDate &&
          (() => {
            // Calcular datos del día
            const dateObj = selectedDate;
            const slotsData = getDailySlots(dateObj);

            if (!slotsData || slotsData.slots.length === 0) {
              return (
                <div className="text-center py-8 bg-white rounded-xl shadow-sm">
                  <p className="text-gray-500">
                    No hay horarios disponibles para este día.
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Intenta seleccionar otro día en el calendario.
                  </p>
                </div>
              );
            }

            return (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-fade-in">
                <div className="bg-gray-50 border-b border-gray-100 p-4 text-center">
                  <h3 className="text-lg font-bold text-gray-800 capitalize">
                    {slotsData.day} {slotsData.date}
                  </h3>
                </div>

                {/* Filtro Mañana/Tarde */}
                <div className="flex justify-center gap-2 p-2 bg-gray-50">
                  <button
                    onClick={() => setFilterShift("todos")}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      filterShift === "todos"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterShift("mañana")}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      filterShift === "mañana"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    Mañana
                  </button>
                  <button
                    onClick={() => setFilterShift("tarde")}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      filterShift === "tarde"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    Tarde
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {slotsData.slots
                    .filter((time) => {
                      if (filterShift === "todos") return true;
                      return getShift(time) === filterShift;
                    })
                    .map((time) => {
                      const fechaISO = slotsData.isoDate;

                      const reservasSlot = todasLasReservas.filter(
                        (r) =>
                          r.fecha === fechaISO &&
                          r.hora.slice(0, 5) === time &&
                          r.estado !== "cancelada"
                      );

                      const ocupadas = reservasSlot.length;
                      const capacidad = 6;
                      const isFull = ocupadas >= capacidad;

                      const miReserva = reservasSlot.find(
                        (r) => r.usuario_id === usuario?.id
                      );

                      const slotDate = new Date(`${fechaISO}T${time}:00`);
                      const now = new Date();
                      const isPast = slotDate < now;

                      if (isPast && !miReserva) return null;

                      return (
                        <div
                          key={time}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="bg-white p-2 rounded-lg shadow-sm font-bold text-gray-700 font-mono">
                              {time}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm font-medium ${
                                    isFull ? "text-red-500" : "text-green-600"
                                  }`}
                                >
                                  {ocupadas}/{capacidad} camas
                                </span>
                              </div>
                            </div>
                          </div>

                          {miReserva ? (
                            <button
                              onClick={() => cancelBooking(miReserva.id)}
                              className="bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                            >
                              Cancelar
                            </button>
                          ) : isFull ? (
                            <button
                              disabled
                              className="bg-gray-200 text-gray-400 px-4 py-2 rounded-lg text-sm font-bold cursor-not-allowed"
                            >
                              Lleno
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                handleBedClick(
                                  slotsData.day,
                                  slotsData.date,
                                  time,
                                  fechaISO
                                )
                              }
                              className="bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow-md"
                            >
                              Reservar
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })()}
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
