import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';

export const useCreditos = () => {
  /**
   * Obtener créditos disponibles de una alumna
   */
  const getCreditos = async (alumnaId) => {
    try {
      const { data, error } = await supabase
        .rpc('get_creditos_disponibles', { p_alumna_id: alumnaId });

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error obteniendo créditos:', error);
      return null;
    }
  };

  /**
   * Obtener todos los créditos de una alumna (incluyendo vencidos)
   */
  const getTodosCreditosAlumna = async (alumnaId) => {
    try {
      const { data, error } = await supabase
        .from('creditos_alumna')
        .select(`
          *,
          pack:packs(nombre, cantidad_clases, duracion_dias)
        `)
        .eq('alumna_id', alumnaId)
        .order('fecha_vencimiento', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo todos créditos:', error);
      return [];
    }
  };

  /**
   * Vender pack a una alumna
   */
  const venderPack = async (alumnaId, packId, metodoPago) => {
    try {
      // Obtener info del pack
      const { data: pack, error: packError } = await supabase
        .from('packs')
        .select('*')
        .eq('id', packId)
        .single();

      if (packError) throw packError;

      // Calcular fecha vencimiento
      const fechaCompra = new Date();
      const fechaVencimiento = new Date(fechaCompra);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + pack.duracion_dias);

      // Crear registro de crédito
      const { data: credito, error: creditoError } = await supabase
        .from('creditos_alumna')
        .insert({
          alumna_id: alumnaId,
          pack_id: packId,
          creditos_totales: pack.cantidad_clases,
          creditos_restantes: pack.cantidad_clases,
          fecha_compra: fechaCompra.toISOString(),
          fecha_vencimiento: fechaVencimiento.toISOString(),
          estado: 'activo',
          monto_pagado: pack.precio,
          metodo_pago: metodoPago
        })
        .select()
        .single();

      if (creditoError) throw creditoError;

      Swal.fire({
        icon: 'success',
        title: '¡Pack vendido!',
        html: `<p>Se vendió <strong>${pack.nombre}</strong></p>
               <p>Créditos disponibles: ${pack.cantidad_clases}</p>
               <p style="font-size: 12px; color: #666; margin-top: 10px;">
                 Vence: ${fechaVencimiento.toLocaleDateString('es-AR')}
               </p>`,
        confirmButtonColor: '#10b981'
      });

      return credito;
    } catch (error) {
      console.error('Error vendiendo pack:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo vender el pack',
        confirmButtonColor: '#10b981'
      });
      return null;
    }
  };

  /**
   * Validar si alumna puede reservar
   */
  const validarCreditos = async (alumnaId) => {
    try {
      const creditos = await getCreditos(alumnaId);

      if (!creditos) {
        return {
          disponible: false,
          mensaje: 'No tenés clases disponibles. Contactá al estudio para renovar tu pack.',
          creditos: null
        };
      }

      // Verificar si vence pronto
      if (creditos.dias_para_vencer <= 7 && creditos.dias_para_vencer > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Tu pack vence pronto',
          text: `Te quedan ${creditos.dias_para_vencer} días para usar tus clases`,
          confirmButtonColor: '#a855f7'
        });
      }

      // Verificar si quedan pocos créditos
      if (creditos.creditos_restantes <= 2 && creditos.creditos_restantes > 0) {
        Swal.fire({
          icon: 'info',
          title: 'Últimas clases',
          text: `Te quedan ${creditos.creditos_restantes} clases disponibles`,
          confirmButtonColor: '#a855f7'
        });
      }

      return {
        disponible: true,
        mensaje: null,
        creditos
      };
    } catch (error) {
      console.error('Error validando créditos:', error);
      return {
        disponible: false,
        mensaje: 'Error al validar créditos',
        creditos: null
      };
    }
  };

  /**
   * Obtener packs activos de un estudio
   */
  const getPacks = async (estudioId) => {
    try {
      const { data, error } = await supabase
        .from('packs')
        .select('*')
        .eq('estudio_id', estudioId)
        .eq('activo', true)
        .order('cantidad_clases', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo packs:', error);
      return [];
    }
  };

  /**
   * Crear pack
   */
  const crearPack = async (estudioId, packData) => {
    try {
      const { data, error } = await supabase
        .from('packs')
        .insert({
          estudio_id: estudioId,
          nombre: packData.nombre,
          cantidad_clases: packData.cantidad_clases,
          precio: packData.precio,
          duracion_dias: packData.duracion_dias,
          activo: true
        })
        .select()
        .single();

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'Pack creado',
        confirmButtonColor: '#10b981'
      });

      return data;
    } catch (error) {
      console.error('Error creando pack:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo crear el pack',
        confirmButtonColor: '#10b981'
      });
      return null;
    }
  };

  /**
   * Actualizar pack
   */
  const actualizarPack = async (packId, packData) => {
    try {
      const { data, error } = await supabase
        .from('packs')
        .update(packData)
        .eq('id', packId)
        .select()
        .single();

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'Pack actualizado',
        confirmButtonColor: '#10b981'
      });

      return data;
    } catch (error) {
      console.error('Error actualizando pack:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el pack',
        confirmButtonColor: '#10b981'
      });
      return null;
    }
  };

  /**
   * Desactivar pack
   */
  const desactivarPack = async (packId) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Desactivar pack?',
      text: 'No se podrán vender nuevos packs de este tipo',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });

    if (!result.isConfirmed) return false;

    try {
      const { error } = await supabase
        .from('packs')
        .update({ activo: false })
        .eq('id', packId);

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'Pack desactivado',
        confirmButtonColor: '#10b981'
      });

      return true;
    } catch (error) {
      console.error('Error desactivando pack:', error);
      return false;
    }
  };

  return {
    getCreditos,
    getTodosCreditosAlumna,
    venderPack,
    validarCreditos,
    getPacks,
    crearPack,
    actualizarPack,
    desactivarPack
  };
};
