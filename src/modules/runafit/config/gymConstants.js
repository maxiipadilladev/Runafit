export const GYM_CONSTANTS = {
    // Días de apertura general (Lun-Vie)
    DIAS_Apertura: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],

    TURNOS: {
        MAÑANA: {
            label: 'Mañana (07:00 - 09:00)',
            horarios: ['07:00', '08:00', '09:00']
        },
        TARDE: {
            label: 'Tarde (17:00 - 23:00)',
            horarios: ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']
        }
    },

    // Mapa de horarios permitidos por día
    // Lunes, Miércoles, Viernes: Mañana y Tarde
    // Martes, Jueves: Solo Mañana
    getHorariosPorDia: (diaSemana) => {
        const dia = diaSemana.toLowerCase();
        const manana = ['07:00', '08:00', '09:00'];
        const tarde = ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

        if (['lunes', 'miércoles', 'viernes'].includes(dia)) {
            return [...manana, ...tarde];
        }
        if (['martes', 'jueves'].includes(dia)) {
            return [...manana];
        }
        return []; // Sábado/Domingo cerrado
    },

    // Getters auxiliares
    get HORARIOS_VALIDOS() {
        return [...this.TURNOS.MAÑANA.horarios, ...this.TURNOS.TARDE.horarios];
    },

    DIAS_SEMANA: [
        { id: 'lunes', label: 'Lunes' },
        { id: 'martes', label: 'Martes' },
        { id: 'miércoles', label: 'Miércoles' },
        { id: 'jueves', label: 'Jueves' },
        { id: 'viernes', label: 'Viernes' },
    ]
};
