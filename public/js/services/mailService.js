// mailService.js - Correos de confirmación (no-reply) con EmailJS.
// Si EMAILJS no está configurado en constants.js, no se envía nada y el flujo sigue igual:
// un correo que no sale nunca debe impedir una reserva o un pago.

import { EMAILJS } from '../utils/constants.js'

let cliente = null

async function cargarCliente() {
    if (!cliente) {
        cliente = (await import('https://cdn.jsdelivr.net/npm/@emailjs/browser@4.4.1/+esm')).default
        cliente.init({ publicKey: EMAILJS.publicKey })
    }
    return cliente
}

export async function enviarCorreo({ para, nombre, asunto, mensaje }) {
    if (!EMAILJS.publicKey || !EMAILJS.serviceId || !EMAILJS.templateId) {
        console.info('[correo] EmailJS sin configurar; no se envió: ' + asunto)
        return false
    }
    try {
        const emailjs = await cargarCliente()
        await emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, { to_email: para, to_name: nombre || 'Astronauta', asunto, mensaje })
        return true
    } catch (error) {
        console.error('[correo] No se pudo enviar: ' + asunto, error)
        return false
    }
}
