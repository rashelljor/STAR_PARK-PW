// cartService.js - Lógica del carrito de compras, usada por las vistas Vue
// de la tienda y el carrito. Se apoya en cartRepository.js para leer/guardar.

import { leerCarrito, guardarCarrito, vaciarCarrito } from '../repository/cartRepository.js'

export function obtenerCarrito() {
    return leerCarrito()
}

// Agrega un producto del catálogo al carrito (solo lo esencial: id, nombre y precio).
export function agregarProducto(producto) {
    const carrito = leerCarrito()

    carrito.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio
    })

    guardarCarrito(carrito)
    return carrito
}

export function quitarProducto(indice) {
    const carrito = leerCarrito()
    carrito.splice(indice, 1)
    guardarCarrito(carrito)
    return carrito
}

export function calcularTotal(carrito) {
    return carrito.reduce((total, item) => total + Number(item.precio || 0), 0)
}

export function limpiarCarrito() {
    vaciarCarrito()
}
