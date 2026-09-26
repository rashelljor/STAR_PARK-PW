import { auth, db } from '../config/firebaseConfig.js'
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

function reservasRef() {
    if (!auth.currentUser) throw new Error('Debes iniciar sesión para gestionar reservas.')
    return collection(db, 'reservas')
}

export async function obtenerReservas() {
    const snapshot = await getDocs(query(reservasRef(), where('uid', '==', auth.currentUser.uid)))
    return snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
}

export async function crearReserva({ nombre, correo, telefono, fecha, items, total }) {
    const reserva = { uid: auth.currentUser.uid, nombre, correo, telefono, fecha, items, total, pagado: false, estado: 'pendiente', fechaRegistro: serverTimestamp() }
    const documento = await addDoc(reservasRef(), reserva)
    return { id: documento.id, ...reserva }
}

export async function pagarReserva(id) {
    await updateDoc(doc(db, 'reservas', id), { pagado: true, estado: 'pagado', actualizadoEn: serverTimestamp() })
    await addDoc(collection(db, 'transacciones'), { reservaId: id, uid: auth.currentUser.uid, estado: 'validada', fecha: serverTimestamp() })
}

export function actualizarReserva(id, datos) {
    return updateDoc(doc(db, 'reservas', id), { ...datos, actualizadoEn: serverTimestamp() })
}

export function eliminarReserva(id) {
    return deleteDoc(doc(db, 'reservas', id))
}
