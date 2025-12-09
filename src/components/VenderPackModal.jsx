import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useCreditos } from "../hooks/useCreditos";
import Swal from "sweetalert2";

export const VenderPackModal = ({
  isOpen,
  onClose,
  alumna,
  estudio,
  onVendido,
}) => {
  const [packs, setPacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState(null);
  const [metodoPago, setMetodoPago] = useState("transferencia");
  const [loading, setLoading] = useState(true);
  const [fechaVencimiento, setFechaVencimiento] = useState("");

  const { getPacks, venderPack } = useCreditos();

  // Cargar packs al abrir modal
  useEffect(() => {
    if (isOpen) {
      cargarPacks();
    }
  }, [isOpen]);

  // Actualizar fecha vencimiento cuando cambia el pack
  useEffect(() => {
    if (selectedPack && packs.length > 0) {
      const pack = packs.find((p) => p.id === selectedPack);
      if (pack) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + pack.duracion_dias);
        setFechaVencimiento(fecha.toISOString().split("T")[0]);
      }
    }
  }, [selectedPack, packs]);

  const cargarPacks = async () => {
    setLoading(true);
    const data = await getPacks(estudio.id);
    setPacks(data);
    if (data.length > 0) {
      setSelectedPack(data[0].id);
    }
    setLoading(false);
  };

  const handleVender = async () => {
    if (!selectedPack) {
      Swal.fire({
        icon: "warning",
        title: "Selecciona un pack",
        confirmButtonColor: "#10b981",
      });
      return;
    }

    const result = await Swal.fire({
      icon: "question",
      title: "¿Confirmar venta?",
      text: `Vender pack a ${alumna.nombre}`,
      showCancelButton: true,
      confirmButtonText: "Sí, vender",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
    });

    if (!result.isConfirmed) return;

    const credito = await venderPack(
      alumna.id,
      selectedPack,
      metodoPago,
      fechaVencimiento
    );

    if (credito) {
      onVendido(credito);
      onClose();
    }
  };

  if (!isOpen) return null;

  const packSeleccionado = packs.find((p) => p.id === selectedPack);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Vender Pack</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Alumna info */}
        <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-400">Cliente</p>
          <p className="text-lg font-semibold text-white">{alumna.nombre}</p>
          <p className="text-sm text-gray-400 mt-1">DNI: {alumna.dni}</p>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-8">
            Cargando packs...
          </div>
        ) : packs.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No hay packs activos
          </div>
        ) : (
          <form className="space-y-4">
            {/* Seleccionar pack */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Selecciona un pack
              </label>
              <select
                value={selectedPack}
                onChange={(e) => setSelectedPack(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
              >
                {packs.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.nombre} - ${pack.precio.toLocaleString("es-AR")}
                  </option>
                ))}
              </select>
            </div>

            {/* Detalles del pack seleccionado */}
            {packSeleccionado && (
              <div className="bg-blue-900/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Clases:</span>
                  <span className="text-white font-semibold">
                    {packSeleccionado.cantidad_clases}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Vigencia:</span>
                  <span className="text-white font-semibold">
                    {packSeleccionado.duracion_dias} días
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-blue-800 pt-2 mt-2">
                  <span className="text-gray-300">Precio:</span>
                  <span className="text-green-400 font-semibold text-lg">
                    ${packSeleccionado.precio.toLocaleString("es-AR")}
                  </span>
                </div>
              </div>
            )}

            {/* Fecha de Vencimiento Editable */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Por defecto: Hoy + duración del pack
              </p>
            </div>

            {/* Método de pago */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Método de pago
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="transferencia"
                    checked={metodoPago === "transferencia"}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-white">Transferencia</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="efectivo"
                    checked={metodoPago === "efectivo"}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-white">Efectivo</span>
                </label>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={handleVender}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition"
              >
                Vender
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
