import { auth, db } from '../config/firebaseConfig.js'
import { collection, doc, getDoc, getDocs, increment, query, serverTimestamp, where, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { contarEntradas } from './cartService.js'
import { redondear } from '../utils/formatters.js'

function reservasRef() {
    if (!auth.currentUser) throw new Error('Debes iniciar sesión para gestionar reservas.')
    return collection(db, 'reservas')
}

export async function obtenerReservas() {
    const snapshot = await getDocs(query(reservasRef(), where('uid', '==', auth.currentUser.uid)))
    return snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
}

export async function obtenerReserva(id) {
    const documento = await getDoc(doc(db, 'reservas', id))
    return documento.exists() ? { id: documento.id, ...documento.data() } : null
}

// Entradas de una reserva. Las del sistema anterior no guardaban "entradas":
// se cuentan desde sus ítems, igual que en el carrito.
export function entradasDe(reserva) {
    return reserva.entradas || contarEntradas(reserva.items || []) || 1
}

// Unidades del bazar por producto del catálogo (los colores de un producto comparten stock).
function unidadesBazar(items) {
    const porProducto = {}
    items.filter(item => item.categoria === 'bazar').forEach(item => {
        const id = item.productoId || item.id
        porProducto[id] = (porProducto[id] || 0) + (Number(item.cantidad) || 1)
    })
    return porProducto
}

// La reserva, su registro de aforo, el stock del bazar y el uso del cupón se
// guardan juntos: o se aplica todo o nada. "apartado" indica que la reserva
// separó stock y cupón, para devolverlos si se quita sin pagar.
// Los montos se guardan como número (antes como texto "S/ 50.00").
export async function crearReserva({ nombre, correo, telefono, fecha, items, subtotal, cupon = null, descuentoCupon = 0 }) {
    const referencia = doc(reservasRef())
    // Los productos del bazar viajan en items pero no ocupan aforo.
    const entradas = contarEntradas(items)
    const reserva = {
        uid: auth.currentUser.uid,
        nombre, correo, telefono, fecha, items, entradas,
        subtotal: redondear(subtotal),
        cupon,
        descuentoCupon: redondear(descuentoCupon),
        total: redondear(subtotal - descuentoCupon),
        pagado: false,
        estado: 'pendiente',
        apartado: true,
        fechaRegistro: serverTimestamp()
    }
    const lote = writeBatch(db)
    lote.set(referencia, reserva)
    lote.set(doc(db, 'ocupacion', referencia.id), { uid: reserva.uid, fecha, entradas })
    Object.entries(unidadesBazar(items)).forEach(([id, unidades]) => {
        lote.update(doc(db, 'productos', id), { stock: increment(-unidades), ultimaReserva: referencia.id })
    })
    if (cupon) lote.update(doc(db, 'cupones', cupon), { usos: increment(1), ultimaReserva: referencia.id })
    await lote.commit()
    return { id: referencia.id, ...reserva }
}

// Solo se editan los datos de contacto y la fecha; el aforo se mueve a la nueva fecha.
// Las reservas del sistema anterior no tienen registro de aforo y no se les crea uno.
export async function actualizarReserva(reserva, { nombre, correo, telefono, fecha }) {
    const lote = writeBatch(db)
    lote.update(doc(db, 'reservas', reserva.id), { nombre, correo, telefono, fecha, actualizadoEn: serverTimestamp() })
    if (reserva.entradas) lote.set(doc(db, 'ocupacion', reserva.id), { uid: reserva.uid, fecha, entradas: reserva.entradas })
    await lote.commit()
}

// Quita una reserva sin pagar con su aforo, y devuelve el stock y el uso del
// cupón que apartó (si el producto o el cupón todavía existen).
export async function eliminarReserva(reserva) {
    const lote = writeBatch(db)
    lote.delete(doc(db, 'reservas', reserva.id))
    if ((await getDoc(doc(db, 'ocupacion', reserva.id))).exists()) lote.delete(doc(db, 'ocupacion', reserva.id))

    if (reserva.apartado) {
        const porProducto = unidadesBazar(reserva.items || [])
        const existentes = await Promise.all(Object.keys(porProducto).map(id => getDoc(doc(db, 'productos', id))))
        existentes.filter(producto => producto.exists()).forEach(producto => {
            lote.update(producto.ref, { stock: increment(porProducto[producto.id]), ultimaDevolucion: reserva.id })
        })
        if (reserva.cupon && (await getDoc(doc(db, 'cupones', reserva.cupon))).exists()) {
            lote.update(doc(db, 'cupones', reserva.cupon), { usos: increment(-1), ultimaDevolucion: reserva.id })
        }
    }
    await lote.commit()
}
