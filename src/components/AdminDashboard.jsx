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
  Plus,
  Gift,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { AdminPacks } from "./AdminPacks";
import { VenderPackModal } from "./VenderPackModal";
import { useCreditos } from "../hooks/useCreditos";
import Swal from "sweetalert2";

const AdminDashboard = () => {
  const [usuario, setUsuario] = useState(null);
  const [estudio, setEstudio] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showVenderPackModal, setShowVenderPackModal] = useState(false);
  const [selectedAlumna, setSelectedAlumna] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [alumnas, setAlumnas] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reservas"); // 'reservas' | 'alumnas' | 'packs' | 'caja'
  const { getTodosCreditosAlumna } = useCreditos();

  // Estado para formulario de nuevo usuario
  const [newUser, setNewUser] = useState({
    dni: "",
    nombre: "",
    telefono: "",
    estudio_id: "",
    turno: "mañana",
    metodo_pago: "digital",
  });

  // Estado para horarios mixtos
  const [schedules, setSchedules] = useState([]);
  const [newSchedule, setNewSchedule] = useState({
    dia_semana: "lunes",
    hora: "09:00",
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
    fetchVentas(); // Cargar historial de ventas

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel("admin-reservas")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservas" },
        () => {
          fetchReservas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Cargar alumnas cuando usuario esté disponible
  useEffect(() => {
    if (usuario) {
      fetchAlumnas();
    }
  }, [usuario]);

  useEffect(() => {
    // Recargar ventas cuando se vende un pack (cambio en tab)
    if (activeTab === "caja") {
      fetchVentas();
    }
  }, [activeTab]);

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

  const fetchVentas = async () => {
    try {
      if (!usuario?.estudio_id) return;

      // Obtener créditos (packs vendidos) unidos con usuarios y packs
      // Filtramos por el estudio del usuarios

      // Nota: creditos_alumna no tiene estudio_id directo, se infiere por el usuario.
      // Supabase limita los joins profundos.
      // Lo ideal seria filtrar por usuario.estudio_id pero aquí traemos todo y filtramos en JS si es necesario
      // O asumimos RLS. Vamos a traer todo con los joins.

      const { data, error } = await supabase
        .from("creditos_alumna")
        .select(
          `
          *,
          usuario:usuarios!inner(nombre, estudio_id),
          pack:packs(nombre)
        `
        )
        .eq("usuario.estudio_id", usuario.estudio_id)
        .order("fecha_compra", { ascending: false });

      if (error) throw error;
      setVentas(data || []);
    } catch (error) {
      console.error("Error cargando ventas:", error);
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

  // Calcular estadísticas en base a datos reales
  const stats = {
    totalBookings: reservas.length,
    activePacks: reservas.filter((r) => r.credito?.id).length,
    occupancy:
      reservas.length > 0 ? Math.round((reservas.length / 42) * 100) : 0, // 7 días * 6 camas = 42 slots semanales
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
        metodo_pago: "digital",
      });
      setSchedules([]);
      setShowUserModal(false);
      await fetchReservas();
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
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 md:gap-6 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="text-4xl font-black">RUNA</div>
              <div className="text-4xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                FIT
              </div>
            </div>
            {estudio && (
              <h2 className="text-lg md:text-xl font-bold text-purple-600 mb-4">
                {estudio.nombre}
              </h2>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
              Panel de Control
            </h1>
            <p className="text-gray-500 text-sm">Dashboard Administrativo</p>
          </div>
          <button
            onClick={() => setShowUserModal(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 md:py-3 px-3 md:px-5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 whitespace-nowrap text-sm md:text-base"
          >
            <Plus className="w-4 md:w-5 h-4 md:h-5" />
            <span>Nueva Cliente</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("reservas")}
            className={`px-4 py-3 font-semibold text-sm md:text-base transition-colors border-b-2 ${
              activeTab === "reservas"
                ? "text-purple-600 border-purple-600"
                : "text-gray-600 border-transparent hover:text-gray-800"
            }`}
          >
            <Calendar className="inline mr-2 w-4 h-4" />
            Reservas
          </button>
          <button
            onClick={() => setActiveTab("alumnas")}
            className={`px-4 py-3 font-semibold text-sm md:text-base transition-colors border-b-2 ${
              activeTab === "alumnas"
                ? "text-purple-600 border-purple-600"
                : "text-gray-600 border-transparent hover:text-gray-800"
            }`}
          >
            <Users className="inline mr-2 w-4 h-4" />
            Alumnas
          </button>
          <button
            onClick={() => setActiveTab("packs")}
            className={`px-4 py-3 font-semibold text-sm md:text-base transition-colors border-b-2 ${
              activeTab === "packs"
                ? "text-purple-600 border-purple-600"
                : "text-gray-600 border-transparent hover:text-gray-800"
            }`}
          >
            <Gift className="inline mr-2 w-4 h-4" />
            Packs
          </button>
          <button
            onClick={() => setActiveTab("caja")}
            className={`px-4 py-3 font-semibold text-sm md:text-base transition-colors border-b-2 ${
              activeTab === "caja"
                ? "text-purple-600 border-purple-600"
                : "text-gray-600 border-transparent hover:text-gray-800"
            }`}
          >
            <DollarSign className="inline mr-2 w-4 h-4" />
            Caja
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
                  value={newUser.turno}
                  onChange={(e) =>
                    setNewUser({ ...newUser, turno: e.target.value })
                  }
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-sm md:text-base"
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
                  onChange={(e) =>
                    setNewUser({ ...newUser, metodo_pago: e.target.value })
                  }
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all outline-none text-sm md:text-base"
                >
                  <option value="digital">Transferencia / Mercado Pago</option>
                  <option value="efectivo">
                    Efectivo (Confirmar manualmente)
                  </option>
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
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, hora: e.target.value })
                    }
                    className="flex-1 px-2 md:px-3 py-2 border border-gray-300 rounded text-xs md:text-sm"
                  />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">
                Turnos Activos
              </p>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {stats.totalBookings}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-pink-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">
                Créditos en Uso
              </p>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {stats.activePacks}
              </p>
            </div>
            <div className="bg-pink-100 p-3 rounded-full">
              <Gift className="w-6 h-6 text-pink-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Ocupación</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {stats.occupancy}%
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
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

      {/* Contenido según pestaña activa */}
      {activeTab === "reservas" && (
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
                    Pack Usado
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
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No hay reservas activas
                    </td>
                  </tr>
                ) : (
                  reservas.map((reserva) => (
                    <tr
                      key={reserva.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {reserva.usuario.nombre}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {reserva.usuario.telefono}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatFecha(reserva.fecha, reserva.hora)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {reserva.hora.slice(0, 5)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                          {reserva.cama.nombre}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {reserva.credito ? (
                          <div className="text-sm">
                            <div className="font-semibold text-gray-900">
                              {reserva.credito.pack.nombre}
                            </div>
                            <div className="text-xs text-gray-500">
                              {reserva.credito.creditos_restantes}/
                              {reserva.credito.creditos_totales} créditos
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 italic">
                            Sin pack
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
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

      {activeTab === "alumnas" && (
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
                        <button
                          onClick={() => {
                            setSelectedAlumna(alumna);
                            setShowVenderPackModal(true);
                          }}
                          className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                        >
                          <Gift className="w-4 h-4" />
                          Vender Pack
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "packs" && estudio && <AdminPacks estudio={estudio} />}

      {activeTab === "caja" && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">
              Movimientos de Caja
            </h2>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
              Total Mes: $
              {ventas
                .reduce((acc, curr) => acc + (curr.monto_pagado || 0), 0)
                .toLocaleString("es-AR")}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método Pago
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ventas.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No hay movimientos registrados
                    </td>
                  </tr>
                ) : (
                  ventas.map((venta) => (
                    <tr
                      key={venta.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(venta.fecha_compra).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {venta.usuario?.nombre || "Desconocido"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {venta.pack?.nombre || "Pack"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-800">
                        ${(venta.monto_pagado || 0).toLocaleString("es-AR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            venta.metodo_pago === "efectivo"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {venta.metodo_pago || "digital"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
