// bookingService.js - Reservas: crear (desde el carrito), listar, pagar,
// editar y eliminar. Usa las mismas claves de localStorage que ya usaba
// controller/reservas.js ('starparkReservas', con 'reservas' como respaldo).

import { formatearFechaHora } from '../utils/formatters.js'

const CLAVE_RESERVAS = 'starparkReservas'
const CLAVE_RESERVAS_LEGACY = 'reservas'
const CLAVE_COMPRAS = 'compras'

export function obtenerReservas() {
    let guardadas = JSON.parse(localStorage.getItem(CLAVE_RESERVAS))

    if (!guardadas) {
        guardadas = JSON.parse(localStorage.getItem(CLAVE_RESERVAS_LEGACY)) || []
        if (guardadas.length > 0) {
            localStorage.setItem(CLAVE_RESERVAS, JSON.stringify(guardadas))
        }
    }

    return guardadas || []
}

function guardarReservas(reservas) {
    localStorage.setItem(CLAVE_RESERVAS, JSON.stringify(reservas))
    localStorage.setItem(CLAVE_RESERVAS_LEGACY, JSON.stringify(reservas))
}

// Crea una reserva a partir de los datos del formulario del carrito.
export function crearReserva({ nombre, correo, telefono, fecha, items, total }) {
    const reservas = obtenerReservas()

    const reserva = {
        nombre,
        correo,
        telefono,
        fecha,
        total,
        items,
        pagado: false,
        fechaRegistro: formatearFechaHora()
    }

    reservas.push(reserva)
    guardarReservas(reservas)
    return reserva
}

// Marca la reserva como pagada y la registra en el historial de compras.
export function pagarReserva(indice) {
    const reservas = obtenerReservas()
    const reserva = reservas[indice]

    if (!reserva) return

    const compras = JSON.parse(localStorage.getItem(CLAVE_COMPRAS)) || []

    compras.push({
        nombre: reserva.nombre,
        items: reserva.items,
        total: reserva.total,
        fecha: reserva.fechaRegistro
    })

    localStorage.setItem(CLAVE_COMPRAS, JSON.stringify(compras))

    reserva.pagado = true
    guardarReservas(reservas)
}

export function actualizarReserva(indice, datos) {
    const reservas = obtenerReservas()
    const reserva = reservas[indice]

    if (!reserva) return

    Object.assign(reserva, datos)
    guardarReservas(reservas)
}

export function eliminarReserva(indice) {
    const reservas = obtenerReservas()
    reservas.splice(indice, 1)
    guardarReservas(reservas)
}
