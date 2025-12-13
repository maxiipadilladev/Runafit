import React, { useState, useEffect } from "react";
import { Users, X, Save } from "lucide-react";
import Swal from "sweetalert2";
import { supabase } from "@core/lib/supabase";
import { GYM_CONSTANTS } from "../config/gymConstants";

export const UserModal = ({
  isOpen,
  onClose,
  onUserSaved,
  userToEdit = null,
  estudioId,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    dni: "",
    nombre: "",
    telefono: "",
    estudio_id: estudioId ? estudioId.toString() : "",
    turno: "",
  });

  const [fixedSchedule, setFixedSchedule] = useState([]);
  const [tempDay, setTempDay] = useState("");
  const [tempHour, setTempHour] = useState("");
  const daysOfWeek = GYM_CONSTANTS.DIAS_SEMANA;
  const horariosValidos = GYM_CONSTANTS.HORARIOS_VALIDOS; // Or specific logic if needed

  // Cargar datos si es edición
  useEffect(() => {
    if (userToEdit) {
      setFormData({
        dni: userToEdit.dni,
        nombre: userToEdit.nombre,
        telefono: userToEdit.telefono,
        estudio_id: userToEdit.estudio_id.toString(),
        estudio_id: userToEdit.estudio_id.toString(),
        turno: userToEdit.turno || "mañana",
      });
      fetchUserSchedule(userToEdit.id);
    } else {
      // Reset si es nuevo
      setFormData({
        dni: "",
        nombre: "",
        telefono: "",
        estudio_id: estudioId ? estudioId.toString() : "",
        estudio_id: estudioId ? estudioId.toString() : "",
        turno: "",
      });
      setFixedSchedule([]);
    }
  }, [userToEdit, estudioId, isOpen]);

  const fetchUserSchedule = async (userId) => {
    try {
      const { data } = await supabase
        .from("schedule_alumnas")
        .select("*")
        .eq("usuario_id", userId);
      setFixedSchedule(data || []);
    } catch (error) {
      console.error("Error loading schedule:", error);
    }
  };

  const addScheduleSlot = () => {
    if (!tempDay || !tempHour) return;

    // Check duplication
    const exists = fixedSchedule.some(
      (s) => s.dia_semana === tempDay && s.hora === tempHour
    );
    if (!exists) {
      setFixedSchedule((prev) => [
        ...prev,
        { dia_semana: tempDay, hora: tempHour, usuario_id: userToEdit?.id },
      ]);
    }
    setTempHour("");
    // Keep day selected for convenience? Or reset? Let's keep day.
  };

  const removeScheduleSlot = (day, time) => {
    setFixedSchedule((prev) =>
      prev.filter((s) => !(s.dia_semana === day && s.hora === time))
    );
  };

  const saveFixedSchedule = async (userId) => {
    // 1. Delete all existing for this user (simple sync)
    await supabase.from("schedule_alumnas").delete().eq("usuario_id", userId);

    // 2. Insert new ones
    if (fixedSchedule.length > 0) {
      const toInsert = fixedSchedule.map((s) => ({
        usuario_id: userId,
        dia_semana: s.dia_semana,
        hora: s.hora,
      }));
      await supabase.from("schedule_alumnas").insert(toInsert);

      // 3. GENERATE RESERVATIONS AUTOMATICALLY (Materialize)
      // We'll try to book for the rest of current month
      await generateReservationsFromSchedule(userId, toInsert);
    }
  };

  const generateReservationsFromSchedule = async (userId, scheduleItems) => {
    // Logic to find future dates in current month matching the schedule
    // and book them if not already booked.
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let bookedCount = 0;

    // Map day names to 0-6
    const dayMap = {
      Domingo: 0,
      Lunes: 1,
      Martes: 2,
      Miércoles: 3,
      Jueves: 4,
      Viernes: 5,
      Sábado: 6,
    };

    // Get Active Credit
    const { data: creditos } = await supabase
      .from("creditos_alumna")
      .select("*")
      .eq("alumna_id", userId)
      .eq("estado", "activo")
      .gte("creditos_restantes", 1)
      .order("fecha_vencimiento", { ascending: true }); // Use nearest expiration first

    if (!creditos || creditos.length === 0) return; // No credit, partial success

    let totalReserved = 0;

    // Loop remaining days of month
    for (let d = today.getDate(); d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      // Skip past days (though loop starts at today)
      if (dateObj < today) continue;

      const dayOfWeekName = Object.keys(dayMap).find(
        (key) => dayMap[key] === dateObj.getDay()
      );

      // Check if this day is in schedule
      const schedItemsForDay = scheduleItems.filter(
        (s) => s.dia_semana.toLowerCase() === dayOfWeekName?.toLowerCase()
      );

      for (const item of schedItemsForDay) {
        const time = item.hora;

        // Find valid credit
        const validCredit = creditos.find(
          (c) =>
            c.creditos_restantes > 0 && new Date(c.fecha_vencimiento) >= dateObj
        );
        if (!validCredit) continue;

        // Check if already reserved (idempotency)
        const dateStr = dateObj.toISOString().split("T")[0];
        const { data: existing } = await supabase
          .from("reservas")
          .select("id")
          .eq("usuario_id", userId)
          .eq("fecha", dateStr)
          .neq("estado", "cancelada");
        if (existing && existing.length > 0) continue; // "One class per day" rule

        // Check Availability (Database check)
        const { data: ocupadas } = await supabase
          .from("reservas")
          .select("cama_id")
          .eq("fecha", dateStr)
          .eq("hora", time + ":00")
          .neq("estado", "cancelada");
        const ocupadasIds = ocupadas.map((o) => o.cama_id);
        const allBeds = [1, 2, 3, 4, 5, 6];
        const availableBeds = allBeds.filter((b) => !ocupadasIds.includes(b));

        if (availableBeds.length > 0) {
          // Book random bed
          const randomIndex = Math.floor(Math.random() * availableBeds.length);
          const bed = availableBeds[randomIndex];

          const { error } = await supabase.from("reservas").insert({
            usuario_id: userId,
            fecha: dateStr,
            hora: time + ":00",
            cama_id: bed,
            credito_id: validCredit.id,
            estado: "confirmada",
          });
          if (!error) {
            validCredit.creditos_restantes--;
            bookedCount++;
          }
        }
      }
    }

    if (bookedCount > 0) {
      Swal.fire({
        icon: "success",
        title: "Agenda Actualizada",
        text: `Se generaron automáticamente ${bookedCount} reservas para este mes.`,
        timer: 3000,
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.dni || !formData.nombre || !formData.telefono) {
      Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Por favor completá todos los datos",
        confirmButtonColor: "#10b981",
      });
      return;
    }

    if (!formData.dni || formData.dni.length < 7 || formData.dni.length > 8) {
      Swal.fire({
        icon: "warning",
        title: "DNI inválido",
        text: "Debe tener entre 7 y 8 dígitos reales",
        confirmButtonColor: "#10b981",
      });
      return;
    }

    // Check against dummy DNIs
    const dummyDNIs = ["123456", "12345678", "11111111", "00000000"];
    if (dummyDNIs.includes(formData.dni)) {
      Swal.fire({
        icon: "warning",
        title: "DNI inválido",
        text: "Ingresá un DNI real",
        confirmButtonColor: "#10b981",
      });
      return;
    }

    setLoading(true);
    try {
      if (userToEdit) {
        // UPDATE
        const { error } = await supabase
          .from("usuarios")
          .update({
            nombre: formData.nombre,
            telefono: formData.telefono,
            turno: formData.turno || null,
            dni: formData.dni, // DNI también editable por si hubo error
          })
          .eq("id", userToEdit.id);

        if (error) throw error;

        Swal.fire({
          icon: "success",
          title: "Usuario actualizado",
          timer: 1500,
          showConfirmButton: false,
        });

        await saveFixedSchedule(userToEdit.id);
      } else {
        // CREATE
        // Verificar DNI duplicado
        const { data: existingUser } = await supabase
          .from("usuarios")
          .select("id")
          .eq("dni", formData.dni)
          .single();

        if (existingUser) {
          Swal.fire({
            icon: "warning",
            title: "DNI ya registrado",
            text: "Este DNI ya existe en el sistema.",
            confirmButtonColor: "#10b981",
          });
          setLoading(false);
          return;
        }

        const { data: newUser, error } = await supabase
          .from("usuarios")
          .insert({
            dni: formData.dni,
            nombre: formData.nombre,
            telefono: formData.telefono,
            rol: "cliente",
            estudio_id: parseInt(formData.estudio_id),
            turno: formData.turno || null,
          })
          .select()
          .single();

        if (error) throw error;

        await saveFixedSchedule(newUser.id);

        if (error) throw error;

        Swal.fire({
          icon: "success",
          title: "Cliente registrada",
          text: `${formData.nombre} ya puede usar el sistema.`,
          confirmButtonColor: "#10b981",
        });
      }

      onUserSaved();
      onClose();
    } catch (error) {
      console.error("Error guardando usuario:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo guardar los cambios.",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 md:p-6 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
            {userToEdit ? "Editar Cliente" : "Registrar Nueva Cliente"}
          </h3>
        </div>

        <div className="space-y-3 mb-4 max-h-96 overflow-y-auto px-1">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              DNI (Usuario)
            </label>
            <input
              type="text"
              value={formData.dni}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dni: e.target.value.replace(/\D/g, "").slice(0, 8),
                })
              }
              placeholder="12345678"
              maxLength="8"
              className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-sm md:text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre Completo
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              placeholder="María González"
              className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-sm md:text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="text"
              value={formData.telefono}
              onChange={(e) =>
                setFormData({ ...formData, telefono: e.target.value })
              }
              placeholder="381-5551234"
              className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-sm md:text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Horario Favorito
            </label>
            <select
              className="w-full border p-2 rounded-lg"
              value={formData.turno}
              onChange={(e) =>
                setFormData({ ...formData, turno: e.target.value })
              }
            >
              <option value="">-- Sin definir --</option>
              <option value="mañana">
                {GYM_CONSTANTS.TURNOS.MAÑANA.label}
              </option>
              <option value="tarde">{GYM_CONSTANTS.TURNOS.TARDE.label}</option>
            </select>
          </div>

          {/* Schedle Configurator - Mobile Optimized - SOLO VISIBLE SI SE EDITA (Para asegurar que tenga creditos) */}
          {userToEdit && (
            <div className="mt-4 border-t pt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Agenda Fija (Horarios Habituales)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Agregá los días fijos de la alumna. (Asegurate que tenga pack
                activo primero)
              </p>

              <div className="flex gap-2 mb-3">
                <select
                  className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5"
                  value={tempDay}
                  onChange={(e) => {
                    setTempDay(e.target.value);
                    setTempHour("");
                  }}
                >
                  <option value="">Día...</option>
                  {daysOfWeek.map((d) => (
                    <option key={d.id} value={d.label}>
                      {d.label}
                    </option>
                  ))}
                </select>

                <select
                  className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5"
                  value={tempHour}
                  onChange={(e) => setTempHour(e.target.value)}
                  disabled={!tempDay}
                >
                  <option value="">Hora...</option>
                  {tempDay &&
                    GYM_CONSTANTS.getHorariosPorDia(tempDay).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  onClick={addScheduleSlot}
                  disabled={!tempDay || !tempHour}
                  className="bg-green-600 text-white p-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5 rotate-90" strokeWidth={3} />{" "}
                  {/* Using Save as 'Plus' metaphor or just simple text */}
                </button>
              </div>

              {/* Chips Container */}
              <div className="flex flex-wrap gap-2 min-h-[50px] bg-gray-50 p-2 rounded-lg border border-dashed border-gray-300">
                {fixedSchedule.length === 0 && (
                  <span className="text-xs text-gray-400 self-center mx-auto">
                    Sin horarios fijos asignados
                  </span>
                )}

                {fixedSchedule.map((s, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 mr-1 text-sm font-medium text-green-800 bg-green-100 rounded"
                  >
                    {s.dia_semana.slice(0, 3)} {s.hora}hs
                    <button
                      type="button"
                      onClick={() => removeScheduleSlot(s.dia_semana, s.hora)}
                      className="inline-flex items-center p-0.5 ml-2 text-sm text-green-400 bg-transparent rounded-sm hover:bg-green-200 hover:text-green-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                "Guardando..."
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {userToEdit ? "Guardar Cambios" : "Registrar Cliente"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
