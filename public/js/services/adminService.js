import { db } from '../config/firebaseConfig.js'
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    serverTimestamp,
    setDoc,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

export async function listar(coleccion, ordenar = 'nombre') {
    const snapshot = await getDocs(collection(db, coleccion))
    return snapshot.docs
        .map(documento => ({ id: documento.id, ...documento.data() }))
        .sort((a, b) => String(a[ordenar] || a.nombreCompleto || a.correo || '').localeCompare(String(b[ordenar] || b.nombreCompleto || b.correo || '')))
}

export function escuchar(coleccion, callback, ordenar = 'nombre') {
    return onSnapshot(collection(db, coleccion), snapshot => {
        callback(snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() })))
    })
}

export function crear(coleccion, datos) {
    return addDoc(collection(db, coleccion), { ...datos, creadoEn: serverTimestamp() })
}

export function actualizar(coleccion, id, datos) {
    return updateDoc(doc(db, coleccion, id), { ...datos, actualizadoEn: serverTimestamp() })
}

export function eliminar(coleccion, id) {
    return deleteDoc(doc(db, coleccion, id))
}

// Lee un documento puntual (o null si no existe).
export async function obtenerDocumento(coleccion, id) {
    const documento = await getDoc(doc(db, coleccion, id))
    return documento.exists() ? { id: documento.id, ...documento.data() } : null
}

// Crea o actualiza un documento con id fijo, conservando los campos que no se envían.
export function guardarDocumento(coleccion, id, datos) {
    return setDoc(doc(db, coleccion, id), { ...datos, actualizadoEn: serverTimestamp() }, { merge: true })
}
