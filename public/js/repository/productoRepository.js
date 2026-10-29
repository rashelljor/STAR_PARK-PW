import { db } from '../config/firebaseConfig.js'
import { collection, doc, getDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

function productosRef() {
    return collection(db, 'productos')
}

function aLista(snapshot) {
    return snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }))
}

export async function leerProductos() {
    return aLista(await getDocs(productosRef()))
}

export async function leerProductosActivos() {
    return aLista(await getDocs(query(productosRef(), where('estado', '==', 'Activo'))))
}

// Usa el índice compuesto productos (estado, categoria) de firestore.indexes.json.
export async function leerProductosPorCategoria(categoria) {
    return aLista(await getDocs(query(productosRef(), where('estado', '==', 'Activo'), where('categoria', '==', categoria))))
}

// Lee un solo documento por su id (o undefined si no existe).
export async function leerProducto(id) {
    const documento = await getDoc(doc(db, 'productos', id))
    return documento.exists() ? { id: documento.id, ...documento.data() } : undefined
}
