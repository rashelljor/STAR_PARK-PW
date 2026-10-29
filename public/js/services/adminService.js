import { db } from '../config/firebaseConfig.js'
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getCountFromServer,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    startAfter,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

export async function listar(coleccion, ordenar = 'nombre') {
    const snapshot = await getDocs(collection(db, coleccion))
    return snapshot.docs
        .map(documento => ({ id: documento.id, ...documento.data() }))
        .sort((a, b) => String(a[ordenar] || a.nombreCompleto || a.correo || '').localeCompare(String(b[ordenar] || b.nombreCompleto || b.correo || '')))
}

// Una tanda de la colección: orderBy + limit, y startAfter desde el último
// documento de la tanda anterior (despuesDe). Solo se leen "cantidad" documentos.
// Los documentos sin el campo de orden no aparecen (Firestore no los indexa).
export async function listarPagina(coleccion, { ordenar = 'nombre', cantidad = 6, despuesDe = null } = {}) {
    const restricciones = despuesDe ? [orderBy(ordenar), startAfter(despuesDe), limit(cantidad)] : [orderBy(ordenar), limit(cantidad)]
    const snapshot = await getDocs(query(collection(db, coleccion), ...restricciones))
    return {
        items: snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() })),
        ultimo: snapshot.docs.at(-1) || despuesDe
    }
}

// Cantidad de documentos sin descargarlos (para "Mostrando X de N").
export async function contar(coleccion) {
    return (await getCountFromServer(collection(db, coleccion))).data().count
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
