// purchaseService.js - Historial de compras (boletas) del usuario.
// bookingService.pagarReserva() es quien escribe en esta misma clave al pagar.

const CLAVE_COMPRAS = 'compras'

export function obtenerCompras() {
    return JSON.parse(localStorage.getItem(CLAVE_COMPRAS)) || []
}
