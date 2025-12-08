export const GYM_CONSTANTS = {
    DIAS_Apertura: ['Lunes', 'Miércoles', 'Viernes'], // Días principales según chat/código previo
    TURNOS: {
        MAÑANA: {
            label: 'Mañana (09:00 - 13:00)',
            horarios: ['09:00', '10:00', '11:00', '12:00']
        },
        TARDE: {
            label: 'Tarde (18:00 - 21:00)',
            horarios: ['18:00', '19:00', '20:00', '21:00']
        }
    },
    // Todos los horarios válidos combinados para validaciones
    get HORARIOS_VALIDOS() {
        return [...this.TURNOS.MAÑANA.horarios, ...this.TURNOS.TARDE.horarios];
    },
    // Días de la semana para mapeo
    DIAS_SEMANA: [
        { id: 'lunes', label: 'Lunes' },
        { id: 'martes', label: 'Martes' },
        { id: 'miércoles', label: 'Miércoles' },
        { id: 'jueves', label: 'Jueves' },
        { id: 'viernes', label: 'Viernes' },
        { id: 'sábado', label: 'Sábado' },
        // Domingo cerrado según inferencia "comercial"
    ]
};
