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
  Search,
  Pencil,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { AdminPacks } from "./AdminPacks";
import { UserModal } from "./UserModal";
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
  const [editingUser, setEditingUser] = useState(null); // Para editar usuario
  const [searchTerm, setSearchTerm] = useState(""); // Buscador

  const [reservas, setReservas] = useState([]);
  const [alumnas, setAlumnas] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("bookings"); // 'bookings' | 'users' | 'packs'
  const { getTodosCreditosAlumna } = useCreditos();

  const handleUserSaved = () => {
    fetchAlumnas();
    fetchReservas();
    setShowUserModal(false);
    setEditingUser(null);
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
    const url = `https://wa.me/549${telefono}?text=${encodeURIComponent(
      mensaje
    )}`;
    window.open(url, "_blank");
  };

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
    fetchVentas(); // Cargar historial de ventas

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

  const fetchVentas = async () => {
    try {
      if (!usuario?.estudio_id) return;

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
        .select(
          `
          *,
          creditos:creditos_alumna(
            creditos_restantes,
            creditos_totales,
            fecha_vencimiento,
            pack:packs(nombre),
            estado
          )
        `
        )
        .eq("estudio_id", usuario.estudio_id)
        .eq("rol", "cliente")
        .order("nombre", { ascending: true });

      if (error) throw error;
      setAlumnas(data || []);
    } catch (error) {
      console.error("Error al cargar alumnas:", error);
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
            fetchAlumnas();
            fetchVentas();
            fetchKPIs();
            fetchReservas();
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
          onClick={() => setActiveTab("caja")}
          className={`whitespace-nowrap flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "caja"
              ? "bg-indigo-600 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
          }`}
        >
          <DollarSign className="inline mr-2 w-4 h-4" />
          Caja
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
              <thead className="bg-gray-50 hidden md:table-header-group">
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
                    Cama
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
                  <>
                    {/* PC View - Table Rows */}
                    {reservas.map((reserva) => (
                      <tr
                        key={reserva.id}
                        className="hover:bg-gray-50 hidden md:table-row"
                      >
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 hidden md:table-cell font-medium">
                          {reserva.cama?.nombre || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Confirmada
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() =>
                                handleWhatsApp(
                                  reserva.usuario.telefono,
                                  `Hola ${reserva.usuario.nombre}! 👋 Te escribo desde BodyFit`
                                )
                              }
                              className="bg-green-100 hover:bg-green-200 text-green-700 p-1.5 rounded-lg transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                releaseBooking(reserva.id, reserva)
                              }
                              className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                            >
                              <X className="w-4 h-4" />
                              Liberar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Mobile View - Cards */}
                    <tr className="md:hidden">
                      <td colSpan="6" className="p-4 space-y-4 bg-gray-50">
                        {reservas.map((reserva) => (
                          <div
                            key={`mobile-${reserva.id}`}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                {reserva.usuario.nombre.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">
                                  {reserva.usuario.nombre}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {formatFecha(reserva.fecha, reserva.hora)} -{" "}
                                  {reserva.hora.slice(0, 5)} hs
                                </p>
                                <p className="text-xs text-indigo-600 font-semibold mt-1">
                                  {reserva.cama?.nombre || "Sin Asignar"}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                releaseBooking(reserva.id, reserva)
                              }
                              className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs font-bold border border-red-100"
                            >
                              Liberar
                            </button>
                          </div>
                        ))}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nombre, DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 hidden md:table-header-group">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    DNI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Créditos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alumnas.filter((alumna) => {
                  const search = searchTerm.toLowerCase();
                  return (
                    alumna.nombre.toLowerCase().includes(search) ||
                    alumna.dni.includes(search) ||
                    alumna.telefono?.includes(search)
                  );
                }).length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      {searchTerm
                        ? "No se encontraron resultados"
                        : "No hay alumnas registradas"}
                    </td>
                  </tr>
                ) : (
                  alumnas
                    .filter((alumna) => {
                      const search = searchTerm.toLowerCase();
                      return (
                        alumna.nombre.toLowerCase().includes(search) ||
                        alumna.dni.includes(search) ||
                        alumna.telefono?.includes(search)
                      );
                    })
                    .map((alumna) => {
                      // Buscar pack activo
                      const creditoActivo = alumna.creditos?.find(
                        (c) => c.estado === "activo" && c.creditos_restantes > 0
                      );

                      return (
                        <React.Fragment key={alumna.id}>
                          {/* Desktop Row */}
                          <tr className="hover:bg-gray-50 hidden md:table-row">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                                  {alumna.nombre.charAt(0)}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {alumna.nombre}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                              {alumna.dni}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                              {alumna.telefono}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {creditoActivo ? (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  {creditoActivo.creditos_restantes} /{" "}
                                  {creditoActivo.creditos_totales}
                                </span>
                              ) : (
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Sin Pack
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedAlumna(alumna);
                                    setShowVenderPackModal(true);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-lg"
                                >
                                  Cargar Pack
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingUser(alumna);
                                    setShowUserModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-lg"
                                  title="Editar Datos"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleWhatsApp(
                                      alumna.telefono,
                                      `Hola ${alumna.nombre}! 👋 Te escribo desde BodyFit`
                                    )
                                  }
                                  className="text-green-600 hover:text-green-900 bg-green-50 p-2 rounded-lg"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Mobile Card */}
                          <tr className="md:hidden">
                            <td colSpan="5" className="p-0 border-none">
                              <div className="bg-white p-4 mb-3 rounded-xl shadow-sm border border-gray-100 mx-1">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold shrink-0">
                                      {alumna.nombre.charAt(0)}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-gray-800">
                                        {alumna.nombre}
                                      </h4>
                                      <p className="text-xs text-gray-500">
                                        {alumna.dni} • {alumna.telefono}
                                      </p>
                                    </div>
                                  </div>
                                  {creditoActivo ? (
                                    <div className="text-right">
                                      <span className="block text-xl font-black text-gray-800">
                                        {creditoActivo.creditos_restantes}
                                        <span className="text-sm text-gray-400 font-normal">
                                          /{creditoActivo.creditos_totales}
                                        </span>
                                      </span>
                                      <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                                        Activo
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full font-medium">
                                      Sin Pack
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-gray-50">
                                  <button
                                    onClick={() => {
                                      setSelectedAlumna(alumna);
                                      setShowVenderPackModal(true);
                                    }}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors"
                                  >
                                    Cargar Pack
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingUser(alumna);
                                      setShowUserModal(true);
                                    }}
                                    className="bg-blue-100 text-blue-700 p-2 rounded-lg hover:bg-blue-200 transition-colors"
                                  >
                                    <Pencil className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleWhatsApp(
                                        alumna.telefono,
                                        `Hola ${alumna.nombre}! 👋 Te escribo desde BodyFit`
                                      )
                                    }
                                    className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200 transition-colors"
                                  >
                                    <MessageCircle className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Packs Tab */}
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
              <thead className="bg-gray-50 hidden md:table-header-group">
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
                    <React.Fragment key={venta.id}>
                      {/* Desktop Row */}
                      <tr className="hover:bg-gray-50 transition-colors hidden md:table-row">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(venta.fecha_compra).toLocaleString(
                            "es-AR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
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

                      {/* Mobile Card */}
                      <tr className="md:hidden">
                        <td colSpan="5" className="p-0 border-none">
                          <div className="bg-white p-4 mb-3 rounded-xl shadow-sm border border-gray-100 mx-1">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-bold text-gray-800">
                                  {venta.usuario?.nombre || "Cliente"}
                                </h4>
                                <p className="text-xs text-gray-500">
                                  {new Date(venta.fecha_compra).toLocaleString(
                                    "es-AR",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </p>
                              </div>
                              <span className="text-lg font-black text-gray-800">
                                $
                                {(venta.monto_pagado || 0).toLocaleString(
                                  "es-AR"
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                              <span className="text-sm text-gray-700 font-medium">
                                {venta.pack?.nombre || "Pack"}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  venta.metodo_pago === "efectivo"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {venta.metodo_pago || "digital"}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Modal User (Nuevo o Edición) */}
      {showUserModal && (
        <UserModal
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
          onUserSaved={handleUserSaved}
          userToEdit={editingUser}
          estudioId={usuario?.estudio_id}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
