import React, { useState, useEffect } from "react";
import {
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Package,
  MessageCircle,
  CreditCard,
  Plus,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { AdminPacks } from "./AdminPacks";
import { VenderPackModal } from "./VenderPackModal";
import { useCreditos } from "../hooks/useCreditos";
import { GYM_CONSTANTS } from "../config/gymConstants";
import Swal from "sweetalert2";

const AdminDashboard = () => {
  const [usuario, setUsuario] = useState(null);
  const [estudio, setEstudio] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showVenderPackModal, setShowVenderPackModal] = useState(false);
  const [selectedAlumna, setSelectedAlumna] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [alumnas, setAlumnas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("bookings"); // 'bookings' | 'users' | 'packs'
  const { getTodosCreditosAlumna } = useCreditos();

  // Estado para formulario de nuevo usuario
  const [newUser, setNewUser] = useState({
    dni: "",
    nombre: "",
    telefono: "",
    estudio_id: "",
    turno: "mañana",
  });

  // Estado para horarios mixtos
  const [schedules, setSchedules] = useState([]);
  const [newSchedule, setNewSchedule] = useState({
    dia_semana: "lunes",
    hora: "08:00",
  });

  // Cargar datos del admin y estudio
  useEffect(() => {
    const storedUser = localStorage.getItem("usuario");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUsuario(user);
      fetchEstudio(user.estudio_id);
    }
    fetchReservas();
    fetchKPIs();

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel("admin-reservas")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservas" },
        () => {
          fetchReservas();
          fetchKPIs();
        }
      )
      .subscribe();

    // Suscripción a cambios en usuarios (alumnas)
    const channelAlumnas = supabase
      .channel("admin-alumnas")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "usuarios" },
        () => {
          fetchAlumnas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channelAlumnas);
    };
  }, []);

  // Cargar alumnas cuando usuario esté disponible
  useEffect(() => {
    if (usuario) {
      fetchAlumnas();
    }
  }, [usuario]);

  const fetchEstudio = async (estudioId) => {
    try {
      const { data, error } = await supabase
        .from("estudios")
        .select("*")
        .eq("id", estudioId)
        .single();

      if (error) throw error;
      setEstudio(data);
      // Auto-llenar estudio_id en el formulario
      setNewUser((prev) => ({ ...prev, estudio_id: estudioId.toString() }));
    } catch (error) {
      console.error("Error al cargar estudio:", error);
    }
  };

  const fetchReservas = async () => {
    try {
      const { data, error } = await supabase
        .from("reservas")
        .select(
          `
          *,
          usuario:usuarios(dni, nombre, telefono),
          cama:camas(nombre),
          credito:creditos_alumna(
            creditos_restantes,
            creditos_totales,
            pack:packs(nombre)
          )
        `
        )
        .neq("estado", "cancelada")
        .order("fecha", { ascending: true })
        .order("hora", { ascending: true });

      if (error) throw error;
      setReservas(data || []);
    } catch (error) {
      console.error("Error al cargar reservas:", error);
      alert("Error al cargar las reservas");
    } finally {
      setLoading(false);
    }
  };

  const [kpis, setKpis] = useState({
    recaudacion: 0,
    vencimientos: 0,
    ocupacionHoy: 0,
  });

  const fetchKPIs = async () => {
    try {
      // 1. Recaudación Mes Actual (suma de packs vendidos)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: packsVendidos } = await supabase
        .from("creditos_alumna")
        .select("monto_pagado")
        .gte("created_at", startOfMonth.toISOString());

      const recaudacion =
        packsVendidos?.reduce(
          (acc, curr) => acc + (curr.monto_pagado || 0),
          0
        ) || 0;

      // 2. Vencimientos Próximos (prox 7 días)
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const { count: vencimientos } = await supabase
        .from("creditos_alumna")
        .select("*", { count: "exact", head: true })
        .eq("estado", "activo")
        .gte("fecha_vencimiento", today.toISOString())
        .lte("fecha_vencimiento", nextWeek.toISOString());

      // 3. Ocupación HOY
      const todayStr = today.toISOString().split("T")[0];
      const { count: reservasHoy } = await supabase
        .from("reservas")
        .select("*", { count: "exact", head: true })
        .eq("fecha", todayStr)
        .neq("estado", "cancelada");

      // Asumimos 36 slots diarios aprox
      const slotsDiarios = 36;
      const ocupacion = reservasHoy
        ? Math.round((reservasHoy / slotsDiarios) * 100)
        : 0;

      setKpis({
        recaudacion,
        vencimientos: vencimientos || 0,
        ocupacionHoy: ocupacion,
      });
    } catch (error) {
      console.error("Error fetching KPIs:", error);
    }
  };

  const fetchAlumnas = async () => {
    try {
      if (!usuario) return;

      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("estudio_id", usuario.estudio_id)
        .eq("rol", "cliente")
        .order("nombre", { ascending: true });

      if (error) throw error;
      setAlumnas(data || []);
    } catch (error) {
      console.error("Error al cargar alumnas:", error);
    }
  };

  const saveSchedulesToDB = async (usuarioId) => {
    if (schedules.length === 0) return;

    for (const schedule of schedules) {
      const { error } = await supabase.from("schedule_alumnas").insert({
        usuario_id: usuarioId,
        dia_semana: schedule.dia_semana,
        hora: schedule.hora,
        cama_preferida: null,
      });

      if (error) {
        console.error("Error guardando horario:", error);
      }
    }
  };

  const releaseBooking = async (reservaId, reserva) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "¿Liberar este cupo?",
      text: "El crédito será devuelto a la alumna",
      showCancelButton: true,
      confirmButtonText: "Sí, liberar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      allowOutsideClick: false,
      allowEscapeKey: true,
    });

    if (!result.isConfirmed) return;

    try {
      // Devolver crédito si existe
      if (reserva.credito_id && reserva.credito?.estado === "activo") {
        await supabase
          .from("creditos_alumna")
          .update({
            creditos_restantes: (reserva.credito.creditos_restantes || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", reserva.credito_id);
      }

      // Eliminar reserva
      const { error } = await supabase
        .from("reservas")
        .delete()
        .eq("id", reservaId);

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "¡Cupo liberado!",
        text: `Crédito devuelto a ${reserva.usuario.nombre}`,
        timer: 1500,
        showConfirmButton: false,
        confirmButtonColor: "#10b981",
      });
      fetchReservas(); // Recargar datos
    } catch (error) {
      console.error("Error al liberar cupo:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo liberar el cupo",
        confirmButtonColor: "#10b981",
      });
    }
  };

  const handleWhatsApp = (telefono, mensaje) => {
    if (!telefono) return;
    // Limpiar teléfono (sacar 0, 15, guiones, etc si fuera necesario, o asumir formato correcto)
    // Asumimos que guardan "381..."
    const url = `https://wa.me/549${telefono}?text=${encodeURIComponent(
      mensaje
    )}`;
    window.open(url, "_blank");
  };

  const createNewUser = async () => {
    if (!newUser.dni || !newUser.nombre || !newUser.telefono) {
      Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Por favor completá todos los datos",
        confirmButtonColor: "#10b981",
      });
      return;
    }

    if (newUser.dni.length < 7) {
      Swal.fire({
        icon: "warning",
        title: "DNI inválido",
        text: "Debe tener 8 dígitos",
        confirmButtonColor: "#10b981",
      });
      return;
    }

    try {
      // Verificar si el DNI ya existe ANTES de insertar
      const { data: existingUser, error: checkError } = await supabase
        .from("usuarios")
        .select("dni, nombre")
        .eq("dni", newUser.dni)
        .single();

      if (existingUser) {
        Swal.fire({
          icon: "warning",
          title: "DNI ya registrado",
          html: `Este DNI ya pertenece a: <strong>${existingUser.nombre}</strong><br><br>Verificá que no sea un error de tipeo.`,
          confirmButtonColor: "#10b981",
        });
        return;
      }

      const { data: newUserData, error } = await supabase
        .from("usuarios")
        .insert({
          dni: newUser.dni,
          nombre: newUser.nombre,
          telefono: newUser.telefono,
          rol: "cliente",
          estudio_id: parseInt(newUser.estudio_id),
          turno: newUser.turno,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          Swal.fire({
            icon: "warning",
            title: "DNI duplicado",
            text: "Este DNI ya está registrado en el sistema",
            confirmButtonColor: "#10b981",
          });
        } else {
          throw error;
        }
        return;
      }

      // Guardar horarios si existen
      await saveSchedulesToDB(newUserData.id);

      Swal.fire({
        icon: "success",
        title: "Cliente registrada",
        text: `${newUser.nombre} puede loguearse con su DNI`,
        confirmButtonColor: "#10b981",
      });
      setNewUser({
        dni: "",
        nombre: "",
        telefono: "",
        estudio_id: newUser.estudio_id,
        turno: "mañana",
      });
      setSchedules([]);
      setShowUserModal(false);
      await fetchReservas();
      await fetchAlumnas();
    } catch (error) {
      console.error("Error al crear usuario:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo registrar la cliente",
        confirmButtonColor: "#10b981",
      });
    }
  };

  // Formatear fecha legible
  const formatFecha = (fecha, hora) => {
    const date = new Date(fecha + "T00:00:00");
    const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const dia = dias[date.getDay()];
    const numero = date.getDate();
    const mes = date.getMonth() + 1;
    return `${dia} ${numero}/${mes}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-600">
          Cargando dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-10 bg-white rounded-2xl shadow-lg p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Panel de Control
            </h1>
            <p className="text-sm text-gray-500">Gestión administrativa</p>
          </div>
          <button
            onClick={() => setShowUserModal(true)}
            className="w-full md:w-auto bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Nueva Cliente
          </button>
        </div>
      </div>

      {/* Modal Nuevo Usuario */}
      {showUserModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
          onClick={(e) =>
            e.target === e.currentTarget && setShowUserModal(false)
          }
          onKeyDown={(e) => e.key === "Escape" && setShowUserModal(false)}
          tabIndex={0}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 md:p-6 relative my-8">
            <button
              onClick={() => setShowUserModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
                Registrar Nueva Cliente
              </h3>
            </div>

            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  DNI (sin puntos)
                </label>
                <input
                  type="text"
                  value={newUser.dni}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
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
                  value={newUser.nombre}
                  onChange={(e) =>
                    setNewUser({ ...newUser, nombre: e.target.value })
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
                  value={newUser.telefono}
                  onChange={(e) =>
                    setNewUser({ ...newUser, telefono: e.target.value })
                  }
                  placeholder="381-5551234"
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-sm md:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Turno
                </label>
                <select
                  className="w-full border p-2 rounded-lg"
                  value={newUser.turno}
                  onChange={(e) =>
                    setNewUser({ ...newUser, turno: e.target.value })
                  }
                  disabled={loading}
                >
                  <option value="mañana">Mañana (09:00 - 13:00)</option>
                  <option value="tarde">Tarde (18:00 - 21:00)</option>
                </select>
              </div>

              <div className="border-t-2 border-gray-200 pt-3">
                <h4 className="text-xs md:text-sm font-semibold text-gray-700 mb-2">
                  Horarios (Días y Horas)
                </h4>
                <div className="space-y-2 mb-2">
                  {schedules.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      Sin horarios agregados aún
                    </p>
                  ) : (
                    schedules.map((sch, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-gray-100 p-2 rounded"
                      >
                        <span className="text-xs md:text-sm font-semibold">
                          {sch.dia_semana.charAt(0).toUpperCase() +
                            sch.dia_semana.slice(1)}{" "}
                          - {sch.hora}
                        </span>
                        <button
                          onClick={() =>
                            setSchedules(schedules.filter((_, i) => i !== idx))
                          }
                          className="text-red-600 hover:text-red-800 text-xs font-bold"
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
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        dia_semana: e.target.value,
                      })
                    }
                    className="flex-1 px-2 md:px-3 py-2 border border-gray-300 rounded text-xs md:text-sm"
                  >
                    {GYM_CONSTANTS.DIAS_SEMANA.filter((day) =>
                      GYM_CONSTANTS.DIAS_Apertura.map((d) =>
                        d.toLowerCase()
                      ).includes(day.id.toLowerCase())
                    ).map((day) => (
                      <option key={day.id} value={day.id}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newSchedule.hora}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, hora: e.target.value })
                    }
                    className="flex-1 px-2 md:px-3 py-2 border border-gray-300 rounded text-xs md:text-sm"
                  >
                    {GYM_CONSTANTS.HORARIOS_VALIDOS.map((hora) => (
                      <option key={hora} value={hora}>
                        {hora}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (
                        !schedules.find(
                          (s) =>
                            s.dia_semana === newSchedule.dia_semana &&
                            s.hora === newSchedule.hora
                        )
                      ) {
                        setSchedules([...schedules, newSchedule]);
                      }
                    }}
                    className="px-2 md:px-3 py-2 bg-blue-500 text-white rounded text-xs md:text-sm font-bold hover:bg-blue-600"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-2 md:p-3 mb-4 border border-blue-200">
              <p className="text-xs md:text-sm text-blue-800">
                <span className="font-semibold">Nota:</span> La cliente podrá
                loguearse con su DNI una vez registrada.
              </p>
            </div>

            <button
              onClick={createNewUser}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 md:py-4 rounded-xl transition-colors shadow-lg text-sm md:text-base"
            >
              Registrar Cliente
            </button>
          </div>
        </div>
      )}
      {/* KPIs Section - Scroll Horizontal en Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Card Turnos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
              Turnos Activos
            </p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {reservas.length}
            </p>
          </div>
          <div className="bg-purple-50 p-2.5 rounded-lg">
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
        </div>

        {/* Card Caja */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
              Caja Mensual
            </p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              ${kpis.recaudacion.toLocaleString("es-AR")}
            </p>
          </div>
          <div className="bg-green-50 p-2.5 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
        </div>

        {/* Card Vencimientos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
              Vencimientos (7d)
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {kpis.vencimientos}
              </p>
              {kpis.vencimientos > 0 && (
                <span className="text-xs text-red-500 font-medium">
                  Atención
                </span>
              )}
            </div>
          </div>
          <div className="bg-red-50 p-2.5 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
        </div>
      </div>

      {/* Alertas */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 mb-8">
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
        <div>
          <h3 className="font-semibold text-green-800 mb-1">
            Sistema de Créditos Activo
          </h3>
          <p className="text-sm text-green-700">
            Reservas sincronizadas en tiempo real con créditos automáticos
          </p>
        </div>
      </div>

      {/* Modal de Vender Pack */}
      {estudio && selectedAlumna && (
        <VenderPackModal
          isOpen={showVenderPackModal}
          onClose={() => {
            setShowVenderPackModal(false);
            setSelectedAlumna(null);
          }}
          alumna={selectedAlumna}
          estudio={estudio}
          onVendido={() => {
            setShowVenderPackModal(false);
            setSelectedAlumna(null);
          }}
        />
      )}

      {/* Tabs Menu - Debajo de los contadores */}
      <div className="flex overflow-x-auto gap-2 pb-4 mb-2 no-scrollbar">
        <button
          onClick={() => setActiveTab("bookings")}
          className={`whitespace-nowrap flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "bookings"
              ? "bg-indigo-600 text-white shadow-md relative"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
          }`}
        >
          <Calendar className="inline mr-2 w-4 h-4" />
          Reservas
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`whitespace-nowrap flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "users"
              ? "bg-indigo-600 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
          }`}
        >
          <Users className="inline mr-2 w-4 h-4" />
          Alumnas
        </button>

        <button
          onClick={() => setActiveTab("packs")}
          className={`whitespace-nowrap flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "packs"
              ? "bg-indigo-600 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
          }`}
        >
          <Package className="inline mr-2 w-4 h-4" />
          Packs
        </button>
      </div>

      {/* Contenido según pestaña activa */}
      {activeTab === "bookings" && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              Reservas Activas
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Actividad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
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
                    <td
                      colSpan="6"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No hay reservas activas hoy
                    </td>
                  </tr>
                ) : (
                  reservas.map((reserva) => (
                    <tr key={reserva.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                              {reserva.usuario.nombre.charAt(0)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {reserva.usuario.nombre}
                            </div>
                            {/* Mostrar teléfono solo en móvil debajo del nombre */}
                            <div className="text-xs text-gray-500 md:hidden">
                              {reserva.usuario.telefono}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {reserva.usuario.telefono}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatFecha(reserva.fecha, reserva.hora)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {reserva.hora.slice(0, 5)} hs
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {reserva.credito?.pack?.nombre || "Pack Regular"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Confirmada
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleWhatsApp(
                                reserva.usuario.telefono,
                                `Hola ${
                                  reserva.usuario.nombre
                                }, te escribo por tu reserva del ${formatFecha(
                                  reserva.fecha,
                                  reserva.hora
                                )} a las ${reserva.hora.slice(0, 5)}hs.`
                              )
                            }
                            className="bg-green-100 hover:bg-green-200 text-green-700 p-1.5 rounded-lg transition-colors"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => releaseBooking(reserva.id, reserva)}
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
      )}

      {activeTab === "users" && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              Gestionar Créditos de Alumnas
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DNI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Créditos Activos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alumnas.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No hay alumnas registradas
                    </td>
                  </tr>
                ) : (
                  alumnas.map((alumna) => (
                    <tr
                      key={alumna.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {alumna.nombre}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {alumna.dni}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {alumna.telefono}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={async () => {
                            const creditos = await getTodosCreditosAlumna(
                              alumna.id
                            );
                            const activos = creditos.filter(
                              (c) => c.estado === "activo"
                            );
                            if (activos.length === 0) {
                              Swal.fire({
                                icon: "info",
                                title: "Sin créditos activos",
                                text: `${alumna.nombre} no tiene packs activos`,
                                confirmButtonColor: "#10b981",
                              });
                            } else {
                              Swal.fire({
                                icon: "info",
                                title: "Créditos Activos",
                                html: activos
                                  .map(
                                    (c) => `
                                  <div style="margin: 10px 0; padding: 10px; background: #f0f9ff; border-radius: 5px; text-align: left;">
                                    <strong>${c.pack.nombre}</strong><br/>
                                    ${c.creditos_restantes}/${
                                      c.creditos_totales
                                    } clases<br/>
                                    <small style="color: #666;">Vence: ${new Date(
                                      c.fecha_vencimiento
                                    ).toLocaleDateString("es-AR")}</small>
                                  </div>
                                `
                                  )
                                  .join(""),
                                confirmButtonColor: "#10b981",
                              });
                            }
                          }}
                          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors text-sm"
                        >
                          Ver
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedAlumna(alumna);
                              setShowVenderPackModal(true);
                            }}
                            className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                          >
                            <CreditCard className="w-4 h-4" />
                            Cargar Pack
                          </button>
                          <button
                            onClick={() =>
                              handleWhatsApp(
                                alumna.telefono,
                                `Hola ${alumna.nombre}, te escribo de RunaFit.`
                              )
                            }
                            className="p-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                            title="Enviar Mensaje"
                          >
                            <MessageCircle className="w-4 h-4" />
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
      )}

      {/* Packs Tab */}
      {activeTab === "packs" && estudio && <AdminPacks estudio={estudio} />}
    </div>
  );
};

export default AdminDashboard;
