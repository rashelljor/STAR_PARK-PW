// cartService.js - Lógica del carrito de compras, usada por las vistas Vue
// de la tienda y el carrito. Se apoya en cartRepository.js para leer/guardar.

import { leerCarrito, guardarCarrito, vaciarCarrito } from '../repository/cartRepository.js'

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

    return guardarCarrito(carrito)
}

export async function quitarProducto(indice) {
    const carrito = await leerCarrito()
    carrito.splice(indice, 1)
    return guardarCarrito(carrito)
}

export function calcularTotal(carrito) {
    return carrito.reduce((total, item) => total + Number(item.precio || 0), 0)
}

export function limpiarCarrito() {
    vaciarCarrito()
}
