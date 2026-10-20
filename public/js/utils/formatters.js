// formatters.js - Funciones de formato reutilizadas por las vistas.

// Convierte un monto a número. Los totales nuevos ya se guardan como número;
// esto solo hace falta para registros antiguos guardados como texto ("S/ 50.00").
export function aNumero(monto) {
    if (typeof monto === 'number') return monto
    return Number(String(monto || '').replace(/[^\d.]/g, '')) || 0
}

// Formatea un precio numérico como "S/ 45.00".
export function formatearPrecio(precio) {
    return 'S/ ' + aNumero(precio).toFixed(2)
}

// Redondea a céntimos para que los totales guardados no arrastren decimales de más.
export function redondear(monto) {
    return Math.round(aNumero(monto) * 100) / 100
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

// Fecha de Firestore (Timestamp), Date o texto → milisegundos (0 si no hay).
export function milisegundos(fecha) {
    if (!fecha) return 0
    return typeof fecha.toMillis === 'function' ? fecha.toMillis() : new Date(fecha).getTime()
}

// Fecha de Firestore (Timestamp), Date o texto → texto legible.
export function fechaLegible(fecha) {
    if (!fecha) return ''
    const fechaJs = typeof fecha.toDate === 'function' ? fecha.toDate() : new Date(fecha)
    return formatearFechaHora(fechaJs)
}

// Id único simple para nuevos registros (reservas, productos, etc.).
export function generarId(prefijo) {
    return prefijo + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
}
