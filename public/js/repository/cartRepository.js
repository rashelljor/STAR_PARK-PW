// cartRepository.js - Acceso directo a la clave 'carrito' en localStorage.
// Es la única parte del carrito que sabe cómo se guardan los datos;
// cartService.js construye la lógica de negocio sobre estas funciones.

const CLAVE_CARRITO = 'carrito'

export function leerCarrito() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || []
    } catch {
        return []
    }
}

export function guardarCarrito(items) {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items))
}

export function vaciarCarrito() {
    localStorage.removeItem(CLAVE_CARRITO)
}
