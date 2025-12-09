import { useState, useEffect } from "react";
import {
  Home as HomeIcon,
  Calendar,
  LayoutDashboard,
  Shield,
  Zap,
  LogIn,
  LogOut,
} from "lucide-react";

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
  useEffect(() => {
    const userStr = localStorage.getItem("usuario");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUsuario(user);
        // Redirigir según rol
        if (user.rol === "admin") {
          setCurrentView("admin");
        } else {
          setCurrentView("bookings");
        }
      } catch (error) {
        console.error("Error cargando sesión:", error);
        localStorage.removeItem("usuario");
      }
    }
  }, []);

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
