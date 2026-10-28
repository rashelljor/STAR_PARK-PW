// avisosAdminService.js - Campanita del panel de administración. Los avisos no
// se guardan aparte: se arman en vivo desde las colecciones que ya existen
// (preguntas, reservas, eventos, productos y reseñas), así ningún cliente
// necesita permisos nuevos para "avisar" al admin.
// Lo ya visto se guarda en el perfil del admin (usuarios/<uid>.avisosVistosHasta):
// todo aviso más nuevo que esa fecha cuenta como no leído.

import { auth, db } from '../config/firebaseConfig.js'
import { collection, doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { esSoloBazar, productosBazar, textoEntradas } from './bookingService.js'
import { formatearPrecio, milisegundos } from '../utils/formatters.js'

// Unidades desde las que un producto del bazar avisa "stock bajo".
export const STOCK_BAJO = 5
const MAXIMO_AVISOS = 40
const COLECCIONES = ['preguntas', 'reservas', 'eventos', 'productos', 'resenas']

const estrellas = cantidad => '★'.repeat(cantidad) + '☆'.repeat(5 - cantidad)

// Cada aviso: { id, icono, titulo, mensaje, fecha, enlace, silencioso }.
// "silencioso" no hace sonar la campanita (el stock lo cambia el propio admin al editar).
function armarAvisos({ preguntas = [], reservas = [], eventos = [], productos = [], resenas = [] }) {
    const avisos = []

    preguntas.forEach(pregunta => avisos.push({
        id: 'pregunta-' + pregunta.id,
        icono: '❓',
        titulo: 'Pregunta de ' + (pregunta.nombre || 'un cliente') + (pregunta.estado === 'respondida' ? ' (respondida)' : ''),
        mensaje: pregunta.pregunta,
        fecha: pregunta.fecha,
        enlace: 'usuario.html#preguntas'
    }))

    reservas.forEach(reserva => {
        const soloBazar = esSoloBazar(reserva)
        const enlace = soloBazar ? 'gestion_reservas_ventas.html#pedidos' : 'gestion_reservas_ventas.html'
        const detalle = (reserva.nombre || 'Cliente') + ' · ' + formatearPrecio(reserva.total) + ' · ' + textoEntradas(reserva) +
            (!soloBazar && productosBazar(reserva).length ? ' + productos del bazar' : '') + ' · ' + (soloBazar ? 'recojo ' : 'visita ') + reserva.fecha
        if (reserva.fechaRegistro) avisos.push({ id: 'reserva-' + reserva.id, icono: soloBazar ? '🛍️' : '🎟️', titulo: soloBazar ? 'Nuevo pedido del bazar' : 'Nueva reserva', mensaje: detalle, fecha: reserva.fechaRegistro, enlace })
        if (reserva.pagadoEn) avisos.push({ id: 'pago-' + reserva.id, icono: '💳', titulo: soloBazar ? 'Pedido del bazar pagado' : 'Reserva pagada', mensaje: detalle, fecha: reserva.pagadoEn, enlace })
        if (reserva.canceladaEn) avisos.push({
            id: 'cancelada-' + reserva.id,
            icono: '↩️',
            titulo: soloBazar ? 'Pedido del bazar cancelado' : 'Reserva cancelada',
            mensaje: (reserva.nombre || 'Cliente') + ' · reembolso ' + formatearPrecio(reserva.reembolso) + (reserva.motivoCancelacion ? ' · ' + reserva.motivoCancelacion : ''),
            fecha: reserva.canceladaEn,
            enlace: soloBazar ? 'gestion_reservas_ventas.html#pedidos' : 'gestion_reservas_ventas.html'
        })
    })

    eventos.forEach(evento => avisos.push({
        id: 'evento-' + evento.id,
        icono: '🎂',
        titulo: 'Solicitud de cumpleaños',
        mensaje: (evento.cumpleanero || '') + ' · ' + (evento.paquete || '') + ' · ' + evento.fecha + ' ' + (evento.hora || '') + ' · ' + (evento.ninos || 0) + ' niños · ' + (evento.nombre || ''),
        fecha: evento.creadoEn,
        enlace: 'gestion_reservas_ventas.html#eventos'
    }))

    // El stock baja al reservar: el aviso toma la fecha de esa reserva. Cada
    // nivel de stock es un aviso distinto, así vuelve a sonar si sigue bajando.
    const fechaReserva = Object.fromEntries(reservas.map(reserva => [reserva.id, reserva.fechaRegistro]))
    productos.filter(producto => producto.categoria === 'bazar' && Number(producto.stock) <= STOCK_BAJO).forEach(producto => {
        const stock = Math.max(0, Number(producto.stock) || 0)
        avisos.push({
            id: 'stock-' + producto.id + '-' + stock,
            icono: stock ? '⚠️' : '⛔',
            titulo: stock ? 'Stock bajo' : 'Producto agotado',
            mensaje: producto.nombre + (stock ? ' · quedan ' + stock + (stock === 1 ? ' unidad' : ' unidades') : ' · sin unidades en el bazar'),
            fecha: fechaReserva[producto.ultimaReserva] || producto.actualizadoEn || producto.creadoEn,
            enlace: 'gestion_catalogo.html',
            silencioso: true
        })
    })

    const nombres = Object.fromEntries(productos.map(producto => [producto.id, producto.nombre]))
    resenas.forEach(resena => avisos.push({
        id: 'resena-' + resena.id + '-' + milisegundos(resena.fecha),
        icono: '⭐',
        titulo: resena.productoId === 'pagina' ? 'Comentario sobre la página' : 'Reseña de ' + (nombres[resena.productoId] || 'un producto'),
        mensaje: (resena.nombre || 'Cliente') + ' · ' + estrellas(Number(resena.estrellas) || 0) + (resena.comentario ? ' · ' + resena.comentario : ''),
        fecha: resena.fecha,
        enlace: '../users/tienda.html' + (resena.productoId === 'pagina' ? '' : '#producto-' + resena.productoId)
    }))

    return avisos.sort((a, b) => milisegundos(b.fecha) - milisegundos(a.fecha)).slice(0, MAXIMO_AVISOS)
}

// Escucha las colecciones en tiempo real y llama a callback(avisos) en cada
// cambio, recién cuando todas respondieron una vez (así la primera carga no
// cuenta como avisos "nuevos" que llegan de a poco). Devuelve cómo dejar de escuchar.
export function escucharAvisos(callback, alFallar = console.error) {
    const datos = {}
    const publicar = () => {
        if (COLECCIONES.every(nombre => datos[nombre])) callback(armarAvisos(datos))
    }
    const detenciones = COLECCIONES.map(nombre => onSnapshot(collection(db, nombre), snapshot => {
        datos[nombre] = snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
        publicar()
    }, fallo => {
        // Sin una colección la campanita sigue con las demás.
        datos[nombre] = []
        publicar()
        alFallar(fallo)
    }))
    return () => detenciones.forEach(detener => detener())
}

// Milisegundos hasta los que el admin ya vio sus avisos (0 = nunca abrió la campanita).
export async function obtenerVistoHasta() {
    const perfil = await getDoc(doc(db, 'usuarios', auth.currentUser.uid))
    return milisegundos(perfil.data()?.avisosVistosHasta)
}

export function marcarAvisosVistos() {
    return updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { avisosVistosHasta: serverTimestamp() })
}
