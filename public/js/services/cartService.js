// cartService.js - Lógica del carrito de compras, usada por las vistas Vue
// de la tienda y el carrito. Se apoya en cartRepository.js para leer/guardar.

import { leerCarrito, guardarCarrito, vaciarCarrito } from '../repository/cartRepository.js'

// Avisa al resto de la página (el contador del Header) cuántos productos hay.
// "agregado" indica que el cambio fue una suma, para animar el contador.
export const EVENTO_CARRITO = 'starpark:carrito'

function avisarCambio(cantidad, agregado = false) {
    window.dispatchEvent(new CustomEvent(EVENTO_CARRITO, { detail: { cantidad, agregado } }))
}

export async function obtenerCarrito() {
    return leerCarrito()
}

// Agrega un producto del catálogo al carrito (solo lo esencial: id, nombre y precio).
export async function agregarProducto(producto) {
    const carrito = await leerCarrito()

    carrito.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio
    })

    const guardado = await guardarCarrito(carrito)
    avisarCambio(guardado.length, true)
    return guardado
}

export async function quitarProducto(indice) {
    const carrito = await leerCarrito()
    carrito.splice(indice, 1)
    const guardado = await guardarCarrito(carrito)
    avisarCambio(guardado.length)
    return guardado
}

export function calcularTotal(carrito) {
    return carrito.reduce((total, item) => total + Number(item.precio || 0), 0)
}

export async function limpiarCarrito() {
    await vaciarCarrito()
    avisarCambio(0)
}
