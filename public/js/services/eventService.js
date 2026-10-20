// eventService.js - Solicitudes de cumpleaños y eventos (colección "eventos").
// No pasan por el carrito: el cliente envía la solicitud y el admin la confirma o rechaza.

import { auth, db } from '../config/firebaseConfig.js'
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
import { milisegundos } from '../utils/formatters.js'
import { PAQUETES_EVENTO } from '../utils/constants.js'

// Imagen del servicio "Cumpleaños" que el admin configuró en Contenido institucional.
export async function obtenerImagenCumpleanos() {
    const snapshot = await getDocs(collection(db, 'servicios'))
    const servicio = snapshot.docs.map(documento => documento.data())
        .find(item => String(item.nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes('cumplea'))
    return servicio?.imagen || ''
}

// Paquetes de cumpleaños (colección "paquetes", editable desde Gestión de catálogo).
// Mientras el admin no los haya creado, se usan los de constants.js.
export async function obtenerPaquetes() {
    try {
        const snapshot = await getDocs(collection(db, 'paquetes'))
        const paquetes = snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
        return paquetes.length ? paquetes.sort((a, b) => Number(a.precioPorNino) - Number(b.precioPorNino)) : PAQUETES_EVENTO
    } catch (error) {
        console.error(error)
        return PAQUETES_EVENTO
    }
}

export async function obtenerMisEventos() {
    const snapshot = await getDocs(query(collection(db, 'eventos'), where('uid', '==', auth.currentUser.uid)))
    return snapshot.docs
        .map(documento => ({ id: documento.id, ...documento.data() }))
        .sort((a, b) => milisegundos(b.creadoEn) - milisegundos(a.creadoEn))
}

export async function solicitarEvento(datos) {
    const evento = { ...datos, uid: auth.currentUser.uid, estado: 'pendiente', creadoEn: serverTimestamp() }
    const documento = await addDoc(collection(db, 'eventos'), evento)
    return { id: documento.id, ...evento }
}

// Solo mientras esté pendiente (también lo exigen las reglas de Firestore).
export function cancelarEvento(id) {
    return deleteDoc(doc(db, 'eventos', id))
}
