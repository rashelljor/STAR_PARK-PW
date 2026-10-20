// paymentService.js - Pasarela de pago SIMULADA (no cobra dinero real).
// Imita el flujo de Culqi / Mercado Pago / Izipay: valida la tarjeta, "contacta
// al banco" (una espera), aprueba o rechaza y registra la transacción.
// El número completo y el CVV nunca se guardan: solo marca y últimos 4 dígitos.
//
// Tarjetas de prueba que el banco simulado rechaza:
//   4000 0000 0000 0002 → fondos insuficientes
//   4000 0000 0000 0069 → tarjeta reportada / bloqueada
// Cualquier otra tarjeta válida (Luhn) y vigente se aprueba.
// Para cobros reales esto debe moverse a una Cloud Function con la pasarela elegida.

import { auth, db } from '../config/firebaseConfig.js'
import { doc, getDoc, increment, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { MILLAS_POR_CANJE, MILLAS_POR_SOL, SOLES_POR_CANJE } from '../utils/constants.js'
import { aNumero, redondear } from '../utils/formatters.js'

const RECHAZOS = {
    '4000000000000002': 'Fondos insuficientes. Prueba con otra tarjeta.',
    '4000000000000069': 'Tu banco rechazó la operación (tarjeta bloqueada). Comunícate con tu banco.'
}

export function soloDigitos(texto) {
    return String(texto || '').replace(/\D/g, '')
}

// Algoritmo de Luhn: detecta números de tarjeta mal escritos.
export function esNumeroTarjetaValido(numero) {
    const digitos = soloDigitos(numero)
    if (digitos.length < 13 || digitos.length > 19) return false
    let suma = 0
    for (let i = 0; i < digitos.length; i++) {
        let digito = Number(digitos[digitos.length - 1 - i])
        if (i % 2 === 1) {
            digito *= 2
            if (digito > 9) digito -= 9
        }
        suma += digito
    }
    return suma % 10 === 0
}

export function marcaTarjeta(numero) {
    const digitos = soloDigitos(numero)
    if (/^4/.test(digitos)) return 'Visa'
    if (/^(5[1-5]|2[2-7])/.test(digitos)) return 'Mastercard'
    if (/^3[47]/.test(digitos)) return 'American Express'
    if (/^3(0[0-5]|[68])/.test(digitos)) return 'Diners Club'
    return ''
}

// "1234567812345678" → "1234 5678 1234 5678" (Amex: 4-6-5).
export function formatearNumeroTarjeta(numero) {
    const digitos = soloDigitos(numero).slice(0, 19)
    if (marcaTarjeta(digitos) === 'American Express') return digitos.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '))
    return digitos.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function erroresTarjeta({ numero, titular, vencimiento, cvv }) {
    const errores = []
    const marca = marcaTarjeta(numero)
    if (!esNumeroTarjetaValido(numero)) errores.push('El número de tarjeta no es válido. Revísalo dígito por dígito.')
    if (titular.trim().length < 3) errores.push('Escribe el nombre del titular tal como aparece en la tarjeta.')

    const [mes, anio] = String(vencimiento).split('/').map(Number)
    const hoy = new Date()
    if (!mes || mes > 12 || anio === undefined || isNaN(anio)) errores.push('Escribe el vencimiento como MM/AA.')
    else if (2000 + anio < hoy.getFullYear() || (2000 + anio === hoy.getFullYear() && mes < hoy.getMonth() + 1)) errores.push('La tarjeta está vencida.')

    const largoCvv = marca === 'American Express' ? 4 : 3
    if (soloDigitos(cvv).length !== largoCvv) errores.push('El código de seguridad (CVV) debe tener ' + largoCvv + ' dígitos.')
    return errores
}

// Millas que se pueden canjear en este pago sin pasar del total.
export function maximoCanjes(millasDisponibles, total) {
    return Math.min(Math.floor(millasDisponibles / MILLAS_POR_CANJE), Math.floor(aNumero(total) / SOLES_POR_CANJE))
}

const esperar = ms => new Promise(resolver => setTimeout(resolver, ms))

// Procesa el pago de una reserva. Devuelve la transacción o lanza un Error con un mensaje para el cliente.
export async function procesarPago(reserva, tarjeta, canjes = 0) {
    const errores = erroresTarjeta(tarjeta)
    if (errores.length) throw new Error(errores.join(' '))

    // "Comunicación con el banco".
    await esperar(1800 + Math.random() * 1200)
    const numero = soloDigitos(tarjeta.numero)
    if (RECHAZOS[numero]) throw new Error(RECHAZOS[numero])

    const millasUsadas = canjes * MILLAS_POR_CANJE
    const descuentoMillas = canjes * SOLES_POR_CANJE
    const total = redondear(aNumero(reserva.total) - descuentoMillas)
    const transaccion = {
        uid: auth.currentUser.uid,
        reservaId: reserva.id,
        items: reserva.items || [],
        fechaVisita: reserva.fecha,
        subtotal: aNumero(reserva.subtotal ?? reserva.total),
        cupon: reserva.cupon || null,
        descuentoCupon: aNumero(reserva.descuentoCupon),
        millasUsadas,
        descuentoMillas,
        total,
        millasGanadas: Math.floor(total) * MILLAS_POR_SOL,
        tarjeta: { marca: marcaTarjeta(numero), ultimos4: numero.slice(-4), titular: tarjeta.titular.trim().toUpperCase() },
        codigoAutorizacion: String(Math.floor(100000 + Math.random() * 900000)),
        estado: 'aprobada',
        fecha: serverTimestamp()
    }

    // Reserva pagada + transacción + contador de fidelidad: todo o nada.
    // La transacción usa el id de la reserva, así una reserva no puede cobrarse dos veces.
    // El uso del cupón ya se contó al reservar, así que el pago no depende del cupón.
    const lote = writeBatch(db)
    lote.update(doc(db, 'reservas', reserva.id), { pagado: true, estado: 'pagado', transaccionId: reserva.id, pagadoEn: serverTimestamp() })
    lote.set(doc(db, 'transacciones', reserva.id), transaccion)
    // Las reglas comprueban que las millas canjeadas salgan del saldo de este contador.
    const fidelidad = doc(db, 'fidelidad', transaccion.uid)
    if ((await getDoc(fidelidad)).exists()) {
        lote.update(fidelidad, { millasGanadas: increment(transaccion.millasGanadas), millasUsadas: increment(millasUsadas), compras: increment(1), ultimaTransaccion: reserva.id })
    } else {
        lote.set(fidelidad, { millasGanadas: transaccion.millasGanadas, millasUsadas, compras: 1, ultimaTransaccion: reserva.id })
    }
    await lote.commit()

    return { id: reserva.id, ...transaccion, fecha: new Date() }
}
