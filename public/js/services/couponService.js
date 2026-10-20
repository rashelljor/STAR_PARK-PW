// couponService.js - Cupones de descuento (colección "cupones", id = código en mayúsculas).
// Condiciones: primera compra, más de 3 juegos en el carrito o cliente frecuente.

import { db } from '../config/firebaseConfig.js'
import { collection, doc, getDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { rangoFechasReserva } from '../utils/validators.js'
import { redondear } from '../utils/formatters.js'
import { COMPRAS_CLIENTE_FRECUENTE } from '../utils/constants.js'

// Monto que descuenta un cupón. firestore.rules hace la misma cuenta al crear la reserva.
export function calcularDescuento(subtotal, porcentaje) {
    return redondear(subtotal * Number(porcentaje) / 100)
}

// Motivo por el que el cupón no se puede usar, o null si cumple todo.
function motivoRechazo(cupon, { unidades, compras }) {
    if (!cupon.activo) return 'El cupón «' + cupon.id + '» no existe o ya no está activo.'
    if (cupon.vencimiento && cupon.vencimiento < rangoFechasReserva().minima) return 'El cupón «' + cupon.id + '» venció el ' + cupon.vencimiento + '.'
    if (cupon.usosMaximos && (cupon.usos || 0) >= cupon.usosMaximos) return 'El cupón «' + cupon.id + '» ya alcanzó su límite de usos.'

    if (cupon.condicion === 'primeraCompra' && compras > 0) return 'Este cupón es solo para tu primera compra.'
    if (cupon.condicion === 'masDeTresJuegos' && unidades <= 3) return 'Este cupón requiere más de 3 juegos en tu carrito (tienes ' + unidades + ').'
    if (cupon.condicion === 'clienteFrecuente' && compras < COMPRAS_CLIENTE_FRECUENTE) return 'Este cupón es para clientes con ' + COMPRAS_CLIENTE_FRECUENTE + ' compras o más (llevas ' + compras + ').'
    return null
}

// Devuelve { ok, cupon, descuento } o { ok: false, mensaje }.
// "unidades" son los juegos del carrito; "compras" las compras ya pagadas del cliente.
export async function validarCupon(codigo, { subtotal, unidades, compras }) {
    const limpio = String(codigo || '').trim().toUpperCase()
    if (!limpio) return { ok: false, mensaje: 'Escribe un código de cupón.' }

    const documento = await getDoc(doc(db, 'cupones', limpio))
    if (!documento.exists()) return { ok: false, mensaje: 'El cupón «' + limpio + '» no existe o ya no está activo.' }
    const cupon = { id: documento.id, ...documento.data() }

    const motivo = motivoRechazo(cupon, { unidades, compras })
    if (motivo) return { ok: false, mensaje: motivo }

    return { ok: true, cupon, descuento: calcularDescuento(subtotal, cupon.descuento) }
}

// Cupones cuya condición el cliente ya cumple con su carrito y sus compras.
export async function cuponesDisponibles({ unidades, compras }) {
    const snapshot = await getDocs(collection(db, 'cupones'))
    return snapshot.docs
        .map(documento => ({ id: documento.id, ...documento.data() }))
        .filter(cupon => !motivoRechazo(cupon, { unidades, compras }))
}
