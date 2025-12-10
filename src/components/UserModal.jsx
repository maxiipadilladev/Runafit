import React, { useState, useEffect } from "react";
import { Users, X, Save } from "lucide-react";
import Swal from "sweetalert2";
import { supabase } from "../lib/supabase";
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

  // Cargar datos si es edición
  useEffect(() => {
    if (userToEdit) {
      setFormData({
        dni: userToEdit.dni,
        nombre: userToEdit.nombre,
        telefono: userToEdit.telefono,
        estudio_id: userToEdit.estudio_id.toString(),
        turno: userToEdit.turno || "mañana",
      });
    } else {
      // Reset si es nuevo
      setFormData({
        dni: "",
        nombre: "",
        telefono: "",
        estudio_id: estudioId ? estudioId.toString() : "",
        turno: "",
      });
    }
  }, [userToEdit, estudioId, isOpen]);

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

    if (formData.dni.length < 7) {
      Swal.fire({
        icon: "warning",
        title: "DNI inválido",
        text: "Debe tener al menos 7 dígitos",
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
