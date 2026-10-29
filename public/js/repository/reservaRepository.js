import { auth, db } from '../config/firebaseConfig.js'
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

export function reservasRef() {
    if (!auth.currentUser) throw new Error('Debes iniciar sesión para gestionar reservas.')
    return collection(db, 'reservas')
}

// Solo las reservas del cliente con sesión iniciada.
export async function leerMisReservas() {
    const snapshot = await getDocs(query(reservasRef(), where('uid', '==', auth.currentUser.uid)))
    return snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
}

export async function leerReserva(id) {
    const documento = await getDoc(doc(db, 'reservas', id))
    return documento.exists() ? { id: documento.id, ...documento.data() } : null
}

export function escucharDocumentoReserva(id, callback, alFallar) {
    return onSnapshot(doc(db, 'reservas', id), documento => {
        if (documento.exists()) callback({ id: documento.id, ...documento.data() })
    }, alFallar)
}
