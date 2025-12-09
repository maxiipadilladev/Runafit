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
  /*
   * Vender pack a una alumna (con logica de renovacion/acumulacion)
   */
  const venderPack = async (alumnaId, packId, metodoPago) => {
    try {
      // 1. Obtener info del pack a vender
      const { data: pack, error: packError } = await supabase
        .from('packs')
        .select('*')
        .eq('id', packId)
        .single();

      if (packError) throw packError;

      // 2. Verificar si ya tiene un pack ACTIVO con creditos
      const { data: packsActivos } = await supabase
        .from('creditos_alumna')
        .select('*')
        .eq('alumna_id', alumnaId)
        .eq('estado', 'activo')
        .gt('creditos_restantes', 0);

      let creditosAcumulados = 0;
      let packAnteriorId = null;

      // Si tiene activo, preguntar si quiere RENOVAR (acumular)
      if (packsActivos && packsActivos.length > 0) {
        const packAnterior = packsActivos[0]; // Tomamos el primero/más relevante

        const confirmResult = await Swal.fire({
          icon: 'info',
          title: 'Pack activo detectado',
          html: `<p>Esta alumna ya tiene <strong>${packAnterior.creditos_restantes} clases</strong> disponibles.</p>
                 <p>¿Querés sumarlas al nuevo pack (Renovación)?</p>`,
          showCancelButton: true,
          confirmButtonText: 'Sí, sumar y renovar',
          cancelButtonText: 'Cancelar venta',
          confirmButtonColor: '#3b82f6'
        });

        if (!confirmResult.isConfirmed) {
          return null; // Cancela la operación
        }

        // Si confirma, guardamos los créditos para sumarlos
        creditosAcumulados = packAnterior.creditos_restantes;
        packAnteriorId = packAnterior.id;
      }

      // 3. Iniciar Transacción (simulada)

      // A. Si hubo renovación, marcamos el anterior como "agotado" (vacío y cerrado)
      if (packAnteriorId) {
        await supabase
          .from('creditos_alumna')
          .update({
            creditos_restantes: 0, // Vaciamos porque se sumaron al nuevo
            estado: 'agotado',
            updated_at: new Date().toISOString()
          })
          .eq('id', packAnteriorId);
      }

      // B. Calcular nueva fecha vencimiento (HOY + dias pack)
      const fechaCompra = new Date();
      const fechaVencimiento = new Date(fechaCompra);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + pack.duracion_dias);

      // C. Crear el NUEVO registro de crédito (suma total)
      // La "Caja" tomará este registro por fecha y monto.
      // El "Sistema de Reservas" tomará este registro como el único activo.
      const nuevosCreditosTotales = pack.cantidad_clases + creditosAcumulados;

      const { data: credito, error: creditoError } = await supabase
        .from('creditos_alumna')
        .insert({
          alumna_id: alumnaId,
          pack_id: packId,
          creditos_totales: nuevosCreditosTotales, // Total del pack + lo que traía
          creditos_restantes: nuevosCreditosTotales, // Todo disponible hoy
          fecha_compra: fechaCompra.toISOString(),
          fecha_vencimiento: fechaVencimiento.toISOString(),
          estado: 'activo',
          monto_pagado: pack.precio, // Precio cobrado hoy (solo el del pack nuevo)
          metodo_pago: metodoPago
        })
        .select()
        .single();

      if (creditoError) throw creditoError;

      Swal.fire({
        icon: 'success',
        title: creditosAcumulados > 0 ? '¡Pack Renovado!' : '¡Pack Vendido!',
        html: `<p>Se cargó <strong>${pack.nombre}</strong></p>
               <p>Créditos totales: <strong>${nuevosCreditosTotales}</strong> (Pack: ${pack.cantidad_clases} + Acum: ${creditosAcumulados})</p>
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
        text: 'No se pudo procesar la venta',
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
