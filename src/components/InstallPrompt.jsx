import React, { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";

export const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      return; // No mostrar si ya está instalada
    }

    // Check for iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Handler for Android (beforeinstallprompt)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Solo mostramos el prompt si no estamos en iOS (iOS tiene su propia lógica manual)
      if (!isIosDevice) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show prompt for iOS immediately (or conditioned to scroll/time)
    if (isIosDevice) {
      // Small delay just to not be annoying immediately
      const timer = setTimeout(() => setShowPrompt(true), 1000);
      return () => clearTimeout(timer);
    }

    // Force check for Android if event didn't fire immediately (e.g. dismissed previously)
    if (!isStandalone && !isIosDevice) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Caso Ideal: El navegador nos dejó capturar el evento
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    } else {
      // Caso Fallback: El navegador no disparó el evento (ya instalado o bloqueado)
      // Mostramos instrucciones manuales para Android
      alert(
        "Para instalar: Tocá los 3 puntitos arriba a la derecha (⋮) y elegí 'Instalar aplicación' 📲"
      );
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 bg-gray-900/95 backdrop-blur-sm text-white p-4 rounded-2xl shadow-2xl z-[100] border border-gray-700 animate-fade-in-up">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Download className="w-5 h-5 text-green-400" />
          Instalar App RunaFit
        </h3>
        <button
          onClick={() => setShowPrompt(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="text-gray-300 text-sm mb-4">
        Instalá la App para reservar tus turnos más rápido y sin ocupar espacio.
      </p>

      {isIOS ? (
        <div className="space-y-2 text-sm bg-gray-800 p-3 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2">
            <span className="bg-gray-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">
              1
            </span>
            <p>
              Tocá el botón <Share className="w-4 h-4 inline mx-1" />{" "}
              (Compartir) abajo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-gray-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">
              2
            </span>
            <p>
              Elegí "Agregar a Inicio"{" "}
              <span className="inline-block border border-gray-600 rounded px-1 text-xs">
                ➕
              </span>
            </p>
          </div>
        </div>
      ) : (
        <button
          onClick={handleInstallClick}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
        >
          Instalar Ahora
        </button>
      )}
    </div>
  );
};
