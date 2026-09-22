// formatters.js - Funciones de formato reutilizadas por las vistas.

// Formatea un precio numérico como "S/ 45.00".
export function formatearPrecio(precio) {
    return 'S/ ' + Number(precio || 0).toFixed(2)
}

// Fecha y hora en formato peruano, igual al que usaban carrito.js/reservas.js.
export function formatearFechaHora(fecha = new Date()) {
    return fecha.toLocaleString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}

// Id único simple para nuevos registros (reservas, productos, etc.).
export function generarId(prefijo) {
    return prefijo + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
}
