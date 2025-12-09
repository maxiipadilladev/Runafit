import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { useCreditos } from "../hooks/useCreditos";
import Swal from "sweetalert2";

export const AdminPacks = ({ estudio }) => {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPack, setEditingPack] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    cantidad_clases: "",
    precio: "",
    duracion_dias: 30,
  });

  const { getPacks, crearPack, actualizarPack, desactivarPack } = useCreditos();

  // Cargar packs al montar
  useEffect(() => {
    cargarPacks();
  }, []);

  const cargarPacks = async () => {
    setLoading(true);
    const data = await getPacks(estudio.id);
    setPacks(data);
    setLoading(false);
  };

  const handleOpenModal = (pack = null) => {
    if (pack) {
      setEditingPack(pack);
      setFormData({
        nombre: pack.nombre,
        cantidad_clases: pack.cantidad_clases,
        precio: pack.precio,
        duracion_dias: pack.duracion_dias,
      });
    } else {
      setEditingPack(null);
      setFormData({
        nombre: "",
        cantidad_clases: "",
        precio: "",
        duracion_dias: 30,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPack(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre || !formData.cantidad_clases || !formData.precio) {
      Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Completa todos los campos",
        confirmButtonColor: "#10b981",
      });
      return;
    }

    if (editingPack) {
      // Actualizar pack
      await actualizarPack(editingPack.id, {
        nombre: formData.nombre,
        cantidad_clases: parseInt(formData.cantidad_clases),
        precio: parseFloat(formData.precio),
        duracion_dias: parseInt(formData.duracion_dias),
      });
    } else {
      // Crear pack
      await crearPack(estudio.id, {
        nombre: formData.nombre,
        cantidad_clases: parseInt(formData.cantidad_clases),
        precio: parseFloat(formData.precio),
        duracion_dias: parseInt(formData.duracion_dias),
      });
    }

    handleCloseModal();
    await cargarPacks();
  };

  const handleDesactivar = async (packId) => {
    const success = await desactivarPack(packId);
    if (success) {
      await cargarPacks();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400">Cargando packs...</div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Gestionar Packs</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus size={20} />
          Nuevo Pack
        </button>
      </div>

      {/* Tabla de packs */}
      {packs.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          No hay packs creados aún
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-300">
            <thead className="border-b border-gray-600 hidden md:table-header-group">
              <tr>
                <th className="text-left py-3 px-4 font-semibold">Nombre</th>
                <th className="text-center py-3 px-4 font-semibold">Clases</th>
                <th className="text-right py-3 px-4 font-semibold">Precio</th>
                <th className="text-center py-3 px-4 font-semibold">
                  Vigencia
                </th>
                <th className="text-center py-3 px-4 font-semibold">Estado</th>
                <th className="text-right py-3 px-4 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((pack) => (
                <React.Fragment key={pack.id}>
                  {/* Desktop Row */}
                  <tr className="border-b border-gray-700 hover:bg-gray-700/50 hidden md:table-row">
                    <td className="py-3 px-4">{pack.nombre}</td>
                    <td className="text-center py-3 px-4">
                      {pack.cantidad_clases}
                    </td>
                    <td className="text-right py-3 px-4 font-semibold text-green-400">
                      ${pack.precio.toLocaleString("es-AR")}
                    </td>
                    <td className="text-center py-3 px-4 text-xs text-gray-400">
                      {pack.duracion_dias} días
                    </td>
                    <td className="text-center py-3 px-4">
                      {pack.activo ? (
                        <span className="text-green-400 text-xs font-semibold">
                          ACTIVO
                        </span>
                      ) : (
                        <span className="text-red-400 text-xs font-semibold">
                          INACTIVO
                        </span>
                      )}
                    </td>
                    <td className="text-right py-3 px-4 space-x-2">
                      <button
                        onClick={() => handleOpenModal(pack)}
                        className="text-blue-400 hover:text-blue-300 transition"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      {pack.activo && (
                        <button
                          onClick={() => handleDesactivar(pack.id)}
                          className="text-red-400 hover:text-red-300 transition"
                          title="Desactivar"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Mobile Card */}
                  <tr className="md:hidden border-b border-gray-700">
                    <td colSpan="6" className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-white text-lg">
                            {pack.nombre}
                          </h4>
                          <span className="text-xs text-gray-400">
                            {pack.cantidad_clases} clases • {pack.duracion_dias}{" "}
                            días
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold text-lg">
                            ${pack.precio.toLocaleString("es-AR")}
                          </div>
                          {pack.activo ? (
                            <span className="text-green-400 text-[10px] font-semibold uppercase bg-green-900/30 px-2 py-0.5 rounded">
                              Activo
                            </span>
                          ) : (
                            <span className="text-red-400 text-[10px] font-semibold uppercase bg-red-900/30 px-2 py-0.5 rounded">
                              Inactivo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-gray-700/50">
                        <button
                          onClick={() => handleOpenModal(pack)}
                          className="text-blue-400 hover:text-blue-300 transition flex items-center gap-1 text-sm font-medium"
                        >
                          <Edit2 size={16} /> Editar
                        </button>
                        {pack.activo && (
                          <button
                            onClick={() => handleDesactivar(pack.id)}
                            className="text-red-400 hover:text-red-300 transition flex items-center gap-1 text-sm font-medium"
                          >
                            <X size={16} /> Desactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-6">
              {editingPack ? "Editar Pack" : "Crear nuevo Pack"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Nombre del Pack
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="ej: Pack 8 clases"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Cantidad de clases */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Clases
                  </label>
                  <input
                    type="number"
                    value={formData.cantidad_clases}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cantidad_clases: e.target.value,
                      })
                    }
                    placeholder="8"
                    min="1"
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Vigencia */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Vigencia (días)
                  </label>
                  <input
                    type="number"
                    value={formData.duracion_dias}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duracion_dias: e.target.value,
                      })
                    }
                    placeholder="30"
                    min="1"
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Precio */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Precio ($)
                </label>
                <input
                  type="number"
                  value={formData.precio}
                  onChange={(e) =>
                    setFormData({ ...formData, precio: e.target.value })
                  }
                  placeholder="25000"
                  min="1"
                  step="0.01"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition"
                >
                  {editingPack ? "Actualizar" : "Crear"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
