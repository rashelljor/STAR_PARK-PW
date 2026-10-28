// cartService.js - Lógica del carrito de compras, usada por las vistas Vue
// de la tienda y el carrito. Se apoya en cartRepository.js para leer/guardar.

import { leerCarrito, guardarCarrito, vaciarCarrito } from '../repository/cartRepository.js'
import { getProducts } from './catalogService.js'
import { MAX_LINEAS_CARRITO } from '../utils/constants.js'
import { formatearPrecio } from '../utils/formatters.js'

// Avisa al resto de la página (el contador del Header) cuántos productos hay.
// "agregado" indica que el cambio fue una suma, para animar el contador.
export const EVENTO_CARRITO = 'starpark:carrito'

function avisarCambio(carrito, agregado = false) {
    window.dispatchEvent(new CustomEvent(EVENTO_CARRITO, { detail: { cantidad: contarUnidades(carrito), agregado } }))
}

export function contarUnidades(carrito) {
    return carrito.reduce((total, item) => total + (Number(item.cantidad) || 1), 0)
}

// Entradas al parque: los productos del bazar no ocupan aforo ni cuentan como juegos.
export function contarEntradas(carrito) {
    return contarUnidades(carrito.filter(item => item.categoria !== 'bazar'))
}

// Error con un mensaje listo para mostrar al cliente.
function errorParaCliente(mensaje) {
    const error = new Error(mensaje)
    error.paraCliente = true
    return error
}

// El stock es del producto: se suman todos sus colores que haya en el carrito.
function revisarStock(carrito, linea) {
    if (linea.stock == null) return
    const productoId = linea.productoId || linea.id
    const enCarrito = contarUnidades(carrito.filter(item => (item.productoId || item.id) === productoId))
    if (enCarrito > linea.stock) throw errorParaCliente('Solo hay ' + linea.stock + ' unidades de ' + linea.nombre + ' en stock.')
}

export async function obtenerCarrito() {
    return leerCarrito()
}

// Agrega una unidad de un producto del catálogo (solo lo esencial: id, nombre y precio;
// en el bazar también categoría, stock y color). Si ya estaba en el carrito, solo aumenta su cantidad.
export async function agregarProducto(producto, color = '') {
    const carrito = await leerCarrito()
    const bazar = producto.categoria === 'bazar'
    // En el bazar cada color es una línea distinta: "<producto>-<color sin #>".
    const id = bazar && color ? producto.id + '-' + color.replace('#', '') : producto.id
    let linea = carrito.find(item => item.id === id)

    if (linea) linea.cantidad++
    else {
        if (carrito.length >= MAX_LINEAS_CARRITO) throw errorParaCliente('Tu carrito admite hasta ' + MAX_LINEAS_CARRITO + ' productos distintos. Reserva estos primero o quita alguno.')
        linea ={ id, nombre: producto.nombre, precio: Number(producto.precio) || 0, cantidad: 1 }
        if (bazar) Object.assign(linea, { categoria: 'bazar', productoId: producto.id })
        if (bazar && color) linea.color = color
        carrito.push(linea)
    }
    // El stock más reciente del catálogo vale para todos los colores del producto.
    if (bazar) carrito.filter(item => (item.productoId || item.id) === producto.id).forEach(item => { item.stock = Number(producto.stock) || 0 })
    revisarStock(carrito, linea)

    const guardado = await guardarCarrito(carrito)
    avisarCambio(guardado, true)
    return guardado
}

// Suma (+1) o resta (-1) unidades de una línea; en 0 la línea se quita.
export async function cambiarCantidad(id, cambio) {
    const carrito = await leerCarrito()
    const linea = carrito.find(item => item.id === id)
    if (linea) linea.cantidad += cambio
    if (linea && cambio > 0) revisarStock(carrito, linea)
    const guardado = await guardarCarrito(carrito.filter(item => item.cantidad > 0))
    avisarCambio(guardado, cambio > 0)
    return guardado
}

export async function quitarProducto(id) {
    const carrito = (await leerCarrito()).filter(item => item.id !== id)
    const guardado = await guardarCarrito(carrito)
    avisarCambio(guardado)
    return guardado
}

// Antes de reservar: trae el precio y el stock actuales del catálogo (las reglas
// de Firestore rechazan precios viejos). Devuelve el carrito actualizado y los
// avisos para el cliente; si hay avisos, el carrito cambió y no se debe reservar aún.
export async function actualizarDesdeCatalogo() {
    const [carrito, productos] = await Promise.all([leerCarrito(), getProducts()])
    const avisos = []
    let corregido = false
    if (carrito.length > MAX_LINEAS_CARRITO) avisos.push('Tu carrito admite hasta ' + MAX_LINEAS_CARRITO + ' productos distintos. Quita alguno para reservar.')

    const vigentes = carrito.filter(linea => {
        const producto = productos.find(item => item.id === (linea.productoId || linea.id))
        if (!producto) {
            avisos.push(linea.nombre + ' ya no está disponible y se quitó de tu carrito.')
            return false
        }
        const precio = Number(producto.precio) || 0
        if (precio !== linea.precio) {
            avisos.push('El precio de ' + linea.nombre + ' cambió a ' + formatearPrecio(precio) + '.')
            linea.precio = precio
        }
        // Líneas guardadas antes de que el carrito anotara la categoría: sin ella
        // un producto del bazar contaría como entrada (y las reglas lo rechazan).
        if (producto.categoria === 'bazar' && linea.categoria !== 'bazar') {
            Object.assign(linea, { categoria: 'bazar', productoId: producto.id })
            corregido = true
        }
        if (linea.categoria === 'bazar') linea.stock = Number(producto.stock) || 0
        return true
    })
    vigentes.filter(linea => linea.categoria === 'bazar').forEach(linea => {
        try { revisarStock(vigentes, linea) } catch (error) { if (!avisos.includes(error.message)) avisos.push(error.message) }
    })

    if (vigentes.length !== carrito.length || avisos.length || corregido) {
        await guardarCarrito(vigentes)
        avisarCambio(vigentes)
    }
    return { carrito: vigentes, avisos }
}

export function calcularTotal(carrito) {
    return carrito.reduce((total, item) => total + Number(item.precio || 0) * (Number(item.cantidad) || 1), 0)
}

export async function limpiarCarrito() {
    await vaciarCarrito()
    avisarCambio([])
}
