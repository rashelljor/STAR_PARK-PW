// reviewService.js - Reseñas de 1 a 5 estrellas de los productos de la tienda.
// Colección "resenas"; el id es "<idProducto>_<uid>", así cada cliente tiene
// una sola reseña por producto (si vuelve a opinar, la actualiza).

import { auth, db } from '../config/firebaseConfig.js'
import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { milisegundos } from '../utils/formatters.js'

// Solo las reseñas de un producto, las más recientes primero (panel de comentarios).
export async function obtenerResenasDe(productoId) {
    const snapshot = await getDocs(query(collection(db, 'resenas'), where('productoId', '==', productoId)))
    return snapshot.docs
        .map(documento => ({ id: documento.id, ...documento.data() }))
        .sort((a, b) => milisegundos(b.fecha) - milisegundos(a.fecha))
}

// Todas las reseñas (para el promedio de cada tarjeta de la tienda) agrupadas por producto, las más recientes primero: { idProducto: [reseña, ...] }.
export async function obtenerResenasPorProducto() {
    const snapshot = await getDocs(collection(db, 'resenas'))
    const porProducto = {}
    snapshot.docs.forEach(documento => {
        const resena = { id: documento.id, ...documento.data() }
        ;(porProducto[resena.productoId] ||= []).push(resena)
    })
    Object.values(porProducto).forEach(lista => lista.sort((a, b) => milisegundos(b.fecha) - milisegundos(a.fecha)))
    return porProducto
}

export function promedioEstrellas(resenas = []) {
    if (!resenas.length) return 0
    return resenas.reduce((total, resena) => total + Number(resena.estrellas || 0), 0) / resenas.length
}

export async function guardarResena(productoId, { estrellas, comentario, nombre }) {
    const uid = auth.currentUser.uid
    const resena = { productoId, uid, nombre, estrellas, comentario: comentario.trim(), fecha: serverTimestamp() }
    await setDoc(doc(db, 'resenas', productoId + '_' + uid), resena)
    return { id: productoId + '_' + uid, ...resena, fecha: new Date() }
}

export function eliminarResena(id) {
    return deleteDoc(doc(db, 'resenas', id))
}
