import { useState, useEffect } from "react";
import {
  Home as HomeIcon,
  Calendar,
  LayoutDashboard,
  Shield,
  Zap,
  LogIn,
  LogOut,
  Bell,
} from "lucide-react";
import { supabase } from "./lib/supabase";

import ClientBookingView from "./components/ClientBookingView";
import AdminDashboard from "./components/AdminDashboard";
import LandingPage from "./components/LandingPage";
import LoginView from "./components/LoginView";
import Swal from "sweetalert2";
import { InstallPrompt } from "./components/InstallPrompt";

function App() {
  const [currentView, setCurrentView] = useState("login");
  const [usuario, setUsuario] = useState(null);

  // Revisar si ya hay sesión guardada
  // Notifications State (Global)
  const [notificaciones, setNotificaciones] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [verHistorialNotif, setVerHistorialNotif] = useState(false);

  // Revisar si ya hay sesión guardada
  useEffect(() => {
    const userStr = localStorage.getItem("usuario");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUsuario(user);
        // Redirigir según rol
        if (user.rol === "admin") {
          setCurrentView("admin");
          fetchNotificaciones(); // Initial fetch
        } else {
          setCurrentView("bookings");
        }
      } catch (error) {
        console.error("Error cargando sesión:", error);
        localStorage.removeItem("usuario");
      }
    }
  }, []);

  // Subscribe to Notifications if Admin
  useEffect(() => {
    if (usuario?.rol === "admin") {
      fetchNotificaciones();
      const channelNotif = supabase
        .channel("app-notificaciones")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notificaciones" },
          (payload) => {
            setNotificaciones((prev) => [payload.new, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channelNotif);
      };
    }
  }, [usuario]);

  useEffect(() => {
    if (usuario?.rol === "admin" && showNotifDropdown) {
      fetchNotificaciones();
    }
  }, [showNotifDropdown, verHistorialNotif]);

  const fetchNotificaciones = async () => {
    try {
      let query = supabase
        .from("notificaciones")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!verHistorialNotif) {
        query = query.eq("leida", false);
      }

      const { data } = await query;
      setNotificaciones(data || []);
    } catch (error) {
      console.error("Error fetching notifications", error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await supabase
        .from("notificaciones")
        .update({ leida: true })
        .eq("id", id);
      setNotificaciones((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Error marking as read", error);
    }
  };

  const handleLogin = (user) => {
    setUsuario(user);
    // Redirigir según rol
    if (user.rol === "admin") {
      setCurrentView("admin");
    } else {
      setCurrentView("bookings");
    }
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: "question",
      title: "¿Cerrar sesión?",
      text: "Tendrás que volver a loguearte",
      showCancelButton: true,
      confirmButtonText: "Sí, cerrar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#a855f7",
      cancelButtonColor: "#6b7280",
      allowOutsideClick: false,
      allowEscapeKey: true,
    });

    if (result.isConfirmed) {
      localStorage.removeItem("usuario");
      setUsuario(null);
      setCurrentView("login");
      Swal.fire({
        icon: "success",
        title: "Sesión cerrada",
        timer: 1000,
        showConfirmButton: false,
        confirmButtonColor: "#a855f7",
      });
    }
  };

  // Si no hay usuario, mostrar solo login
  if (!usuario) {
    return <LoginView onLogin={handleLogin} />;
  }

  const views = {
    bookings: {
      component: ClientBookingView,
      name: "Reservas",
      icon: Calendar,
    },
    admin: { component: AdminDashboard, name: "Admin", icon: Shield },
  };

  const CurrentComponent = views[currentView].component;

  return (
    <div className="min-h-screen">
      {/* Navegación */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="RunaFit"
                className="w-8 h-8 rounded-lg shadow-sm"
              />
              <div className="flex items-baseline">
                <span className="font-black text-xl text-gray-800 tracking-tight">
                  RUNA
                </span>
                <span className="font-black text-xl bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent ml-0.5">
                  FIT
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {Object.entries(views)
                .filter(([key]) => {
                  // Mostrar landing solo para admins
                  if (key === "landing") return usuario.rol === "admin";
                  // Filtrar según rol
                  if (usuario.rol === "admin") return key !== "bookings";
                  return key !== "admin";
                })
                .map(([key, view]) => {
                  const Icon = view.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setCurrentView(key)}
                      className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                      ${
                        currentView === key
                          ? "bg-indigo-600 text-white shadow-md"
                          : "text-gray-600 hover:bg-gray-100"
                      }
                    `}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{view.name}</span>
                    </button>
                  );
                })}

              {/* Bell Icon (Only Admin) */}
              {usuario?.rol === "admin" && (
                <div className="relative mr-2">
                  <button
                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors relative"
                  >
                    <Bell className="w-5 h-5 text-gray-600" />
                    {notificaciones.length > 0 && (
                      <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                  </button>

                  {/* Dropdown */}
                  {showNotifDropdown && (
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                      <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700 text-sm">
                          Notificaciones
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setVerHistorialNotif(!verHistorialNotif);
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          {verHistorialNotif
                            ? "Ver solo nuevas"
                            : "Ver historial"}
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {notificaciones.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            {verHistorialNotif
                              ? "No hay notificaciones"
                              : "No hay notificaciones nuevas"}
                          </div>
                        ) : (
                          notificaciones.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => !n.leida && markAsRead(n.id)}
                              className={`p-3 border-b cursor-pointer transition-colors text-left ${
                                n.leida
                                  ? "bg-gray-50 opacity-75"
                                  : "hover:bg-purple-50 bg-white"
                              }`}
                            >
                              <p
                                className={`text-sm text-gray-800 ${
                                  n.leida ? "font-normal" : "font-bold"
                                }`}
                              >
                                {n.mensaje}
                              </p>
                              <div className="flex justify-between items-center mt-1">
                                <p className="text-xs text-gray-400">
                                  {new Date(n.created_at).toLocaleString()}
                                </p>
                                {n.leida && (
                                  <span className="text-[10px] text-gray-400 border px-1 rounded">
                                    Leída
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botón Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-red-600 hover:bg-red-50"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Vista Actual */}
      <CurrentComponent />

      {/* Banner Instalar PWA */}
      <InstallPrompt />
    </div>
  );
}

export default App;
